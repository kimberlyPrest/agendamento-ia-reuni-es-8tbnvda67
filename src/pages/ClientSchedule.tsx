import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  addMonths,
  differenceInHours,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  MessageCircle,
} from 'lucide-react'

import {
  EliteBrand,
  EliteHeaderAction,
  EliteKicker,
  ElitePanel,
} from '@/components/elite/ElitePrimitives'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { bookMeeting, getAvailableSlots, rescheduleMeeting } from '@/services/api'
import { useClientStore } from '@/stores/use-client-store'

type Slot = {
  time: string
  start_time: string
  end_time: string
  available?: boolean
}

const weekdays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const clientCalendarError =
  'Não foi possível carregar os horários agora. Fale com seu consultor para continuar.'

function isTechnicalCalendarError(message = '') {
  return /google|oauth|refresh token|calendar|agenda|GOOGLE_CLIENT|GOOGLE_SECRET|token/i.test(
    message,
  )
}

function whatsappHref(phone: string | undefined) {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : ''
}

function sameOrBefore(day: Date, maxDate: Date) {
  const normalized = new Date(day)
  normalized.setHours(0, 0, 0, 0)
  const max = new Date(maxDate)
  max.setHours(0, 0, 0, 0)
  return normalized.getTime() <= max.getTime()
}

function sameOrAfter(day: Date, minDate: Date) {
  const normalized = new Date(day)
  normalized.setHours(0, 0, 0, 0)
  const min = new Date(minDate)
  min.setHours(0, 0, 0, 0)
  return normalized.getTime() >= min.getTime()
}

function AvailabilityCalendar({
  selected,
  visibleMonth,
  minDate,
  maxDate,
  onSelect,
  onMonthChange,
}: {
  selected?: Date
  visibleMonth: Date
  minDate: Date
  maxDate: Date
  onSelect: (date: Date) => void
  onMonthChange: (date: Date) => void
}) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [visibleMonth])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_16px_rgba(109,217,187,.9)]" />
          Disponibilidade
        </h2>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded"
            aria-label="Mês anterior"
            onClick={() => onMonthChange(subMonths(visibleMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="w-24 text-center font-mono text-[0.68rem] font-bold uppercase leading-4">
            {format(visibleMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded"
            aria-label="Próximo mês"
            onClick={() => onMonthChange(addMonths(visibleMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekdays.map((day) => (
          <div
            key={day}
            className="py-0.5 text-center font-mono text-[0.62rem] font-bold text-muted-foreground sm:py-1"
          >
            {day}
          </div>
        ))}
        {days.map((day) => {
          const outsideMonth = !isSameMonth(day, visibleMonth)
          const disabled = outsideMonth || !sameOrAfter(day, minDate) || !sameOrBefore(day, maxDate)
          const selectedDay = selected ? isSameDay(day, selected) : false

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(day)}
              className={cn(
                'relative flex h-8 items-center justify-center rounded border border-border bg-secondary text-xs font-bold text-muted-foreground transition-all duration-150 sm:h-10 sm:text-sm md:h-12 md:text-base',
                'enabled:hover:border-[#60a5fa] enabled:hover:bg-[#60a5fa]/15 enabled:hover:text-[#93c5fd] enabled:hover:shadow-[0_0_16px_rgba(96,165,250,.28)]',
                selectedDay &&
                  'border-primary bg-primary text-primary-foreground shadow-[0_0_25px_rgba(109,217,187,.45)] hover:border-primary hover:bg-primary hover:text-primary-foreground',
                disabled && 'cursor-not-allowed opacity-25',
                outsideMonth && 'invisible',
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CompactGuidelines({ action, className }: { action: ReactNode; className?: string }) {
  const items = [
    'Escolha um dia e horário tranquilo, sem reuniões coladas e sem correria.',
    'Os horários exibidos já consideram sua agenda e a disponibilidade do consultor.',
    'O novo horário depende da agenda do consultor e pode entrar no fim da fila.',
  ]

  return (
    <ElitePanel className={cn('flex h-full min-h-0 flex-col p-4', className)}>
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
        <Info className="h-4 w-4 text-primary" />
        Diretrizes
      </h2>
      <div className="mt-4 space-y-4">
        {items.map((item, index) => (
          <div key={item} className="grid grid-cols-[18px_1fr] gap-3">
            <div className="relative flex justify-center">
              {index < items.length - 1 && (
                <span
                  className={cn(
                    'absolute top-3 h-[calc(100%+1rem)] w-px',
                    index < 2 ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative mt-1 h-2.5 w-2.5 rounded-full border bg-background',
                  index < 2
                    ? 'border-primary shadow-[0_0_12px_rgba(109,217,187,.8)]'
                    : 'border-muted-foreground/40',
                )}
              />
            </div>
            <p
              className={cn(
                'text-xs font-semibold leading-5',
                index < 2 ? 'text-foreground/80' : 'text-muted-foreground/55',
              )}
            >
              {item}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-auto border-t border-border pt-4">{action}</div>
    </ElitePanel>
  )
}

export default function ClientSchedule() {
  const { client, upcomingMeeting, refreshClient } = useClientStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rescheduleId = searchParams.get('reschedule')
  const isRescheduling = Boolean(rescheduleId)
  const program = client?.expand?.program_id
  const consultant = client?.expand?.consultant_id
  const minRescheduleHours = Number(program?.min_reschedule_hours ?? 24)
  const lateRescheduleDelayDays = Number(program?.late_reschedule_delay_days ?? 7)

  const existingMeetingDate =
    isRescheduling && upcomingMeeting?.start_time ? new Date(upcomingMeeting.start_time) : null
  const isLateReschedule = existingMeetingDate
    ? differenceInHours(existingMeetingDate, new Date()) < minRescheduleHours
    : false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const minDate = new Date(today)
  if (isLateReschedule) minDate.setDate(minDate.getDate() + lateRescheduleDelayDays)
  const minDateTime = minDate.getTime()
  const initialDate = isLateReschedule
    ? minDate
    : isRescheduling && existingMeetingDate
      ? existingMeetingDate
      : today

  const [date, setDate] = useState<Date | undefined>(initialDate)
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(initialDate))
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [needsConsultantSupport, setNeedsConsultantSupport] = useState(false)

  useEffect(() => {
    if (!client) navigate('/')
  }, [client, navigate])

  useEffect(() => {
    if (isLateReschedule && date && date.getTime() < minDateTime) {
      setDate(new Date(minDateTime))
      setVisibleMonth(startOfMonth(new Date(minDateTime)))
      return
    }
    if (date && client?.consultant_id) fetchSlots(date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, client?.consultant_id, rescheduleId, isLateReschedule, minDateTime])

  const fetchSlots = async (selectedDate: Date) => {
    if (!client?.consultant_id) return
    setLoading(true)
    setSelectedSlot(null)
    setError('')
    setNeedsConsultantSupport(false)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const data = await getAvailableSlots(
        client.consultant_id,
        dateStr,
        client.id,
        rescheduleId || undefined,
      )
      const nextSlots = (data.slots || []).map((slot: Slot | string) => {
        if (typeof slot !== 'string') return slot
        return {
          time: slot,
          start_time: `${dateStr}T${slot}:00`,
          end_time: `${dateStr}T${slot}:00`,
        }
      })
      setSlots(nextSlots)
      if (data.blocked || data.blocked_reason) {
        setSlots([])
        setError(data.blocked_reason || data.message || 'Este cliente não pode agendar agora.')
      } else if (data.setup_required) {
        setSlots([])
        setNeedsConsultantSupport(true)
        setError(clientCalendarError)
      }
    } catch (err: any) {
      setSlots([])
      const message = err.message || 'Não foi possível buscar horários.'
      setNeedsConsultantSupport(isTechnicalCalendarError(message))
      setError(isTechnicalCalendarError(message) ? clientCalendarError : message)
    } finally {
      setLoading(false)
    }
  }

  const handleBook = async () => {
    if (!selectedSlot || !client) return
    setBooking(true)
    setError('')
    setNeedsConsultantSupport(false)
    try {
      let bookedMeeting: any = null
      if (isRescheduling && rescheduleId) {
        const data = await rescheduleMeeting(
          rescheduleId,
          client.id,
          selectedSlot.start_time,
          selectedSlot.end_time,
        )
        bookedMeeting = data.meeting || null
      } else {
        const data = await bookMeeting(client.id, selectedSlot.start_time, selectedSlot.end_time)
        bookedMeeting = data.meeting || null
      }
      const refreshed = await refreshClient()
      navigate('/confirmation', {
        state: { meeting: refreshed?.upcomingMeeting || bookedMeeting },
      })
    } catch (err: any) {
      const message = err.message || 'Erro ao agendar. Tente outro horário.'
      const technicalCalendarError = isTechnicalCalendarError(message)
      setNeedsConsultantSupport(technicalCalendarError)
      setError(technicalCalendarError ? clientCalendarError : message)
      if (!technicalCalendarError && date) fetchSlots(date)
    } finally {
      setBooking(false)
    }
  }

  if (!client) return null

  const bookingWindow = Number(program?.booking_window_days || 60)
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + bookingWindow)
  maxDate.setHours(23, 59, 59, 999)
  const firstName = client.name?.split(' ')[0] || client.name
  const selectedDateLabel = date
    ? format(date, "d 'de' MMMM", { locale: ptBR })
    : 'Selecione uma data'
  const shortDateLabel = date ? format(date, 'd MMM', { locale: ptBR }).toUpperCase() : ''
  const supportHref = whatsappHref(
    consultant?.whatsapp_number || consultant?.phone || consultant?.contact_phone,
  )
  const scheduleAction = (
    <div className="space-y-3">
      <p className="text-center text-xs leading-5 text-muted-foreground">
        {selectedSlot
          ? `${selectedDateLabel} às ${selectedSlot.time}`
          : 'Selecione um dia e horário para continuar.'}
      </p>
      <Button
        size="lg"
        className="h-11 w-full rounded-full font-mono text-xs"
        disabled={!selectedSlot || booking}
        onClick={handleBook}
      >
        {booking
          ? 'Salvando...'
          : isRescheduling
            ? 'Confirmar Remarcação'
            : 'Confirmar Agendamento'}
        {!booking && <ArrowRight className="h-5 w-5" />}
      </Button>
    </div>
  )

  return (
    <section className="animate-fade-in-up flex min-h-dvh flex-col">
      <header className="mx-auto flex h-12 w-full max-w-[1080px] shrink-0 items-center justify-between px-4 sm:h-14 sm:px-6">
        <EliteBrand compact />
        <button type="button" aria-label="Voltar" onClick={() => navigate('/status')}>
          <EliteHeaderAction className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </EliteHeaderAction>
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col px-4 pb-3 pt-2 sm:px-6 sm:pb-5 sm:pt-3">
        <div className="shrink-0">
          <EliteKicker className="min-h-6 px-3 text-[0.62rem] max-[720px]:hidden">
            Sessão de consultoria
          </EliteKicker>
          <h1 className="mt-2 max-w-4xl font-display text-2xl font-extrabold leading-tight sm:mt-3 sm:text-3xl md:text-4xl">
            {isRescheduling ? 'Escolha o novo horário' : 'Agende sua reunião, '}
            {!isRescheduling && <span className="text-primary">{firstName}</span>}
            {!isRescheduling && '!'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-muted-foreground max-[720px]:hidden md:text-base">
            Escolha o melhor horário disponível na agenda do seu consultor{' '}
            <span className="text-primary">{consultant?.name}</span>.
          </p>
        </div>

        <div className="mt-3 grid gap-4 sm:mt-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <ElitePanel className="flex flex-col p-3 sm:p-4 md:p-5">
            <AvailabilityCalendar
              selected={date}
              visibleMonth={visibleMonth}
              minDate={minDate}
              maxDate={maxDate}
              onSelect={(nextDate) => {
                setDate(nextDate)
                setVisibleMonth(startOfMonth(nextDate))
              }}
              onMonthChange={setVisibleMonth}
            />

            <div className="mt-4 border-t border-border pt-3">
              <div className="flex items-center gap-2 font-mono text-[0.68rem] font-bold uppercase text-muted-foreground">
                <Clock className="h-4 w-4" />
                Horários disponíveis: {shortDateLabel}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Buscando horários...</p>
                ) : error ? (
                  <div className="flex w-full min-w-0 flex-col gap-3 rounded-md border border-[#fbbf24]/30 bg-[#fbbf24]/10 p-3 text-sm text-[#fbbf24] sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <span className="min-w-0 leading-5">{error}</span>
                    </div>
                    {needsConsultantSupport && supportHref && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-9 w-full shrink-0 border-[#fbbf24]/40 text-[#fbbf24] hover:bg-[#fbbf24]/10 sm:w-auto"
                      >
                        <a href={supportHref} target="_blank" rel="noreferrer">
                          WhatsApp <MessageCircle className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem horários disponíveis</p>
                ) : (
                  slots.map((slot) => (
                    <Button
                      key={`${slot.start_time}-${slot.time}`}
                      type="button"
                      variant={selectedSlot?.start_time === slot.start_time ? 'default' : 'outline'}
                      className={cn(
                        'h-9 min-w-20 rounded-full px-4 font-mono text-xs',
                        selectedSlot?.start_time === slot.start_time &&
                          'bg-transparent text-primary ring-1 ring-primary hover:bg-primary/10',
                      )}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot.time}
                    </Button>
                  ))
                )}
              </div>
            </div>
            <div className="mt-3 border-t border-border pt-3 lg:hidden">{scheduleAction}</div>
          </ElitePanel>

          <CompactGuidelines className="hidden lg:flex" action={scheduleAction} />
        </div>
      </div>
    </section>
  )
}
