import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import EnterprisePortal from './EnterprisePortal'
import BenchmarkPage from './pages/BenchmarkPage'
import PremiumPage from './pages/PremiumPage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Navigation Header */}
        <nav className="app-nav">
          <div className="nav-brand">
            <img 
              src="https://via.placeholder.com/32x32/4F46E5/FFFFFF?text=DT" 
              alt="Decentralized Trust Platform" 
              className="nav-logo"
            />
            <span className="nav-title">Decentralized Trust Platform</span>
          </div>
          <div className="nav-links">
            <Link to="/" className="nav-link">
              🏢 Portal
            </Link>
            <Link to="/benchmark" className="nav-link">
              🧪 Benchmark Suite
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <main className="app-main">
          <Routes>
            <Route 
              path="/" 
              element={
                <EnterprisePortal 
                  companyName="Decentralized Trust Platform"
                  logoUrl="https://via.placeholder.com/64x64/4F46E5/FFFFFF?text=DT"
                />
              } 
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