import { useEffect, useState, type FormEvent } from 'react'
import { changePassword, getConsultantMe, syncTldv, updateConsultantProfile } from '@/services/hub'
import { getGoogleCalendarStatus, startGoogleOAuth } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CalendarCheck, KeyRound, Loader2, RefreshCw, Save, UserCog } from 'lucide-react'

const dayLabels = [
  ['monday', 'Segunda'],
  ['tuesday', 'Terça'],
  ['wednesday', 'Quarta'],
  ['thursday', 'Quinta'],
  ['friday', 'Sexta'],
  ['saturday', 'Sábado'],
  ['sunday', 'Domingo'],
]

const defaultWorkingHours: any = {
  monday: [{ start: '09:00', end: '18:00' }],
  tuesday: [{ start: '09:00', end: '18:00' }],
  wednesday: [{ start: '09:00', end: '18:00' }],
  thursday: [{ start: '09:00', end: '18:00' }],
  friday: [{ start: '09:00', end: '18:00' }],
  saturday: [],
  sunday: [],
}

function normalizeWorkingHours(value: any) {
  if (!value) return defaultWorkingHours
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch (_) {
      return defaultWorkingHours
    }
  }
  return { ...defaultWorkingHours, ...value }
}

export default function ConsultantSettings() {
  const [consultant, setConsultant] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [workingHours, setWorkingHours] = useState<any>(defaultWorkingHours)
  const [status, setStatus] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncingTldv, setSyncingTldv] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' })
  const [changingPassword, setChangingPassword] = useState(false)

  const load = async () => {
    const data = await getConsultantMe()
    setConsultant(data.consultant)
    setForm({
      name: data.consultant.name || '',
      email: data.consultant.email || '',
      whatsapp_number: data.consultant.whatsapp_number || '',
      photo_url: data.consultant.photo_url || '',
      tldv_api_key: data.consultant.tldv_api_key || '',
      working_timezone: data.consultant.working_timezone || 'America/Sao_Paulo',
    })
    setWorkingHours(normalizeWorkingHours(data.consultant.working_hours))
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message || 'Não foi possível carregar seu perfil.'))
  }, [])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const data = await updateConsultantProfile({
        ...form,
        email: String(form.email || '')
          .trim()
          .toLowerCase(),
        whatsapp_number: String(form.whatsapp_number || '').replace(/\D/g, ''),
        working_hours: workingHours,
      })
      setConsultant(data.consultant)
      toast.success('Perfil atualizado.')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar perfil.')
    } finally {
      setSaving(false)
    }
  }

  const testGoogle = async () => {
    if (!consultant?.id) return
    setTesting(true)
    try {
      const next = await getGoogleCalendarStatus(consultant.id)
      setStatus(next)
      if (next.google_connected) toast.success('Agenda Google acessível.')
      else toast.error(next.message || 'Agenda Google não conectada.')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao testar agenda.')
    } finally {
      setTesting(false)
    }
  }

  const connectGoogle = async () => {
    if (!consultant?.id) return
    setConnecting(true)
    try {
      const data = await startGoogleOAuth(consultant.id)
      const popup = window.open(data.url, 'google-oauth', 'width=520,height=720')
      if (!popup) window.location.href = data.url
      toast.info('Conclua a autorização na janela do Google.')
      let attempts = 0
      const timer = window.setInterval(async () => {
        attempts += 1
        try {
          const next = await getGoogleCalendarStatus(consultant.id)
          setStatus(next)
          if (next.google_connected || attempts >= 45) {
            window.clearInterval(timer)
            setConnecting(false)
            if (next.google_connected) toast.success('Google Calendar conectado.')
            else toast.info(next.message || 'Use Testar para confirmar a conexão.')
          }
        } catch (_) {
          if (attempts >= 45) {
            window.clearInterval(timer)
            setConnecting(false)
          }
        }
      }, 2000)
    } catch (err: any) {
      setConnecting(false)
      toast.error(err.message || 'Não foi possível iniciar o OAuth.')
    }
  }

  const changeOwnPassword = async () => {
    setChangingPassword(true)
    try {
      await changePassword(passwordForm.password, passwordForm.confirm)
      setPasswordForm({ password: '', confirm: '' })
      toast.success('Senha atualizada.')
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível alterar a senha.')
    } finally {
      setChangingPassword(false)
    }
  }

  const syncTldvNow = async () => {
    setSyncingTldv(true)
    try {
      const data = await syncTldv()
      if (!data.enabled) toast.info('Informe sua API key do tl;dv antes de sincronizar.')
      else toast.success(`tl;dv sincronizado: ${data.updated || 0} reunião(ões) atualizada(s).`)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao sincronizar tl;dv.')
    } finally {
      setSyncingTldv(false)
    }
  }

  const updateWindow = (day: string, index: number, field: 'start' | 'end', value: string) => {
    setWorkingHours((current: any) => ({
      ...current,
      [day]: (current[day] || []).map((window: any, i: number) =>
        i === index ? { ...window, [field]: value } : window,
      ),
    }))
  }

  const addWindow = (day: string) => {
    setWorkingHours((current: any) => ({
      ...current,
      [day]: [...(current[day] || []), { start: '09:00', end: '18:00' }],
    }))
  }

  const removeWindow = (day: string, index: number) => {
    setWorkingHours((current: any) => ({
      ...current,
      [day]: (current[day] || []).filter((_: any, i: number) => i !== index),
    }))
  }

  if (!consultant) return <div className="text-muted-foreground">Carregando configurações...</div>

  const connected = status?.google_connected || consultant.google_sync_status === 'connected'

  return (
    <form onSubmit={save} className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="font-display text-2xl font-bold">Configurações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Perfil, integrações e janelas de atendimento usadas no agendamento.
        </p>
      </div>

      <Card className="bg-card border-border rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" /> Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <Input
              value={form.whatsapp_number}
              onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Foto</Label>
            <Input
              value={form.photo_url}
              onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Senha
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input
              type="password"
              minLength={8}
              value={passwordForm.password}
              onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmar senha</Label>
            <Input
              type="password"
              minLength={8}
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={changingPassword || !passwordForm.password || !passwordForm.confirm}
            onClick={changeOwnPassword}
          >
            {changingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Alterar senha
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" /> Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-secondary p-4">
            <div>
              <Badge variant={connected ? 'default' : 'destructive'}>
                {connected ? 'Conectado' : 'Desconectado'}
              </Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                {status?.connected_email ||
                  consultant.google_connected_email ||
                  'Conecte sua conta para liberar horários reais.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={testGoogle}
                disabled={testing || connecting}
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Testar
              </Button>
              <Button type="button" onClick={connectGoogle} disabled={connecting || testing}>
                {connecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CalendarCheck className="w-4 h-4 mr-2" />
                )}
                {connected ? 'Reconectar' : 'Conectar'}
              </Button>
            </div>
          </div>
          {status?.message && <p className="text-sm text-muted-foreground">{status.message}</p>}
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> tl;dv
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API key do tl;dv</Label>
            <Input
              type="password"
              value={form.tldv_api_key}
              onChange={(e) => setForm({ ...form, tldv_api_key: e.target.value })}
              placeholder="Cole sua API key"
            />
          </div>
          <Button type="button" variant="outline" onClick={syncTldvNow} disabled={syncingTldv}>
            {syncingTldv ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Buscar gravações agora
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="font-display">Horários de atendimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dayLabels.map(([day, label]) => (
            <div
              key={day}
              className="grid gap-3 rounded-lg bg-secondary p-3 md:grid-cols-[110px_1fr]"
            >
              <div className="pt-2 text-sm text-muted-foreground">{label}</div>
              <div className="space-y-2">
                {(workingHours[day] || []).map((window: any, index: number) => (
                  <div key={`${day}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Input
                      type="time"
                      value={window.start}
                      onChange={(e) => updateWindow(day, index, 'start', e.target.value)}
                    />
                    <Input
                      type="time"
                      value={window.end}
                      onChange={(e) => updateWindow(day, index, 'end', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => removeWindow(day, index)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addWindow(day)}>
                  Adicionar janela
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving}>
        {saving ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        Salvar configurações
      </Button>
    </form>
  )
}
