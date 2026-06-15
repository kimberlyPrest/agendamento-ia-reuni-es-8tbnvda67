import { useEffect, useState } from 'react'
import { getPrograms, createProgram } from '@/services/api'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function AdminPrograms() {
  const [programs, setPrograms] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [total, setTotal] = useState('')

  const load = () => getPrograms().then(setPrograms)
  useEffect(() => {
    load()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createProgram({ name, total_meetings: Number(total), meeting_duration: 60 })
      toast.success('Programa criado!')
      setOpen(false)
      load()
    } catch {
      toast.error('Erro ao criar programa')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Novo Programa</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Criar Novo Programa</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4 pt-4">
              <Input
                placeholder="Nome do Programa"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                type="number"
                placeholder="Total de reuniões"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                required
              />
              <Button type="submit" className="w-full">
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Nome</TableHead>
              <TableHead>Total de Reuniões</TableHead>
              <TableHead>Duração (min)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((p) => (
              <TableRow key={p.id} className="border-border">
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.total_meetings}</TableCell>
                <TableCell>{p.meeting_duration}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
