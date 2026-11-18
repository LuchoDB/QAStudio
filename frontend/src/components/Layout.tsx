import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

// El marco de todas las pantallas privadas: menú arriba, usuario + botón Cerrar sesión, y contenido abajo.
export function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="top-header">
        <div className="brand-nav">
          <span className="brand-title">QA Studio</span>
          <nav className="main-nav">
            <NavLink to="/bugs">Incidencias (Bugs)</NavLink>
            <NavLink to="/users">Equipo QA (Usuarios)</NavLink>
            <NavLink to="/roles">Roles</NavLink>
            <NavLink to="/permissions">Permisos</NavLink>
          </nav>
        </div>
        <div className="user-bar">
          <span className="user-badge">
            {user?.name} ({user?.roles.map((r) => r.name).join(', ') || 'Sin rol'})
          </span>
          <button type="button" className="btn-danger" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
