import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import EnterprisePortalProfessional from './EnterprisePortalProfessional'
import BenchmarkPage from './pages/BenchmarkPage'
import PremiumPage from './pages/PremiumPage'
import BlockchainViewer from './pages/BlockchainViewer'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Main Content */}
        <main className="app-main">
          <Routes>
            <Route 
              path="/" 
              element={<EnterprisePortalProfessional />} 
            />
            <Route 
              path="/benchmark" 
              element={<BenchmarkPage />} 
            />
            <Route 
              path="/premium" 
              element={<PremiumPage />} 
            />
            <Route 
              path="/blockchain" 
              element={<BlockchainViewer />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App