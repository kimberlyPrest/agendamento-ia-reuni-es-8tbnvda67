import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, CalendarPlus, Check, MessageCircle, Video } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { EliteBrand, ElitePanel } from '@/components/elite/ElitePrimitives'
import { Button } from '@/components/ui/button'
import { useClientStore } from '@/stores/use-client-store'

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
  const meetingLabel = `${format(meetDate, "d 'de' MMMM", { locale: ptBR })} às ${format(
    meetDate,
    'HH:mm',
  )}`

  return (
    <section className="animate-fade-in-up flex min-h-screen flex-col">
      <header className="flex justify-center px-6 py-8">
        <EliteBrand />
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 py-14 text-center">
        <div className="flex h-32 w-32 items-center justify-center rounded-full border border-primary/30 bg-background shadow-[0_0_64px_-16px_rgba(109,217,187,.75)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-10 w-10" />
          </div>
        </div>

        <h1 className="mt-16 font-display text-5xl font-extrabold leading-tight md:text-7xl">
          Agendamento Confirmado
        </h1>
        <p className="mt-8 flex items-center gap-3 text-xl font-semibold text-muted-foreground">
          <Calendar className="h-5 w-5" /> {meetingLabel}
        </p>

        <ElitePanel className="mt-14 max-w-2xl p-8 text-left">
          <div className="flex gap-5">
            <span className="mt-1 h-3 w-3 rounded-full bg-[#60a5fa] shadow-[0_0_16px_rgba(96,165,250,.85)]" />
            <div>
              <p className="font-mono text-sm font-bold uppercase text-muted-foreground">
                Política de reagendamento
              </p>
              <p className="mt-4 text-lg font-semibold leading-8 text-muted-foreground">
                Caso precise reagendar, isso deve ser feito com no mínimo{' '}
                <strong className="text-foreground">24h de antecedência</strong> pela sua Área de
                Membros da Consultoria ou via WhatsApp diretamente com o seu consultor.
              </p>
            </div>
          </div>
        </ElitePanel>

        <div className="mt-14 grid w-full max-w-2xl gap-4 md:grid-cols-2">
          {upcomingMeeting.google_html_link && (
            <Button asChild size="lg" className="h-14 font-mono">
              <a href={upcomingMeeting.google_html_link} target="_blank" rel="noreferrer">
                Ver na agenda <CalendarPlus className="h-5 w-5" />
              </a>
            </Button>
          )}
          {consultant?.whatsapp_number && (
            <Button asChild variant="outline" size="lg" className="h-14 font-mono">
              <a
                href={`https://wa.me/${consultant.whatsapp_number}?text=${whatsappText}`}
                target="_blank"
                rel="noreferrer"
              >
                Conversar com o consultor <MessageCircle className="h-5 w-5" />
              </a>
            </Button>
          )}
          {upcomingMeeting.meet_link && (
            <Button asChild variant="secondary" size="lg" className="h-14 font-mono md:col-span-2">
              <a href={upcomingMeeting.meet_link} target="_blank" rel="noreferrer">
                Abrir Google Meet <Video className="h-5 w-5" />
              </a>
            </Button>
          )}
          {!upcomingMeeting.google_html_link && !consultant?.whatsapp_number && (
            <Button size="lg" className="h-14 font-mono" onClick={() => navigate('/status')}>
              Voltar para meu agendamento
            </Button>
          )}
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-7xl items-center justify-between bg-surface-deep px-6 py-10 font-mono text-sm text-muted-foreground">
        <span>© 2026 Adapta Elite. Executive Briefing Systems.</span>
        <button type="button" onClick={() => navigate('/status')} className="hover:text-primary">
          Support
        </button>
      </footer>
    </section>
  )
}
