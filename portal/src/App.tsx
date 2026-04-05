import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import EnterprisePortalProfessional from './EnterprisePortalProfessional'
import BenchmarkPage from './pages/BenchmarkPage'
import PremiumPage from './pages/PremiumPage'
import BlockchainViewer from './pages/BlockchainViewer'
import CertificatesPage from './pages/CertificatesPage'
import AdminPage from './pages/AdminPage'
import ZKAccessPage from './pages/ZKAccessPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import FloatingLines from './components/backgrounds/FloatingLines'
import { setupTokenRefreshInterval } from './utils/auth'
import './App.css'

function AppRoutes() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const enabledWaves = useMemo<Array<'top' | 'middle' | 'bottom'>>(
    () => ['middle', 'bottom', 'top'],
    []
  );
  const linesGradient = useMemo<string[]>(
    () => ['#2563eb', '#06b6d4', '#8b5cf6'],
    []
  );

  return (
    <div className="app-shell">
      <div className="app-background" aria-hidden="true">
        <FloatingLines
          enabledWaves={enabledWaves}
          lineCount={5}
          lineDistance={35.5}
          bendRadius={10.5}
          bendStrength={-7}
          interactive={!isAdminRoute}
          parallax={!isAdminRoute}
          parallaxStrength={0.12}
          mouseDamping={0.045}
          linesGradient={linesGradient}
          mixBlendMode="normal"
        />
        <div className="app-background-vignette" />
      </div>

      <div className="app-container">
        {/* Main Content */}
        <main className="app-main">
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/login" replace />}
            />
            <Route
              path="/login"
              element={<EnterprisePortalProfessional />}
            />
            <Route
              path="/admin"
              element={<AdminPage />}
            />
            <Route
              path="/benchmark"
              element={
                <ProtectedRoute requireBadge="manager">
                  <BenchmarkPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/premium"
              element={
                <ProtectedRoute requireBadge="admin">
                  <PremiumPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/blockchain"
              element={
                <ProtectedRoute requireBadge="auditor">
                  <BlockchainViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/certificates"
              element={
                <ProtectedRoute>
                  <CertificatesPage />
                </ProtectedRoute>
              }
            />
            {/* ZK Access - Anonymous access via ZK-proof (no standard auth required) */}
            <Route
              path="/zk-access"
              element={<ZKAccessPage />}
            />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function App() {
  // Set up automatic token refresh
  useEffect(() => {
    const cleanup = setupTokenRefreshInterval();
    return cleanup;
  }, []);

  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}

export default App