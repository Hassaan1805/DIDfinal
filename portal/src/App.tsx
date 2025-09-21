<<<<<<< HEAD
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import EnterprisePortal from './EnterprisePortal'
import SimpleEnterprisePortal from './SimpleEnterprisePortal'
import TestPortal from './TestPortal'
import BenchmarkPage from './pages/BenchmarkPage'
import './App.css'
import './fallback.css'

// Navigation Component
function Navigation() {
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className={`app-nav ${isScrolled ? 'nav-scrolled' : ''}`}>
      <div className="nav-container">
        <div className="nav-brand">
          <div className="nav-logo-container">
            <div className="nav-logo">
              <svg viewBox="0 0 32 32" className="nav-logo-svg">
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4F46E5" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="8" fill="url(#logoGradient)" />
                <path d="M8 12h16v2H8zm0 4h16v2H8zm0 4h12v2H8z" fill="white" />
                <circle cx="22" cy="20" r="2" fill="white" />
              </svg>
            </div>
          </div>
          <div className="nav-brand-text">
            <span className="nav-title">Decentralized Trust</span>
            <span className="nav-subtitle">Enterprise Platform</span>
          </div>
        </div>
        
        <div className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'nav-link-active' : ''}`}
          >
            <div className="nav-link-icon">🏢</div>
            <span>Portal</span>
          </Link>
          <Link 
            to="/benchmark" 
            className={`nav-link ${isActive('/benchmark') ? 'nav-link-active' : ''}`}
          >
            <div className="nav-link-icon">📊</div>
            <span>Analytics</span>
          </Link>
        </div>

        <div className="nav-status">
          <div className="connection-indicator">
            <div className="connection-dot"></div>
            <span className="connection-text">Connected</span>
          </div>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navigation />
        
        {/* Main Content */}
        <main className="app-main">
          <Routes>
            <Route 
              path="/" 
              element={
                <SimpleEnterprisePortal 
                  companyName="Decentralized Trust Platform"
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
          </Routes>
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <div className="footer-container">
            <div className="footer-content">
              <div className="footer-section">
                <h4>Decentralized Trust Platform</h4>
                <p>Enterprise-grade DID authentication with Zero-Knowledge Proof technology</p>
              </div>
              <div className="footer-section">
                <h4>Features</h4>
                <ul>
                  <li>DID Authentication</li>
                  <li>Zero-Knowledge Proofs</li>
                  <li>Premium Content Access</li>
                  <li>Enterprise Dashboard</li>
                </ul>
              </div>
              <div className="footer-section">
                <h4>Security</h4>
                <ul>
                  <li>End-to-End Encryption</li>
                  <li>Blockchain Verified</li>
                  <li>Privacy Preserving</li>
                  <li>Self-Sovereign Identity</li>
                </ul>
              </div>
            </div>
            <div className="footer-bottom">
              <div className="footer-bottom-left">
                <span>© 2025 Decentralized Trust Platform.</span>
              </div>
              <div className="footer-bottom-right">
                <span>Provides Enterprise security</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App