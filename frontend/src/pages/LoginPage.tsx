import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { getSetupStatus, register } from '../api/auth'
import type { Country } from '../api/types'
import { getCountries } from '../api/users'
import { ErrorMessage } from '../components/ErrorMessage'
import { useAuth } from '../context/useAuth'
import { useFetch } from '../hooks/useFetch'

const FALLBACK_COUNTRIES: Country[] = [
  { id: 1, name: 'Argentina' },
  { id: 2, name: 'Uruguay' },
  { id: 3, name: 'Brasil' },
]

export function LoginPage() {
  const { isAuthenticated, login, sessionMessage } = useAuth()
  const [isRegisterMode, setIsRegisterMode] = useState(false)

  // Estados de login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Estados adicionales para registro de usuario
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [countryId, setCountryId] = useState('')

  const [error, setError] = useState<string | null>(null)

  // Catálogo de países y estado inicial de la base
  const { data: fetchedCountries } = useFetch(getCountries, [])
  const countries =
    fetchedCountries && fetchedCountries.length > 0
      ? fetchedCountries
      : FALLBACK_COUNTRIES
  const { data: setupStatus } = useFetch(getSetupStatus, [])

  const isFirstUser = setupStatus ? !setupStatus.has_users : false

  // Si la base de datos todavía no tiene usuarios, abrimos directamente el formulario para crear el primer usuario (ADMIN)
  useEffect(() => {
    if (setupStatus && !setupStatus.has_users) {
      setIsRegisterMode(true)
    }
  }, [setupStatus])

  if (isAuthenticated) return <Navigate to="/bugs" replace />

  async function handleLoginSubmit(event: SubmitEvent) {
    event.preventDefault()
    setError(null)
    try {
      await login(email, password)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleRegisterSubmit(event: SubmitEvent) {
    event.preventDefault()
    setError(null)
    try {
      await register({
        name,
        age: Number(age),
        country_id: countryId ? Number(countryId) : null,
        email,
        password,
      })
      // Después de registrar en UserDB y asignar su rol en UserRole (ADMIN si es el primero, TESTER los siguientes), inicia sesión automáticamente
      await login(email, password)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>QA Studio</h1>
        <p className="subtitle">
          Sistema de Gestión de Incidencias y Control de Calidad
        </p>

        {isFirstUser && (
          <div className="info-banner">
            <strong>Configuración inicial:</strong> Todavía no hay usuarios en la
            base de datos. Creá el primer usuario del sistema, que recibirá el rol{' '}
            <strong>ADMIN</strong> por defecto.
          </div>
        )}

        {!isRegisterMode ? (
          <form onSubmit={handleLoginSubmit} className="form-stack">
            <h2>Iniciar sesión</h2>
            <label>
              Email
              <input
                type="email"
                placeholder="tu-email@dominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <ErrorMessage message={error ?? sessionMessage} />

            <button type="submit" className="btn-primary">
              Ingresar
            </button>

            <div className="auth-switch">
              <span>¿No tenés cuenta?</span>
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setError(null)
                  setIsRegisterMode(true)
                }}
              >
                Crear usuario / Registrarse
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="form-stack">
            <h2>
              {isFirstUser
                ? 'Crear primer usuario (Administrador)'
                : 'Crear usuario nuevo'}
            </h2>
            <label>
              Nombre completo
              <input
                type="text"
                placeholder="Ingresá tu nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label>
              Edad
              <input
                type="number"
                min="1"
                placeholder="Edad"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
            </label>
            <label>
              País
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
              Email
              <input
                type="email"
                placeholder="correo@dominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Contraseña (mínimo 4 caracteres)
              <input
                type="password"
                minLength={4}
                placeholder="Elegí una contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <ErrorMessage message={error} />

            <button type="submit" className="btn-primary">
              {isFirstUser
                ? 'Crear Administrador e ingresar'
                : 'Registrarme e ingresar'}
            </button>

            {!isFirstUser && (
              <div className="auth-switch">
                <span>¿Ya tenés usuario?</span>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setError(null)
                    setIsRegisterMode(false)
                  }}
                >
                  Volver al login
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
