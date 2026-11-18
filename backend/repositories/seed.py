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
    """
    existing_countries = {c.name for c in session.exec(select(Country)).all()}
    missing_countries = [
        Country(name=name)
        for name in DEFAULT_COUNTRIES
        if name not in existing_countries
    ]
    if missing_countries:
        session.add_all(missing_countries)
        session.commit()

    if not session.exec(select(Role)).first():
        permissions = {
            name: Permission(name=name, description=f"Permiso para {name}")
            for name in PERMISSION_NAMES
        }
        session.add_all(permissions.values())
        session.add_all(
            Role(
                name=role,
                description=f"Rol del sistema QA Studio: {role}",
                permissions=[permissions[p] for p in names],
            )
            for role, names in ROLE_PERMISSIONS.items()
        )
        session.commit()
