import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/use-client-store'
import { authClientByEmail } from '@/services/api'
import {
  EliteBrand,
  EliteHeaderAction,
  EliteKicker,
  EliteTrustNote,
} from '@/components/elite/ElitePrimitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, ArrowRight, UserCircle } from 'lucide-react'

export default function ClientIndex() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setClientData } = useClientStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      setError('Email não encontrado, coloque o email de compra do programa.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="animate-fade-in-up min-h-screen">
      <header className="border-b border-border bg-card/70">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-6">
          <EliteBrand compact />
          <Link to="/login" aria-label="Acessar central">
            <EliteHeaderAction>
              <UserCircle className="h-6 w-6" />
            </EliteHeaderAction>
          </Link>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <EliteKicker>Consultoria de Inteligência Artificial</EliteKicker>
        <h1 className="mt-10 max-w-4xl text-balance font-display text-5xl font-extrabold leading-tight text-foreground md:text-7xl">
          Central de Comando da sua <span className="text-primary">Consultoria</span>
        </h1>
        <p className="mt-8 max-w-3xl text-xl leading-9 text-muted-foreground md:text-2xl">
          Agende sua consultoria com o seu especialista ou acesse a área exclusiva para membro e
          acompanhe seu progresso.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-16 grid w-full max-w-4xl gap-4 md:grid-cols-[1fr_220px]"
        >
          <Input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-16 rounded-full px-8 text-lg"
            required
          />
          <Button type="submit" className="h-16 px-10 font-mono text-base" disabled={loading}>
            {loading ? 'Buscando...' : 'Enviar'}
            {!loading && <ArrowRight className="h-5 w-5" />}
          </Button>
        </form>

        {error && (
          <div className="mt-8 flex w-full max-w-3xl items-start gap-5 rounded-lg border border-destructive/40 bg-card/80 p-6 text-left">
            <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-destructive" />
            <div className="space-y-2 text-center md:text-left">
              <p className="font-mono text-sm font-bold uppercase text-destructive">
                E-mail não encontrado
              </p>
              <p className="text-lg leading-8 text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        <EliteTrustNote className="mt-20" />
      </div>
    </section>
  )
}
