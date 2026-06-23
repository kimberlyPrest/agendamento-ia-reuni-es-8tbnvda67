import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createProgram, updateProgram } from '@/services/api'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'

const TITLE_PLACEHOLDERS = [
  { label: 'Cliente', token: '{client_name}' },
  { label: 'Email', token: '{client_email}' },
  { label: 'Programa', token: '{program_name}' },
  { label: 'Nº reunião', token: '{meeting_number}' },
]

const TALLY_PLACEHOLDERS = [
  { label: 'Email', token: '{clients_email}' },
  { label: 'Nome completo', token: '{clients_name}' },
  { label: 'Primeiro nome', token: '{firstname}' },
]

const TALLY_TEMPLATE = 'https://tally.so/r/wdRX0N?e-mail={clients_email}&firstname={firstname}'

const programSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  total_meetings: z.coerce.number().min(1, 'Obrigatório ter pelo menos 1 reunião'),
  meeting_duration: z.coerce.number().min(15, 'Use pelo menos 15 minutos'),
  title_template: z.string().optional(),
  tally_form_template: z.string().min(1, 'Informe a URL do Tally').optional().or(z.literal('')),
  require_tally: z.boolean().default(true),
  allow_concurrent: z.boolean().default(false),
  max_future_meetings: z.coerce.number().min(1).default(1),
  min_interval_days: z.coerce.number().min(0).default(0),
  min_interval_unit: z.enum(['days', 'weeks', 'months']).default('days'),
  min_reschedule_hours: z.coerce.number().min(0).default(24),
  late_reschedule_delay_days: z.coerce.number().min(0).default(7),
  booking_window_days: z.coerce.number().min(1).default(60),
  buffer_before_minutes: z.coerce.number().min(0).default(0),
  buffer_after_minutes: z.coerce.number().min(0).default(0),
  confirmation_message: z.string().optional(),
})

type ProgramFormValues = z.infer<typeof programSchema>

interface ProgramFormProps {
  program?: any
  onSuccess: () => void
}

export function ProgramForm({ program, onSuccess }: ProgramFormProps) {
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: program?.name || '',
      total_meetings: program?.total_meetings || 1,
      meeting_duration: program?.meeting_duration || 60,
      title_template: program?.title_template || 'Consultoria {meeting_number} - {client_name}',
      tally_form_template: program?.tally_form_template || program?.tally_form_url || '',
      require_tally: program?.require_tally ?? true,
      allow_concurrent: program?.allow_concurrent ?? false,
      max_future_meetings: program?.max_future_meetings || 1,
      min_interval_days: program?.min_interval_days || 0,
      min_interval_unit: program?.min_interval_unit || 'days',
      min_reschedule_hours: program?.min_reschedule_hours ?? 24,
      late_reschedule_delay_days: program?.late_reschedule_delay_days ?? 7,
      booking_window_days: program?.booking_window_days || 60,
      buffer_before_minutes: program?.buffer_before_minutes || 0,
      buffer_after_minutes: program?.buffer_after_minutes || 0,
      confirmation_message: program?.confirmation_message || '',
    },
  })

  const insertPlaceholder = (field: 'title_template' | 'tally_form_template', token: string) => {
    const current = form.getValues(field) || ''
    const shouldAddSpace = field === 'title_template' && current && !current.endsWith(' ')
    form.setValue(field, `${current}${shouldAddSpace ? ' ' : ''}${token}`, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const useTallyTemplate = () => {
    form.setValue('tally_form_template', TALLY_TEMPLATE, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const onSubmit = async (data: ProgramFormValues) => {
    try {
      const payload = {
        ...data,
        tally_form_template: data.tally_form_template || '',
      }
      if (program?.id) await updateProgram(program.id, payload)
      else await createProgram(payload)
      toast.success(program?.id ? 'Programa atualizado.' : 'Programa criado.')
      onSuccess()
    } catch (error) {
      const fieldErrors = extractFieldErrors(error)
      if (Object.keys(fieldErrors).length > 0) {
        Object.entries(fieldErrors).forEach(([field, msg]) => {
          form.setError(field as keyof ProgramFormValues, { message: msg })
        })
        toast.error('Preencha os campos corretamente')
      } else {
        toast.error(getErrorMessage(error) || 'Erro ao salvar programa')
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Nome do programa</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Mentoria Elite IA" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="total_meetings"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qtd. de consultorias</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="meeting_duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duração (min)</FormLabel>
                <FormControl>
                  <Input type="number" min={15} step={15} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title_template"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título do evento</FormLabel>
              <FormControl>
                <Input placeholder="Consultoria - clique nos campos abaixo" {...field} />
              </FormControl>
              <div className="flex flex-wrap gap-2 pt-1">
                {TITLE_PLACEHOLDERS.map((item) => (
                  <Button
                    key={item.token}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-md border-primary/30 bg-primary/10 px-2 text-xs text-primary hover:bg-primary/20"
                    onClick={() => insertPlaceholder('title_template', item.token)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Exemplo: Consultoria Adapta Elite - Cliente - Nº reunião.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tally_form_template"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL do formulário Tally</FormLabel>
              <FormControl>
                <Input placeholder="Cole o link do Tally ou use o modelo abaixo" {...field} />
              </FormControl>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 rounded-md px-2 text-xs"
                  onClick={useTallyTemplate}
                >
                  Modelo Tally
                </Button>
                {TALLY_PLACEHOLDERS.map((item) => (
                  <Button
                    key={item.token}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-md border-primary/30 bg-primary/10 px-2 text-xs text-primary hover:bg-primary/20"
                    onClick={() => insertPlaceholder('tally_form_template', item.token)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Modelo configurado para o formulário wdRX0N, usando o hidden field e-mail.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="min_interval_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intervalo mínimo</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="min_interval_unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidade</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="days">Dias</SelectItem>
                    <SelectItem value="weeks">Semanas</SelectItem>
                    <SelectItem value="months">Meses</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="min_reschedule_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Antecedência remarcação (h)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="late_reschedule_delay_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prazo remarcação tardia (dias)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="booking_window_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Janela de agenda (dias)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="buffer_before_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Buffer antes (min)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step={5} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="buffer_after_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Buffer depois (min)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step={5} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="require_tally"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
                <FormLabel className="text-sm font-normal">Exigir Tally</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="allow_concurrent"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
                <FormLabel className="text-sm font-normal">Mais de uma futura</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="max_future_meetings"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Máx. futuras</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="confirmation_message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensagem de confirmação</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Mensagem exibida ao cliente após o agendamento (opcional)"
                  className="min-h-[100px] resize-y"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
          {form.formState.isSubmitting
            ? 'Salvando...'
            : program?.id
              ? 'Salvar alterações'
              : 'Salvar programa'}
        </Button>
      </form>
    </Form>
  )
}
