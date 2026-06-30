import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, Send } from 'lucide-react'

import { EliteBrand, ElitePanel } from '@/components/elite/ElitePrimitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { requestPasswordReset } = useAuth()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      setSubmitting(false)
      return
    }

    await requestPasswordReset(email.trim().toLowerCase())
    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <main className="elite-grid flex min-h-screen items-center justify-center p-6">
      <ElitePanel className="w-full max-w-md p-6 md:p-8">
        <div className="mb-10 flex justify-center">
          <EliteBrand compact />
        </div>

        {submitted ? (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl">Verifique sua caixa de entrada</h2>
              <p className="text-sm text-muted-foreground">
                Se existir uma conta para este e-mail, você receberá um link de recuperação em
                breve.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <div className="space-y-2">
              <h2 className="font-display text-xl text-center">Recupere sua senha</h2>
              <p className="text-sm text-muted-foreground text-center">
                Digite seu e-mail cadastrado e enviaremos um link de recuperação.
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-sm font-semibold text-muted-foreground">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-11"
                  placeholder="exemplo@adapta.elite"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <Button type="submit" size="lg" className="h-14 w-full" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar Link de Recuperação'}
              {!submitting && <Send className="h-5 w-5" />}
            </Button>
          </form>
        )}

        <Button asChild variant="outline" className="mt-6 w-full">
          <Link to="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Login
          </Link>
        </Button>
      </ElitePanel>
    </main>
  )
}
