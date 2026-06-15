import pb from '@/lib/pocketbase/client'

const baseUrl = import.meta.env.VITE_POCKETBASE_URL

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json')

  const res = await fetch(`${baseUrl}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Erro na requisição')
  }
  if (data.error) throw new Error(data.message || data.error)
  return data
}

export const authClientByEmail = (email: string) =>
  apiRequest<any>('/backend/v1/client/auth', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })

export const getAvailableSlots = (
  consultantId: string,
  date: string,
  clientId?: string,
  ignoreMeetingId?: string,
) => {
  const params = new URLSearchParams({ consultant_id: consultantId, date })
  if (clientId) params.set('client_id', clientId)
  if (ignoreMeetingId) params.set('ignore_meeting_id', ignoreMeetingId)
  return apiRequest<any>(`/backend/v1/calendar/slots?${params.toString()}`)
}

export const bookMeeting = (clientId: string, startTime: string, endTime: string) =>
  apiRequest<any>('/backend/v1/calendar/book', {
    method: 'POST',
    body: JSON.stringify({ client_id: clientId, start_time: startTime, end_time: endTime }),
  })

export const cancelMeeting = (meetingId: string, clientId: string, reason?: string) =>
  apiRequest<any>('/backend/v1/calendar/cancel', {
    method: 'POST',
    body: JSON.stringify({ meeting_id: meetingId, client_id: clientId, reason }),
  })

export const rescheduleMeeting = (
  meetingId: string,
  clientId: string,
  startTime: string,
  endTime: string,
) =>
  apiRequest<any>('/backend/v1/calendar/reschedule', {
    method: 'POST',
    body: JSON.stringify({
      meeting_id: meetingId,
      client_id: clientId,
      start_time: startTime,
      end_time: endTime,
    }),
  })

export const startGoogleOAuth = async (consultantId: string) => {
  const params = new URLSearchParams({ consultant_id: consultantId })
  const res = await fetch(`${baseUrl}/backend/v1/google/oauth/start?${params.toString()}`, {
    headers: { Authorization: pb.authStore.token },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) throw new Error(data.message || data.error || 'Erro ao iniciar OAuth')
  return data as { url: string }
}

export const syncTallySubmissions = () =>
  apiRequest<{ enabled: boolean; checked: number; updated: number }>('/backend/v1/tally/sync', {
    method: 'POST',
    headers: { Authorization: pb.authStore.token },
  })

export const getClientByEmail = async (email: string) => {
  try {
    const data = await authClientByEmail(email)
    return data.client
  } catch (_) {
    return null
  }
}

export const getClientDetails = async (clientId: string) =>
  pb.collection('clients').getOne(clientId, { expand: 'program_id,consultant_id' })

export const getUpcomingMeeting = async (clientId: string) => {
  const data = await authClientByEmail((await getClientDetails(clientId)).email)
  return data.upcoming || null
}

export const getClients = () =>
  pb.collection('clients').getFullList({ expand: 'program_id,consultant_id', sort: 'name' })
export const createClient = (data: any) => pb.collection('clients').create(data)
export const updateClient = (id: string, data: any) => pb.collection('clients').update(id, data)
export const deleteClient = (id: string) => pb.collection('clients').delete(id)

export const getPrograms = () => pb.collection('programs').getFullList({ sort: 'name' })
export const createProgram = (data: any) => pb.collection('programs').create(data)
export const updateProgram = (id: string, data: any) => pb.collection('programs').update(id, data)
export const deleteProgram = (id: string) => pb.collection('programs').delete(id)

export const getConsultants = () => pb.collection('consultants').getFullList({ sort: 'name' })
export const createConsultant = (data: any) => pb.collection('consultants').create(data)
export const updateConsultant = (id: string, data: any) =>
  pb.collection('consultants').update(id, data)
export const deleteConsultant = (id: string) => pb.collection('consultants').delete(id)
