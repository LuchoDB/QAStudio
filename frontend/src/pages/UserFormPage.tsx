import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Country, UserDetail } from '../api/types'
import { createUser, getCountries, getUser, updateUser } from '../api/users'
import { ErrorMessage } from '../components/ErrorMessage'
import { useFetch } from '../hooks/useFetch'

const FALLBACK_COUNTRIES: Country[] = [
  { id: 1, name: 'Argentina' },
  { id: 2, name: 'Uruguay' },
  { id: 3, name: 'Brasil' },
]

// PATCH /user/{id} exige una contraseña de 4+ caracteres, pero la ignora.
const UNUSED_PASSWORD = 'sin-cambios'

// /users/new -> alta. /users/7/edit -> edición del usuario 7.
export function UserFormPage() {
  const { id } = useParams()
  if (!id) return <UserForm />
  return <EditUser id={Number(id)} />
}

// Para editar: primero se trae el usuario, después se muestra el formulario.
function EditUser({ id }: { id: number }) {
  const { data: user, error, loading } = useFetch(() => getUser(id), [id])

  if (loading) return <p className="status-text">Cargando…</p>
  if (error || !user) return <ErrorMessage message={error} />
  return <UserForm user={user} />
}

// Sin `user` da de alta; con `user` edita.
function UserForm({ user }: { user?: UserDetail }) {
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name ?? '')
  const [age, setAge] = useState(user ? String(user.age) : '')
  const [countryId, setCountryId] = useState(
    user?.country ? String(user.country.id) : '',
  )
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Catálogo dinámico de países desde GET /country
  const { data: fetchedCountries } = useFetch(getCountries, [])
  const countries =
    fetchedCountries && fetchedCountries.length > 0
      ? fetchedCountries
      : FALLBACK_COUNTRIES

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    setError(null)
    const payload = {
      name,
      age: Number(age),
      country_id: countryId ? Number(countryId) : null,
      email,
      password: user ? UNUSED_PASSWORD : password,
    }
    try {
      if (user) {
        await updateUser(user.id, payload)
        navigate(`/users/${user.id}`)
      } else {
        const created = await createUser(payload)
        navigate(`/users/${created.id}`)
      }
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="page-card">
      <h1>{user ? `Editar a ${user.name}` : 'Nuevo usuario'}</h1>
      <form onSubmit={handleSubmit} className="form-stack">
        <label>
          Nombre{' '}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Edad{' '}
          <input
            type="number"
            min="0"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
          />
        </label>
        <label>
          País{' '}
          <select
            value={countryId}
            onChange={(e) => setCountryId(e.target.value)}
          >
            <option value="">Sin país</option>
            {countries?.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Email{' '}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={Boolean(user)}
          />
        </label>
        {!user && (
          <label>
            Contraseña{' '}
            <input
              type="password"
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        )}
        <ErrorMessage message={error} />
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Guardar
          </button>
          <Link
            to={user ? `/users/${user.id}` : '/users'}
            className="btn-secondary"
          >
            Volver
          </Link>
        </div>
      </form>
    </div>
  )
}
