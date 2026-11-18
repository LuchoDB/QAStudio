import { apiFetch } from './client'
import type {
  CreatedResponse,
  LoginResponse,
  SetupStatusResponse,
  UserPayload,
} from './types'

export const getSetupStatus = () =>
  apiFetch<SetupStatusResponse>('/auth/setup-status')

export const login = (email: string, password: string) =>
  apiFetch<LoginResponse>('/login', {
    method: 'POST',
    body: { email, password },
  })

export const register = (user: UserPayload) =>
  apiFetch<CreatedResponse>('/register', {
    method: 'POST',
    body: user,
  })
