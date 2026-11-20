import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link } from 'react-router-dom'
import { deleteBug, getBugs, getCriticalBugs, searchBugs } from '../api/bugs'
import { ConfirmButton } from '../components/ConfirmButton'
import { ErrorMessage } from '../components/ErrorMessage'
import { useAuth } from '../context/useAuth'
import { useFetch } from '../hooks/useFetch'

const PAGE_SIZE = 5

export function BugsPage() {
  const { can } = useAuth()
  const [offset, setOffset] = useState(0)
  const [searchText, setSearchText] = useState('') // lo que se escribe
  const [search, setSearch] = useState('') // lo que se busca
  const [onlyCritical, setOnlyCritical] = useState(false)
  const [sortAsc, setSortAsc] = useState<boolean | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Un solo pedido que depende de los filtros: si cambia uno, se pide de nuevo.
  const { data: bugs, error, loading, reload } = useFetch(() => {
    if (search) return searchBugs(search)
    if (onlyCritical) return getCriticalBugs()
    return getBugs(offset, PAGE_SIZE)
  }, [search, onlyCritical, offset])

  function handleSearch(event: SubmitEvent) {
    event.preventDefault()
    setOffset(0)
    setSearch(searchText.trim())
  }

  async function handleDelete(id: number) {
    setActionError(null)
    try {
      await deleteBug(id)
      reload()
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  // Ordenamiento local sobre una copia al renderizar (sin fetch extra)
  const displayedBugs = bugs
    ? sortAsc === null
      ? bugs
      : [...bugs].sort((a, b) =>
          sortAsc
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title),
        )
    : null

  const totalShown = displayedBugs?.length ?? 0
  const openCount = displayedBugs?.filter((b) => !b.is_resolved).length ?? 0
  const resolvedCount = displayedBugs?.filter((b) => b.is_resolved).length ?? 0
  const criticalOpenCount =
    displayedBugs?.filter((b) => !b.is_resolved && b.severity >= 4).length ?? 0

  return (
    <div className="page-card">
      <div className="page-header">
        <div>
          <span className="section-eyebrow">ISSUE TRACKER · TELEMETRY</span>
          <h1>Incidencias (Bugs)</h1>
        </div>
        {can('write_bugs') && (
          <Link to="/bugs/new" className="btn-primary">
            + Reportar nuevo bug
          </Link>
        )}
      </div>

      {displayedBugs && (
        <div className="qa-metrics-grid">
          <div className="qa-metric-card">
            <span className="qa-metric-label">En esta vista</span>
            <strong className="qa-metric-value">{totalShown}</strong>
          </div>
          <div className="qa-metric-card">
            <span className="qa-metric-label">Abiertos</span>
            <strong className="qa-metric-value metric-warn">{openCount}</strong>
          </div>
          <div className="qa-metric-card">
            <span className="qa-metric-label">Críticos (Sev 4–5)</span>
            <strong className="qa-metric-value metric-danger">
              {criticalOpenCount}
            </strong>
          </div>
          <div className="qa-metric-card">
            <span className="qa-metric-label">Resueltos</span>
            <strong className="qa-metric-value metric-ok">
              {resolvedCount}
            </strong>
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="filter-bar">
        <input
          placeholder="Buscar bug por título…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <button type="submit" className="btn-secondary">
          Buscar
        </button>
        {search && (
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              setSearchText('')
              setSearch('')
              setOffset(0)
            }}
          >
            Limpiar
          </button>
        )}
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={onlyCritical}
            onChange={(e) => {
              setOffset(0)
              setOnlyCritical(e.target.checked)
            }}
          />
          Solo críticos abiertos (Severidad 4–5)
        </label>
      </form>

      <ErrorMessage message={error ?? actionError} />
      {loading && <p className="status-text">Cargando…</p>}

      {displayedBugs && !error && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>
                Título{' '}
                <button
                  type="button"
                  className="btn-sort"
                  onClick={() =>
                    setSortAsc((prev) => (prev === null ? true : !prev))
                  }
                >
                  {sortAsc === null ? '↕' : sortAsc ? 'A-Z' : 'Z-A'}
                </button>
              </th>
              <th>Módulo</th>
              <th>Severidad</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {displayedBugs.map((bug) => (
              <tr key={bug.id}>
                <td>#{bug.id}</td>
                <td>{bug.title}</td>
                <td>
                  <span className="tag-badge">{bug.module}</span>
                </td>
                <td>
                  <span className={`severity-badge sev-${bug.severity}`}>
                    Nivel {bug.severity}
                  </span>
                </td>
                <td>
                  <span
                    className={
                      bug.is_resolved ? 'status-resolved' : 'status-open'
                    }
                  >
                    {bug.is_resolved ? 'Resuelto' : 'Abierto'}
                  </span>
                </td>
                <td className="actions-cell">
                  <Link to={`/bugs/${bug.id}`}>Ver</Link>
                  {can('update_bugs') && (
                    <Link to={`/bugs/${bug.id}/edit`}>Editar</Link>
                  )}
                  {can('delete_bugs') && (
                    <ConfirmButton
                      label="Borrar"
                      onConfirm={() => handleDelete(bug.id)}
                    />
                  )}
                </td>
              </tr>
            ))}
            {displayedBugs.length === 0 && (
              <tr>
                <td colSpan={6}>No se encontraron reportes de bugs.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {!search && !onlyCritical && bugs && (
        <div className="pagination-bar">
          <button
            type="button"
            className="btn-secondary"
            disabled={offset === 0}
            onClick={() => setOffset(offset - PAGE_SIZE)}
          >
            Anterior
          </button>
          <span>Página {Math.floor(offset / PAGE_SIZE) + 1}</span>
          <button
            type="button"
            className="btn-secondary"
            disabled={bugs.length < PAGE_SIZE}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
