import { Link, useParams } from 'react-router-dom'
import { getBug } from '../api/bugs'
import { ErrorMessage } from '../components/ErrorMessage'
import { useAuth } from '../context/useAuth'
import { useFetch } from '../hooks/useFetch'

export function BugDetailPage() {
  const bugId = Number(useParams().id)
  const { can } = useAuth()
  const { data: bug, error, loading } = useFetch(() => getBug(bugId), [bugId])

  if (loading) return <p className="status-text">Cargando…</p>
  if (error || !bug) return <ErrorMessage message={error} />

  return (
    <div className="page-card">
      <div className="page-header">
        <h1>
          Bug #{bug.id}: {bug.title}
        </h1>
        <div className="actions-cell">
          {can('update_bugs') && (
            <Link to={`/bugs/${bug.id}/edit`} className="btn-primary">
              Editar
            </Link>
          )}
          <Link to="/bugs" className="btn-secondary">
            Volver
          </Link>
        </div>
      </div>

      <div className="detail-grid">
        <p>
          <strong>Proyecto:</strong>{' '}
          <span className="tag-badge">{bug.project ?? 'E-Commerce Web'}</span>
        </p>
        <p>
          <strong>Módulo afectado:</strong>{' '}
          <span className="tag-badge">{bug.module}</span>
        </p>
        <p>
          <strong>Severidad:</strong>{' '}
          <span className={`severity-badge sev-${bug.severity}`}>
            Nivel {bug.severity} de 5
          </span>
        </p>
        <p>
          <strong>Estado:</strong>{' '}
          <span className={bug.is_resolved ? 'status-resolved' : 'status-open'}>
            {bug.is_resolved ? 'Resuelto' : 'Abierto'}
          </span>
        </p>
        <p>
          <strong>Reportado por:</strong>{' '}
          {bug.reporter ? (
            <Link to={`/users/${bug.reporter.id}`}>{bug.reporter.name}</Link>
          ) : (
            'Usuario no especificado'
          )}
        </p>
      </div>

      <h2>Descripción técnica</h2>
      <p className="description-box">{bug.description}</p>
    </div>
  )
}
