import { useEffect, useState, type FormEvent } from 'react'
import pb from '@/lib/pocketbase/client'
import { syncSheetClients } from '@/services/hub'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { DatabaseZap, Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-react'

const emptyForm = {
  id: '',
  kind: 'deal_stage',
  external_id: '',
  name: '',
  consultant_id: '',
  program_id: '',
}

export default function ExternalIds() {
  const [records, setRecords] = useState<any[]>([])
  const [consultants, setConsultants] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [form, setForm] = useState<any>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const load = async () => {
    const [ids, consultantRecords, programRecords] = await Promise.all([
      pb.collection('external_ids').getFullList({ sort: 'kind,name' }),
      pb.collection('consultants').getFullList({ sort: 'name' }),
      pb.collection('programs').getFullList({ sort: 'name' }),
    ])
    setRecords(ids)
    setConsultants(consultantRecords)
    setPrograms(programRecords)
    setLoading(false)
  }

  useEffect(() => {
    load().catch(() => toast.error('Erro ao carregar IDs.'))
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.external_id.trim() || !form.name.trim())
      return toast.error('ID e nome são obrigatórios.')
    setSaving(true)
    try {
      const payload = {
        kind: form.kind,
        external_id: form.external_id.trim(),
        name: form.name.trim(),
        consultant_id: form.consultant_id,
        program_id: form.program_id,
      }
      if (form.id) await pb.collection('external_ids').update(form.id, payload)
      else await pb.collection('external_ids').create(payload)
      setForm(emptyForm)
      await load()
      toast.success('ID salvo.')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar ID.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (record: any) => {
    if (!window.confirm(`Excluir o ID ${record.external_id}?`)) return
    try {
      await pb.collection('external_ids').delete(record.id)
      await load()
      toast.success('ID removido.')
    } catch (_) {
      toast.error('Erro ao remover ID.')
    }
  }

  const syncSheets = async () => {
    setSyncing(true)
    try {
      const data = await syncSheetClients()
      toast.success(`Planilha sincronizada: ${data.updated || 0} cliente(s) atualizados.`)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao sincronizar planilha.')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <div className="text-muted-foreground">Carregando IDs...</div>

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">IDs externos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Relacione IDs do HubSpot/Sheets com nomes legíveis, consultores e programas.
          </p>
        </div>
        <Button onClick={syncSheets} disabled={syncing}>
          {syncing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Sincronizar planilha
        </Button>
      </div>

      <Card className="bg-card border-border rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <DatabaseZap className="h-5 w-5 text-primary" /> Novo relacionamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
              >
                <option value="deal_stage">Etapa do negócio</option>
                <option value="owner">Proprietário</option>
                <option value="program">Programa</option>
                <option value="product">Produto</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>ID externo</Label>
              <Input
                value={form.external_id}
                onChange={(e) => setForm({ ...form, external_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome legível</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Consultor</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.consultant_id}
                onChange={(e) => setForm({ ...form, consultant_id: e.target.value })}
              >
                <option value="">Nenhum</option>
                {consultants.map((consultant) => (
                  <option key={consultant.id} value={consultant.id}>
                    {consultant.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Programa</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.program_id}
                onChange={(e) => setForm({ ...form, program_id: e.target.value })}
              >
                <option value="">Nenhum</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-5 flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : form.id ? 'Atualizar ID' : 'Salvar ID'}
              </Button>
              {form.id && (
                <Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>
                  Cancelar edição
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-xl shadow-none overflow-hidden">
        <Table>
          <TableHeader className="bg-background/60">
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>ID externo</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Consultor</TableHead>
              <TableHead>Programa</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>
                  <Badge variant="outline">{record.kind}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{record.external_id}</TableCell>
                <TableCell>{record.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {consultants.find((item) => item.id === record.consultant_id)?.name || '-'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {programs.find((item) => item.id === record.program_id)?.name || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setForm({ ...emptyForm, ...record })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => remove(record)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhum ID cadastrado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
