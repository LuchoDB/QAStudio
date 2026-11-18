import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link } from 'react-router-dom'
import { createRole, deleteRole, getRoles } from '../api/roles'
import { ConfirmButton } from '../components/ConfirmButton'
import { ErrorMessage } from '../components/ErrorMessage'
import { useFetch } from '../hooks/useFetch'

export function RolesPage() {
  const { data: roles, error, loading, reload } = useFetch(getRoles, [])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleCreate(event: SubmitEvent) {
    event.preventDefault()
    setActionError(null)
    try {
      await createRole({ name: name.trim(), description: description || null })
      setName('')
      setDescription('')
      reload()
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  async function handleDelete(id: number) {
    setActionError(null)
    try {
      await deleteRole(id)
      reload()
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  return (
    <div className="page-card">
      <h1>Roles</h1>

      <form onSubmit={handleCreate} className="filter-bar">
        <input
          placeholder="Nombre del nuevo rol (ej. QA_LEAD)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          placeholder="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" className="btn-primary">
          + Crear rol
        </button>
      </form>

      <ErrorMessage message={error ?? actionError} />
      {loading && <p className="status-text">Cargando…</p>}

      {roles && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>{role.id}</td>
                <td>
                  <Link to={`/roles/${role.id}`}>{role.name}</Link>
                </td>
                <td className="actions-cell">
                  <Link to={`/roles/${role.id}`}>Ver permisos y usuarios</Link>
                  <ConfirmButton
                    label="Borrar"
                    onConfirm={() => handleDelete(role.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
