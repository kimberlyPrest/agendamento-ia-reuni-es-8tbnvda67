import { useEffect, useState } from 'react'
import { getAdminOverview, syncSheetClients } from '@/services/hub'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Calendar, CheckCircle2, Loader2, RefreshCw, Users, UserCog } from 'lucide-react'

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const load = async () => {
    const overview = await getAdminOverview()
    setData(overview)
    setLoading(false)
  }

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [])

  const runSync = async () => {
    setSyncing(true)
    try {
      const result = await syncSheetClients()
      toast.success(`Planilha sincronizada: ${result.updated || 0} cliente(s) atualizados.`)
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao sincronizar planilha.')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <div className="text-muted-foreground">Carregando visão geral...</div>

  const kpis = data?.kpis || {}
  const cards = [
    { title: 'Clientes', value: kpis.clients || 0, icon: Users },
    { title: 'Consultores', value: kpis.consultants || 0, icon: UserCog },
    { title: 'Reuniões agendadas', value: kpis.scheduled_meetings || 0, icon: Calendar },
    { title: 'Calendários conectados', value: kpis.connected_calendars || 0, icon: CheckCircle2 },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Visão Geral</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Operação completa da consultoria: clientes, agendas, conexões e próximos compromissos.
          </p>
        </div>
        <Button onClick={runSync} disabled={syncing}>
          {syncing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Sincronizar planilha
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="bg-card border-border rounded-xl shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card border-border rounded-xl shadow-none">
          <CardHeader>
            <CardTitle className="font-display">Conexões dos consultores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.consultants || []).map((consultant: any) => (
              <div
                key={consultant.id}
                className="flex items-center justify-between rounded-lg bg-secondary p-3"
              >
                <div>
                  <p className="font-medium">{consultant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {consultant.google_connected_email || consultant.email || '-'}
                  </p>
                </div>
                <Badge
                  variant={
                    consultant.google_sync_status === 'connected' ? 'default' : 'destructive'
                  }
                >
                  {consultant.google_sync_status === 'connected' ? 'Google ok' : 'Pendente'}
                </Badge>
              </div>
            ))}
            {(data?.consultants || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum consultor cadastrado.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-xl shadow-none">
          <CardHeader>
            <CardTitle className="font-display">Próximas agendas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.upcoming_meetings || []).map((meeting: any) => (
              <div key={meeting.id} className="rounded-lg bg-secondary p-3">
                <p className="font-medium">{meeting.title || 'Consultoria Elite'}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(meeting.start_time)} -{' '}
                  {meeting.expand?.consultant_id?.name || 'Consultor'} com{' '}
                  {meeting.expand?.client_id?.name || 'Cliente'}
                </p>
              </div>
            ))}
            {(data?.upcoming_meetings || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma reunião futura encontrada.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
