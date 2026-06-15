import { useEffect, useState } from 'react'
import { getClients } from '@/services/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export default function AdminClients() {
  const [clients, setClients] = useState<any[]>([])

  useEffect(() => {
    getClients().then(setClients)
  }, [])

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Programa</TableHead>
              <TableHead>Consultor</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Formulário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id} className="border-border">
                <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.email}</TableCell>
                <TableCell>{c.expand?.program_id?.name}</TableCell>
                <TableCell>{c.expand?.consultant_id?.name}</TableCell>
                <TableCell>
                  {c.current_meeting_number} / {c.expand?.program_id?.total_meetings}
                </TableCell>
                <TableCell>
                  {c.form_answered ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      Respondido
                    </Badge>
                  ) : (
                    <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                      Pendente
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
