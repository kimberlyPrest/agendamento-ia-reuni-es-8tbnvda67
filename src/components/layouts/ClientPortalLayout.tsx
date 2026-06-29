import { Link, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { EliteBrand } from '@/components/elite/ElitePrimitives'
import { CalendarCheck, Home, LogOut, Video } from 'lucide-react'

export function ClientPortalLayout() {
  const { user, isAuthenticated, loading, signOut } = useAuth()
  const role = user?.role

  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />
  if (role === 'consultant') return <Navigate to="/consultor/dashboard" replace />
  if (role !== 'client') return <Navigate to="/login" replace />

  return (
    <div className="elite-grid min-h-screen bg-background">
      <header className="border-b border-border bg-card/70 sticky top-0 z-30 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/cliente/central" aria-label="Central Elite">
            <EliteBrand
              compact
              className="[&>div:first-child]:h-9 [&>div:first-child]:w-9 [&>div:last-child]:text-xl"
            />
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/cliente/central">
                <Home className="w-4 h-4 mr-2" /> Central
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/cliente/reunioes">
                <Video className="w-4 h-4 mr-2" /> Reuniões
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <CalendarCheck className="w-4 h-4 mr-2" /> Agendar sem senha
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
