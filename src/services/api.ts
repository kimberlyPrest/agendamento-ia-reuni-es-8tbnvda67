import pb from '@/lib/pocketbase/client'

export const getClientByEmail = async (email: string) => {
  try {
    return await pb.collection('clients').getFirstListItem(`email="${email}"`)
  } catch (e) {
    return null
  }
}

export const getClientDetails = async (clientId: string) => {
  return await pb.collection('clients').getOne(clientId, { expand: 'program_id,consultant_id' })
}

export const getUpcomingMeeting = async (clientId: string) => {
  try {
    return await pb
      .collection('meetings')
      .getFirstListItem(`client_id="${clientId}" && status="scheduled"`, { sort: 'start_time' })
  } catch (e) {
    return null
  }
}

export const getAvailableSlots = async (consultantId: string, date: string) => {
  return await pb.send(`/backend/v1/calendar/slots?consultantId=${consultantId}&date=${date}`, {
    method: 'GET',
  })
}

export const bookMeeting = async (clientId: string, date: string, time: string) => {
  return await pb.send(`/backend/v1/calendar/book`, {
    method: 'POST',
    body: JSON.stringify({ clientId, date, time }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const cancelMeeting = async (meetingId: string) => {
  return await pb.send(`/backend/v1/calendar/cancel`, {
    method: 'POST',
    body: JSON.stringify({ meetingId }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const getClients = () =>
  pb.collection('clients').getFullList({ expand: 'program_id,consultant_id' })
export const createClient = (data: any) => pb.collection('clients').create(data)

export const getPrograms = () => pb.collection('programs').getFullList()
export const createProgram = (data: any) => pb.collection('programs').create(data)

export const getConsultants = () => pb.collection('consultants').getFullList()
export const createConsultant = (data: any) => pb.collection('consultants').create(data)
