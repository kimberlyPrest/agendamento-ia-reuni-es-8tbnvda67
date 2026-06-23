import { useEffect, useMemo, useState } from 'react'
import { cancelMeeting } from '@/services/api'
import { getConsultantClients } from '@/services/hub'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Download, Search } from 'lucide-react'
import { toast } from 'sonner'

function text(value: any) {
  return String(value || '').toLowerCase()
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function csvValue(value: any) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export default function ConsultantClients() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [tally, setTally] = useState('all')
  const [cancellingId, setCancellingId] = useState('')

  const loadClients = async () => {
    const data = await getConsultantClients()
    setRows(data.clients || [])
    setLoading(false)
  }

  useEffect(() => {
    loadClients().catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = text(query)
    return rows.filter((item) => {
      const client = item.client || {}
      const stats = item.stats || {}
      const matchesQuery =
        !q ||
        text(client.name).includes(q) ||
        text(client.email).includes(q) ||
        text(client.deal_name).includes(q) ||
        text(client.deal_stage_name).includes(q) ||
        text(client.expand?.program_id?.name).includes(q)
      const matchesStatus =
        status === 'all' ||
        (status === 'active' && !stats.finalised && !stats.booking_blocked) ||
        (status === 'finished' && stats.finalised) ||
        (status === 'blocked' && stats.booking_blocked) ||
        (status === 'scheduled' && stats.future_meetings > 0)
      const matchesTally =
        tally === 'all' ||
        (tally === 'answered' && client.form_answered) ||
        (tally === 'pending' && stats.requires_tally)
      return matchesQuery && matchesStatus && matchesTally
    })
  }, [rows, query, status, tally])

  const cancelFutureMeeting = async (client: any, meeting: any) => {
    if (!meeting?.id || !client?.id) return
    if (!window.confirm(`Cancelar o agendamento futuro de ${client.name}?`)) return
    setCancellingId(meeting.id)
    try {
      await cancelMeeting(
        meeting.id,
        client.id,
        'Cancelado pelo consultor após status de reembolso.',
      )
      await loadClients()
      toast.success('Agendamento cancelado.')
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível cancelar o agendamento.')
    } finally {
      setCancellingId('')
    }
  }

  const downloadCsv = () => {
    const header = [
      'Nome',
      'Email',
      'Programa',
      'Etapa',
      'Reuniões realizadas',
      'Total de reuniões',
      'Dias desde última reunião',
      'Tally',
      'Próxima reunião',
      'Telefone',
    ]
    const lines = filtered.map((item) => {
      const client = item.client || {}
      const stats = item.stats || {}
      return [
        client.name,
        client.email,
        client.expand?.program_id?.name,
        client.deal_stage_name || client.deal_stage_id,
        stats.completed_meetings,
        stats.max_meetings,
        stats.days_since_last_meeting ?? '',
        client.form_answered ? 'respondido' : 'pendente',
        formatDate(stats.upcoming?.start_time),
        client.contact_phone,
      ]
        .map(csvValue)
        .join(',')
    })
    const blob = new Blob([[header.map(csvValue).join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'clientes-elite.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-muted-foreground">Carregando clientes...</div>

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Clientes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Filtros rápidos, estágio do programa e dias desde a última reunião sempre visíveis.
          </p>
        </div>
        <Button onClick={downloadCsv} variant="outline">
          <Download className="w-4 h-4 mr-2" /> Baixar relatório
        </Button>
      </div>

      <Card className="bg-card border-border rounded-xl p-4 shadow-none">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, email, programa ou etapa"
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="finished">Finalizados</option>
            <option value="blocked">Bloqueados/reembolso</option>
            <option value="scheduled">Com próxima reunião</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={tally}
            onChange={(e) => setTally(e.target.value)}
          >
            <option value="all">Tally: todos</option>
            <option value="answered">Tally respondido</option>
            <option value="pending">Tally pendente</option>
          </select>
        </div>
      </Card>

      <Card className="bg-card border-border rounded-xl shadow-none overflow-hidden">
        <Table>
          <TableHeader className="bg-background/60">
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Programa</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Última reunião</TableHead>
              <TableHead>Próxima</TableHead>
              <TableHead>Tally</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => {
              const client = item.client || {}
              const stats = item.stats || {}
              return (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="font-medium">{client.name}</div>
                    <div className="text-xs text-muted-foreground">{client.email}</div>
                  </TableCell>
                  <TableCell>{client.expand?.program_id?.name || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.deal_stage_name || client.deal_stage_id || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge
                        variant={
                          stats.finalised
                            ? 'outline'
                            : stats.booking_blocked
                              ? 'destructive'
                              : 'default'
                        }
                      >
                        {stats.completed_meetings || 0}/{stats.max_meetings || 0}
                      </Badge>
                      {stats.booking_blocked && (
                        <p className="text-xs text-destructive">Reembolso bloqueado</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {stats.days_since_last_meeting === null ||
                    stats.days_since_last_meeting === undefined
                      ? 'Sem reunião'
                      : `${stats.days_since_last_meeting} dia(s)`}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div>{formatDate(stats.upcoming?.start_time)}</div>
                      {stats.booking_blocked && stats.upcoming && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={cancellingId === stats.upcoming.id}
                          onClick={() => cancelFutureMeeting(client, stats.upcoming)}
                        >
                          {cancellingId === stats.upcoming.id
                            ? 'Cancelando...'
                            : 'Cancelar agendamento'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        client.form_answered
                          ? 'default'
                          : stats.requires_tally
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {client.form_answered
                        ? 'Respondido'
                        : stats.requires_tally
                          ? 'Pendente'
                          : 'Não exigido'}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Nenhum cliente encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
