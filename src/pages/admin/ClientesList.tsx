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

export default function ClientesList() {
  const [clients, setClients] = useState<any[]>([])

  const loadData = async () => {
    const res = await pb.collection('clients').getFullList({ expand: 'program_id,consultant_id' })
    setClients(res)
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('clients', () => loadData())

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Clientes</h2>
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Programa</TableHead>
              <TableHead>Consultor</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead>Tally</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.expand?.program_id?.name}</TableCell>
                <TableCell>{c.expand?.consultant_id?.name}</TableCell>
                <TableCell>
                  {c.current_meeting_number} / {c.expand?.program_id?.total_meetings}
                </TableCell>
                <TableCell>
                  <Badge variant={c.form_answered ? 'default' : 'destructive'}>
                    {c.form_answered ? 'Respondido' : 'Pendente'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
