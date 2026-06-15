import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { getClientByEmail } from '@/services/api'
import { useClient } from '@/hooks/use-client'
import { AlertCircle } from 'lucide-react'

export default function ClientEntry() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const navigate = useNavigate()
  const { setClientId } = useClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(false)
    const client = await getClientByEmail(email)
    setLoading(false)
    if (client) {
      setClientId(client.id)
      navigate('/status')
    } else {
      setError(true)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="text-center space-y-3">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Agende sua Reunião
        </h1>
        <p className="text-muted-foreground text-lg">com o seu especialista de IA</p>
      </div>

      <Card className="border-border bg-card p-6 shadow-elevation">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Seu email de compra do programa..."
              className="h-12 text-base bg-input/50 border-border"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md text-sm font-medium animate-fade-in-up border border-destructive/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Email não encontrado, coloque o email de compra do programa.
            </div>
          )}

          <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
            {loading ? 'Buscando...' : 'Acessar'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
