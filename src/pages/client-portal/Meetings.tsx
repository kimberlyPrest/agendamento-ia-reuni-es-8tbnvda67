import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cancelMeeting } from '@/services/api'
import { getClientMeetings, getClientPortal } from '@/services/hub'
import { useClientStore } from '@/stores/use-client-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  PlayCircle,
  RotateCcw,
  Video,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

function parseDate(value?: string) {
  if (!value) return null
  const date = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateTime(value?: string) {
  const date = parseDate(value)
  if (!date) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function downloadDoc(meeting: any) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${meeting.title || 'Reunião Elite'}</title></head><body><h1>${meeting.title || 'Reunião Elite'}</h1><p><strong>Data:</strong> ${formatDateTime(meeting.start_time)}</p><h2>Notas</h2><pre>${meeting.tldv_notes_markdown || ''}</pre><h2>Transcrição</h2><pre>${meeting.tldv_transcript_text || 'Transcrição ainda não disponível.'}</pre></body></html>`
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${meeting.title || 'reuniao-elite'}.doc`
  link.click()
  URL.revokeObjectURL(url)
}

function isFutureMeeting(meeting: any) {
  const start = parseDate(meeting.start_time)
  return meeting.status === 'scheduled' && Boolean(start && start > new Date())
}

export default function ClientMeetings() {
  const [meetings, setMeetings] = useState<any[]>([])
  const [portal, setPortal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState('')
  const { setClientData } = useClientStore()
  const navigate = useNavigate()

  const load = async () => {
    const [meetingData, portalData] = await Promise.all([getClientMeetings(), getClientPortal()])
    setMeetings(meetingData.meetings || [])
    setPortal(portalData)
    setClientData(
      portalData.client,
      portalData.upcoming,
      portalData.stats,
      portalData.lastMeeting,
    )
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canSchedule =
    portal &&
    !portal.stats?.finalised &&
    !portal.stats?.booking_blocked &&
    !portal.stats?.requires_tally &&
    !portal.upcoming

  const cancelScheduledMeeting = async (meeting: any) => {
    if (!portal?.client?.id || !meeting?.id) return
    setCancellingId(meeting.id)
    try {
      await cancelMeeting(meeting.id, portal.client.id, 'Cancelado pelo cliente.')
      await load()
      toast.success('Agendamento cancelado.')
    } catch (_) {
      toast.error('Não foi possível cancelar este agendamento agora.')
    } finally {
      setCancellingId('')
    }
  }

  const rescheduleMeeting = (meeting: any) => {
    if (!portal?.client || !meeting?.id) return
    setClientData(portal.client, meeting, portal.stats, portal.lastMeeting)
    navigate(`/schedule?reschedule=${meeting.id}`)
  }

  if (loading) return <div className="text-muted-foreground">Carregando reuniões...</div>

  const futureMeetings = meetings.filter(isFutureMeeting)
  const historyMeetings = meetings.filter((meeting) => !isFutureMeeting(meeting))

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Suas reuniões</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Próximos encontros, links de acesso e materiais ficam reunidos aqui.
          </p>
        </div>
        {canSchedule && <Button onClick={() => navigate('/schedule')}>Agendar reunião</Button>}
      </div>

      {futureMeetings.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Agendadas</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {futureMeetings.map((meeting) => (
              <Card key={meeting.id} className="bg-card border-border rounded-xl shadow-none">
                <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <Badge variant="outline">Agendada</Badge>
                    <h3 className="mt-3 truncate font-display text-xl font-semibold">
                      {meeting.title || 'Consultoria Elite'}
                    </h3>
                    <p className="mt-2 flex items-center text-sm text-muted-foreground">
                      <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                      {formatDateTime(meeting.start_time)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {meeting.meet_link && (
                      <Button size="sm" asChild>
                        <a href={meeting.meet_link} target="_blank" rel="noreferrer">
                          <Video className="mr-2 h-4 w-4" /> Google Meet
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => rescheduleMeeting(meeting)}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Remarcar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={cancellingId === meeting.id}
                      onClick={() => cancelScheduledMeeting(meeting)}
                    >
                      {cancellingId === meeting.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {meetings.length === 0 ? (
        <Card className="bg-card border-border rounded-xl shadow-none">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma reunião registrada ainda.
          </CardContent>
        </Card>
      ) : historyMeetings.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Histórico e materiais</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {historyMeetings.map((meeting) => {
              const recording = meeting.recording_url || meeting.tldv_url
              const cancelled = meeting.status === 'cancelled'
              return (
                <Card
                  key={meeting.id}
                  className="bg-card border-border rounded-xl shadow-none overflow-hidden"
                >
                  <div className="aspect-video bg-secondary flex items-center justify-center">
                    {recording && !cancelled ? (
                      <iframe
                        src={recording}
                        className="h-full w-full"
                        title={meeting.title || 'Gravação'}
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <PlayCircle className="mx-auto mb-2 h-10 w-10" />
                        {cancelled ? 'Agendamento cancelado' : 'Gravação em processamento'}
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-4 p-4">
                    <div>
                      <Badge variant={meeting.status === 'completed' ? 'default' : 'outline'}>
                        {cancelled ? 'Cancelada' : meeting.status === 'completed' ? 'Realizada' : 'Registro'}
                      </Badge>
                      <h3 className="font-display mt-3 text-lg font-semibold">
                        {meeting.title || 'Consultoria Elite'}
                      </h3>
                      <p className="mt-1 flex items-center text-sm text-muted-foreground">
                        <CalendarDays className="mr-2 h-4 w-4" /> {formatDateTime(meeting.start_time)}
                      </p>
                    </div>
                    {(meeting.tldv_notes_markdown || meeting.tldv_transcript_text) && !cancelled && (
                      <div className="max-h-28 overflow-hidden rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
                        {meeting.tldv_notes_markdown || meeting.tldv_transcript_text}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {recording && !cancelled && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={recording} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" /> Abrir
                          </a>
                        </Button>
                      )}
                      {!cancelled && (
                        <Button variant="outline" size="sm" onClick={() => downloadDoc(meeting)}>
                          <Download className="w-4 h-4 mr-2" /> Word
                        </Button>
                      )}
                      {meeting.tldv_transcript_text && !cancelled && (
                        <Button variant="ghost" size="sm">
                          <FileText className="w-4 h-4 mr-2" /> Transcrição salva
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
