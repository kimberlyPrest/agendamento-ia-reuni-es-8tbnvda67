import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useClientStore } from '@/stores/use-client-store'
import { bookMeeting, getAvailableSlots, rescheduleMeeting } from '@/services/api'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, ArrowLeft, AlertCircle } from 'lucide-react'

type Slot = {
  time: string
  start_time: string
  end_time: string
  available?: boolean
}

export default function ClientSchedule() {
  const { client, upcomingMeeting, refreshClient } = useClientStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rescheduleId = searchParams.get('reschedule')
  const isRescheduling = Boolean(rescheduleId)
  const initialDate =
    isRescheduling && upcomingMeeting?.start_time
      ? new Date(upcomingMeeting.start_time)
      : new Date()

  const [date, setDate] = useState<Date | undefined>(initialDate)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!client) navigate('/')
  }, [client, navigate])

  useEffect(() => {
    if (date && client?.consultant_id) fetchSlots(date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, client?.consultant_id, rescheduleId])

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

  const program = client.expand?.program_id
  const consultant = client.expand?.consultant_id
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

      <Card className="bg-card border-border overflow-hidden shadow-none">
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="bg-transparent"
              disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0)) || day > maxDate}
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
