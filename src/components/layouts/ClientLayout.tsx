import { Outlet } from 'react-router-dom'

export function ClientLayout() {
  return (
    <main className="elite-grid min-h-screen bg-background text-foreground">
      <div className="min-h-screen">
        <Outlet />
      </div>
    </main>
  )
}
