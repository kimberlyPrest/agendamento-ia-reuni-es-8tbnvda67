import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { CalendarCheck, LayoutDashboard, LogOut, Settings, Shield, Users } from 'lucide-react'

export function ConsultantLayout() {
  const { user, isAuthenticated, loading, signOut } = useAuth()
  const location = useLocation()
  const role = user?.role

  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role !== 'consultant' && role !== 'admin') return <Navigate to="/cliente/central" replace />
  if (
    role === 'consultant' &&
    user?.must_change_password &&
    location.pathname !== '/consultor/trocar-senha'
  ) {
    return <Navigate to="/consultor/trocar-senha" replace />
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4 border-b border-border">
          <h2 className="font-display font-bold text-xl text-primary">Elite Hub</h2>
          <p className="text-xs text-muted-foreground">Visão consultor</p>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/consultor/dashboard">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/consultor/clientes">
                    <Users className="w-4 h-4 mr-2" /> Clientes
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/consultor/configuracoes">
                    <Settings className="w-4 h-4 mr-2" /> Configurações
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {role === 'admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/admin/dashboard">
                      <Shield className="w-4 h-4 mr-2" /> Admin
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <div className="mt-auto p-4 space-y-2">
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link to="/">
              <CalendarCheck className="w-4 h-4 mr-2" /> Fluxo de agendamento
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </Sidebar>
      <SidebarInset className="bg-background flex flex-col">
        <header className="h-14 border-b border-border flex items-center px-6">
          <h1 className="font-display font-medium">Central da Consultoria Elite</h1>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
