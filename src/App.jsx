
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";

function Placeholder({ title }) {
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>This module will be integrated with the team member's work.</p>
        </div>
      </div>

      <div className="content-card placeholder-card">
        <h3>{title} Module</h3>
        <p>
          This section is ready for integration with the corresponding
          team member's frontend and backend.
        </p>
      </div>
    </div>
  );
}

function AppLayout() {
  return (
    <div className="app-layout">

      <Sidebar />

      <div className="main-area">

        <Navbar />

        <main>
          <Routes>

            <Route path="/" element={<Dashboard />} />

            <Route path="/analytics" element={<Analytics />} />

            <Route path="/reports" element={<Reports />} />

            <Route path="/products" element={<Placeholder title="Products" />} />

            <Route path="/plans" element={<Placeholder title="Plans" />} />

            <Route path="/subscriptions" element={<Placeholder title="Subscriptions" />} />

            <Route path="/quotations" element={<Placeholder title="Quotations" />} />

            <Route path="/invoices" element={<Placeholder title="Invoices" />} />

            <Route path="/discounts" element={<Placeholder title="Discounts" />} />

            <Route path="/payments" element={<Placeholder title="Payments" />} />

            <Route path="/users" element={<Placeholder title="Users" />} />

            <Route path="/settings" element={<Placeholder title="Settings" />} />

          </Routes>
        </main>

      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
