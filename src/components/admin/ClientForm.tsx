import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import pb from '@/lib/pocketbase/client'
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

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  program_id: z.string().min(1, 'Programa é obrigatório'),
  consultant_id: z.string().min(1, 'Consultor é obrigatório'),
  current_meeting_number: z.coerce.number().min(0, 'Número inválido').default(1),
  form_answered: z.boolean().default(false),
})

interface ClientFormProps {
  programs: any[]
  consultants: any[]
  onSuccess: () => void
}

export function ClientForm({ programs, consultants, onSuccess }: ClientFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      program_id: '',
      consultant_id: '',
      current_meeting_number: 1,
      form_answered: false,
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await pb.collection('clients').create(values)
      toast.success('Cliente adicionado com sucesso!', {
        style: { backgroundColor: '#00C851', color: '#fff', border: 'none' },
      })
      onSuccess()
    } catch (err: unknown) {
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors.email) {
        form.setError('email', { message: 'E-mail já está em uso.' })
        toast.error('Erro: E-mail já está em uso.', {
          style: { backgroundColor: '#FF3B3B', color: '#fff', border: 'none' },
        })
      } else {
        toast.error('Ocorreu um erro ao adicionar o cliente.', {
          style: { backgroundColor: '#FF3B3B', color: '#fff', border: 'none' },
        })
      }
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-300">Nome</FormLabel>
              <FormControl>
                <Input
                  placeholder="Nome do cliente"
                  className="bg-zinc-900 border-zinc-800 text-white"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[#FF3B3B]" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-300">E-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  className="bg-zinc-900 border-zinc-800 text-white"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[#FF3B3B]" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="program_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Programa</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {programs.map((p) => (
                      <SelectItem
                        key={p.id}
                        value={p.id}
                        className="focus:bg-zinc-800 focus:text-white cursor-pointer"
                      >
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[#FF3B3B]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="consultant_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Consultor</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {consultants.map((c) => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                        className="focus:bg-zinc-800 focus:text-white cursor-pointer"
                      >
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[#FF3B3B]" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 items-end">
          <FormField
            control={form.control}
            name="current_meeting_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Reunião Atual</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    className="bg-zinc-900 border-zinc-800 text-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[#FF3B3B]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="form_answered"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 h-10 mb-0.5">
                <FormLabel className="text-zinc-300 text-sm font-normal">
                  Tally Respondido
                </FormLabel>
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

        <Button
          type="submit"
          className="w-full bg-[#FF6B00] text-[#FFFFFF] hover:bg-[#FF6B00]/90 rounded-[8px] mt-6"
        >
          Salvar Cliente
        </Button>
      </form>
    </Form>
  )
}
