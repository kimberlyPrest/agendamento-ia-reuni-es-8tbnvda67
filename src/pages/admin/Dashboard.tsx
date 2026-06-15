import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import useRealtime from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, Video } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ clients: 0, programs: 0, meetings: 0 })

  const loadStats = async () => {
    try {
      const clients = await pb.collection('clients').getList(1, 1)
      const programs = await pb.collection('programs').getList(1, 1)
      const meetings = await pb
        .collection('meetings')
        .getList(1, 1, { filter: "status = 'scheduled'" })
      setStats({
        clients: clients.totalItems,
        programs: programs.totalItems,
        meetings: meetings.totalItems,
      })
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadStats()
  }, [])
  useRealtime('meetings', () => loadStats())
  useRealtime('clients', () => loadStats())

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programas Ativos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.programs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reuniões Agendadas</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.meetings}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
