import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/use-client-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Clock, Video, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react'
import { format, differenceInHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ClientStatus() {
  const { client, upcomingMeeting, refreshClient } = useClientStore()
  const navigate = useNavigate()
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    if (!client) navigate('/')
  }, [client, navigate])

  if (!client) return null

  const program = client.expand?.program_id
  const consultant = client.expand?.consultant_id

  const handleSimulateTally = async () => {
    await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/client/simulate-tally`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: client.id }),
    })
    await refreshClient()
  }

  const handleCancel = async () => {
    if (!upcomingMeeting) return
    const hoursDiff = differenceInHours(new Date(upcomingMeeting.start_time), new Date())
    if (hoursDiff < 24) {
      setCancelError('Remarcações só são permitidas com no mínimo 24h de antecedência.')
      return
    }

    setCancelling(true)
    try {
      await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/calendar/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: upcomingMeeting.id }),
      })
      await refreshClient()
    } finally {
      setCancelling(false)
    }
  }

  if (!client.form_answered) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <h2 className="font-display font-bold text-2xl text-center">Atenção Necessária</h2>
        <Card className="bg-card border-primary/20">
          <CardContent className="p-6 space-y-6 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-primary" />
            </div>
            <p className="text-lg">
              Antes de agendar sua reunião você deve responder o formulário para que o consultor(a){' '}
              <strong className="text-primary">{consultant?.name}</strong> possa se preparar para te
              atender.
            </p>
            <div className="flex flex-col gap-3 pt-4">
              <Button asChild size="lg" className="w-full text-base">
                <a href={program?.tally_form_url} target="_blank" rel="noreferrer">
                  Responder Formulário <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
              <Button
                variant="ghost"
                onClick={handleSimulateTally}
                className="text-muted-foreground"
              >
                (Dev) Simular Preenchimento
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (client.current_meeting_number > (program?.total_meetings || 1)) {
    return (
      <div className="animate-fade-in-up space-y-6 text-center">
        <h2 className="font-display font-bold text-2xl">Jornada Concluída</h2>
        <Card className="bg-card">
          <CardContent className="p-6 space-y-4">
            <p className="text-lg text-muted-foreground">Sua consultoria já foi finalizada.</p>
            <Button asChild size="lg" className="w-full">
              <a
                href={`https://wa.me/${consultant?.whatsapp_number}`}
                target="_blank"
                rel="noreferrer"
              >
                Fazer Upgrade <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (upcomingMeeting) {
    const meetDate = new Date(upcomingMeeting.start_time)
    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="text-center space-y-2">
          <p className="text-primary font-medium">{program?.name}</p>
          <h2 className="font-display font-bold text-2xl">
            Olá, {client.name.split(' ')[0]}, como vai?
          </h2>
          <p className="text-muted-foreground">
            Seu agendamento já foi realizado com o(a) {consultant?.name}
          </p>
        </div>

        <Card className="bg-secondary border-border overflow-hidden">
          <div className="bg-primary/10 px-6 py-4 border-b border-border/50">
            <h3 className="font-display font-semibold text-lg flex items-center">
              <Video className="w-5 h-5 mr-2 text-primary" />
              Reunião Agendada
            </h3>
          </div>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center text-muted-foreground text-sm">
                  <Calendar className="w-4 h-4 mr-2" /> Data
                </div>
                <p className="font-medium">{format(meetDate, "dd 'de' MMMM", { locale: ptBR })}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {format(meetDate, 'EEEE', { locale: ptBR })}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-muted-foreground text-sm">
                  <Clock className="w-4 h-4 mr-2" /> Horário
                </div>
                <p className="font-medium">
                  {format(meetDate, 'HH:mm')} -{' '}
                  {format(new Date(upcomingMeeting.end_time), 'HH:mm')}
                </p>
              </div>
            </div>

            <Button asChild className="w-full" variant="secondary">
              <a href={upcomingMeeting.meet_link} target="_blank" rel="noreferrer">
                Acessar Google Meet
              </a>
            </Button>

            {cancelError && <p className="text-sm text-destructive text-center">{cancelError}</p>}

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCancel}
                disabled={cancelling}
              >
                Remarcar
              </Button>
              <Button
                variant="destructive"
                className="w-full bg-destructive/10 text-destructive hover:bg-destructive/20"
                onClick={handleCancel}
                disabled={cancelling}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-8">
      <div className="text-center space-y-2">
        <p className="text-primary font-medium tracking-wide">{program?.name}</p>
        <h2 className="font-display font-bold text-3xl">Bem-vindo, {client.name.split(' ')[0]}!</h2>
        <p className="text-muted-foreground text-lg">
          Vamos agendar a sua {client.current_meeting_number}ª reunião?
        </p>
      </div>

      <Card className="bg-[#FF6B0015] border-primary shadow-none">
        <CardContent className="p-5 text-sm leading-relaxed text-foreground/90">
          <strong className="block mb-2 text-primary">Importante:</strong>
          Escolha um dia e horário tranquilos, em que consiga se dedicar por inteiro, sem reuniões
          coladas, sem correria.
          <br />
          <br />
          Nota sobre remarcação: se precisar, avise com no mínimo 24h pelo WhatsApp do seu
          consultor. Evite ao máximo, remarcações dependem da agenda dele e o novo horário entra no
          fim da fila, o que pode levar tempo.
        </CardContent>
      </Card>

      <Button size="lg" className="w-full text-lg h-14" onClick={() => navigate('/schedule')}>
        Agendar Agora <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  )
}
