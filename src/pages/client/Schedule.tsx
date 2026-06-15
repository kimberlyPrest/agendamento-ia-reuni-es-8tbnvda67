import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { useClient } from '@/hooks/use-client'
import { getClientDetails, getAvailableSlots, bookMeeting } from '@/services/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft } from 'lucide-react'

export default function ClientSchedule() {
  const { clientId } = useClient()
  const navigate = useNavigate()
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [slots, setSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingBook, setLoadingBook] = useState(false)
  const [consultant, setConsultant] = useState<any>(null)

  useEffect(() => {
    if (!clientId) navigate('/')
    getClientDetails(clientId!).then((c) => setConsultant(c.expand?.consultant_id))
  }, [clientId, navigate])

  useEffect(() => {
    if (date && consultant) {
      const loadSlots = async () => {
        setLoading(true)
        const res = await getAvailableSlots(consultant.id, format(date, 'yyyy-MM-dd'))
        setSlots(res.slots || [])
        setLoading(false)
      }
      loadSlots()
    }
  }, [date, consultant])

  const handleBook = async (time: string) => {
    if (!date || !clientId) return
    setLoadingBook(true)
    await bookMeeting(clientId, format(date, 'yyyy-MM-dd'), time)
    setLoadingBook(false)
    navigate('/status')
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <button
        onClick={() => navigate('/status')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-white">Escolha um horário</h1>
        <p className="text-muted-foreground">Agenda do(a) {consultant?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
        <Card className="p-4 border-border bg-card shadow-elevation inline-block w-full sm:w-auto">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            locale={ptBR}
            disabled={(d) =>
              d < new Date(new Date().setHours(0, 0, 0, 0)) || d.getDay() === 0 || d.getDay() === 6
            }
            className="rounded-md w-full"
          />
        </Card>

        <Card className="p-5 border-border bg-card shadow-elevation min-h-[350px]">
          <h3 className="font-semibold mb-4 text-center text-white capitalize border-b border-border pb-3">
            {date ? format(date, "EEEE, d 'de' MMMM", { locale: ptBR }) : 'Selecione uma data'}
          </h3>
          {loading ? (
            <div className="text-center text-muted-foreground mt-10 animate-pulse">
              Buscando horários...
            </div>
          ) : date ? (
            slots.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {slots.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    className="w-full font-medium"
                    disabled={loadingBook}
                    onClick={() => handleBook(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground mt-10">
                Nenhum horário disponível.
              </div>
            )
          ) : (
            <div className="text-center text-muted-foreground mt-10 text-sm">
              Use o calendário ao lado para ver os horários.
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
