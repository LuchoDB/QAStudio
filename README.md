# QA Studio — Sistema de Gestión de Incidencias y Control de Calidad

Proyecto integral desarrollado con **FastAPI + SQLModel** en el Backend y **React + TypeScript + Vite** en el Frontend, siguiendo la arquitectura en capas de la cátedra.

## Características Principales (0% Hardcodeo)

1. **Sin usuarios pre-cargados ni credenciales fijas:**
   - La base de datos arranca con los catálogos base (`Country`, `Role`, `Permission`), pero **sin ningún usuario hardcodeado**.
   - En la pantalla de `/login` (`GET /auth/setup-status`), el **primer usuario que se registra** (`POST /register`) recibe automáticamente el rol **`ADMIN`** por defecto en la tabla intermedia `UserRole`.
   - Todos los usuarios que se registren después reciben por defecto el rol **`TESTER`**.
   - El **Administrador** puede entrar al detalle de cualquier usuario (`UserDetailPage`) y **otorgarle el privilegio de `ADMIN`** (o asignarle/quitarle cualquier rol mediante `POST /user/{id}/role/{role_id}` y `DELETE /user/{id}/role/{role_id}`).
   - En la barra superior (`Layout.tsx`) siempre está visible el usuario actual, sus roles y el botón **"Cerrar sesión"**.

2. **Las 7 Tablas en SQLModel (`backend/model/`):**
   - `Country`: Catálogo 1:N con `UserDB` consultado por `GET /country` para los `<select>`.
   - `UserDB`: Usuarios (`id`, `name`, `age`, `email` único, `password` hasheada con `bcrypt`, `country_id`).
   - `Role`: Roles (`ADMIN`, `TESTER`, `REGULAR`).
   - `Permission`: Permisos (`read_users`, `write_users`, `update_users`, `delete_users`, `read_bugs`, `write_bugs`, `update_bugs`, `delete_bugs`).
   - `UserRole`: Tabla intermedia N:M `UserDB <-> Role`.
   - `RolePermission`: Tabla intermedia N:M `Role <-> Permission`.
   - `BugReport`: Incidencias de software (`id`, `title`, `description`, `module`, `severity` 1-5, `is_resolved`, `reporter_id` tomado automáticamente del token JWT con `CurrentUserIdDep`).

3. **Endpoints de QA Studio:**
   - Autenticación y Registro: `GET /auth/setup-status`, `POST /register`, `POST /login`, `GET /country`.
   - Incidencias (Bugs): `GET /bug`, `POST /bug`, `GET /bug/{id}`, `PATCH /bug/{id}`, `DELETE /bug/{id}`, `GET /bug/search/{title}`, `GET /bug/filter/critical`.
   - Equipo QA (Usuarios): `GET /user`, `POST /user`, `GET /user/{id}`, `PATCH /user/{id}`, `DELETE /user/{id}`, `GET /user/me/id`, `GET /user/search/{name}`, `GET /user/filter/seniors`, `POST /user/{id}/role/{role_id}`, `DELETE /user/{id}/role/{role_id}`.
   - Roles y Permisos: `GET/POST /role`, `GET/PATCH/DELETE /role/{id}`, `GET /role/{id}/user`, `POST/DELETE /role/{id}/permission/{permission_id}`, `GET/POST /permission`, `GET/PATCH/DELETE /permission/{id}`.

---

## Cómo ejecutar el proyecto

### 1. Backend (`backend/`)

```powershell
cd "C:\Users\Luciano\Documents\Facultad\Programacion 4\QAStudio\backend"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
pytest
uvicorn main:app --reload --port 8000
```

### 2. Frontend (`frontend/`)

```powershell
cd "C:\Users\Luciano\Documents\Facultad\Programacion 4\QAStudio\frontend"
npm install
npm run dev
```

Abrí `http://localhost:5174`:
1. Al iniciar por primera vez con la base limpia, la pantalla detecta que no existen usuarios y te invita a **Crear el primer usuario (Administrador)**.
2. Una vez adentro, podés reportar bugs, ver tu nombre e historial, o tocar **"Cerrar sesión"** arriba a la derecha.
3. Si registrás un segundo usuario desde la pantalla de login, entrará como **`TESTER`**. Si volvés a entrar con tu cuenta **`ADMIN`**, desde **Equipo QA (Usuarios) -> Ver / Roles (Dar Admin)** podés tocar **"Otorgar privilegio ADMIN"** para promoverlo.
