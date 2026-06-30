import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, Check, LogIn, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { EliteBrand } from '@/components/elite/ElitePrimitives'
import { Button } from '@/components/ui/button'
import { useClientStore } from '@/stores/use-client-store'

export default function ClientConfirmation() {
  const { client, upcomingMeeting } = useClientStore()
  const navigate = useNavigate()
  const location = useLocation()
  const confirmedMeeting = upcomingMeeting || location.state?.meeting || null

  useEffect(() => {
    if (!client || !confirmedMeeting) navigate('/status')
  }, [client, confirmedMeeting, navigate])

  if (!client || !confirmedMeeting) return null

  const meetDate = new Date(String(confirmedMeeting.start_time || '').replace(' ', 'T'))
  const consultant = client.expand?.consultant_id || confirmedMeeting.expand?.consultant_id
  const program = client.expand?.program_id || confirmedMeeting.expand?.program_id
  const validDate = !Number.isNaN(meetDate.getTime())
  const dayLabel = validDate ? format(meetDate, "d 'de' MMMM", { locale: ptBR }) : ''
  const timeLabel = validDate ? format(meetDate, 'HH:mm') : ''
  const whatsappText = encodeURIComponent(
    `Olá! Agendei minha reunião do programa ${program?.name || 'Elite'} para ${validDate ? `${format(meetDate, 'dd/MM/yyyy')} às ${timeLabel}` : 'o horário escolhido'}.`,
  )
  const whatsappNumber = String(consultant?.whatsapp_number || '').replace(/\D/g, '')

  return (
    <section className="elite-grid grid h-dvh overflow-hidden px-5 py-5 text-foreground sm:px-8 sm:py-6">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
        <header className="flex shrink-0 items-center justify-center py-2">
          <EliteBrand compact />
        </header>

        <main className="grid min-h-0 flex-1 place-items-center py-4">
          <div className="w-full max-w-2xl text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-primary/25 bg-card shadow-[0_0_50px_-18px_rgba(109,217,187,.85)] sm:h-24 sm:w-24">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground sm:h-14 sm:w-14">
                <Check className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
            </div>

            <p className="mt-7 font-mono text-xs font-bold uppercase tracking-[0.28em] text-primary">
              Agendamento confirmado
            </p>
            <h1 className="mx-auto mt-3 max-w-xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              Sua reunião está na agenda.
            </h1>

            <div className="mx-auto mt-6 grid max-w-lg gap-3 rounded-lg border border-border bg-card p-4 text-left shadow-none sm:grid-cols-[auto_1fr] sm:p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {dayLabel || 'Data confirmada'}
                  {timeLabel ? `, às ${timeLabel}` : ''}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {program?.name || 'Consultoria Elite'} com {consultant?.name || 'seu consultor'}.
                </p>
              </div>
            </div>

            <div className="mx-auto mt-6 grid max-w-lg gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                className="h-12 rounded-full font-mono"
                onClick={() => navigate('/login')}
              >
                Entrar no portal <LogIn className="h-5 w-5" />
              </Button>
              {whatsappNumber ? (
                <Button asChild variant="outline" size="lg" className="h-12 rounded-full font-mono">
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Falar com consultor <MessageCircle className="h-5 w-5" />
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full font-mono"
                  onClick={() => navigate('/status')}
                >
                  Ver status
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </section>
  )
}
