import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { Users, Calendar as CalendarIcon, Briefcase, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const AdminInner = () => {
  const { isAuthenticated, signOut, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (loading) return null

  if (!isAuthenticated && !location.pathname.includes('/login')) {
    navigate('/admin/login')
    return null
  }

  if (location.pathname.includes('/login')) {
    return <Outlet />
  }

  const navItems = [
    { name: 'Clientes', href: '/admin/clientes', icon: Users },
    { name: 'Programas', href: '/admin/programas', icon: CalendarIcon },
    { name: 'Consultores', href: '/admin/consultores', icon: Briefcase },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6">
          <h2 className="font-display font-bold text-xl tracking-tight text-primary">
            Admin Portal
          </h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname.includes(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={() => {
              signOut()
              navigate('/admin/login')
            }}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/50 flex items-center px-8">
          <h1 className="font-semibold text-lg">
            {navItems.find((i) => location.pathname.includes(i.href))?.name || 'Dashboard'}
          </h1>
        </header>
        <div className="flex-1 p-8 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export const AdminLayout = () => {
  return (
    <AuthProvider>
      <AdminInner />
    </AuthProvider>
  )
}
