import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClientMeetings, getClientPortal } from '@/services/hub'
import { useClientStore } from '@/stores/use-client-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Download, ExternalLink, FileText, PlayCircle } from 'lucide-react'

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function downloadDoc(meeting: any) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${meeting.title || 'Reunião Elite'}</title></head><body><h1>${meeting.title || 'Reunião Elite'}</h1><p><strong>Data:</strong> ${formatDate(meeting.start_time)}</p><h2>Notas</h2><pre>${meeting.tldv_notes_markdown || ''}</pre><h2>Transcrição</h2><pre>${meeting.tldv_transcript_text || 'Transcrição ainda não disponível.'}</pre></body></html>`
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${meeting.title || 'reuniao-elite'}.doc`
  link.click()
  URL.revokeObjectURL(url)
}

export default function ClientMeetings() {
  const [meetings, setMeetings] = useState<any[]>([])
  const [portal, setPortal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { setClientData } = useClientStore()
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getClientMeetings(), getClientPortal()])
      .then(([meetingData, portalData]) => {
        setMeetings(meetingData.meetings || [])
        setPortal(portalData)
        setClientData(
          portalData.client,
          portalData.upcoming,
          portalData.stats,
          portalData.lastMeeting,
        )
      })
      .finally(() => setLoading(false))
  }, [])

  const canSchedule = portal && !portal.stats?.finalised && !portal.upcoming

  if (loading) return <div className="text-muted-foreground">Carregando reuniões...</div>

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Suas reuniões</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gravações, transcrições e materiais ficam reunidos aqui.
          </p>
        </div>
        {canSchedule && <Button onClick={() => navigate('/schedule')}>Agendar reunião</Button>}
      </div>

      {meetings.length === 0 ? (
        <Card className="bg-card border-border rounded-xl shadow-none">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma reunião registrada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {meetings.map((meeting) => {
            const recording = meeting.recording_url || meeting.tldv_url
            return (
              <Card
                key={meeting.id}
                className="bg-card border-border rounded-xl shadow-none overflow-hidden"
              >
                <div className="aspect-video bg-secondary flex items-center justify-center">
                  {recording ? (
                    <iframe
                      src={recording}
                      className="h-full w-full"
                      title={meeting.title || 'Gravação'}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <PlayCircle className="mx-auto mb-2 h-10 w-10" />
                      Gravação em processamento
                    </div>
                  )}
                </div>
                <CardContent className="space-y-4 p-4">
                  <div>
                    <Badge variant={meeting.status === 'completed' ? 'default' : 'outline'}>
                      {meeting.status || 'scheduled'}
                    </Badge>
                    <h3 className="font-display mt-3 text-lg font-semibold">
                      {meeting.title || 'Consultoria Elite'}
                    </h3>
                    <p className="mt-1 flex items-center text-sm text-muted-foreground">
                      <CalendarDays className="mr-2 h-4 w-4" /> {formatDate(meeting.start_time)}
                    </p>
                  </div>
                  {(meeting.tldv_notes_markdown || meeting.tldv_transcript_text) && (
                    <div className="max-h-28 overflow-hidden rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
                      {meeting.tldv_notes_markdown || meeting.tldv_transcript_text}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {recording && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={recording} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" /> Abrir
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => downloadDoc(meeting)}>
                      <Download className="w-4 h-4 mr-2" /> Word
                    </Button>
                    {meeting.tldv_transcript_text && (
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
      )}
    </div>
  )
}
