import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useClient } from '@/hooks/use-client'
import { getClientDetails, getUpcomingMeeting, cancelMeeting } from '@/services/api'
import { CalendarDays, Video, Clock } from 'lucide-react'
import { format, differenceInHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

export default function ClientStatus() {
  const { clientId, setClientId } = useClient()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [meeting, setMeeting] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) {
      navigate('/')
      return
    }
    const load = async () => {
      try {
        const c = await getClientDetails(clientId)
        const m = await getUpcomingMeeting(clientId)
        setData(c)
        setMeeting(m)
      } catch (e) {
        setClientId(null)
        navigate('/')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clientId, navigate, setClientId])

  if (loading)
    return (
      <div className="text-center text-muted-foreground animate-pulse mt-20">Carregando...</div>
    )

  const program = data?.expand?.program_id
  const consultant = data?.expand?.consultant_id

  // Blocker: Tally Form
  if (!data?.form_answered) {
    return (
      <Card className="p-8 text-center space-y-6 animate-fade-in-up border-primary/20 bg-card">
        <h2 className="text-2xl font-display font-bold text-white">Ação Necessária</h2>
        <p className="text-muted-foreground leading-relaxed">
          Antes de agendar sua reunião você deve responder o formulário para que o consultor(a){' '}
          <strong className="text-foreground">{consultant?.name}</strong> possa se preparar para te
          atender.
        </p>
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={() => window.open('https://tally.so', '_blank')}
        >
          Responder Formulário
        </Button>
      </Card>
    )
  }

  // Max Meetings
  if (data?.current_meeting_number > program?.total_meetings) {
    return (
      <Card className="p-8 text-center space-y-6 animate-fade-in-up bg-card border-border">
        <h2 className="text-2xl font-display font-bold text-white">
          Sua consultoria já foi finalizada.
        </h2>
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={() => window.open(`https://wa.me/${consultant?.whatsapp_number}`, '_blank')}
        >
          Fazer Upgrade
        </Button>
      </Card>
    )
  }

  // Upcoming
  if (meeting) {
    const meetingDate = new Date(meeting.start_time)
    const hoursDiff = differenceInHours(meetingDate, new Date())
    const canReschedule = hoursDiff >= 24

    const handleCancel = async () => {
      if (!canReschedule)
        return toast.error('Remarcações só são permitidas com no mínimo 24h de antecedência.')
      if (confirm('Deseja realmente cancelar?')) {
        await cancelMeeting(meeting.id)
        setMeeting(null)
        toast.success('Agendamento cancelado com sucesso.')
      }
    }

    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="space-y-2">
          <span className="text-primary font-medium tracking-wide uppercase text-sm">
            {program?.name}
          </span>
          <h1 className="font-display text-3xl font-bold text-white">Olá, {data.name}!</h1>
          <p className="text-muted-foreground">
            Seu agendamento já foi realizado com o(a) {consultant?.name}
          </p>
        </div>
        <Card className="p-6 space-y-6 bg-secondary/20 border-border">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white capitalize">
                {format(meetingDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h3>
              <div className="flex items-center gap-2 text-muted-foreground mt-1 font-medium">
                <Clock className="w-4 h-4" />
                <span>{format(meetingDate, 'HH:mm')}</span>
              </div>
            </div>
          </div>
          <a
            href={meeting.meet_link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-md font-semibold transition-colors shadow-sm"
          >
            <Video className="w-5 h-5" /> Acessar Reunião no Meet
          </a>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="outline" className="w-full font-medium" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="w-full font-medium"
              onClick={() => {
                if (!canReschedule)
                  return toast.error(
                    'Remarcações só são permitidas com no mínimo 24h de antecedência.',
                  )
                cancelMeeting(meeting.id).then(() => navigate('/schedule'))
              }}
            >
              Remarcar
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Ready to Schedule
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="space-y-2">
        <span className="text-primary font-medium tracking-wide uppercase text-sm">
          {program?.name}
        </span>
        <h1 className="font-display text-3xl font-bold text-white">Bem-vindo, {data.name}!</h1>
        <p className="text-muted-foreground">
          Vamos agendar a sua {data.current_meeting_number}ª reunião?
        </p>
      </div>

      <div className="bg-primary/10 border border-primary/30 p-5 rounded-xl space-y-3">
        <h4 className="font-semibold text-primary">Aviso Importante</h4>
        <p className="text-sm leading-relaxed text-primary/80">
          Escolha um dia e horário tranquilos, em que consiga se dedicar por inteiro, sem reuniões
          coladas, sem correria.
          <br />
          <br />
          <strong>Nota sobre remarcação:</strong> se precisar, avise com no mínimo 24h pelo WhatsApp
          do seu consultor. Evite ao máximo, remarcações dependem da agenda dele e o novo horário
          entra no fim da fila, o que pode levar tempo.
        </p>
      </div>

      <Button className="w-full h-14 text-lg font-bold" onClick={() => navigate('/schedule')}>
        Agendar Agora
      </Button>
    </div>
  )
}
