from sqlmodel import Session, select

from model.roles import ADMIN_ROLE, REGULAR_ROLE, TESTER_ROLE, Permission, Role
from model.users import Country

PERMISSION_NAMES = [
    "read_users",
    "write_users",
    "update_users",
    "delete_users",
    "read_bugs",
    "write_bugs",
    "update_bugs",
    "delete_bugs",
]

ROLE_PERMISSIONS = {
    ADMIN_ROLE: PERMISSION_NAMES,
    TESTER_ROLE: ["read_users", "read_bugs", "write_bugs", "update_bugs"],
    REGULAR_ROLE: ["read_users", "read_bugs", "write_bugs", "update_bugs"],
}

DEFAULT_COUNTRIES = [
    "Argentina",
    "Uruguay",
    "Brasil",
]


def seed_catalog_and_roles(session: Session) -> None:
    """Inicializa únicamente los catálogos base (países, roles y permisos).
    No crea usuarios hardcodeados: el primer usuario registrado en el sistema recibe ADMIN.

    SEED BLINDADO (Idempotente y Autoreparable):
    En lugar de ejecutarse solo cuando la tabla está completamente vacía, verifica
    elemento por elemento que todos los países base (DEFAULT_COUNTRIES), los 8 permisos
    esenciales (PERMISSION_NAMES) y sus asignaciones a cada rol (ROLE_PERMISSIONS)
    existan siempre al iniciar el servidor.
    Si alguien renombra o borra por error un permiso crítico desde la API/UI
    (por ejemplo cambiar 'read_users' a 'read_user'), al reiniciar el backend se
    restaura automáticamente el permiso faltante y se vuelve a vincular a los roles
    correspondientes sin duplicar los datos que ya estaban bien.
    """
    # 1. BLINDAJE DE PAÍSES: revisa qué países ya están en la tabla Country y agrega solo los que falten
    existing_countries = {c.name for c in session.exec(select(Country)).all()}
    missing_countries = [
        Country(name=name)
        for name in DEFAULT_COUNTRIES
        if name not in existing_countries
    ]
    if missing_countries:
        session.add_all(missing_countries)
        session.commit()

    # 2. BLINDAJE DE PERMISOS: verifica los 8 códigos de PERMISSION_NAMES uno por uno; si falta alguno, lo recrea
    existing_perms = {
        p.name: p for p in session.exec(select(Permission)).all()
    }
    for name in PERMISSION_NAMES:
        if name not in existing_perms:
            perm = Permission(name=name, description=f"Permiso para {name}")
            session.add(perm)
            existing_perms[name] = perm
    session.commit()

    # 3. BLINDAJE DE ROLES Y RELACIÓN N:M (RolePermission): si el rol ya existe pero le falta un permiso base, se lo vuelve a vincular
    existing_roles = {r.name: r for r in session.exec(select(Role)).all()}
    for role_name, perm_names in ROLE_PERMISSIONS.items():
        role = existing_roles.get(role_name)
        if not role:
            role = Role(
                name=role_name,
                description=f"Rol del sistema QA Studio: {role_name}",
                permissions=[existing_perms[p] for p in perm_names],
            )
            session.add(role)
        else:
            current_perm_names = {p.name for p in role.permissions}
            for p_name in perm_names:
                if p_name not in current_perm_names:
                    role.permissions.append(existing_perms[p_name])
            session.add(role)
    session.commit()
