import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

// Marco principal inspirado en QINTIQA: navbar blanca limpia + tarjetas glass pastel.
export function Layout() {
  const { user, permissions, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const roleNames = user?.roles.map((r) => r.name).join(', ') || 'Sin rol'

  return (
    <div className="app-shell">
      <header className="top-header">
        <div className="brand-nav">
          <Link to="/bugs" className="qintiqa-brand">
            <span className="qintiqa-logo-box">&lt;/&gt;</span>
            <span className="brand-title">QA STUDIO</span>
          </Link>
          <nav className="main-nav">
            <NavLink to="/bugs">Incidencias (Bugs)</NavLink>
            <NavLink to="/users">Equipo QA (Usuarios)</NavLink>
            <NavLink to="/roles">Roles</NavLink>
          </nav>
        </div>

        <div className="user-menu-container" ref={menuRef}>
          <button
            type="button"
            className="user-menu-trigger"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
          >
            <span className="user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </span>
            <span className="user-trigger-text">
              <strong>{user?.name}</strong>
              <small>{roleNames}</small>
            </span>
            <span className="user-caret">{menuOpen ? '▲' : '▼'}</span>
          </button>

          {menuOpen && (
            <div className="user-dropdown">
              <div className="user-dropdown-section">
                <div className="user-dropdown-header">
                  <strong>{user?.name}</strong>
                  <span className="tag-badge">{roleNames}</span>
                </div>
                <p className="user-dropdown-detail">
                  <span>Email:</span> {user?.email}
                </p>
                <p className="user-dropdown-detail">
                  <span>Edad:</span> {user?.age} años
                </p>
                <p className="user-dropdown-detail">
                  <span>País:</span> {user?.country?.name ?? 'Sin país'}
                </p>
                {user && (
                  <Link
                    to={`/users/${user.id}`}
                    className="user-profile-link"
                    onClick={() => setMenuOpen(false)}
                  >
                    Ver mi perfil completo →
                  </Link>
                )}
              </div>

              <div className="user-dropdown-section">
                <span className="user-dropdown-label">
                  Mis permisos ({permissions.length})
                </span>
                <div className="user-permissions-list">
                  {permissions.length > 0 ? (
                    permissions.map((perm) => (
                      <code key={perm} className="perm-chip">
                        {perm}
                      </code>
                    ))
                  ) : (
                    <span className="no-perms">Sin permisos asignados</span>
                  )}
                </div>
              </div>

              <div className="user-dropdown-footer">
                <button
                  type="button"
                  className="btn-danger btn-logout-full"
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
