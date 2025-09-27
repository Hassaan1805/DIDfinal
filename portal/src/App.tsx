import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import EnterprisePortalProfessional from './EnterprisePortalProfessional'
import SimpleEnterprisePortal from './SimpleEnterprisePortal'
import TestPortal from './TestPortal'
import BenchmarkPage from './pages/BenchmarkPage'
import PremiumPage from './pages/PremiumPage'
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
              path="/simple" 
              element={
                <SimpleEnterprisePortal 
                  companyName="Decentralized Trust Platform"
                  logoUrl="https://via.placeholder.com/64x64/4F46E5/FFFFFF?text=DT"
                />
              } 
            />
            <Route 
              path="/test" 
              element={<TestPortal />} 
            />
            <Route 
              path="/benchmark" 
              element={<BenchmarkPage />} 
            />
            <Route 
              path="/premium" 
              element={<PremiumPage />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App