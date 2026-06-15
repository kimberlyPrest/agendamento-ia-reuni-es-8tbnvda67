import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/use-client-store'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { format, addMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, ArrowLeft } from 'lucide-react'

export default function ClientSchedule() {
  const { client, refreshClient } = useClientStore()
  const navigate = useNavigate()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [slots, setSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(false)

  useEffect(() => {
    if (!client) navigate('/')
  }, [client, navigate])

  useEffect(() => {
    if (date && client?.consultant_id) {
      fetchSlots(date)
    }
  }, [date])

  const fetchSlots = async (selectedDate: Date) => {
    setLoading(true)
    setSelectedSlot(null)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/calendar/slots?consultant_id=${client.consultant_id}&date=${dateStr}`,
      )
      if (res.ok) {
        const data = await res.json()
        setSlots(data.slots || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBook = async () => {
    if (!date || !selectedSlot || !client) return
    setBooking(true)

    const dateStr = format(date, 'yyyy-MM-dd')
    const startTime = new Date(`${dateStr}T${selectedSlot}:00`)
    const endTime = addMinutes(startTime, client.expand?.program_id?.meeting_duration || 60)

    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/calendar/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          consultant_id: client.consultant_id,
          program_id: client.program_id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        }),
      })

      if (res.ok) {
        await refreshClient()
        navigate('/confirmation')
      } else {
        alert('Erro ao agendar. Tente outro horário.')
        fetchSlots(date)
      }
    } finally {
      setBooking(false)
    }
  }

  if (!client) return null

  return (
    <div className="animate-fade-in-up space-y-6">
      <Button variant="ghost" onClick={() => navigate('/status')} className="mb-2 -ml-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

      <div>
        <h2 className="font-display font-bold text-2xl mb-1">Escolha uma data</h2>
        <p className="text-muted-foreground text-sm">Fuso horário: Horário de Brasília</p>
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="bg-transparent"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              locale={ptBR}
            />
          </div>
          <div className="p-6 md:w-64 flex flex-col">
            <h3 className="font-medium mb-4 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {date ? format(date, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione uma data'}
            </h3>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[280px]">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Buscando horários...
                </p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sem horários disponíveis
                </p>
              ) : (
                slots.map((slot) => (
                  <Button
                    key={slot}
                    variant={selectedSlot === slot ? 'default' : 'outline'}
                    className="w-full justify-center font-medium"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot}
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
        {booking ? 'Agendando...' : 'Confirmar Agendamento'}
      </Button>
    </div>
  )
}
