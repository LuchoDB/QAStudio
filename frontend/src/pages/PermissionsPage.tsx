import { useState } from 'react'
import type { SubmitEvent } from 'react'
import {
  createPermission,
  deletePermission,
  getPermission,
  getPermissions,
  updatePermission,
} from '../api/permissions'
import { ConfirmButton } from '../components/ConfirmButton'
import { ErrorMessage } from '../components/ErrorMessage'
import { useFetch } from '../hooks/useFetch'

export function PermissionsPage() {
  const { data: permissions, error, loading, reload } = useFetch(
    getPermissions,
    [],
  )
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  async function startEdit(id: number) {
    setActionError(null)
    try {
      // GET /permission/{id} trae también la descripción antes de editar
      const full = await getPermission(id)
      setEditingId(full.id)
      setName(full.name)
      setDescription(full.description ?? '')
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    setActionError(null)
    try {
      if (editingId !== null) {
        await updatePermission(editingId, {
          name: name.trim(),
          description: description || null,
        })
      } else {
        await createPermission({
          name: name.trim(),
          description: description || null,
        })
      }
      setEditingId(null)
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
      await deletePermission(id)
      reload()
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  return (
    <div className="page-card">
      <h1>Permisos</h1>

      <form onSubmit={handleSubmit} className="filter-bar">
        <input
          placeholder="Nombre del permiso (ej. export_bugs)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          placeholder="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" className="btn-primary">
          {editingId !== null ? 'Guardar cambios' : '+ Crear permiso'}
        </button>
        {editingId !== null && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setEditingId(null)
              setName('')
              setDescription('')
            }}
          >
            Cancelar
          </button>
        )}
      </form>

      <ErrorMessage message={error ?? actionError} />
      {loading && <p className="status-text">Cargando…</p>}

      {permissions && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Código de permiso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm) => (
              <tr key={perm.id}>
                <td>{perm.id}</td>
                <td>
                  <code>{perm.name}</code>
                </td>
                <td className="actions-cell">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => startEdit(perm.id)}
                  >
                    Editar
                  </button>
                  <ConfirmButton
                    label="Borrar"
                    onConfirm={() => handleDelete(perm.id)}
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
