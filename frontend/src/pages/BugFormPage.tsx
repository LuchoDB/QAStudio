import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createBug, getBug, updateBug } from '../api/bugs'
import type { BugDetail } from '../api/types'
import { ErrorMessage } from '../components/ErrorMessage'
import { useFetch } from '../hooks/useFetch'

export function BugFormPage() {
  const { id } = useParams()
  if (!id) return <BugForm />
  return <EditBug id={Number(id)} />
}

function EditBug({ id }: { id: number }) {
  const { data: bug, error, loading } = useFetch(() => getBug(id), [id])

  if (loading) return <p className="status-text">Cargando…</p>
  if (error || !bug) return <ErrorMessage message={error} />
  return <BugForm bug={bug} />
}

function BugForm({ bug }: { bug?: BugDetail }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(bug?.title ?? '')
  const [module, setModule] = useState(bug?.module ?? '')
  const [severity, setSeverity] = useState(bug ? String(bug.severity) : '3')
  const [description, setDescription] = useState(bug?.description ?? '')
  const [isResolved, setIsResolved] = useState(bug?.is_resolved ?? false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    setError(null)
    const payload = {
      title,
      module,
      severity: Number(severity),
      description,
      is_resolved: isResolved,
    }
    try {
      if (bug) {
        await updateBug(bug.id, payload)
        navigate(`/bugs/${bug.id}`)
      } else {
        const created = await createBug(payload)
        navigate(`/bugs/${created.id}`)
      }
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="page-card">
      <h1>{bug ? `Editar Bug #${bug.id}` : 'Reportar nuevo bug'}</h1>
      <form onSubmit={handleSubmit} className="form-stack">
        <label>
          Título de la incidencia
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Error 500 al confirmar carrito"
            required
          />
        </label>
        <label>
          Módulo del sistema
          <input
            value={module}
            onChange={(e) => setModule(e.target.value)}
            placeholder="Ej. Pagos, Autenticación, UI, Reportes"
            required
          />
        </label>
        <label>
          Nivel de severidad (1 = Baja, 5 = Crítica/Bloqueante)
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option value="1">1 - Baja (Cosmético)</option>
            <option value="2">2 - Menor</option>
            <option value="3">3 - Media</option>
            <option value="4">4 - Alta</option>
            <option value="5">5 - Crítica / Bloqueante</option>
          </select>
        </label>
        <label>
          Descripción y pasos para reproducir
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describí qué ocurrió y cómo reproducir el fallo…"
            required
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isResolved}
            onChange={(e) => setIsResolved(e.target.checked)}
          />
          Marcar incidencia como resuelta
        </label>

        <ErrorMessage message={error} />
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Guardar
          </button>
          <Link
            to={bug ? `/bugs/${bug.id}` : '/bugs'}
            className="btn-secondary"
          >
            Volver
          </Link>
        </div>
      </form>
    </div>
  )
}
