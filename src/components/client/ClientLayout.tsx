import { Outlet } from 'react-router-dom'
import { ClientProvider } from '@/hooks/use-client'

export const ClientLayout = () => {
  return (
    <ClientProvider>
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-xl mx-auto">
          <Outlet />
        </div>
      </div>
    </ClientProvider>
  )
}
