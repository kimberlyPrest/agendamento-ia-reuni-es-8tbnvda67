import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/use-client-store'
import { authClientByEmail } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, ArrowRight } from 'lucide-react'

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
    } catch (err: any) {
      const message = String(err?.message || '')
      setError(
        message.toLowerCase().includes('email não encontrado')
          ? 'Email não encontrado, coloque o email de compra do programa.'
          : message || 'Não foi possível buscar seus dados agora. Tente novamente em instantes.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="animate-fade-in-up flex flex-col items-center text-center space-y-8">
      <div className="space-y-3">
        <p className="text-primary text-sm font-medium uppercase tracking-[0.18em]">
          Agendamentos Elite
        </p>
        <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground text-balance">
          Agende sua reunião com seu especialista de IA
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          Use o email de compra do programa para encontrar sua consultoria.
        </p>
      </div>

      <Card className="w-full bg-card border-border shadow-none">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-sm font-medium text-foreground">Email de compra</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-background border-border focus-visible:ring-primary"
                required
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md text-left">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-base font-medium" disabled={loading}>
              {loading ? 'Buscando...' : 'Continuar para agendar'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>
          <div className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
            Quer ver gravações, histórico e dados da consultoria?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Entrar na central
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
