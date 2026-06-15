import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  createConsultant,
  deleteConsultant,
  getGoogleCalendarStatus,
  startGoogleOAuth,
  updateConsultant,
} from '@/services/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  CalendarCheck,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserCog,
} from 'lucide-react'

const dayLabels = [
  ['monday', 'Segunda'],
  ['tuesday', 'Terça'],
  ['wednesday', 'Quarta'],
  ['thursday', 'Quinta'],
  ['friday', 'Sexta'],
  ['saturday', 'Sábado'],
  ['sunday', 'Domingo'],
]

const defaultWorkingHours = {
  monday: [
    { start: '09:00', end: '12:00' },
    { start: '14:00', end: '18:00' },
  ],
  tuesday: [
    { start: '09:00', end: '12:00' },
    { start: '14:00', end: '18:00' },
  ],
  wednesday: [
    { start: '09:00', end: '12:00' },
    { start: '14:00', end: '18:00' },
  ],
  thursday: [
    { start: '09:00', end: '12:00' },
    { start: '14:00', end: '18:00' },
  ],
  friday: [
    { start: '09:00', end: '12:00' },
    { start: '14:00', end: '18:00' },
  ],
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

function ConsultantForm({ consultant, onSuccess }: { consultant?: any; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: consultant?.name || '',
    email: consultant?.email || '',
    whatsapp_number: consultant?.whatsapp_number || '',
    google_calendar_id: consultant?.google_calendar_id || 'primary',
    working_timezone: consultant?.working_timezone || 'America/Sao_Paulo',
  })
  const [workingHours, setWorkingHours] = useState<any>(
    normalizeWorkingHours(consultant?.working_hours),
  )
  const [submitting, setSubmitting] = useState(false)

  const updateWindow = (day: string, index: number, field: 'start' | 'end', value: string) => {
    setWorkingHours((current: any) => ({
      ...current,
      [day]: current[day].map((window: any, i: number) =>
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
      [day]: current[day].filter((_: any, i: number) => i !== index),
    }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return toast.error('Nome é obrigatório')
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        email: form.email.trim().toLowerCase(),
        whatsapp_number: form.whatsapp_number.replace(/\D/g, ''),
        google_calendar_id: form.google_calendar_id || 'primary',
        working_hours: workingHours,
      }
      if (consultant?.id) await updateConsultant(consultant.id, payload)
      else await createConsultant(payload)
      toast.success(consultant?.id ? 'Consultor atualizado.' : 'Consultor criado.')
      onSuccess()
    } catch (_) {
      toast.error('Erro ao salvar consultor')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nome do especialista"
          />
        </div>
        <div className="space-y-2">
          <Label>Email do consultor</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="consultor@empresa.com"
          />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp</Label>
          <Input
            value={form.whatsapp_number}
            onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
            placeholder="5511999999999"
          />
        </div>
        <div className="space-y-2">
          <Label>ID do Google Calendar</Label>
          <Input
            value={form.google_calendar_id}
            onChange={(e) => setForm({ ...form, google_calendar_id: e.target.value })}
            placeholder="primary ou id@group.calendar.google.com"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Horários de atendimento</Label>
          <p className="text-xs text-muted-foreground mt-1">
            O sistema usa estas janelas e remove automaticamente conflitos encontrados no Google
            Calendar.
          </p>
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-secondary p-3">
          {dayLabels.map(([day, label]) => (
            <div
              key={day}
              className="grid grid-cols-[88px_1fr] gap-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
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
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? 'Salvando...' : consultant?.id ? 'Salvar alterações' : 'Salvar consultor'}
      </Button>
    </form>
  )
}

export default function AdminConsultants() {
  const [consultants, setConsultants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const records = await pb.collection('consultants').getFullList({ sort: 'name' })
      setConsultants(records)
    } catch (_) {
      toast.error('Erro ao carregar consultores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('consultants', () => loadData())

  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    loadData()
  }

  const handleConnectGoogle = async (consultant: any) => {
    setConnectingId(consultant.id)
    try {
      const data = await startGoogleOAuth(consultant.id)
      const popup = window.open(data.url, 'google-oauth', 'width=520,height=720')
      if (!popup) {
        window.location.href = data.url
        return
      }

      toast.info('Conclua a autorização do Google na janela aberta.')
      let finished = false
      let timer: ReturnType<typeof window.setInterval> | undefined

      const finish = async (status?: string, calendarStatus?: any) => {
        if (finished) return
        finished = true
        if (timer) window.clearInterval(timer)
        window.removeEventListener('message', onMessage)
        const nextStatus = calendarStatus?.status || status
        await loadData()
        if (nextStatus) {
          setConsultants((current) =>
            current.map((item) =>
              item.id === consultant.id
                ? {
                    ...item,
                    google_sync_status: nextStatus,
                    google_connected_email:
                      calendarStatus?.connected_email || item.google_connected_email,
                    google_calendar_id: calendarStatus?.calendar_id || item.google_calendar_id,
                  }
                : item,
            ),
          )
        }
        setConnectingId(null)
        if (nextStatus === 'connected') toast.success('Google Calendar conectado e sincronizado.')
        else if (nextStatus === 'missing_refresh_token') {
          toast.error(
            'Google autorizou, mas não enviou refresh token. Reconecte após revogar o acesso do app na conta Google.',
          )
        } else if (calendarStatus?.message) toast.error(calendarStatus.message)
        else
          toast.info('Ainda não consegui confirmar a conexão. Use Testar para ver o diagnóstico.')
      }

      const onMessage = (event: MessageEvent) => {
        const data = event.data || {}
        if (data.type === 'google-calendar-oauth' && data.consultantId === consultant.id) {
          setTimeout(() => finish(data.status), 500)
        }
      }

      window.addEventListener('message', onMessage)
      let attempts = 0
      timer = window.setInterval(async () => {
        attempts += 1
        let latestStatus: any = null
        try {
          latestStatus = await getGoogleCalendarStatus(consultant.id)
          if (latestStatus.google_connected || latestStatus.status === 'missing_refresh_token') {
            await finish(latestStatus.status, latestStatus)
            return
          }
        } catch (_) {
          latestStatus = null
        }
        if (attempts >= 60) await finish(latestStatus?.status, latestStatus)
      }, 2000)
    } catch (err: any) {
      setConnectingId(null)
      toast.error(err.message || 'Não foi possível iniciar OAuth do Google')
    }
  }

  const handleTestGoogle = async (consultant: any) => {
    setTestingId(consultant.id)
    try {
      const status = await getGoogleCalendarStatus(consultant.id)
      await loadData()
      if (status.google_connected) {
        setConsultants((current) =>
          current.map((item) =>
            item.id === consultant.id
              ? {
                  ...item,
                  google_sync_status: status.status || 'connected',
                  google_connected_email: status.connected_email || item.google_connected_email,
                  google_calendar_id: status.calendar_id || item.google_calendar_id,
                }
              : item,
          ),
        )
        toast.success(
          `Agenda acessível: ${status.busy_count_today || 0} conflito(s) encontrados hoje.`,
        )
      } else toast.error(status.message || 'Agenda Google ainda não está acessível.')
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível testar a agenda Google')
    } finally {
      setTestingId(null)
    }
  }

  const handleDelete = async (consultant: any) => {
    if (!window.confirm(`Excluir ${consultant.name}?`)) return
    try {
      await deleteConsultant(consultant.id)
      toast.success('Consultor excluído.')
      loadData()
    } catch (_) {
      toast.error('Não foi possível excluir. Verifique clientes vinculados.')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold">Consultores</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Conecte Google Calendar por OAuth e defina os horários de atendimento.
          </p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) setEditing(null)
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="w-4 h-4 mr-2" /> Novo consultor
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-white sm:max-w-[820px]">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editing ? 'Editar consultor' : 'Adicionar consultor'}
              </DialogTitle>
            </DialogHeader>
            <ConsultantForm consultant={editing} onSuccess={closeDialog} />
          </DialogContent>
        </Dialog>
      </div>

      {!loading && consultants.length === 0 ? (
        <Card className="border-border bg-card flex flex-col items-center justify-center py-16 text-center rounded-xl shadow-none">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <UserCog className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display font-medium text-xl mb-2">Nenhum consultor encontrado</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Adicione o primeiro especialista e conecte a agenda Google para liberar horários reais.
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar consultor
          </Button>
        </Card>
      ) : (
        <Card className="border-border bg-card rounded-xl overflow-hidden shadow-none">
          <Table>
            <TableHeader className="bg-background/60">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Calendário</TableHead>
                <TableHead>Status Google</TableHead>
                <TableHead className="w-[320px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultants.map((consultant) => {
                const googleStatus = consultant.google_sync_status || 'not_connected'
                const connected = googleStatus === 'connected'
                const statusLabel = connected
                  ? 'Conectado'
                  : googleStatus === 'missing_refresh_token'
                    ? 'Reconectar'
                    : googleStatus === 'calendar_error'
                      ? 'Erro'
                      : 'Pendente'
                return (
                  <TableRow key={consultant.id}>
                    <TableCell className="font-medium">{consultant.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {consultant.email || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {consultant.whatsapp_number || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {consultant.google_calendar_id || 'primary'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={connected ? 'default' : 'destructive'}>{statusLabel}</Badge>
                        {consultant.google_connected_email && (
                          <p className="text-xs text-muted-foreground">
                            {consultant.google_connected_email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant={connected ? 'outline' : 'default'}
                          onClick={() => handleConnectGoogle(consultant)}
                          disabled={connectingId === consultant.id}
                        >
                          {connectingId === consultant.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : connected ? (
                            <CalendarCheck className="w-4 h-4 mr-2" />
                          ) : (
                            <Link2 className="w-4 h-4 mr-2" />
                          )}
                          {connected ? 'Reconectar' : 'Conectar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestGoogle(consultant)}
                          disabled={testingId === consultant.id || connectingId === consultant.id}
                        >
                          {testingId === consultant.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Testar
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(consultant)
                            setOpen(true)
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(consultant)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
