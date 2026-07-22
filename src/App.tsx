import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/auth/AuthContext'
import { UnassignedPage } from './routes/UnassignedPage'
import { ComingSoonPage } from './routes/ComingSoonPage'
import { TabletHome } from './routes/tablet/TabletHome'
import { CommissaryHome } from './routes/commissary/CommissaryHome'
import { RequireRole, RootRedirect, LoginRoute } from './routes/guards'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginRoute />} />
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
                <ComingSoonPage title="Founder Dashboard" />
              </RequireRole>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
