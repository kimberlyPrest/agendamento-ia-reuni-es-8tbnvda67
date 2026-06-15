import { useEffect, useMemo, useState } from 'react'
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
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ClientesList() {
  const [clients, setClients] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [consultants, setConsultants] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [programFilter, setProgramFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [syncingTally, setSyncingTally] = useState(false)

  const loadData = async () => {
    const res = await pb
      .collection('clients')
      .getFullList({ expand: 'program_id,consultant_id', sort: 'name' })
    setClients(res)
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
    loadRefs()
  }, [])

  useRealtime('clients', () => loadData())

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesProgram = programFilter === 'all' || client.program_id === programFilter
      const term = search.trim().toLowerCase()
      const matchesSearch =
        !term ||
        client.name?.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term)
      return matchesProgram && matchesSearch
    })
  }, [clients, programFilter, search])

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

  const getLimit = (client: any) => {
    if (client.meeting_limit_override > 0) return client.meeting_limit_override
    return (
      Number(client.expand?.program_id?.total_meetings || 0) + Number(client.extra_meetings || 0)
    )
  }

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
          <Select value={programFilter} onValueChange={setProgramFilter}>
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
            {filteredClients.map((client) => (
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
                  <Badge variant={client.form_answered ? 'default' : 'destructive'}>
                    {client.form_answered ? 'Respondido' : 'Pendente'}
                  </Badge>
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
            {filteredClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
