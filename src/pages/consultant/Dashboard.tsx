import { useEffect, useState } from 'react'
import { getConsultantDashboard } from '@/services/hub'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, CheckCircle2, Clock, FileWarning, Users } from 'lucide-react'

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function clientName(item: any) {
  return item?.client?.name || item?.client?.email || '-'
}

export default function ConsultantDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getConsultantDashboard()
      .then(setData)
      .catch((err) => setError(err.message || 'Erro ao carregar dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-muted-foreground">Carregando dashboard...</div>
  if (error) return <div className="text-destructive">{error}</div>

  const kpis = data?.kpis || {}
  const cards = [
    { title: 'Clientes totais', value: kpis.total_clients || 0, icon: Users },
    { title: 'Clientes ativos', value: kpis.active_clients || 0, icon: Clock },
    { title: 'Finalizados', value: kpis.finished_clients || 0, icon: CheckCircle2 },
    { title: 'Tally pendente', value: kpis.tally_pending || 0, icon: FileWarning },
    { title: 'Reuniões hoje', value: kpis.meetings_today || 0, icon: CalendarDays },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="font-display text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Sua fila de clientes, reuniões do dia e sinais que precisam de atenção.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                <div className="text-3xl font-bold font-display">{card.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-card border-border rounded-xl shadow-none">
          <CardHeader>
            <CardTitle className="font-display">Agenda de hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.meetings_today || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma reunião agendada para hoje.</p>
            ) : (
              data.meetings_today.map((meeting: any) => (
                <div key={meeting.id} className="rounded-lg border border-border bg-secondary p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{meeting.title || 'Consultoria Elite'}</p>
                      <p className="text-sm text-muted-foreground">
                        {meeting.expand?.client_id?.name || 'Cliente'} -{' '}
                        {formatDateTime(meeting.start_time)}
                      </p>
                    </div>
                    {meeting.meet_link && (
                      <a
                        className="text-sm text-primary hover:underline"
                        href={meeting.meet_link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir Meet
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-xl shadow-none">
          <CardHeader>
            <CardTitle className="font-display">Clientes em foco</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.clients || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente vinculado ainda.</p>
            ) : (
              data.clients.map((item: any) => (
                <div
                  key={item.client.id}
                  className="flex items-center justify-between rounded-lg bg-secondary p-3"
                >
                  <div>
                    <p className="font-medium">{clientName(item)}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.stats.completed_meetings}/{item.stats.max_meetings} reuniões realizadas
                    </p>
                  </div>
                  <Badge variant={item.stats.finalised ? 'outline' : 'default'}>
                    {item.stats.finalised ? 'Finalizado' : 'Ativo'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
