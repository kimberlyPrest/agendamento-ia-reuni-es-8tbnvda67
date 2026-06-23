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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ProgramForm } from '@/components/admin/ProgramForm'
import { deleteProgram } from '@/services/api'
import { toast } from 'sonner'

export default function ProgramasList() {
  const [programs, setPrograms] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  const loadData = async () => {
    const res = await pb.collection('programs').getFullList({ sort: 'name' })
    setPrograms(res)
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('programs', () => loadData())

  const handleDelete = async (program: any) => {
    if (!window.confirm(`Excluir o programa ${program.name}?`)) return
    try {
      await deleteProgram(program.id)
      toast.success('Programa excluído.')
      loadData()
    } catch (_) {
      toast.error('Não foi possível excluir. Verifique se há clientes vinculados.')
    }
  }

  const closeDialog = () => {
    setOpen(false)
    setEditing(null)
    loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Programas</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Regras de quantidade, Tally, duração, remarcação e disponibilidade.
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
              <Plus className="w-4 h-4 mr-2" /> Novo programa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[720px] bg-card text-white border-border rounded-xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {editing ? 'Editar programa' : 'Novo programa'}
              </DialogTitle>
            </DialogHeader>
            <ProgramForm program={editing} onSuccess={closeDialog} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-background/60">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Calls</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Tally</TableHead>
              <TableHead>Intervalo</TableHead>
              <TableHead>Remarcação</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.total_meetings}</TableCell>
                <TableCell>{p.meeting_duration} min</TableCell>
                <TableCell>
                  <Badge variant={p.require_tally === false ? 'secondary' : 'default'}>
                    {p.require_tally === false ? 'Opcional' : 'Obrigatório'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {p.min_interval_days || 0}{' '}
                  {p.min_interval_unit === 'weeks'
                    ? 'sem.'
                    : p.min_interval_unit === 'months'
                      ? 'meses'
                      : 'dias'}
                </TableCell>
                <TableCell>
                  {p.min_reschedule_hours ?? 24}h antes
                  <span className="block text-xs text-muted-foreground">
                    tardia: +{p.late_reschedule_delay_days ?? 7} dias
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(p)
                        setOpen(true)
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(p)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {programs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum programa cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
