import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import InvoicesPage from './pages/InvoicesPage' // Adjust path if your pages folder structure differs
import DiscountsPage from './pages/DiscountsPage'
import PaymentsPage from './pages/PaymentsPage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app-container" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {/* Simple Navigation Header */}
        <nav style={{ display: 'flex', gap: '20px', padding: '15px', background: '#f4f4f4', borderRadius: '8px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', alignSelf: 'center' }}>Billing System</h2>
          <Link to="/invoices" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>Invoices</Link>
          <Link to="/discounts" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>Discounts</Link>
          <Link to="/payments" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>Payments</Link>
        </nav>

        {/* Route Configuration */}
        <Routes>
          <Route path="/" element={<Navigate to="/invoices" replace />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/discounts" element={<DiscountsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App