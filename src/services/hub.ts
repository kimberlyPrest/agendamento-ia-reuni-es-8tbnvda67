import pb from '@/lib/pocketbase/client'

const baseUrl = import.meta.env.VITE_POCKETBASE_URL

async function hubRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json')
  if (pb.authStore.token && !headers.has('Authorization'))
    headers.set('Authorization', pb.authStore.token)

  const res = await fetch(`${baseUrl}/backend/v1/hub${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) throw new Error(data.message || data.error || 'Erro na requisição')
  return data
}

export const getHubMe = () => hubRequest<any>('/me')
export const getClientPortal = () => hubRequest<any>('/client/me')
export const getClientMeetings = () => hubRequest<any>('/client/meetings')
export const getConsultantMe = (consultantId?: string) => {
  const params = new URLSearchParams()
  if (consultantId) params.set('consultant_id', consultantId)
  return hubRequest<any>(`/consultant/me${params.toString() ? `?${params.toString()}` : ''}`)
}
export const getConsultantDashboard = (consultantId?: string) => {
  const params = new URLSearchParams()
  if (consultantId) params.set('consultant_id', consultantId)
  return hubRequest<any>(`/consultant/dashboard${params.toString() ? `?${params.toString()}` : ''}`)
}
export const getConsultantClients = (consultantId?: string) => {
  const params = new URLSearchParams()
  if (consultantId) params.set('consultant_id', consultantId)
  return hubRequest<any>(`/consultant/clients${params.toString() ? `?${params.toString()}` : ''}`)
}
export const getAdminOverview = () => hubRequest<any>('/admin/overview')
export const syncSheetClients = () => hubRequest<any>('/sheets/sync', { method: 'POST' })
export const saveConsultantWithUser = (data: any) =>
  hubRequest<any>('/consultants/save', { method: 'POST', body: JSON.stringify(data) })
export const updateConsultantProfile = (data: any) =>
  hubRequest<any>('/consultant/profile', { method: 'POST', body: JSON.stringify(data) })
export const syncTldv = (consultantId?: string) =>
  hubRequest<any>('/consultant/tldv/sync', {
    method: 'POST',
    body: JSON.stringify(consultantId ? { consultant_id: consultantId } : {}),
  })
export const searchTldvMeetings = (query: string, consultantId?: string) =>
  hubRequest<any>('/consultant/tldv/search', {
    method: 'POST',
    body: JSON.stringify({ query, ...(consultantId ? { consultant_id: consultantId } : {}) }),
  })
export const linkTldvMeeting = (meetingId: string, tldvMeetingId: string) =>
  hubRequest<any>('/consultant/tldv/link', {
    method: 'POST',
    body: JSON.stringify({ meeting_id: meetingId, tldv_meeting_id: tldvMeetingId }),
  })
export const changePassword = (password: string, passwordConfirm: string) =>
  hubRequest<any>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ password, password_confirm: passwordConfirm }),
  })
export const skipPasswordChange = () =>
  hubRequest<any>('/auth/skip-password-change', { method: 'POST' })
