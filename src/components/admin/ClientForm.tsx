import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient, updateClient } from '@/services/api'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  program_id: z.string().min(1, 'Programa é obrigatório'),
  consultant_id: z.string().min(1, 'Consultor é obrigatório'),
  current_meeting_number: z.coerce.number().min(1, 'Número inválido').default(1),
  form_answered: z.boolean().default(false),
  extra_meetings: z.coerce.number().min(0).default(0),
  meeting_limit_override: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
})

interface ClientFormProps {
  client?: any
  programs: any[]
  consultants: any[]
  onSuccess: () => void
}

export function ClientForm({ client, programs, consultants, onSuccess }: ClientFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: client?.name || '',
      email: client?.email || '',
      program_id: client?.program_id || '',
      consultant_id: client?.consultant_id || '',
      current_meeting_number: client?.current_meeting_number || 1,
      form_answered: client?.form_answered || false,
      extra_meetings: client?.extra_meetings || 0,
      meeting_limit_override: client?.meeting_limit_override || 0,
      notes: client?.notes || '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const payload = { ...values, email: values.email.trim().toLowerCase() }
      if (client?.id) await updateClient(client.id, payload)
      else await createClient(payload)
      toast.success(client?.id ? 'Cliente atualizado.' : 'Cliente adicionado.')
      onSuccess()
    } catch (err: unknown) {
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors.email) {
        form.setError('email', { message: 'E-mail já está em uso.' })
      }
      toast.error(fieldErrors.email ? 'E-mail já está em uso.' : 'Erro ao salvar cliente.')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome do cliente" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail de compra</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="program_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Programa</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="consultant_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Consultor</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {consultants.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 items-end">
          <FormField
            control={form.control}
            name="current_meeting_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Próxima reunião</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="extra_meetings"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Calls extras</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="meeting_limit_override"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limite específico</FormLabel>
                <FormControl>
                  <Input type="number" min={0} placeholder="0 = regra" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="form_answered"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
              <FormLabel className="text-sm font-normal">Tally respondido</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas internas</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Exceções, contexto comercial, observações..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? 'Salvando...'
            : client?.id
              ? 'Salvar alterações'
              : 'Salvar cliente'}
        </Button>
      </form>
    </Form>
  )
}
