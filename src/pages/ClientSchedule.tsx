import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useClientStore } from '@/stores/use-client-store'
import { bookMeeting, getAvailableSlots, rescheduleMeeting } from '@/services/api'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { differenceInHours, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, ArrowLeft, AlertCircle, CalendarCheck } from 'lucide-react'

type Slot = {
  time: string
  start_time: string
  end_time: string
  available?: boolean
}

type CalendarContext = {
  google_connected?: boolean
  google_connected_email?: string
  calendar_source_count?: number
  busy_calendar_ids?: string[]
  uses_calendar_list?: boolean
}

export default function ClientSchedule() {
  const { client, upcomingMeeting, stats, refreshClient } = useClientStore()
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
  const noShowEarliestDate = stats?.no_show_earliest_start
    ? new Date(stats.no_show_earliest_start)
    : null
  const isLateReschedule = existingMeetingDate
    ? differenceInHours(existingMeetingDate, new Date()) < minRescheduleHours
    : false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const minDate = new Date(today)
  if (isLateReschedule) minDate.setDate(minDate.getDate() + lateRescheduleDelayDays)
  if (!isLateReschedule && noShowEarliestDate && !Number.isNaN(noShowEarliestDate.getTime())) {
    const noShowDay = new Date(noShowEarliestDate)
    noShowDay.setHours(0, 0, 0, 0)
    if (noShowDay > minDate) minDate.setTime(noShowDay.getTime())
  }
  const minDateTime = minDate.getTime()
  const initialDate = isLateReschedule
    ? minDate
    : isRescheduling && existingMeetingDate
      ? existingMeetingDate
      : today

  const [date, setDate] = useState<Date | undefined>(initialDate)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [calendarContext, setCalendarContext] = useState<CalendarContext | null>(null)

  useEffect(() => {
    if (!client) navigate('/')
    else if (stats?.booking_blocked || stats?.requires_tally || stats?.finalised)
      navigate('/status')
  }, [client, stats?.booking_blocked, stats?.requires_tally, stats?.finalised, navigate])

  useEffect(() => {
    if (isLateReschedule && date && date.getTime() < minDateTime) {
      setDate(new Date(minDateTime))
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
      let nextSlots = (data.slots || []).map((slot: Slot | string) => {
        if (typeof slot !== 'string') return slot
        return {
          time: slot,
          start_time: `${dateStr}T${slot}:00`,
          end_time: `${dateStr}T${slot}:00`,
        }
      })
      if (noShowEarliestDate && !Number.isNaN(noShowEarliestDate.getTime())) {
        nextSlots = nextSlots.filter(
          (slot: Slot) => new Date(slot.start_time) >= noShowEarliestDate,
        )
      }
      setSlots(nextSlots)
      setCalendarContext({
        google_connected: data.google_connected,
        google_connected_email: data.google_connected_email,
        calendar_source_count: data.calendar_source_count,
        busy_calendar_ids: data.busy_calendar_ids || [],
        uses_calendar_list: data.uses_calendar_list,
      })
      if (data.setup_required) setError(data.message || 'Agenda Google ainda não conectada.')
    } catch (err: any) {
      setSlots([])
      setCalendarContext(null)
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

  return (
    <section className="animate-fade-in-up space-y-6">
      <Button variant="ghost" onClick={() => navigate('/status')} className="mb-2 -ml-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

      <div className="space-y-1">
        <p className="text-primary text-sm font-medium">{program?.name}</p>
        <h2 className="font-display font-bold text-2xl">
          {isRescheduling ? 'Escolha o novo horário' : 'Escolha uma data'}
        </h2>
        <p className="text-muted-foreground text-sm">
          Agenda do(a) {consultant?.name}. Fuso horário: Horário de Brasília.
        </p>
      </div>

      {calendarContext?.google_connected && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Agenda Google sincronizada</p>
              <p className="text-xs text-muted-foreground">
                Os horários abaixo respeitam a janela de atendimento e conflitos encontrados em{' '}
                {calendarContext.calendar_source_count || 1} agenda(s) do consultor.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit border-primary/30 text-primary">
            Atualizado em tempo real
          </Badge>
        </div>
      )}

      {isLateReschedule && (
        <div className="text-sm text-[#FFB800] bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-md p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Como a remarcação passou do prazo mínimo, os novos horários aparecem a partir de{' '}
            {lateRescheduleDelayDays} {lateRescheduleUnit}.
          </span>
        </div>
      )}

      <Card className="bg-card border-border overflow-hidden shadow-none">
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="bg-transparent"
              disabled={(day) => day < minDate || day > maxDate}
              locale={ptBR}
            />
          </div>
          <div className="p-6 md:w-72 flex flex-col">
            <h3 className="font-medium mb-4 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {date ? format(date, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione uma data'}
            </h3>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[280px]">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Buscando horários...
                </p>
              ) : error ? (
                <div className="text-sm text-[#FFB800] bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-md p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sem horários disponíveis
                </p>
              ) : (
                slots.map((slot) => (
                  <Button
                    key={`${slot.start_time}-${slot.time}`}
                    variant={selectedSlot?.start_time === slot.start_time ? 'default' : 'outline'}
                    className="w-full justify-center font-medium"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot.time}
                  </Button>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      <Button
        size="lg"
        className="w-full h-14 text-lg"
        disabled={!selectedSlot || booking}
        onClick={handleBook}
      >
        {booking
          ? 'Salvando...'
          : isRescheduling
            ? 'Confirmar remarcação'
            : 'Confirmar agendamento'}
      </Button>
    </section>
  )
}
