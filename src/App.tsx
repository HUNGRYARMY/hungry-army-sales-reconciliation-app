import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './lib/auth/AuthContext'
import { UnassignedPage } from './routes/UnassignedPage'
import { ResetPasswordPage } from './routes/auth/ResetPasswordPage'
import { TabletHome } from './routes/tablet/TabletHome'
import { CommissaryHome } from './routes/commissary/CommissaryHome'
import { DashboardHome } from './routes/dashboard/DashboardHome'
import { RequireRole, RootRedirect, LoginRoute } from './routes/guards'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/unassigned" element={<UnassignedPage />} />
            <Route
              path="/tablet/*"
              element={
                <RequireRole allow={['branch_staff']}>
                  <TabletHome />
                </RequireRole>
              }
            />
            <Route
              path="/commissary/*"
              element={
                <RequireRole allow={['commissary_staff', 'founder_admin', 'supervisor']}>
                  <CommissaryHome />
                </RequireRole>
              }
            />
            <Route
              path="/dashboard/*"
              element={
                <RequireRole allow={['founder_admin', 'supervisor']}>
                  <DashboardHome />
                </RequireRole>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
