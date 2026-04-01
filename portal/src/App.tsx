import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import EnterprisePortalProfessional from './EnterprisePortalProfessional'
import BenchmarkPage from './pages/BenchmarkPage'
import PremiumPage from './pages/PremiumPage'
import BlockchainViewer from './pages/BlockchainViewer'
import CertificatesPage from './pages/CertificatesPage'
import AdminPage from './pages/AdminPage'
import ZKAccessPage from './pages/ZKAccessPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { setupTokenRefreshInterval } from './utils/auth'
import './App.css'

function App() {
  // Set up automatic token refresh
  useEffect(() => {
    const cleanup = setupTokenRefreshInterval();
    return cleanup;
  }, []);

  return (
    <Router>
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
    </Router>
  )
}

export default App