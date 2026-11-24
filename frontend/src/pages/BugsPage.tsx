import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link } from 'react-router-dom'
import { deleteBug, getBugs, getCriticalBugs, searchBugs } from '../api/bugs'
import {
  addStoredProject,
  getStoredProjects,
  type BugSummary,
} from '../api/types'
import { ConfirmButton } from '../components/ConfirmButton'
import { ErrorMessage } from '../components/ErrorMessage'
import { useAuth } from '../context/useAuth'
import { useFetch } from '../hooks/useFetch'

const PAGE_SIZE = 5
const ALL_PROJECTS = 'ALL'

function getBugProject(bug: BugSummary): string {
  return bug.project && bug.project.trim() ? bug.project : 'E-Commerce Web'
}

export function BugsPage() {
  const { can } = useAuth()
  const [selectedProject, setSelectedProject] = useState<string>(ALL_PROJECTS)
  const [customProjects, setCustomProjects] = useState<string[]>(() =>
    getStoredProjects(),
  )
  const [addingProject, setAddingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const [offset, setOffset] = useState(0)
  const [searchText, setSearchText] = useState('') // lo que se escribe
  const [search, setSearch] = useState('') // lo que se busca
  const [onlyCritical, setOnlyCritical] = useState(false)
  const [sortAsc, setSortAsc] = useState<boolean | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Pedido según filtros de búsqueda o críticos
  const { data: bugs, error, loading, reload } = useFetch(() => {
    if (search) return searchBugs(search)
    if (onlyCritical) return getCriticalBugs()
    return getBugs(0, 100)
  }, [search, onlyCritical])

  // Todos los bugs del sistema para evaluar pestañas de proyectos y Release Gate
  const { data: allBugs, reload: reloadAllBugs } = useFetch(
    () => getBugs(0, 100),
    [],
  )

  function handleSearch(event: SubmitEvent) {
    event.preventDefault()
    setOffset(0)
    setSearch(searchText.trim())
  }

  function handleAddProject(event: SubmitEvent) {
    event.preventDefault()
    const trimmed = newProjectName.trim()
    if (!trimmed) return
    const updated = addStoredProject(trimmed)
    setCustomProjects(updated)
    setSelectedProject(trimmed)
    setOffset(0)
    setNewProjectName('')
    setAddingProject(false)
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

  // Lista dinámica de proyectos (los base + los guardados + cualquier proyecto presente en la BD)
  const bugProjectNames = (allBugs ?? []).map(getBugProject)
  const projectList = [...new Set([...customProjects, ...bugProjectNames])]

  // Filtrar los bugs de la tabla por el proyecto activo
  const projectFilteredBugs = bugs
    ? selectedProject === ALL_PROJECTS
      ? bugs
      : bugs.filter((b) => getBugProject(b) === selectedProject)
    : null

  // Ordenamiento local sobre una copia al renderizar
  const sortedBugs = projectFilteredBugs
    ? sortAsc === null
      ? projectFilteredBugs
      : [...projectFilteredBugs].sort((a, b) =>
          sortAsc
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title),
        )
    : null

  // Paginación local por proyecto
  const displayedBugs =
    sortedBugs && !search && !onlyCritical
      ? sortedBugs.slice(offset, offset + PAGE_SIZE)
      : sortedBugs

  // Bugs que audita el Release Readiness Gate (específicos del proyecto seleccionado o globales)
  const rawAuditList = allBugs ?? bugs ?? []
  const auditList =
    selectedProject === ALL_PROJECTS
      ? rawAuditList
      : rawAuditList.filter((b) => getBugProject(b) === selectedProject)

  const sev5Open = auditList.filter((b) => !b.is_resolved && b.severity === 5)
  const sev4Open = auditList.filter((b) => !b.is_resolved && b.severity === 4)
  const criticalBlockers = [...sev5Open, ...sev4Open]
  const openAll = auditList.filter((b) => !b.is_resolved)

  // Cálculo del QA Health Score (0 a 100%) ponderado por severidad de bugs abiertos en este proyecto
  const penalty = openAll.reduce(
    (acc, b) =>
      acc + (b.severity === 5 ? 18 : b.severity === 4 ? 10 : b.severity * 2),
    0,
  )
  const qaHealth =
    auditList.length === 0 ? 100 : Math.max(0, Math.min(100, 100 - penalty))

  const ruleNoSev5 = sev5Open.length === 0
  const ruleMaxOneSev4 = sev4Open.length <= 1
  const ruleHealthMin70 = qaHealth >= 70
  const isReleaseGo = ruleNoSev5 && ruleMaxOneSev4 && ruleHealthMin70

  // Evalúa si un proyecto puntual está en GO o NO-GO para mostrar el indicador en su pestaña
  function isProjectGo(projName: string): boolean {
    const pBugs = rawAuditList.filter((b) => getBugProject(b) === projName)
    const pSev5 = pBugs.filter((b) => !b.is_resolved && b.severity === 5)
    const pSev4 = pBugs.filter((b) => !b.is_resolved && b.severity === 4)
    const pOpen = pBugs.filter((b) => !b.is_resolved)
    const pPenalty = pOpen.reduce(
      (acc, b) =>
        acc + (b.severity === 5 ? 18 : b.severity === 4 ? 10 : b.severity * 2),
      0,
    )
    const pHealth =
      pBugs.length === 0 ? 100 : Math.max(0, Math.min(100, 100 - pPenalty))
    return pSev5.length === 0 && pSev4.length <= 1 && pHealth >= 70
  }

  function handleExportCsv() {
    const headers = [
      'ID',
      'Proyecto',
      'Titulo',
      'Modulo',
      'Severidad',
      'Estado',
      'Reporter_ID',
      'Impacto_Release',
    ]
    const rows = auditList.map((b) => [
      b.id,
      `"${getBugProject(b).replace(/"/g, '""')}"`,
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
    const slug =
      selectedProject === ALL_PROJECTS
        ? 'global'
        : selectedProject.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    link.download = `auditoria_qa_${slug}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const newBugUrl =
    selectedProject === ALL_PROJECTS
      ? '/bugs/new'
      : `/bugs/new?project=${encodeURIComponent(selectedProject)}`

  return (
    <div className="page-card">
      <div className="page-header">
        <div>
          <span className="section-eyebrow">
            MULTI-PROJECT ISSUE TRACKER · RELEASE GATE
          </span>
          <h1>Incidencias (Bugs)</h1>
        </div>
        {can('write_bugs') && (
          <Link to={newBugUrl} className="btn-primary">
            + Reportar nuevo bug
          </Link>
        )}
      </div>

      {/* Pestañas de Proyectos para auditorías específicas */}
      <div className="project-tabs-wrapper">
        <div className="project-tabs-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={selectedProject === ALL_PROJECTS}
            className={`project-tab ${
              selectedProject === ALL_PROJECTS ? 'project-tab-active' : ''
            }`}
            onClick={() => {
              setSelectedProject(ALL_PROJECTS)
              setOffset(0)
            }}
          >
            <span>Todos los proyectos</span>
            <span className="project-tab-count">{rawAuditList.length}</span>
          </button>

          {projectList.map((proj) => {
            const count = rawAuditList.filter(
              (b) => getBugProject(b) === proj,
            ).length
            const projGo = isProjectGo(proj)
            return (
              <button
                key={proj}
                type="button"
                role="tab"
                aria-selected={selectedProject === proj}
                className={`project-tab ${
                  selectedProject === proj ? 'project-tab-active' : ''
                }`}
                onClick={() => {
                  setSelectedProject(proj)
                  setOffset(0)
                }}
              >
                <span
                  className={`project-status-dot ${
                    projGo ? 'dot-go' : 'dot-nogo'
                  }`}
                  title={projGo ? 'Release GO' : 'Release NO-GO'}
                />
                <span>{proj}</span>
                <span className="project-tab-count">{count}</span>
              </button>
            )
          })}

          {!addingProject ? (
            <button
              type="button"
              className="project-tab-add"
              onClick={() => setAddingProject(true)}
            >
              + Nuevo proyecto
            </button>
          ) : (
            <form onSubmit={handleAddProject} className="project-add-inline">
              <input
                placeholder="Nombre del proyecto…"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn-primary">
                Crear
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setAddingProject(false)
                  setNewProjectName('')
                }}
              >
                ✕
              </button>
            </form>
          )}
        </div>
      </div>

      {/* OPCIÓN 3: Release Readiness Gate (Go / No-Go) por Proyecto */}
      <section className="release-gate-card">
        <div className="release-gate-top">
          <h2>
            Release Readiness Gate —{' '}
            {selectedProject === ALL_PROJECTS
              ? 'Global (Todos los proyectos)'
              : selectedProject}
          </h2>
          <span className="tag-badge">
            {auditList.length} incidencias en auditoría
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
                <strong>LISTO PARA PRODUCCIÓN (GO)</strong> ·{' '}
                {selectedProject === ALL_PROJECTS
                  ? 'Todos los proyectos superaron'
                  : `El proyecto "${selectedProject}" superó`}{' '}
                los controles de calidad para despliegue
              </>
            ) : (
              <>
                <strong>RELEASE BLOQUEADO (NO-GO)</strong> ·{' '}
                {criticalBlockers.length}{' '}
                {criticalBlockers.length === 1
                  ? 'Bug Crítico Impide'
                  : 'Bugs Críticos Impiden'}{' '}
                el Despliegue de{' '}
                {selectedProject === ALL_PROJECTS
                  ? 'la Plataforma'
                  : `"${selectedProject}"`}
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
              Automated release gate rules (
              {selectedProject === ALL_PROJECTS ? 'Global' : selectedProject}):
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
            Exportar Auditoría{' '}
            {selectedProject === ALL_PROJECTS
              ? 'Global'
              : `de ${selectedProject}`}{' '}
            (.CSV)
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
              <th>Proyecto</th>
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
                  <span className="project-pill">{getBugProject(bug)}</span>
                </td>
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
                <td colSpan={7}>
                  No se encontraron reportes de bugs en{' '}
                  {selectedProject === ALL_PROJECTS
                    ? 'el sistema'
                    : `el proyecto "${selectedProject}"`}
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {!search && !onlyCritical && sortedBugs && (
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
            disabled={offset + PAGE_SIZE >= sortedBugs.length}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
