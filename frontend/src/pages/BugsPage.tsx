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

  // Todos los bugs del sistema para evaluar el Release Readiness Gate global
  const { data: allBugs, reload: reloadAllBugs } = useFetch(
    () => getBugs(0, 100),
    [],
  )

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
      reloadAllBugs()
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

  const auditList = allBugs ?? displayedBugs ?? []
  const sev5Open = auditList.filter((b) => !b.is_resolved && b.severity === 5)
  const sev4Open = auditList.filter((b) => !b.is_resolved && b.severity === 4)
  const criticalBlockers = [...sev5Open, ...sev4Open]
  const openAll = auditList.filter((b) => !b.is_resolved)

  // Cálculo del QA Health Score (0 a 100%) ponderado por severidad de bugs abiertos
  const penalty = openAll.reduce(
    (acc, b) => acc + (b.severity === 5 ? 18 : b.severity === 4 ? 10 : b.severity * 2),
    0,
  )
  const qaHealth =
    auditList.length === 0 ? 100 : Math.max(0, Math.min(100, 100 - penalty))

  const ruleNoSev5 = sev5Open.length === 0
  const ruleMaxOneSev4 = sev4Open.length <= 1
  const ruleHealthMin70 = qaHealth >= 70
  const isReleaseGo = ruleNoSev5 && ruleMaxOneSev4 && ruleHealthMin70

  function handleExportCsv() {
    const headers = [
      'ID',
      'Titulo',
      'Modulo',
      'Severidad',
      'Estado',
      'Reporter_ID',
      'Impacto_Release',
    ]
    const rows = auditList.map((b) => [
      b.id,
      `"${b.title.replace(/"/g, '""')}"`,
      `"${b.module.replace(/"/g, '""')}"`,
      b.severity,
      b.is_resolved ? 'Resuelto' : 'Abierto',
      b.reporter_id ?? '',
      !b.is_resolved && b.severity >= 4 ? 'BLOQUEANTE (NO-GO)' : 'OK (GO)',
    ])
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `auditoria_release_qastudio.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-card">
      <div className="page-header">
        <div>
          <span className="section-eyebrow">ISSUE TRACKER · RELEASE GATE</span>
          <h1>Incidencias (Bugs)</h1>
        </div>
        {can('write_bugs') && (
          <Link to="/bugs/new" className="btn-primary">
            + Reportar nuevo bug
          </Link>
        )}
      </div>

      {/* OPCIÓN 3: Release Readiness Gate (Go / No-Go) */}
      <section className="release-gate-card">
        <div className="release-gate-top">
          <h2>Release Readiness Gate (Go / No-Go)</h2>
          <span className="tag-badge">
            {auditList.length} incidencias auditadas
          </span>
        </div>

        <div
          className={`release-gate-banner ${
            isReleaseGo ? 'gate-banner-go' : 'gate-banner-nogo'
          }`}
        >
          <span className="gate-banner-icon">{isReleaseGo ? '✓' : '⚠'}</span>
          <div>
            {isReleaseGo ? (
              <>
                <strong>LISTO PARA PRODUCCIÓN (GO)</strong> · Todos los
                controles de calidad fueron superados para el despliegue
              </>
            ) : (
              <>
                <strong>RELEASE BLOQUEADO (NO-GO)</strong> ·{' '}
                {criticalBlockers.length}{' '}
                {criticalBlockers.length === 1
                  ? 'Bug Crítico Impide'
                  : 'Bugs Críticos Impiden'}{' '}
                Despliegue a Producción
              </>
            )}
          </div>
        </div>

        <div className="release-gate-body">
          <div className="release-health-meter">
            <div className="release-health-header">
              <span className="qa-metric-label">QA Health Score</span>
              <strong className="release-health-percent">{qaHealth}%</strong>
            </div>
            <div className="release-progress-track">
              <div
                className="release-progress-fill"
                style={{ width: `${qaHealth}%` }}
              />
            </div>
            <span className="release-health-caption">
              {openAll.length} abiertos ·{' '}
              {auditList.length - openAll.length} resueltos
            </span>
          </div>

          <div className="release-rules-box">
            <strong className="release-rules-title">
              Automated release gate rules:
            </strong>
            <ul className="release-rules-list">
              <li className={ruleNoSev5 ? 'rule-pass' : 'rule-fail'}>
                <span>{ruleNoSev5 ? '✓' : '✕'}</span>
                0 Bugs Sev-5 bloqueantes abiertos{' '}
                {!ruleNoSev5 && (
                  <em>
                    (Falla: {sev5Open.map((b) => `#${b.id}`).join(', ')})
                  </em>
                )}
              </li>
              <li className={ruleMaxOneSev4 ? 'rule-pass' : 'rule-fail'}>
                <span>{ruleMaxOneSev4 ? '✓' : '✕'}</span>
                Máximo 1 Bug Sev-4 crítico abierto{' '}
                {!ruleMaxOneSev4 && (
                  <em>
                    ({sev4Open.length} abiertos:{' '}
                    {sev4Open.map((b) => `#${b.id}`).join(', ')})
                  </em>
                )}
              </li>
              <li className={ruleHealthMin70 ? 'rule-pass' : 'rule-fail'}>
                <span>{ruleHealthMin70 ? '✓' : '✕'}</span>
                Índice QA Health mínimo del 70% ({qaHealth}%)
              </li>
            </ul>
          </div>
        </div>

        <div className="release-gate-footer">
          <button
            type="button"
            className="btn-primary"
            onClick={handleExportCsv}
          >
            Exportar Auditoría QA (.CSV)
          </button>
        </div>
      </section>

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
