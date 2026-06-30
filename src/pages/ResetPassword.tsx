import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, KeyRound, Loader2 } from 'lucide-react'

import { EliteBrand, ElitePanel } from '@/components/elite/ElitePrimitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const { confirmPasswordReset } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    if (!token) {
      setError('Invalid or missing reset token. Please request a new reset link.')
      return
    }

    setSubmitting(true)
    const res = await confirmPasswordReset(token, password)
    setSubmitting(false)

    if (res.error) {
      setError(getErrorMessage(res.error))
      return
    }

    setSuccess(true)
    setTimeout(() => navigate('/login', { replace: true }), 3000)
  }

  if (!token) {
    return (
      <main className="elite-grid flex min-h-screen items-center justify-center p-6">
        <ElitePanel className="w-full max-w-md p-6 md:p-8">
          <div className="mb-10 flex justify-center">
            <EliteBrand compact />
          </div>
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <KeyRound className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="font-display text-xl">Invalid Reset Link</h2>
            <p className="text-sm text-muted-foreground">
              This reset link is missing a token. Please request a new password reset link.
            </p>
          </div>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link to="/forgot-password">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Request New Link
            </Link>
          </Button>
        </ElitePanel>
      </main>
    )
  }

  if (success) {
    return (
      <main className="elite-grid flex min-h-screen items-center justify-center p-6">
        <ElitePanel className="w-full max-w-md p-6 md:p-8">
          <div className="mb-10 flex justify-center">
            <EliteBrand compact />
          </div>
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-display text-xl">Password Reset Successfully</h2>
            <p className="text-sm text-muted-foreground">
              Your password has been updated. Redirecting you to the login page...
            </p>
          </div>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Login
            </Link>
          </Button>
        </ElitePanel>
      </main>
    )
  }

  return (
    <main className="elite-grid flex min-h-screen items-center justify-center p-6">
      <ElitePanel className="w-full max-w-md p-6 md:p-8">
        <div className="mb-10 flex justify-center">
          <EliteBrand compact />
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <div className="space-y-2 text-center">
            <h2 className="font-display text-xl">Set a New Password</h2>
            <p className="text-sm text-muted-foreground">
              Enter your new password below. It must be at least 8 characters.
            </p>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-sm font-semibold text-muted-foreground">
              New Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pl-11"
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-sm font-semibold text-muted-foreground">
              Confirm New Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="pl-11"
                minLength={8}
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
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Reset Password'}
          </Button>
        </form>

        <Button asChild variant="outline" className="mt-6 w-full">
          <Link to="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Link>
        </Button>
      </ElitePanel>
    </main>
  )
}
