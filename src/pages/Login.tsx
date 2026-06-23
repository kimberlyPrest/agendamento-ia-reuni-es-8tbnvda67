import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function routeForRecord(record?: any) {
  if (record?.role === 'admin') return '/admin/dashboard'
  if (record?.role === 'consultant') {
    return record?.must_change_password ? '/consultor/trocar-senha' : '/consultor/dashboard'
  }
  if (record?.role === 'client') return '/cliente/central'
  return '/cliente/central'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await signIn(email.trim().toLowerCase(), password)
    setSubmitting(false)
    if (res.error) {
      setError('Email ou senha inválidos.')
      return
    }
    navigate(routeForRecord(pb.authStore.record), { replace: true })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border rounded-xl shadow-none">
        <CardHeader className="space-y-3 text-center">
          <Badge className="mx-auto w-fit bg-primary/15 text-primary hover:bg-primary/15">
            Portal Elite
          </Badge>
          <CardTitle className="font-display text-3xl">Acesse sua central</CardTitle>
          <p className="text-sm text-muted-foreground">
            Clientes podem agendar sem senha pelo email. O login libera histórico, gravações e dados
            da consultoria.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <div className="mt-5 flex flex-col gap-2 text-center text-sm text-muted-foreground">
            <Link to="/" className="text-primary hover:underline">
              Agendar sem senha usando apenas meu email
            </Link>
            <span>Senha padrão inicial dos clientes importados: AdaptaElite26.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
