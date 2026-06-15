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
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ProgramForm } from '@/components/admin/ProgramForm'

export default function ProgramasList() {
  const [programs, setPrograms] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  const loadData = async () => {
    const res = await pb.collection('programs').getFullList({ sort: '-created' })
    setPrograms(res)
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('programs', () => loadData())

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold font-['Syne',sans-serif]">Programas</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white font-['DM_Sans',sans-serif] rounded-[8px]">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Novo Programa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-[#141414] text-white border-border rounded-[12px]">
            <DialogHeader>
              <DialogTitle className="font-['Syne',sans-serif] text-xl">Novo Programa</DialogTitle>
            </DialogHeader>
            <ProgramForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Total de Reuniões</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Intervalo Min (Dias)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.total_meetings}</TableCell>
                <TableCell>{p.meeting_duration} min</TableCell>
                <TableCell>{p.min_interval_days}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
