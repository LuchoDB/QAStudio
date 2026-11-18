import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteUser,
  getSeniorTesters,
  getUsers,
  searchUsers,
} from '../api/users'
import { ConfirmButton } from '../components/ConfirmButton'
import { ErrorMessage } from '../components/ErrorMessage'
import { useAuth } from '../context/useAuth'
import { useFetch } from '../hooks/useFetch'

const PAGE_SIZE = 5

export function UsersPage() {
  const { can } = useAuth()
  const [offset, setOffset] = useState(0)
  const [searchText, setSearchText] = useState('') // lo que se escribe
  const [search, setSearch] = useState('') // lo que se busca
  const [onlySeniors, setOnlySeniors] = useState(false)
  const [sortAsc, setSortAsc] = useState<boolean | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Un solo pedido que depende de los filtros: si cambia uno, se pide de nuevo.
  const { data: users, error, loading, reload } = useFetch(() => {
    if (search) return searchUsers(search)
    if (onlySeniors) return getSeniorTesters()
    return getUsers(offset, PAGE_SIZE)
  }, [search, onlySeniors, offset])

  function handleSearch(event: SubmitEvent) {
    event.preventDefault()
    setOffset(0)
    setSearch(searchText.trim())
  }

  async function handleDelete(id: number) {
    setActionError(null)
    try {
      await deleteUser(id)
      reload() // vuelve a pedir la lista, ya sin el usuario borrado
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  // Ordenar una copia al renderizar con localeCompare
  const displayedUsers = users
    ? sortAsc === null
      ? users
      : [...users].sort((a, b) =>
          sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
        )
    : null

  return (
    <div className="page-card">
      <div className="page-header">
        <h1>Equipo QA (Usuarios)</h1>
        {can('write_users') && (
          <Link to="/users/new" className="btn-primary">
            + Nuevo usuario
          </Link>
        )}
      </div>

      <form onSubmit={handleSearch} className="filter-bar">
        <input
          placeholder="Buscar miembro por nombre"
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
            checked={onlySeniors}
            onChange={(e) => {
              setOffset(0)
              setOnlySeniors(e.target.checked)
            }}
          />
          Solo perfil Senior (25+ años)
        </label>
      </form>

      <ErrorMessage message={error ?? actionError} />
      {loading && <p className="status-text">Cargando…</p>}

      {displayedUsers && !error && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>
                Nombre{' '}
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
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {displayedUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td className="actions-cell">
                  <Link to={`/users/${user.id}`}>Ver / Roles (Dar Admin)</Link>
                  {can('update_users') && (
                    <Link to={`/users/${user.id}/edit`}>Editar</Link>
                  )}
                  {can('delete_users') && (
                    <ConfirmButton
                      label="Borrar"
                      onConfirm={() => handleDelete(user.id)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Buscar y filtro traen todo junto: solo se pagina la lista general. */}
      {!search && !onlySeniors && users && (
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
            disabled={users.length < PAGE_SIZE}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
