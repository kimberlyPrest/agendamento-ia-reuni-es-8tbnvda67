import { useEffect, useMemo, useState } from 'react'
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
} from 'lucide-react'

import {
  EliteBrand,
  EliteGuidelines,
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
    <div className="space-y-7">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-3 font-display text-2xl font-extrabold">
          <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_16px_rgba(109,217,187,.9)]" />
          Disponibilidade
        </h2>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Mês anterior"
            onClick={() => onMonthChange(subMonths(visibleMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="w-28 text-center font-mono text-sm font-bold uppercase leading-5">
            {format(visibleMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Próximo mês"
            onClick={() => onMonthChange(addMonths(visibleMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {weekdays.map((day) => (
          <div
            key={day}
            className="py-2 text-center font-mono text-sm font-bold text-muted-foreground"
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
                'relative flex aspect-square min-h-16 items-center justify-center rounded-md border border-border bg-card text-xl font-bold text-muted-foreground transition-all duration-150 md:min-h-24',
                'enabled:hover:border-primary enabled:hover:text-primary enabled:hover:shadow-[0_0_0_1px_rgba(109,217,187,.55),0_20px_40px_-28px_rgba(109,217,187,.85)]',
                selectedDay &&
                  'border-primary bg-primary text-primary-foreground shadow-[0_20px_48px_-20px_rgba(109,217,187,.85)] hover:text-primary-foreground',
                disabled && 'cursor-not-allowed opacity-25',
                outsideMonth && 'invisible',
              )}
            >
              {format(day, 'd')}
              {!selectedDay && !disabled && (
                <span className="absolute bottom-2 h-1 w-1 rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </button>
          )
        })}
      </div>
    </div>
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
  const lateRescheduleUnit = lateRescheduleDelayDays === 1 ? 'dia' : 'dias'
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
      if (data.setup_required) setError(data.message || 'Agenda Google ainda não conectada.')
    } catch (err: any) {
      setSlots([])
      setError(err.message || 'Não foi possível buscar horários.')
    } finally {
      setLoading(false)
    }
  }

  const handleBook = async () => {
    if (!selectedSlot || !client) return
    setBooking(true)
    setError('')
    try {
      if (isRescheduling && rescheduleId) {
        await rescheduleMeeting(
          rescheduleId,
          client.id,
          selectedSlot.start_time,
          selectedSlot.end_time,
        )
      } else {
        await bookMeeting(client.id, selectedSlot.start_time, selectedSlot.end_time)
      }
      await refreshClient()
      navigate('/confirmation')
    } catch (err: any) {
      setError(err.message || 'Erro ao agendar. Tente outro horário.')
      if (date) fetchSlots(date)
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

  return (
    <section className="animate-fade-in-up min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
        <EliteBrand />
        <button type="button" aria-label="Voltar" onClick={() => navigate('/status')}>
          <EliteHeaderAction>
            <ArrowLeft className="h-6 w-6" />
          </EliteHeaderAction>
        </button>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-16">
        <EliteKicker>Sessão de consultoria</EliteKicker>
        <h1 className="mt-8 max-w-6xl font-display text-5xl font-extrabold leading-tight md:text-7xl">
          {isRescheduling ? 'Escolha o novo horário' : 'Bem-vindo, '}
          {!isRescheduling && <span className="text-primary">{firstName}</span>}
          {!isRescheduling && '!'}
        </h1>
        <p className="mt-8 max-w-5xl text-2xl font-semibold leading-10 text-muted-foreground">
          Vamos agendar a sua reunião? Escolha o melhor horário com o seu consultor{' '}
          <span className="text-primary">{consultant?.name}</span>.
        </p>

        {isLateReschedule && (
          <ElitePanel className="mt-10 flex max-w-4xl gap-3 border-[#fbbf24]/30 p-4 text-[#fbbf24]">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
            <span>
              Como a remarcação passou do prazo mínimo, os novos horários aparecem a partir de{' '}
              {lateRescheduleDelayDays} {lateRescheduleUnit}.
            </span>
          </ElitePanel>
        )}

        <div className="mt-24 grid gap-8 lg:grid-cols-[1fr_0.48fr]">
          <ElitePanel className="p-6 md:p-8">
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

            <div className="mt-10 border-t border-border pt-8">
              <div className="flex items-center gap-2 font-mono text-sm font-bold uppercase text-muted-foreground">
                <Clock className="h-4 w-4" />
                Horários disponíveis: {shortDateLabel}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Buscando horários...</p>
                ) : error ? (
                  <div className="flex w-full gap-3 rounded-md border border-[#fbbf24]/30 bg-[#fbbf24]/10 p-4 text-sm text-[#fbbf24]">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span>{error}</span>
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
                        'h-11 min-w-24 font-mono',
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
          </ElitePanel>

          <EliteGuidelines
            action={
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  {selectedSlot
                    ? `${selectedDateLabel} às ${selectedSlot.time}`
                    : 'Selecione um dia e horário para continuar.'}
                </p>
                <Button
                  size="lg"
                  className="h-14 w-full font-mono"
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
            }
          />
        </div>
      </div>
    </section>
  )
}
