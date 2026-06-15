import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/use-client-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, CalendarPlus, MessageCircle, Video } from 'lucide-react'
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
  const consultant = client.expand?.consultant_id || upcomingMeeting.expand?.consultant_id
  const program = client.expand?.program_id || upcomingMeeting.expand?.program_id
  const whatsappText = encodeURIComponent(
    `Olá! Agendei minha reunião do programa ${program?.name || ''} para ${format(meetDate, 'dd/MM/yyyy')} às ${format(meetDate, 'HH:mm')}.`,
  )

  return (
    <section className="animate-fade-in-up space-y-8 text-center">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-[#00C851]/15 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-[#00C851]" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-primary font-medium">{program?.name}</p>
        <h2 className="font-display font-bold text-3xl">Agendamento confirmado</h2>
        <p className="text-muted-foreground text-lg">O evento foi criado na agenda do consultor.</p>
      </div>

      <Card className="bg-secondary border-border text-left shadow-none">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-display font-semibold text-lg">
            {upcomingMeeting.title || 'Reunião agendada'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Data</p>
              <p className="font-medium text-lg">
                {format(meetDate, "dd 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="text-sm text-muted-foreground capitalize">
                {format(meetDate, 'EEEE', { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horário</p>
              <p className="font-medium text-lg">
                {format(meetDate, 'HH:mm')} - {format(new Date(upcomingMeeting.end_time), 'HH:mm')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 pt-4">
        <Button
          asChild
          size="lg"
          className="w-full h-14 bg-[#00C851] hover:bg-[#00C851]/90 text-white"
        >
          <a
            href={`https://wa.me/${consultant?.whatsapp_number}?text=${whatsappText}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="w-5 h-5 mr-2" /> Confirmar com o consultor
          </a>
        </Button>
        {upcomingMeeting.meet_link && (
          <Button asChild variant="secondary" size="lg" className="w-full h-14">
            <a href={upcomingMeeting.meet_link} target="_blank" rel="noreferrer">
              <Video className="w-5 h-5 mr-2" /> Abrir Google Meet
            </a>
          </Button>
        )}
        {upcomingMeeting.google_html_link && (
          <Button asChild variant="outline" size="lg" className="w-full h-14">
            <a href={upcomingMeeting.google_html_link} target="_blank" rel="noreferrer">
              <CalendarPlus className="w-5 h-5 mr-2" /> Adicionar/ver na minha agenda
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="lg"
          className="w-full h-12"
          onClick={() => navigate('/status')}
        >
          Voltar para meu agendamento
        </Button>
      </div>
    </section>
  )
}
