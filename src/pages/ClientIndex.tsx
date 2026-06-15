import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientStore } from '@/stores/use-client-store'
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
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/client/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Email não encontrado')
      }

      setClientData(data.client, data.upcoming)
      navigate('/status')
    } catch (err: any) {
      setError('Email não encontrado, coloque o email de compra do programa.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in-up flex flex-col items-center text-center space-y-8">
      <div className="space-y-3">
        <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground text-balance">
          Agende sua Reunião com o seu especialista de IA
        </h1>
        <p className="text-muted-foreground text-lg">Acesse seu painel usando o email da compra.</p>
      </div>

      <Card className="w-full bg-card border-border shadow-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-sm font-medium text-foreground">Email de Acesso</label>
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
              <div className="flex items-center space-x-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium transition-all hover:scale-[0.98]"
              disabled={loading}
            >
              {loading ? 'Buscando...' : 'Acessar Painel'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
