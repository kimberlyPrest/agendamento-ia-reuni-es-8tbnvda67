import { useEffect, useState } from 'react'
import { z } from 'zod'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { UserCog, Plus } from 'lucide-react'

interface Consultant {
  id: string
  name: string
  email: string
  whatsapp_number: string
  google_calendar_id: string
  working_hours: any
}

const consultantSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  email: z.string().trim().email('Email inválido').or(z.literal('')),
  whatsapp_number: z.string().trim().optional(),
  google_calendar_id: z.string().trim().optional(),
  working_hours: z.string().refine((val) => {
    if (!val.trim()) return true
    try {
      JSON.parse(val)
      return true
    } catch {
      return false
    }
  }, 'JSON de horas de trabalho inválido'),
})

export default function AdminConsultants() {
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp_number: '',
    google_calendar_id: '',
    working_hours: '{\n  "monday": ["09:00-18:00"],\n  "tuesday": ["09:00-18:00"]\n}',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    try {
      const records = await pb.collection('consultants').getFullList<Consultant>({
        sort: '-created',
      })
      setConsultants(records)
    } catch (err) {
      toast.error('Erro ao carregar consultores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('consultants', () => {
    loadData()
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsSubmitting(true)

    const parsed = consultantSchema.safeParse(formData)
    if (!parsed.success) {
      const fieldErrs: Record<string, string> = {}
      parsed.error.issues.forEach((issue) => {
        fieldErrs[issue.path[0]] = issue.message
      })
      setErrors(fieldErrs)
      setIsSubmitting(false)
      return
    }

    const validData = parsed.data
    let parsedWorkingHours = null
    if (validData.working_hours && validData.working_hours.trim()) {
      parsedWorkingHours = JSON.parse(validData.working_hours)
    }

    try {
      await pb.collection('consultants').create({
        name: validData.name,
        email: validData.email,
        whatsapp_number: validData.whatsapp_number,
        google_calendar_id: validData.google_calendar_id,
        working_hours: parsedWorkingHours,
      })
      toast.success('Consultor adicionado com sucesso!')
      setOpen(false)
      setFormData({
        name: '',
        email: '',
        whatsapp_number: '',
        google_calendar_id: '',
        working_hours: '{\n  "monday": ["09:00-18:00"],\n  "tuesday": ["09:00-18:00"]\n}',
      })
    } catch (err) {
      const fieldErrors = extractFieldErrors(err)
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
      } else {
        toast.error('Erro ao criar consultor')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up bg-[#0A0A0A] text-[#FFFFFF] min-h-full p-2">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-2xl font-bold">Consultores</h2>
          <p className="text-muted-foreground font-sans mt-1">
            Gerencie os especialistas integrados ao sistema.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#FF6B00] hover:bg-[#E66000] text-white font-sans">
              <Plus className="w-4 h-4 mr-2" /> Novo Consultor
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#141414] border-[#2A2A2A] text-white sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-display">Adicionar Consultor</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4 pt-4 font-sans">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome do especialista"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="bg-[#0A0A0A] border-[#2A2A2A]"
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="bg-[#0A0A0A] border-[#2A2A2A]"
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_number">WhatsApp</Label>
                  <Input
                    id="whatsapp_number"
                    placeholder="+5511999999999"
                    value={formData.whatsapp_number}
                    onChange={(e) => handleInputChange('whatsapp_number', e.target.value)}
                    className="bg-[#0A0A0A] border-[#2A2A2A]"
                  />
                  {errors.whatsapp_number && (
                    <p className="text-sm text-red-500">{errors.whatsapp_number}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_calendar_id">ID Calendário Google</Label>
                  <Input
                    id="google_calendar_id"
                    placeholder="id@group.calendar.google.com"
                    value={formData.google_calendar_id}
                    onChange={(e) => handleInputChange('google_calendar_id', e.target.value)}
                    className="bg-[#0A0A0A] border-[#2A2A2A]"
                  />
                  {errors.google_calendar_id && (
                    <p className="text-sm text-red-500">{errors.google_calendar_id}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="working_hours">Horário de Trabalho (JSON)</Label>
                <Textarea
                  id="working_hours"
                  rows={4}
                  value={formData.working_hours}
                  onChange={(e) => handleInputChange('working_hours', e.target.value)}
                  className="bg-[#0A0A0A] border-[#2A2A2A] font-mono text-sm"
                />
                {errors.working_hours && (
                  <p className="text-sm text-red-500">{errors.working_hours}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-[#FF6B00] hover:bg-[#E66000] text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Consultor'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!loading && consultants.length === 0 ? (
        <Card className="border-[#2A2A2A] bg-[#141414] flex flex-col items-center justify-center py-16 text-center rounded-[12px]">
          <div className="w-16 h-16 rounded-full bg-[#2A2A2A] flex items-center justify-center mb-4">
            <UserCog className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display font-medium text-xl mb-2">Nenhum consultor encontrado</h3>
          <p className="text-muted-foreground font-sans max-w-sm mb-6">
            Você ainda não cadastrou nenhum especialista. Adicione o primeiro consultor para começar
            os agendamentos.
          </p>
          <Button
            className="bg-[#FF6B00] hover:bg-[#E66000] text-white font-sans"
            onClick={() => setOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar Primeiro Consultor
          </Button>
        </Card>
      ) : (
        <Card className="border-[#2A2A2A] bg-[#141414] rounded-[12px] overflow-hidden">
          <Table>
            <TableHeader className="bg-[#0A0A0A]/50">
              <TableRow className="border-[#2A2A2A] hover:bg-transparent">
                <TableHead className="font-sans text-muted-foreground">Nome</TableHead>
                <TableHead className="font-sans text-muted-foreground">Email</TableHead>
                <TableHead className="font-sans text-muted-foreground">WhatsApp</TableHead>
                <TableHead className="font-sans text-muted-foreground">ID Calendário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultants.map((c) => (
                <TableRow
                  key={c.id}
                  className="border-[#2A2A2A] hover:bg-[#2A2A2A]/50 transition-colors"
                >
                  <TableCell className="font-medium font-sans text-white">{c.name}</TableCell>
                  <TableCell className="font-sans text-muted-foreground">
                    {c.email || '-'}
                  </TableCell>
                  <TableCell className="font-sans text-muted-foreground">
                    {c.whatsapp_number || '-'}
                  </TableCell>
                  <TableCell className="font-sans text-muted-foreground">
                    {c.google_calendar_id || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
