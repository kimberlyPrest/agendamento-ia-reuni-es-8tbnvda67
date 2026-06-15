import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

import { AuthProvider } from '@/hooks/use-auth'
import { ClientStoreProvider } from '@/stores/use-client-store'

import { ClientLayout } from '@/components/layouts/ClientLayout'
import ClientIndex from '@/pages/ClientIndex'
import ClientStatus from '@/pages/ClientStatus'
import ClientSchedule from '@/pages/ClientSchedule'
import ClientConfirmation from '@/pages/ClientConfirmation'

import { AdminLayout } from '@/components/layouts/AdminLayout'
import AdminLogin from '@/pages/admin/Login'
import AdminDashboard from '@/pages/admin/Dashboard'
import ClientesList from '@/pages/admin/ClientesList'
import ProgramasList from '@/pages/admin/ProgramasList'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ClientStoreProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Client Flow */}
            <Route element={<ClientLayout />}>
              <Route path="/" element={<ClientIndex />} />
              <Route path="/status" element={<ClientStatus />} />
              <Route path="/schedule" element={<ClientSchedule />} />
              <Route path="/confirmation" element={<ClientConfirmation />} />
            </Route>

            {/* Admin Flow */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/clientes" element={<ClientesList />} />
              <Route path="/admin/programas" element={<ProgramasList />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </ClientStoreProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
