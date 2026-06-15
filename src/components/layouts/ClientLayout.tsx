import { Outlet } from 'react-router-dom'

export function ClientLayout() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Outlet />
      </div>
    </main>
  )
}
