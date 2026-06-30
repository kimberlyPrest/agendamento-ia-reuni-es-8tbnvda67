import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, LogIn, UserRound, Link2 } from 'lucide-react'

import { EliteBrand, ElitePanel } from '@/components/elite/ElitePrimitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

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
    <main className="elite-grid flex min-h-screen items-center justify-center p-6">
      <ElitePanel className="w-full max-w-md p-6 md:p-8">
        <div className="mb-10 flex justify-center">
          <EliteBrand compact />
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <div className="space-y-2">
            <label className="font-mono text-sm font-semibold text-muted-foreground">Email</label>
            <div className="relative">
              <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="pl-11"
                placeholder="officer@adapta.elite"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-sm font-semibold text-muted-foreground">Senha</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pl-11"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="h-14 w-full" disabled={submitting}>
            {submitting ? 'Entrando...' : 'Entrar'}
            {!submitting && <LogIn className="h-5 w-5" />}
          </Button>

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-1 font-mono text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Link2 className="h-3 w-3" />
              Forgot password?
            </Link>
          </div>
        </form>

        <Button asChild variant="outline" className="mt-6 w-full"></Button>
      </ElitePanel>
    </main>
  )
}
