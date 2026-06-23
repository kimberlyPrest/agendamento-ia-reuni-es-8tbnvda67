import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { changePassword, skipPasswordChange } from '@/services/hub'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { KeyRound, Loader2 } from 'lucide-react'

async function refreshSession() {
  await pb
    .collection('users')
    .authRefresh()
    .catch(() => undefined)
}

export default function ConsultantChangePassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const navigate = useNavigate()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await changePassword(password, confirm)
      await refreshSession()
      toast.success('Senha atualizada com sucesso.')
      navigate('/consultor/dashboard', { replace: true })
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível alterar a senha.')
    } finally {
      setSaving(false)
    }
  }

  const skip = async () => {
    setSkipping(true)
    try {
      await skipPasswordChange()
      await refreshSession()
      toast.info('Você pode trocar a senha depois em Configurações.')
      navigate('/consultor/dashboard', { replace: true })
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível pular agora.')
    } finally {
      setSkipping(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
      <Card className="w-full bg-card border-border rounded-xl shadow-none">
        <CardHeader className="space-y-3 text-center">
          <Badge className="mx-auto w-fit bg-primary/15 text-primary hover:bg-primary/15">
            Primeiro acesso
          </Badge>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">Troque sua senha inicial</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sua conta foi criada com uma senha padrão. Você pode trocar agora ou fazer isso depois
            em Configurações.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                minLength={8}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving || skipping}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Trocar senha
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={skip}
              disabled={saving || skipping}
            >
              {skipping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pular por enquanto
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
