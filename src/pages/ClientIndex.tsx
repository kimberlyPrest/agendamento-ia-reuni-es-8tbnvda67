import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, ShieldCheck, UserCircle } from 'lucide-react'

import { EliteKicker } from '@/components/elite/ElitePrimitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { authClientByEmail } from '@/services/api'
import { useClientStore } from '@/stores/use-client-store'

export default function ClientIndex() {
  const [email, setEmail] = useState('')
  const [captureOpen, setCaptureOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)
  const { setClientData } = useClientStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (captureOpen) emailRef.current?.focus()
  }, [captureOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!captureOpen) {
      setCaptureOpen(true)
      return
    }
    if (!email) return
    setLoading(true)
    setError('')

    try {
      const data = await authClientByEmail(email)
      setClientData(
        data.client,
        data.upcoming || data.upcomingMeeting,
        data.stats,
        data.lastMeeting,
      )
      navigate('/status')
    } catch (_) {
      setError(
        'Não identificamos nenhuma consultoria comprada ou convite ativo vinculado a este e-mail.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative flex h-dvh min-h-[560px] flex-col overflow-hidden bg-surface-deep text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(61,174,146,.16),transparent_34rem)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(135,148,142,.14)_1px,transparent_1px)] [background-size:42px_42px]" />

      <header className="relative z-10 border-b border-border bg-surface-overlay/70 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between px-6">
          <span className="font-display text-sm font-extrabold text-primary">Adapta</span>
          <Link
            to="/login"
            aria-label="Acessar central"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
          >
            <UserCircle className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[800px] flex-1 flex-col items-center justify-center px-6 pb-16 pt-8 text-center">
        <EliteKicker className="min-h-6 rounded-full px-3 py-1 text-[0.62rem]">
          Consultoria de Inteligência Artificial
        </EliteKicker>

        <h1 className="mt-7 max-w-3xl text-balance font-display text-4xl font-extrabold leading-tight text-foreground md:text-6xl">
          Central de Comando da sua <span className="text-primary">Consultoria</span>
        </h1>
        <p className="mt-5 max-w-[600px] text-sm font-medium leading-7 text-muted-foreground md:text-base">
          Agende sua consultoria com o seu especialista ou acesse a área exclusiva para membro e
          acompanhe seu progresso.
        </p>

        <form
          onSubmit={handleSubmit}
          className={cn(
            'mt-10 flex flex-col items-stretch justify-center gap-3 transition-all duration-300 sm:flex-row',
            captureOpen ? 'w-full max-w-[520px]' : 'w-auto',
          )}
        >
          {captureOpen && (
            <Input
              ref={emailRef}
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-[52px] rounded-full border-border bg-secondary/70 px-6 text-sm"
              required
            />
          )}
          <Button
            type="submit"
            className="h-[52px] shrink-0 rounded-full px-8 font-mono text-[0.68rem] uppercase tracking-[0.1em] shadow-[0_18px_40px_-22px_rgba(61,174,146,.7)]"
            disabled={loading}
          >
            {loading ? 'Buscando...' : captureOpen ? 'Enviar' : 'Agendar Reunião Agora'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        {error && (
          <div className="mt-4 flex w-full max-w-[520px] items-start gap-3 rounded-lg border border-destructive/40 bg-surface-overlay/85 p-4 text-left backdrop-blur">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="space-y-1">
              <p className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.1em] text-destructive">
                E-mail não encontrado
              </p>
              <p className="text-sm leading-6 text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        <div className="mt-9 inline-flex items-center gap-2 border-l border-border pl-5 font-mono text-[0.68rem] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Acesso Exclusivo
        </div>
      </main>
    </section>
  )
}
