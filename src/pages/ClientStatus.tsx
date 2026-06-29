import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  LogIn,
  MessageCircle,
  RefreshCw,
  Video,
} from 'lucide-react'
import { differenceInHours, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import {
  EliteBrand,
  EliteHeaderAction,
  EliteKicker,
  ElitePanel,
} from '@/components/elite/ElitePrimitives'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { cancelMeeting } from '@/services/api'
import { useClientStore } from '@/stores/use-client-store'

function ClientFlowHeader() {
  return (
    <header className="mx-auto flex h-12 w-full max-w-[1080px] shrink-0 items-center justify-between px-4 sm:h-14 sm:px-6">
      <EliteBrand compact className="origin-left scale-75" />
      <EliteHeaderAction className="h-9 w-9">
        <LogIn className="h-4 w-4" />
      </EliteHeaderAction>
    </header>
  )
}

function StatusShell({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <section className="animate-fade-in-up flex h-dvh flex-col overflow-hidden">
      <ClientFlowHeader />
      <main
        className={cn(
          'mx-auto flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pb-3 pt-2 sm:px-6 sm:pb-5',
          narrow ? 'max-w-[720px] justify-center' : 'max-w-[1080px]',
        )}
      >
        {children}
      </main>
    </section>
  )
}

function CompactChecklist({ action }: { action: ReactNode }) {
  const items = [
    'Escolha um horário sem reuniões coladas.',
    'Remarcações precisam respeitar a antecedência mínima.',
    'O novo horário depende da agenda do consultor.',
  ]

  return (
    <ElitePanel className="mt-4 flex min-h-0 flex-col p-3 sm:p-4">
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item} className="grid grid-cols-[18px_1fr] gap-3">
            <div className="relative flex justify-center">
              {index < items.length - 1 && (
                <span className="absolute top-3 h-[calc(100%+.75rem)] w-px bg-primary/70" />
              )}
              <span className="relative mt-1 h-2.5 w-2.5 rounded-full border border-primary bg-background shadow-[0_0_12px_rgba(109,217,187,.75)]" />
            </div>
            <p className="text-xs font-semibold leading-5 text-foreground/80">{item}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-border pt-4">{action}</div>
    </ElitePanel>
  )
}

function SimpleState({
  icon,
  kicker,
  title,
  children,
}: {
  icon: ReactNode
  kicker: string
  title: string
  children: ReactNode
}) {
  return (
    <StatusShell narrow>
      <div className="text-center">
        <EliteKicker className="min-h-6 px-3 text-[0.62rem]">{kicker}</EliteKicker>
        <h1 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl md:text-4xl">
          {title}
        </h1>
      </div>
      <ElitePanel className="mt-4 p-4 text-center sm:p-5">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary">
          {icon}
        </div>
        <div className="mt-4 text-sm font-semibold leading-6 text-muted-foreground sm:text-base">
          {children}
        </div>
      </ElitePanel>
    </StatusShell>
  )
}

function replaceToken(value: string, token: string, replacement: string) {
  return value.split(token).join(replacement)
}

function whatsappHref(phone: string | undefined) {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : ''
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
  const consultantWhatsApp = whatsappHref(consultant?.whatsapp_number)

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
      <SimpleState
        icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
        kicker={program?.name || 'Consultoria Elite'}
        title="Agendamento indisponível"
      >
        <p>
          {stats.block_reason || 'O status atual da consultoria não permite novos agendamentos.'}
        </p>
        {consultantWhatsApp && (
          <Button asChild size="lg" className="mt-5 h-11 w-full rounded-full font-mono text-xs">
            <a href={consultantWhatsApp} target="_blank" rel="noreferrer">
              Falar com o consultor <MessageCircle className="h-4 w-4" />
            </a>
          </Button>
        )}
      </SimpleState>
    )
  }

  if (stats?.requires_tally) {
    return (
      <SimpleState
        icon={<ExternalLink className="h-5 w-5" />}
        kicker={program?.name || 'Consultoria Elite'}
        title="Antes de agendar"
      >
        <p>
          Responda o formulário para que o(a) consultor(a){' '}
          <strong className="text-primary">{consultant?.name}</strong> possa se preparar.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Button
            type="button"
            size="lg"
            className="h-11 rounded-full font-mono text-xs"
            disabled={!tallyUrl}
            onClick={() => window.open(tallyUrl, '_blank', 'noopener,noreferrer')}
          >
            Responder formulário <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleRefresh} className="h-11 rounded-full px-5">
            <RefreshCw className="h-4 w-4" />
            Verificar
          </Button>
        </div>
        {feedback && <p className="mt-3 text-xs text-muted-foreground">{feedback}</p>}
      </SimpleState>
    )
  }

  if (stats?.finalised) {
    return (
      <SimpleState
        icon={<CheckCircle2 className="h-5 w-5" />}
        kicker={program?.name || 'Consultoria Elite'}
        title="Consultoria finalizada"
      >
        <p>Você já realizou todas as consultorias previstas para este programa.</p>
        {consultantWhatsApp && (
          <Button asChild size="lg" className="mt-5 h-11 w-full rounded-full font-mono text-xs">
            <a href={consultantWhatsApp} target="_blank" rel="noreferrer">
              Falar sobre upgrade <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        )}
      </SimpleState>
    )
  }

  if (upcomingMeeting) {
    const meetDate = new Date(upcomingMeeting.start_time)
    const canChange = differenceInHours(meetDate, new Date()) >= minRescheduleHours

    return (
      <StatusShell>
        <div className="shrink-0 text-center">
          <EliteKicker className="min-h-6 px-3 text-[0.62rem] max-[720px]:hidden">
            {program?.name || 'Consultoria Elite'}
          </EliteKicker>
          <h1 className="mt-2 font-display text-2xl font-extrabold sm:mt-3 sm:text-3xl md:text-4xl">
            Olá, <span className="text-primary">{firstName}</span>
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground max-[720px]:hidden">
            Seu agendamento já foi realizado com o(a) {consultant?.name}.
          </p>
        </div>

        <ElitePanel className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border bg-primary/10 px-4 py-3 sm:px-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <Video className="h-5 w-5 text-primary" />
              {upcomingMeeting.title || 'Reunião agendada'}
            </h2>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center text-xs font-semibold text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" /> Data
                </div>
                <p className="mt-2 font-display text-xl font-bold">
                  {format(meetDate, "dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  {format(meetDate, 'EEEE', { locale: ptBR })}
                </p>
              </div>
              <div className="border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                <div className="flex items-center text-xs font-semibold text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4" /> Horário
                </div>
                <p className="mt-2 font-display text-xl font-bold">
                  {format(meetDate, 'HH:mm')} -{' '}
                  {format(new Date(upcomingMeeting.end_time), 'HH:mm')}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {upcomingMeeting.meet_link && (
                <Button asChild variant="secondary" className="h-10 rounded-full">
                  <a href={upcomingMeeting.meet_link} target="_blank" rel="noreferrer">
                    Acessar Google Meet
                  </a>
                </Button>
              )}
              {upcomingMeeting.google_html_link && (
                <Button asChild variant="outline" className="h-10 rounded-full">
                  <a href={upcomingMeeting.google_html_link} target="_blank" rel="noreferrer">
                    Ver evento
                  </a>
                </Button>
              )}
            </div>

            {!canChange && (
              <p className="mt-4 rounded-md border border-[#fbbf24]/30 bg-[#fbbf24]/10 p-3 text-center text-xs leading-5 text-[#fbbf24]">
                Cancelamentos exigem no mínimo {minRescheduleHours}h de antecedência. Você ainda
                pode remarcar, mas o novo horário precisa ser {lateRescheduleText}.
              </p>
            )}
            {feedback && (
              <p className="mt-3 text-center text-xs text-muted-foreground">{feedback}</p>
            )}

            <div className="mt-auto grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
              <Button
                variant="outline"
                className="h-11 rounded-full"
                onClick={() => navigate(`/schedule?reschedule=${upcomingMeeting.id}`)}
                disabled={cancelling}
              >
                Remarcar
              </Button>
              <Button
                variant="destructive"
                className="h-11 rounded-full"
                onClick={handleCancel}
                disabled={!canChange || cancelling}
              >
                {cancelling ? 'Cancelando...' : 'Cancelar'}
              </Button>
            </div>
          </div>
        </ElitePanel>
      </StatusShell>
    )
  }

  return (
    <StatusShell>
      <div className="shrink-0">
        <EliteKicker className="min-h-6 px-3 text-[0.62rem] max-[720px]:hidden">
          Sessão de consultoria
        </EliteKicker>
        <h1 className="mt-2 max-w-4xl font-display text-2xl font-extrabold leading-tight sm:mt-3 sm:text-3xl md:text-4xl">
          Bem-vindo, <span className="text-primary">{firstName}</span>!
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-muted-foreground max-[720px]:hidden md:text-base">
          Vamos agendar a sua reunião? Escolha o melhor horário com o seu consultor{' '}
          <span className="text-primary">{consultant?.name}</span>.
        </p>
      </div>

      {stats?.stage_rules?.has_no_show &&
        noShowEarliestDate &&
        !Number.isNaN(noShowEarliestDate.getTime()) && (
          <ElitePanel className="mt-3 shrink-0 border-[#fbbf24]/30 p-3 text-sm text-[#fbbf24]">
            No-show registrado: essa reunião não consumiu saldo. Você pode reagendar a partir de{' '}
            {format(noShowEarliestDate, "dd 'de' MMMM", { locale: ptBR })}.
          </ElitePanel>
        )}

      <CompactChecklist
        action={
          <Button
            size="lg"
            className="h-11 w-full rounded-full font-mono text-xs"
            onClick={() => navigate('/schedule')}
          >
            Iniciar Agendamento <ArrowRight className="h-5 w-5" />
          </Button>
        }
      />
    </StatusShell>
  )
}
