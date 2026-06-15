import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/use-client-store'
import { cancelMeeting } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Calendar,
  Clock,
  Video,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { format, differenceInHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ClientStatus() {
  const { client, upcomingMeeting, stats, refreshClient } = useClientStore()
  const navigate = useNavigate()
  const [cancelling, setCancelling] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!client) navigate('/')
  }, [client, navigate])

  if (!client) return null

  const program = client.expand?.program_id || upcomingMeeting?.expand?.program_id
  const consultant = client.expand?.consultant_id || upcomingMeeting?.expand?.consultant_id
  const firstName = client.name?.split(' ')[0] || client.name
  const minRescheduleHours = Number(program?.min_reschedule_hours ?? 24)
  const lateRescheduleDelayDays = Number(program?.late_reschedule_delay_days ?? 7)
  const lateRescheduleUnit = lateRescheduleDelayDays === 1 ? 'dia' : 'dias'
  const lateRescheduleText =
    lateRescheduleDelayDays > 0
      ? `a partir de ${lateRescheduleDelayDays} ${lateRescheduleUnit}`
      : 'imediatamente'
  const tallyTemplate = program?.tally_form_template || program?.tally_form_url || ''
  const replaceToken = (value: string, token: string, replacement: string) =>
    value.split(token).join(replacement)
  let tallyUrl = tallyTemplate
  const encodedEmail = encodeURIComponent(client.email || '')
  const encodedName = encodeURIComponent(client.name || '')
  const encodedFirstName = encodeURIComponent(firstName || '')
  ;['{clients_email}', '{client_email}', '{email}'].forEach((token) => {
    tallyUrl = replaceToken(tallyUrl, token, encodedEmail)
  })
  ;['{clients_name}', '{client_name}'].forEach((token) => {
    tallyUrl = replaceToken(tallyUrl, token, encodedName)
  })
  ;['{firstname}', '{first_name}'].forEach((token) => {
    tallyUrl = replaceToken(tallyUrl, token, encodedFirstName)
  })

  const handleRefresh = async () => {
    setFeedback('')
    try {
      await refreshClient()
      setFeedback('Status atualizado.')
    } catch (_) {
      setFeedback('Ainda não encontramos sua resposta. Aguarde alguns segundos e tente de novo.')
    }
  }

  const handleCancel = async () => {
    if (!upcomingMeeting) return
    const confirmed = window.confirm(
      'Deseja cancelar este agendamento? O evento será removido do Google Calendar.',
    )
    if (!confirmed) return
    setCancelling(true)
    setFeedback('')
    try {
      await cancelMeeting(upcomingMeeting.id, client.id)
      await refreshClient()
      setFeedback('Agendamento cancelado com sucesso.')
    } catch (err: any) {
      setFeedback(err.message || 'Não foi possível cancelar este agendamento.')
    } finally {
      setCancelling(false)
    }
  }

  if (!client.form_answered && program?.require_tally !== false) {
    return (
      <section className="animate-fade-in-up space-y-6">
        <div className="text-center space-y-2">
          <p className="text-primary font-medium">{program?.name}</p>
          <h2 className="font-display font-bold text-2xl">Antes de agendar</h2>
        </div>
        <Card className="bg-card border-primary/30 shadow-none">
          <CardContent className="p-6 space-y-6 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-primary" />
            </div>
            <p className="text-lg leading-relaxed">
              Responda o formulário para que o(a) consultor(a){' '}
              <strong className="text-primary">{consultant?.name}</strong> possa se preparar para te
              atender com contexto.
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <Button asChild size="lg" className="w-full text-base" disabled={!tallyUrl}>
                <a href={tallyUrl || '#'} target="_blank" rel="noreferrer">
                  Responder formulário <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
              <Button variant="outline" onClick={handleRefresh} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" /> Já respondi, atualizar status
              </Button>
              {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
            </div>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (stats?.finalised) {
    return (
      <section className="animate-fade-in-up space-y-6 text-center">
        <p className="text-primary font-medium">{program?.name}</p>
        <h2 className="font-display font-bold text-2xl">Consultoria finalizada</h2>
        <Card className="bg-card border-border shadow-none">
          <CardContent className="p-6 space-y-5">
            <p className="text-muted-foreground leading-relaxed">
              Você já realizou todas as consultorias previstas para este programa.
            </p>
            <Button asChild size="lg" className="w-full">
              <a
                href={`https://wa.me/${consultant?.whatsapp_number}`}
                target="_blank"
                rel="noreferrer"
              >
                Falar sobre upgrade <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (upcomingMeeting) {
    const meetDate = new Date(upcomingMeeting.start_time)
    const canChange = differenceInHours(meetDate, new Date()) >= minRescheduleHours

    return (
      <section className="animate-fade-in-up space-y-6">
        <div className="text-center space-y-2">
          <p className="text-primary font-medium">{program?.name}</p>
          <h2 className="font-display font-bold text-2xl">Olá, {firstName}, como vai?</h2>
          <p className="text-muted-foreground">
            Seu agendamento já foi realizado com o(a) {consultant?.name}.
          </p>
        </div>

        <Card className="bg-secondary border-border overflow-hidden shadow-none">
          <div className="bg-primary/10 px-6 py-4 border-b border-border/50">
            <h3 className="font-display font-semibold text-lg flex items-center">
              <Video className="w-5 h-5 mr-2 text-primary" />
              {upcomingMeeting.title || 'Reunião agendada'}
            </h3>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center text-muted-foreground text-sm">
                  <Calendar className="w-4 h-4 mr-2" /> Data
                </div>
                <p className="font-medium">{format(meetDate, "dd 'de' MMMM", { locale: ptBR })}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {format(meetDate, 'EEEE', { locale: ptBR })}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-muted-foreground text-sm">
                  <Clock className="w-4 h-4 mr-2" /> Horário
                </div>
                <p className="font-medium">
                  {format(meetDate, 'HH:mm')} -{' '}
                  {format(new Date(upcomingMeeting.end_time), 'HH:mm')}
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {upcomingMeeting.meet_link && (
                <Button asChild className="w-full" variant="secondary">
                  <a href={upcomingMeeting.meet_link} target="_blank" rel="noreferrer">
                    Acessar Google Meet
                  </a>
                </Button>
              )}
              {upcomingMeeting.google_html_link && (
                <Button asChild className="w-full" variant="outline">
                  <a href={upcomingMeeting.google_html_link} target="_blank" rel="noreferrer">
                    Ver evento no Google Calendar
                  </a>
                </Button>
              )}
            </div>

            {!canChange && (
              <p className="text-sm text-[#FFB800] bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-md p-3 text-center">
                Cancelamentos exigem no mínimo {minRescheduleHours}h de antecedência. Você ainda
                pode remarcar, mas o novo horário precisa ser {lateRescheduleText}. Fale diretamente
                com seu consultor se for urgente.
              </p>
            )}
            {feedback && <p className="text-sm text-muted-foreground text-center">{feedback}</p>}

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/schedule?reschedule=${upcomingMeeting.id}`)}
                disabled={cancelling}
              >
                Remarcar
              </Button>
              <Button
                variant="destructive"
                className="w-full bg-destructive/10 text-destructive hover:bg-destructive/20"
                onClick={handleCancel}
                disabled={!canChange || cancelling}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="animate-fade-in-up space-y-8">
      <div className="text-center space-y-2">
        <p className="text-primary font-medium tracking-wide">{program?.name}</p>
        <h2 className="font-display font-bold text-3xl">Bem-vindo, {firstName}!</h2>
        <p className="text-muted-foreground text-lg">
          Vamos agendar a sua {stats?.next_meeting_number || client.current_meeting_number || 1}ª
          reunião?
        </p>
        <p className="text-sm text-muted-foreground">
          Agenda do(a) consultor(a) {consultant?.name}
        </p>
      </div>

      <Card className="bg-[#FF6B0015] border-primary shadow-none">
        <CardContent className="p-5 text-sm leading-relaxed text-foreground/90">
          <strong className="block mb-2 text-primary">Importante:</strong>
          Escolha um dia e horário tranquilos, em que consiga se dedicar por inteiro, sem reuniões
          coladas, sem correria.
          <br />
          <br />
          Se precisar remarcar, faça isso com no mínimo {minRescheduleHours}h de antecedência. O
          novo horário depende da agenda do consultor e pode entrar no fim da fila.
        </CardContent>
      </Card>

      <Button size="lg" className="w-full text-lg h-14" onClick={() => navigate('/schedule')}>
        Agendar agora <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </section>
  )
}
