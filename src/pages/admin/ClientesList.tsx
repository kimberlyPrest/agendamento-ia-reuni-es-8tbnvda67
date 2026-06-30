import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ClientForm } from '@/components/admin/ClientForm'
import { deleteClient, syncTallySubmissions } from '@/services/api'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { toast } from 'sonner'

const PER_PAGE_OPTIONS = [20, 50, 100]

export default function ClientesList() {
  const [clients, setClients] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [consultants, setConsultants] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [programFilter, setProgramFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [syncingTally, setSyncingTally] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [viewingPayload, setViewingPayload] = useState<any | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadData = async () => {
    setLoading(true)
    try {
      const parts: string[] = []
      if (programFilter !== 'all') parts.push(`program_id = "${programFilter}"`)
      if (debouncedSearch)
        parts.push(`(name ~ "${debouncedSearch}" || email ~ "${debouncedSearch}")`)
      const filter = parts.join(' && ')
      const res = await pb.collection('clients').getList(page, perPage, {
        expand: 'program_id,consultant_id',
        sort: 'name',
        ...(filter ? { filter } : {}),
      })
      setClients(res.items)
      setTotalItems(res.totalItems)
      setTotalPages(res.totalPages)
    } catch (_) {
      toast.error('Não foi possível carregar os clientes.')
    } finally {
      setLoading(false)
    }
  }

  const loadRefs = async () => {
    const [progs, cons] = await Promise.all([
      pb.collection('programs').getFullList({ sort: 'name' }),
      pb.collection('consultants').getFullList({ sort: 'name' }),
    ])
    setPrograms(progs)
    setConsultants(cons)
  }

  useEffect(() => {
    loadData()
  }, [page, perPage, programFilter, debouncedSearch])

  useEffect(() => {
    loadRefs()
  }, [])

  useRealtime('clients', () => loadData())

  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    loadData()
  }

  const handleDelete = async (client: any) => {
    if (!window.confirm(`Excluir ${client.name}?`)) return
    try {
      await deleteClient(client.id)
      toast.success('Cliente excluído.')
      loadData()
    } catch (_) {
      toast.error('Não foi possível excluir o cliente.')
    }
  }

  const handleTallySync = async () => {
    setSyncingTally(true)
    try {
      const result = await syncTallySubmissions()
      await loadData()
      if (!result.enabled) {
        toast.error('Configure TALLY_API_KEY para sincronizar respostas antigas.')
        return
      }
      toast.success(
        `Tally sincronizado: ${result.updated} cliente(s) atualizado(s) em ${result.checked} resposta(s).`,
      )
    } catch (_) {
      toast.error('Não foi possível sincronizar o Tally.')
    } finally {
      setSyncingTally(false)
    }
  }

  const handlePerPageChange = (value: string) => {
    setPerPage(Number(value))
    setPage(1)
  }

  const handleProgramFilterChange = (value: string) => {
    setProgramFilter(value)
    setPage(1)
  }

  const getLimit = (client: any) => {
    if (client.meeting_limit_override > 0) return client.meeting_limit_override
    return (
      Number(client.expand?.program_id?.total_meetings || 0) + Number(client.extra_meetings || 0)
    )
  }

  const rangeStart = totalItems > 0 ? (page - 1) * perPage + 1 : 0
  const rangeEnd = Math.min(page * perPage, totalItems)

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Clientes</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Estágio, formulário Tally, exceções e consultor responsável.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <Input
            placeholder="Buscar por nome ou email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-64"
          />
          <Select value={programFilter} onValueChange={handleProgramFilterChange}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Filtrar programa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os programas</SelectItem>
              {programs.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="secondary" onClick={handleTallySync} disabled={syncingTally}>
            {syncingTally ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sincronizar Tally
          </Button>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next)
              if (!next) setEditing(null)
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="w-4 h-4 mr-2" /> Novo cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border rounded-xl sm:max-w-[680px] text-white">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editing ? 'Editar cliente' : 'Adicionar cliente'}
                </DialogTitle>
              </DialogHeader>
              <ClientForm
                client={editing}
                programs={programs}
                consultants={consultants}
                onSuccess={closeDialog}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-background/60">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Programa</TableHead>
              <TableHead>Consultor</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead>Tally</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : (
              <>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.expand?.program_id?.name}</TableCell>
                    <TableCell>{client.expand?.consultant_id?.name}</TableCell>
                    <TableCell>
                      {client.current_meeting_number || 1} / {getLimit(client)}
                      {client.extra_meetings > 0 && (
                        <span className="text-muted-foreground"> +{client.extra_meetings}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant={client.form_answered ? 'default' : 'destructive'}
                              className="cursor-default"
                            >
                              {client.form_answered ? (
                                <>
                                  <Check className="w-3 h-3 mr-1" /> Respondido
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 mr-1" /> Pendente
                                </>
                              )}
                            </Badge>
                          </TooltipTrigger>
                          {client.form_answered && client.tally_answered_at && (
                            <TooltipContent>
                              Respondido em{' '}
                              {new Date(client.tally_answered_at).toLocaleString('pt-BR')}
                            </TooltipContent>
                          )}
                        </Tooltip>
                        {client.form_answered && client.tally_payload && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setViewingPayload(client)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(client)
                            setOpen(true)
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(client)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {clients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {rangeStart}-{rangeEnd} de {totalItems}
            </span>
            <Select value={String(perPage)} onValueChange={handlePerPageChange}>
              <SelectTrigger className="w-[90px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PER_PAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Página {page} de {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!viewingPayload} onOpenChange={(next) => !next && setViewingPayload(null)}>
        <DialogContent className="bg-card border-border rounded-xl sm:max-w-[640px] text-white max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Respostas do Tally</DialogTitle>
          </DialogHeader>
          {viewingPayload && (
            <div className="space-y-3">
              {viewingPayload.tally_answered_at && (
                <p className="text-sm text-muted-foreground">
                  Respondido em:{' '}
                  {new Date(viewingPayload.tally_answered_at).toLocaleString('pt-BR')}
                </p>
              )}
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {JSON.stringify(viewingPayload.tally_payload, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
