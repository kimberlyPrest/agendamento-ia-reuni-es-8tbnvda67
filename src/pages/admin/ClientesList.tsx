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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ClientForm } from '@/components/admin/ClientForm'

export default function ClientesList() {
  const [clients, setClients] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [consultants, setConsultants] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  const loadData = async () => {
    const res = await pb.collection('clients').getFullList({ expand: 'program_id,consultant_id' })
    setClients(res)
  }

  const loadRefs = async () => {
    try {
      const [progs, cons] = await Promise.all([
        pb.collection('programs').getFullList(),
        pb.collection('consultants').getFullList(),
      ])
      setPrograms(progs)
      setConsultants(cons)
    } catch (err) {
      console.error('Failed to load references', err)
    }
  }

  useEffect(() => {
    loadData()
    loadRefs()
  }, [])

  useRealtime('clients', () => loadData())

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>
          Clientes
        </h2>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-[#FF6B00] text-[#FFFFFF] rounded-[8px] hover:bg-[#FF6B00]/90 font-medium px-5"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#141414] border-[#2A2A2A] rounded-[12px] sm:rounded-[12px] text-white">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Syne, sans-serif' }}>
                Adicionar Novo Cliente
              </DialogTitle>
            </DialogHeader>
            <ClientForm
              programs={programs}
              consultants={consultants}
              onSuccess={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

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
