import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import InvoicesPage from './pages/InvoicesPage';
import DiscountsPage from './pages/DiscountsPage';
import PaymentsPage from './pages/PaymentsPage';
import './App.css';

// Product Management component from your friend's branch
function ProductsPage() {
  const emptyForm = {
    name: '',
    type: '',
    sales_price: '',
    cost_price: '',
    notes: '',
    brand_variant: '',
  };

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadProducts() {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setProducts(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    const salesPrice = Number(form.sales_price);
    const costPrice = Number(form.cost_price);

    if (!form.name.trim() || !form.type.trim()) {
      setError('Please enter both product name and type.');
      return;
    }

    if (
      form.sales_price === '' ||
      form.cost_price === '' ||
      !Number.isFinite(salesPrice) ||
      !Number.isFinite(costPrice) ||
      salesPrice < 0 ||
      costPrice < 0
    ) {
      setError('Enter valid, non-negative sales and cost prices.');
      return;
    }

    const productData = {
      name: form.name.trim(),
      type: form.type.trim(),
      sales_price: salesPrice,
      cost_price: costPrice,
      notes: form.notes.trim() || null,
      brand_variant: form.brand_variant.trim() || null,
    };

    setSaving(true);

    const result = editingId === null
      ? await supabase.from('products').insert(productData)
      : await supabase.from('products').update(productData).eq('id', editingId);

    if (result.error) {
      setError(result.error.message);
    } else {
      setMessage(editingId === null ? 'Product added successfully!' : 'Product updated successfully!');
      setForm(emptyForm);
      setEditingId(null);
      await loadProducts();
    }

    setSaving(false);
  }

  function startEdit(product) {
    setForm({
      name: product.name ?? '',
      type: product.type ?? '',
      sales_price: String(product.sales_price ?? ''),
      cost_price: String(product.cost_price ?? ''),
      notes: product.notes ?? '',
      brand_variant: product.brand_variant ?? '',
    });
    setEditingId(product.id);
    setError('');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}"?`)) return;

    setError('');
    setMessage('');

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id);

    if (error) {
      setError(error.message);
    } else {
      setMessage('Product deleted successfully.');
      await loadProducts();
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setMessage('');
  }

  const filteredProducts = products.filter((product) => {
    const text = `${product.name} ${product.type} ${product.brand_variant ?? ''}`;
    return text.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <main className="product-app">
      <header className="page-header">
        <div>
          <p className="eyebrow">SUBSCRIPTION MANAGEMENT SYSTEM</p>
          <h1>Product Management</h1>
          <p className="subtitle">
            Manage your products, pricing, brands and variants.
          </p>
        </div>
        <div className="product-count">
          <span>Total products</span>
          <strong>{products.length}</strong>
        </div>
      </header>

      {error && <div className="notice error">{error}</div>}
      {message && <div className="notice success">{message}</div>}

      <section className="panel">
        <h2>{editingId === null ? 'Add a product' : 'Edit product'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Product name *
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Premium Coffee"
                required
              />
            </label>

            <label>
              Product type *
              <input
                name="type"
                value={form.type}
                onChange={handleChange}
                placeholder="e.g. Beverage"
                required
              />
            </label>

            <label>
              Sales price *
              <input
                name="sales_price"
                type="number"
                min="0"
                step="0.01"
                value={form.sales_price}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </label>

            <label>
              Cost price *
              <input
                name="cost_price"
                type="number"
                min="0"
                step="0.01"
                value={form.cost_price}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </label>

            <label>
              Brand / variant
              <input
                name="brand_variant"
                value={form.brand_variant}
                onChange={handleChange}
                placeholder="e.g. Large, Brand A"
              />
            </label>

            <label>
              Notes
              <input
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Optional details"
              />
            </label>
          </div>

          <div className="form-actions">
            <button className="primary-button" disabled={saving}>
              {saving
                ? 'Saving...'
                : editingId === null
                  ? 'Add product'
                  : 'Save changes'}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className="secondary-button"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="list-header">
          <div>
            <h2>Products</h2>
            <p className="subtitle">Products stored in your shared database.</p>
          </div>

          <input
            className="search-input"
            aria-label="Search products"
            placeholder="Search products..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <p className="empty-state">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="empty-state">
            {products.length === 0
              ? 'No products yet. Add your first product above.'
              : 'No products match your search.'}
          </p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Brand / variant</th>
                  <th>Sales price</th>
                  <th>Cost price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.type}</td>
                    <td>{product.brand_variant || '—'}</td>
                    <td>{Number(product.sales_price).toFixed(2)}</td>
                    <td>{Number(product.cost_price).toFixed(2)}</td>
                    <td className="row-actions">
                      <button
                        className="edit-button"
                        onClick={() => startEdit(product)}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => deleteProduct(product)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {/* Unified Navigation Header */}
        <nav style={{ display: 'flex', gap: '20px', padding: '15px', background: '#f4f4f4', borderRadius: '8px', marginBottom: '20px', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Subscription System</h2>
          <Link to="/products" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>Products</Link>
          <Link to="/invoices" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>Invoices</Link>
          <Link to="/discounts" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>Discounts</Link>
          <Link to="/payments" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>Payments</Link>
        </nav>

        {/* Route Configuration */}
        <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/discounts" element={<DiscountsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App;