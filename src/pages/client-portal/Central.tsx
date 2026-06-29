import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getClientPortal } from '@/services/hub'
import { useClientStore } from '@/stores/use-client-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, CheckCircle2, Mail, MessageCircle, UserRound, Video } from 'lucide-react'

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function waLink(number?: string, text?: string) {
  const normalized = String(number || '').replace(/\D/g, '')
  if (!normalized) return ''
  return `https://wa.me/${normalized}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export default function ClientCentral() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { setClientData } = useClientStore()
  const navigate = useNavigate()

  useEffect(() => {
    getClientPortal()
      .then((next) => {
        setData(next)
        setClientData(next.client, next.upcoming, next.stats, next.lastMeeting)
      })
      .catch((err) => setError(err.message || 'Erro ao carregar central.'))
      .finally(() => setLoading(false))
  }, [setClientData])

  if (loading) return <div className="text-muted-foreground">Carregando sua central...</div>
  if (error) return <div className="text-destructive">{error}</div>

  const client = data?.client || {}
  const stats = data?.stats || {}
  const consultant = client.expand?.consultant_id || {}
  const program = client.expand?.program_id || {}
  const upcoming = data?.upcoming
  const finished = stats.finalised
  const notStarted = (stats.completed_meetings || 0) === 0 && !upcoming
  const whatsapp = waLink(
    consultant.whatsapp_number,
    `Olá, ${consultant.name || 'consultor(a)'}! Sou ${client.name} e estou falando sobre minha consultoria Elite.`,
  )

  const goSchedule = () => {
    setClientData(client, upcoming, stats, data?.lastMeeting)
    navigate('/schedule')
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="rounded-xl border border-border bg-card p-6 shadow-none">
        <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
          {program.name || 'Programa Elite'}
        </Badge>
        <h1 className="font-display mt-4 text-3xl font-bold">Olá, {client.name}.</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Esta é sua central da consultoria: próximos passos, contato do especialista e histórico
          das reuniões.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border rounded-xl shadow-none">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-bold">
              {stats.completed_meetings || 0}/{stats.max_meetings || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">reuniões realizadas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-xl shadow-none md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Seu consultor</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
                {consultant.photo_url ? (
                  <img src={consultant.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium">{consultant.name || 'Consultor(a)'}</p>
                <p className="text-sm text-muted-foreground">{consultant.email || '-'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {consultant.email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${consultant.email}`}>
                    <Mail className="w-4 h-4 mr-2" /> Email
                  </a>
                </Button>
              )}
              {whatsapp && (
                <Button size="sm" asChild>
                  <a href={whatsapp} target="_blank" rel="noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Próxima reunião
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.booking_blocked ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-destructive">Agendamento indisponível</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.block_reason || 'O status atual não permite novas reuniões.'}
                </p>
              </div>
              {whatsapp && (
                <Button asChild>
                  <a href={whatsapp} target="_blank" rel="noreferrer">
                    Falar com consultor
                  </a>
                </Button>
              )}
            </div>
          ) : stats.requires_tally ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Formulário pendente</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Antes de agendar, responda o formulário preparatório pelo fluxo de agendamento.
                </p>
              </div>
              <Button onClick={() => navigate('/status')}>Responder formulário</Button>
            </div>
          ) : finished ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" /> Consultoria finalizada
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Parabéns pela jornada. Suas reuniões ficam disponíveis no histórico.
                </p>
              </div>
              <Button asChild>
                <Link to="/cliente/reunioes">Ver reuniões</Link>
              </Button>
            </div>
          ) : upcoming ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{upcoming.title || 'Consultoria Elite'}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDateTime(upcoming.start_time)}
                </p>
              </div>
              <Button asChild>
                <Link to="/cliente/reunioes">
                  <Video className="w-4 h-4 mr-2" /> Ver detalhes
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {notStarted
                    ? 'Sua consultoria ainda não começou.'
                    : 'Você ainda não tem uma próxima reunião.'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha um horário tranquilo na agenda do seu consultor.
                </p>
              </div>
              <Button onClick={goSchedule}>
                {notStarted ? 'Iniciar consultoria agora' : 'Agendar reunião'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
