import { useEffect, useMemo, useState } from 'react'
import { cancelMeeting } from '@/services/api'
import { getConsultantClients, linkTldvMeeting, searchTldvMeetings } from '@/services/hub'
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
import { Download, Link2, Loader2, Search, X } from 'lucide-react'
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
  const [tldvLink, setTldvLink] = useState<any>(null)
  const [tldvQuery, setTldvQuery] = useState('')
  const [tldvResults, setTldvResults] = useState<any[]>([])
  const [searchingTldv, setSearchingTldv] = useState(false)
  const [linkingTldvId, setLinkingTldvId] = useState('')

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

  const openTldvLink = async (client: any, meeting: any) => {
    if (!meeting?.id) return
    const queryText = [client.email, client.name, formatDate(meeting.start_time)]
      .filter(Boolean)
      .join(' ')
    setTldvLink({ client, meeting })
    setTldvQuery(queryText)
    setTldvResults([])
    setSearchingTldv(true)
    try {
      const data = await searchTldvMeetings(queryText)
      setTldvResults(data.meetings || [])
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível buscar reuniões do tl;dv.')
    } finally {
      setSearchingTldv(false)
    }
  }

  const searchTldv = async () => {
    setSearchingTldv(true)
    try {
      const data = await searchTldvMeetings(tldvQuery)
      setTldvResults(data.meetings || [])
      if (!data.enabled) toast.info('Informe sua API key do tl;dv em Configurações.')
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível buscar reuniões do tl;dv.')
    } finally {
      setSearchingTldv(false)
    }
  }

  const linkTldv = async (remote: any) => {
    if (!tldvLink?.meeting?.id || !remote?.id) return
    setLinkingTldvId(remote.id)
    try {
      await linkTldvMeeting(tldvLink.meeting.id, remote.id)
      await loadClients()
      setTldvLink(null)
      toast.success('Reunião do tl;dv vinculada.')
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível vincular a reunião do tl;dv.')
    } finally {
      setLinkingTldvId('')
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
              <TableHead>tl;dv</TableHead>
              <TableHead>Tally</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => {
              const client = item.client || {}
              const stats = item.stats || {}
              const lastMeeting = stats.last_meeting
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
                    {lastMeeting ? (
                      <div className="space-y-2">
                        {lastMeeting.tldv_url ? (
                          <a
                            className="text-xs text-primary hover:underline"
                            href={lastMeeting.tldv_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir tl;dv
                          </a>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openTldvLink(client, lastMeeting)}
                          >
                            <Link2 className="mr-2 h-4 w-4" /> Linkar
                          </Button>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
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
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Nenhum cliente encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {tldvLink && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <Card className="w-full max-w-2xl bg-card border-border rounded-xl p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-semibold">Linkar reunião tl;dv</h3>
                <p className="text-sm text-muted-foreground">
                  {tldvLink.client?.name || tldvLink.client?.email} -{' '}
                  {formatDateTime(tldvLink.meeting?.start_time)}
                </p>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => setTldvLink(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={tldvQuery}
                onChange={(event) => setTldvQuery(event.target.value)}
                placeholder="Buscar por nome, email, data ou link"
              />
              <Button type="button" variant="outline" onClick={searchTldv} disabled={searchingTldv}>
                {searchingTldv ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Buscar
              </Button>
            </div>
            <div className="mt-4 max-h-[420px] space-y-2 overflow-auto">
              {tldvResults.map((remote) => (
                <div
                  key={remote.id}
                  className="grid gap-3 rounded-lg border border-border bg-secondary p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{remote.name || 'Reunião tl;dv'}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateTime(remote.started_at)} -{' '}
                      {(remote.emails || []).join(', ') || remote.id}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => linkTldv(remote)}
                    disabled={linkingTldvId === remote.id}
                  >
                    {linkingTldvId === remote.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    Vincular
                  </Button>
                </div>
              ))}
              {!searchingTldv && tldvResults.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma reunião encontrada no tl;dv.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
