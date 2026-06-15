import pb from '@/lib/pocketbase/client'

export const getPrograms = () => pb.collection('programs').getFullList({ sort: '-created' })

export const createProgram = (
  data: Partial<{
    name: string
    total_meetings: number
    meeting_duration: number
    title_template: string
    tally_form_url: string
    allow_concurrent: boolean
    min_interval_days: number
  }>,
) => pb.collection('programs').create(data)

export const updateProgram = (id: string, data: Partial<any>) =>
  pb.collection('programs').update(id, data)

export const deleteProgram = (id: string) => pb.collection('programs').delete(id)
