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
import { createProgram } from '@/services/programs'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

const programSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  total_meetings: z.coerce.number().min(1, 'Obrigatório ter pelo menos 1 reunião'),
  meeting_duration: z.coerce.number().min(1, 'Duração é obrigatória'),
  title_template: z.string().optional(),
  tally_form_url: z.string().url('URL inválida').optional().or(z.literal('')),
  allow_concurrent: z.boolean().default(false),
  min_interval_days: z.coerce.number().min(0).default(0),
})

type ProgramFormValues = z.infer<typeof programSchema>

interface ProgramFormProps {
  onSuccess: () => void
}

export function ProgramForm({ onSuccess }: ProgramFormProps) {
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: '',
      total_meetings: 1,
      meeting_duration: 60,
      title_template: '',
      tally_form_url: '',
      allow_concurrent: false,
      min_interval_days: 0,
    },
  })

  const onSubmit = async (data: ProgramFormValues) => {
    try {
      await createProgram({
        ...data,
        tally_form_url: data.tally_form_url || '',
      })
      toast.success('Programa criado com sucesso!', {
        style: { background: '#00C851', color: '#fff', border: 'none' },
      })
      onSuccess()
    } catch (error) {
      const fieldErrors = extractFieldErrors(error)
      if (Object.keys(fieldErrors).length > 0) {
        Object.entries(fieldErrors).forEach(([field, msg]) => {
          form.setError(field as keyof ProgramFormValues, { message: msg })
        })
      } else {
        toast.error('Erro ao criar programa')
      }
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
              <FormLabel className="font-['DM_Sans',sans-serif] text-gray-200">
                Nome do Programa
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Mentoria Premium"
                  className="rounded-[8px] bg-transparent border-border focus-visible:ring-[#FF6B00]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="total_meetings"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-['DM_Sans',sans-serif] text-gray-200">
                  Qtd. de Consultorias
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    className="rounded-[8px] bg-transparent border-border focus-visible:ring-[#FF6B00]"
                    {...field}
                  />
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
                <FormLabel className="font-['DM_Sans',sans-serif] text-gray-200">
                  Tempo da Reunião (min)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    className="rounded-[8px] bg-transparent border-border focus-visible:ring-[#FF6B00]"
                    {...field}
                  />
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
              <FormLabel className="font-['DM_Sans',sans-serif] text-gray-200">
                Template de Título
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Reunião {meeting_number} - {client_name}"
                  className="rounded-[8px] bg-transparent border-border focus-visible:ring-[#FF6B00]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tally_form_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-['DM_Sans',sans-serif] text-gray-200">
                URL do Formulário Tally
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="https://tally.so/r/..."
                  className="rounded-[8px] bg-transparent border-border focus-visible:ring-[#FF6B00]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="min_interval_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-['DM_Sans',sans-serif] text-gray-200">
                  Intervalo mínimo (dias)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    className="rounded-[8px] bg-transparent border-border focus-visible:ring-[#FF6B00]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="allow_concurrent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-[8px] border border-border px-3 py-2 mt-auto h-10">
                <div className="space-y-0.5">
                  <FormLabel className="font-['DM_Sans',sans-serif] text-gray-200">
                    Agendamentos simultâneos?
                  </FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-[#FF6B00]"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white rounded-[8px] font-['DM_Sans',sans-serif] w-full sm:w-auto"
          >
            {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Programa'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
