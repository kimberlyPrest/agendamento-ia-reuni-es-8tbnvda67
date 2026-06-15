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

export default function ProgramasList() {
  const [programs, setPrograms] = useState<any[]>([])

  const loadData = async () => {
    const res = await pb.collection('programs').getFullList()
    setPrograms(res)
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('programs', () => loadData())

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Programas</h2>
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
