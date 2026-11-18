import { apiFetch } from './client'
import type {
  BugDetail,
  BugPayload,
  BugSummary,
  CreatedResponse,
  MessageResponse,
} from './types'

export const getBugs = (offset: number, limit: number) =>
  apiFetch<BugSummary[]>(`/bug?offset=${offset}&limit=${limit}`)

export const getBug = (id: number) => apiFetch<BugDetail>(`/bug/${id}`)

export const searchBugs = (title: string) =>
  apiFetch<BugSummary[]>(`/bug/search/${encodeURIComponent(title)}`)

export const getCriticalBugs = () =>
  apiFetch<BugSummary[]>('/bug/filter/critical')

export const createBug = (bug: BugPayload) =>
  apiFetch<CreatedResponse>('/bug', { method: 'POST', body: bug })

export const updateBug = (id: number, bug: BugPayload) =>
  apiFetch<CreatedResponse>(`/bug/${id}`, { method: 'PATCH', body: bug })

export const deleteBug = (id: number) =>
  apiFetch<MessageResponse>(`/bug/${id}`, { method: 'DELETE' })
