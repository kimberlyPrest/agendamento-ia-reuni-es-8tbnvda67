import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  LogIn,
  RefreshCw,
  Video,
} from 'lucide-react'
import { differenceInHours, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import {
  EliteBrand,
  EliteGuidelines,
  EliteHeaderAction,
  EliteKicker,
  ElitePanel,
} from '@/components/elite/ElitePrimitives'
import { Button } from '@/components/ui/button'
import { cancelMeeting } from '@/services/api'
import { useClientStore } from '@/stores/use-client-store'

function ClientFlowHeader() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
      <EliteBrand />
      <EliteHeaderAction>
        <LogIn className="h-6 w-6" />
      </EliteHeaderAction>
    </header>
  )
}

function replaceToken(value: string, token: string, replacement: string) {
  return value.split(token).join(replacement)
}

function buildTallyUrl(client: any, program: any, firstName: string) {
  const tallyTemplate =
    program?.tally_form_template ||
    program?.tally_form_url ||
    'https://tally.so/r/wdRX0N?e-mail={clients_email}&firstname={firstname}'
  let tallyUrl = tallyTemplate
    .replace(/([?&])email=/gi, '$1e-mail=')
    .split('firstname={clients_name}')
    .join('firstname={firstname}')
  const rawEmail = String(client.email || '').trim()
  const rawName = String(client.name || '').trim()
  const rawFirstName = String(firstName || '').trim()

  ;['{clients_email}', '{client_email}', '{email}'].forEach((token) => {
    tallyUrl = replaceToken(tallyUrl, token, rawEmail)
  })
  ;['{clients_name}', '{client_name}'].forEach((token) => {
    tallyUrl = replaceToken(tallyUrl, token, rawName)
  })
  ;['{firstname}', '{first_name}'].forEach((token) => {
    tallyUrl = replaceToken(tallyUrl, token, rawFirstName)
  })

  return tallyUrl.replace(/%40/gi, '@')
}

export default function ClientStatus() {
  const { client, upcomingMeeting, stats, refreshClient } = useClientStore()
  const navigate = useNavigate()
  const [cancelling, setCancelling] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!client) navigate('/')
  }, [client, navigate])

  useEffect(() => {
    if (!client || client.form_answered || !stats?.requires_tally) return
    const interval = window.setInterval(() => {
      refreshClient().catch(() => undefined)
    }, 5000)
    return () => window.clearInterval(interval)
  }, [client, stats?.requires_tally, refreshClient])

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
  const noShowEarliestDate = stats?.no_show_earliest_start
    ? new Date(stats.no_show_earliest_start)
    : null
  const tallyUrl = buildTallyUrl(client, program, firstName)

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

  if (stats?.booking_blocked) {
    return (
      <section className="animate-fade-in-up min-h-screen">
        <ClientFlowHeader />
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
          <EliteKicker>{program?.name || 'Consultoria Elite'}</EliteKicker>
          <h1 className="mt-8 font-display text-5xl font-extrabold">Agendamento indisponível</h1>
          <ElitePanel className="mt-10 p-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              {stats.block_reason ||
                'O status atual da consultoria não permite novos agendamentos.'}
            </p>
            {consultant?.whatsapp_number && (
              <Button asChild size="lg" className="mt-8 w-full">
                <a
                  href={`https://wa.me/${consultant.whatsapp_number}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Falar com o consultor <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
            )}
          </ElitePanel>
        </div>
      </section>
    )
  }

  if (stats?.requires_tally) {
    return (
      <section className="animate-fade-in-up min-h-screen">
        <ClientFlowHeader />
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
          <EliteKicker>{program?.name || 'Consultoria Elite'}</EliteKicker>
          <h1 className="mt-8 font-display text-5xl font-extrabold">Antes de agendar</h1>
          <ElitePanel className="mt-10 p-8">
            <p className="text-xl leading-9">
              Responda o formulário para que o(a) consultor(a){' '}
              <strong className="text-primary">{consultant?.name}</strong> possa se preparar para te
              atender com contexto.
            </p>
            <div className="mt-8 grid gap-3">
              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={!tallyUrl}
                onClick={() => window.open(tallyUrl, '_blank', 'noopener,noreferrer')}
              >
                Responder formulário <ExternalLink className="h-5 w-5" />
              </Button>
              <Button variant="outline" onClick={handleRefresh} className="w-full">
                <RefreshCw className="h-4 w-4" /> Já respondi, verificar agora
              </Button>
              {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
            </div>
          </ElitePanel>
        </div>
      </section>
    )
  }

  if (stats?.finalised) {
    return (
      <section className="animate-fade-in-up min-h-screen">
        <ClientFlowHeader />
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
          <EliteKicker>{program?.name || 'Consultoria Elite'}</EliteKicker>
          <h1 className="mt-8 font-display text-5xl font-extrabold">Consultoria finalizada</h1>
          <ElitePanel className="mt-10 p-8">
            <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Você já realizou todas as consultorias previstas para este programa.
            </p>
            {consultant?.whatsapp_number && (
              <Button asChild size="lg" className="mt-8 w-full">
                <a
                  href={`https://wa.me/${consultant.whatsapp_number}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Falar sobre upgrade <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
            )}
          </ElitePanel>
        </div>
      </section>
    )
  }

  if (upcomingMeeting) {
    const meetDate = new Date(upcomingMeeting.start_time)
    const canChange = differenceInHours(meetDate, new Date()) >= minRescheduleHours

    return (
      <section className="animate-fade-in-up min-h-screen">
        <ClientFlowHeader />
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="text-center">
            <EliteKicker>{program?.name || 'Consultoria Elite'}</EliteKicker>
            <h1 className="mt-8 font-display text-5xl font-extrabold">
              Olá, <span className="text-primary">{firstName}</span>
            </h1>
            <p className="mt-4 text-xl text-muted-foreground">
              Seu agendamento já foi realizado com o(a) {consultant?.name}.
            </p>
          </div>

          <ElitePanel className="mt-10 overflow-hidden">
            <div className="border-b border-border bg-primary/10 px-6 py-5">
              <h2 className="flex items-center gap-3 font-display text-2xl font-bold">
                <Video className="h-6 w-6 text-primary" />
                {upcomingMeeting.title || 'Reunião agendada'}
              </h2>
            </div>
            <div className="space-y-8 p-6 md:p-8">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-md border border-border bg-secondary p-5">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" /> Data
                  </div>
                  <p className="mt-3 font-display text-xl font-bold">
                    {format(meetDate, "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="mt-1 text-sm capitalize text-muted-foreground">
                    {format(meetDate, 'EEEE', { locale: ptBR })}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-secondary p-5">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4" /> Horário
                  </div>
                  <p className="mt-3 font-display text-xl font-bold">
                    {format(meetDate, 'HH:mm')} -{' '}
                    {format(new Date(upcomingMeeting.end_time), 'HH:mm')}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {upcomingMeeting.meet_link && (
                  <Button asChild variant="secondary" className="w-full">
                    <a href={upcomingMeeting.meet_link} target="_blank" rel="noreferrer">
                      Acessar Google Meet
                    </a>
                  </Button>
                )}
                {upcomingMeeting.google_html_link && (
                  <Button asChild variant="outline" className="w-full">
                    <a href={upcomingMeeting.google_html_link} target="_blank" rel="noreferrer">
                      Ver evento no Google Calendar
                    </a>
                  </Button>
                )}
              </div>

              {!canChange && (
                <p className="rounded-md border border-[#fbbf24]/30 bg-[#fbbf24]/10 p-4 text-center text-sm text-[#fbbf24]">
                  Cancelamentos exigem no mínimo {minRescheduleHours}h de antecedência. Você ainda
                  pode remarcar, mas o novo horário precisa ser {lateRescheduleText}.
                </p>
              )}
              {feedback && <p className="text-center text-sm text-muted-foreground">{feedback}</p>}

              <div className="grid gap-3 border-t border-border pt-6 md:grid-cols-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/schedule?reschedule=${upcomingMeeting.id}`)}
                  disabled={cancelling}
                >
                  Remarcar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={!canChange || cancelling}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </ElitePanel>
        </div>
      </section>
    )
  }

  return (
    <section className="animate-fade-in-up min-h-screen">
      <ClientFlowHeader />
      <div className="mx-auto max-w-7xl px-6 py-20">
        <EliteKicker>Sessão de consultoria</EliteKicker>
        <h1 className="mt-8 max-w-6xl font-display text-5xl font-extrabold leading-tight md:text-7xl">
          Bem-vindo, <span className="text-primary">{firstName}</span>!
        </h1>
        <p className="mt-8 max-w-5xl text-2xl font-semibold leading-10 text-muted-foreground">
          Vamos agendar a sua reunião? Escolha o melhor horário com o seu consultor{' '}
          <span className="text-primary">{consultant?.name}</span>.
        </p>

        {stats?.stage_rules?.has_no_show &&
          noShowEarliestDate &&
          !Number.isNaN(noShowEarliestDate.getTime()) && (
            <ElitePanel className="mt-10 max-w-4xl border-[#fbbf24]/30 p-5 text-[#fbbf24]">
              No-show registrado: essa reunião não consumiu saldo. Você pode reagendar a partir de{' '}
              {format(noShowEarliestDate, "dd 'de' MMMM", { locale: ptBR })}.
            </ElitePanel>
          )}

        <EliteGuidelines
          className="mx-auto mt-24 max-w-5xl"
          action={
            <Button
              size="lg"
              className="h-14 w-full font-mono"
              onClick={() => navigate('/schedule')}
            >
              Iniciar Agendamento <ArrowRight className="h-5 w-5" />
            </Button>
          }
        />
      </div>
    </section>
  )
}
