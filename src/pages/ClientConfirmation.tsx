import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/use-client-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, CalendarPlus, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ClientConfirmation() {
  const { client, upcomingMeeting } = useClientStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!client || !upcomingMeeting) navigate('/status')
  }, [client, upcomingMeeting, navigate])

  if (!client || !upcomingMeeting) return null

  const meetDate = new Date(upcomingMeeting.start_time)
  const consultant = client.expand?.consultant_id

  const whatsappText = encodeURIComponent(
    `Olá! Acabei de agendar minha reunião para o dia ${format(meetDate, 'dd/MM')} às ${format(meetDate, 'HH:mm')}.`,
  )

  return (
    <div className="animate-fade-in-up space-y-8 text-center">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-display font-bold text-3xl">Agendamento Confirmado!</h2>
        <p className="text-muted-foreground text-lg">Sua reunião foi marcada com sucesso.</p>
      </div>

      <Card className="bg-secondary border-border text-left">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Data</p>
              <p className="font-medium text-lg">
                {format(meetDate, "dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horário</p>
              <p className="font-medium text-lg">{format(meetDate, 'HH:mm')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 pt-4">
        <Button
          asChild
          size="lg"
          className="w-full h-14 bg-green-600 hover:bg-green-700 text-white"
        >
          <a
            href={`https://wa.me/${consultant?.whatsapp_number}?text=${whatsappText}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="w-5 h-5 mr-2" /> Confirmar com o Consultor
          </a>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full h-14"
          onClick={() => navigate('/status')}
        >
          <CalendarPlus className="w-5 h-5 mr-2" /> Ir para o Painel
        </Button>
      </div>
    </div>
  )
}
