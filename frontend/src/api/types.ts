// Lo que viaja por HTTP. Copia de los modelos de api/model/*.py del backend.

export interface LoginResponse { // POST /login
  msg: string
  token: string
}

export interface SetupStatusResponse { // GET /auth/setup-status
  has_users: boolean
}

export interface UserSummary { // GET /user: id, nombre, edad y roles para tarjetas de impacto QA
  id: number
  name: string
  age?: number
  roles?: RoleSummary[]
}

export interface Country { // GET /country
  id: number
  name: string
}

export interface RoleSummary {
  id: number
  name: string
}

export interface UserDetail extends UserSummary { // GET /user/{id}
  age: number
  email: string
  country: Country | null
  roles: RoleSummary[]
}

export interface UserPayload { // body de POST /user, POST /register y PATCH /user/{id}
  name: string
  age: number
  country_id: number | null
  email: string
  password: string
}

export interface Permission {
  id: number
  name: string
  description?: string | null
}

export interface RoleDetail extends RoleSummary { // GET /role/{id}
  description: string | null
  permissions: Permission[]
}

export interface NamedPayload { // body de roles y de permisos
  name: string
  description: string | null
}

export const BASE_PROJECTS = ['E-Commerce Web', 'Mobile App', 'Core API']

export function getStoredProjects(): string[] {
  try {
    const raw = localStorage.getItem('qastudio_projects')
    const custom = raw ? (JSON.parse(raw) as string[]) : []
    return [...new Set([...BASE_PROJECTS, ...custom])]
  } catch {
    return BASE_PROJECTS
  }
}

export function addStoredProject(name: string): string[] {
  const current = getStoredProjects()
  const trimmed = name.trim()
  if (!trimmed || current.includes(trimmed)) return current
  const updated = [...current, trimmed]
  localStorage.setItem('qastudio_projects', JSON.stringify(updated))
  return updated
}

export interface BugSummary { // GET /bug: lista liviana con proyecto y reporter_id
  id: number
  title: string
  project?: string
  module: string
  severity: number
  is_resolved: boolean
  reporter_id?: number | null
}

export interface BugDetail extends BugSummary { // GET /bug/{id}: detalle con reporter
  description: string
  reporter_id: number | null
  reporter: UserSummary | null
}

export interface BugPayload { // body de POST /bug y PATCH /bug/{id}
  title: string
  description: string
  project: string
  module: string
  severity: number
  is_resolved: boolean
}

export interface CreatedResponse { // POST y PATCH: {"id": 7}
  id: number
}

export interface MessageResponse { // DELETE: {"msg": "..."}
  msg: string
}
