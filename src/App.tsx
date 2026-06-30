import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

import { AuthProvider } from '@/hooks/use-auth'
import { ClientStoreProvider } from '@/stores/use-client-store'

import { ClientLayout } from '@/components/layouts/ClientLayout'
import { ClientPortalLayout } from '@/components/layouts/ClientPortalLayout'
import { ConsultantLayout } from '@/components/layouts/ConsultantLayout'
import ClientIndex from '@/pages/ClientIndex'
import ClientStatus from '@/pages/ClientStatus'
import ClientSchedule from '@/pages/ClientSchedule'
import ClientConfirmation from '@/pages/ClientConfirmation'

import { AdminLayout } from '@/components/layouts/AdminLayout'
import Login from '@/pages/Login'
import AdminLogin from '@/pages/admin/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import AdminDashboard from '@/pages/admin/Dashboard'
import ClientesList from '@/pages/admin/ClientesList'
import ProgramasList from '@/pages/admin/ProgramasList'
import Consultants from '@/pages/admin/Consultants'
import ExternalIds from '@/pages/admin/ExternalIds'
import ConsultantDashboard from '@/pages/consultant/Dashboard'
import ConsultantClients from '@/pages/consultant/Clients'
import ConsultantSettings from '@/pages/consultant/Settings'
import ConsultantChangePassword from '@/pages/consultant/ChangePassword'
import ClientCentral from '@/pages/client-portal/Central'
import ClientMeetings from '@/pages/client-portal/Meetings'
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

            {/* Login */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin Flow */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/clientes" element={<ClientesList />} />
              <Route path="/admin/programas" element={<ProgramasList />} />
              <Route path="/admin/consultores" element={<Consultants />} />
              <Route path="/admin/ids" element={<ExternalIds />} />
            </Route>

            {/* Consultant Flow */}
            <Route path="/consultor" element={<Navigate to="/consultor/dashboard" replace />} />
            <Route element={<ConsultantLayout />}>
              <Route path="/consultor/trocar-senha" element={<ConsultantChangePassword />} />
              <Route path="/consultor/dashboard" element={<ConsultantDashboard />} />
              <Route path="/consultor/clientes" element={<ConsultantClients />} />
              <Route path="/consultor/configuracoes" element={<ConsultantSettings />} />
            </Route>

            {/* Client Portal */}
            <Route path="/cliente" element={<Navigate to="/cliente/central" replace />} />
            <Route element={<ClientPortalLayout />}>
              <Route path="/cliente/central" element={<ClientCentral />} />
              <Route path="/cliente/reunioes" element={<ClientMeetings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </ClientStoreProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
