import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import PlansSection from './PlansSection';
import SubscriptionsSection from './SubscriptionsSection';
import './App.css';

const emptyForm = {
  name: '',
  type: '',
  sales_price: '',
  cost_price: '',
  notes: '',
  brand_variant: '',
};

const emptyVariantForm = {
  product_id: '',
  variant_name: '',
  price_adjustment: '0',
};

function App() {
  // Product state
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');

  // Variant state
  const [variants, setVariants] = useState([]);
  const [variantForm, setVariantForm] = useState(emptyVariantForm);
  const [editingVariantId, setEditingVariantId] = useState(null);
  const [variantSearch, setVariantSearch] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingVariant, setSavingVariant] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // --------------------------------------------------
  // LOAD PRODUCTS AND VARIANTS
  // --------------------------------------------------

  async function loadProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      setError(`Could not load products: ${error.message}`);
      setProducts([]);
      setLoading(false);
      return;
    }

    const productList = data ?? [];
    setProducts(productList);

    // Keep the selected product valid.
    if (
      variantForm.product_id &&
      !productList.some(
        (product) =>
          String(product.id) === String(variantForm.product_id)
      )
    ) {
      setVariantForm((previous) => ({
        ...previous,
        product_id: '',
      }));
    }

    setLoading(false);

    await loadVariants(productList);
  }

  async function loadVariants(productList = products) {
    if (!productList.length) {
      setVariants([]);
      return;
    }

    setVariantsLoading(true);

    const productIds = productList.map((product) => product.id);

    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .in('product_id', productIds)
      .order('id', { ascending: false });

    if (error) {
      setError(`Could not load variants: ${error.message}`);
      setVariants([]);
    } else {
      setVariants(data ?? []);
    }

    setVariantsLoading(false);
  }

  useEffect(() => {
    void Promise.resolve().then(loadProducts);
    // Load once; later product reloads happen after CRUD actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------
  // PRODUCT FORM
  // --------------------------------------------------

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

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

    try {
      const result =
        editingId === null
          ? await supabase.from('products').insert(productData)
          : await supabase
              .from('products')
              .update(productData)
              .eq('id', editingId);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setMessage(
        editingId === null
          ? 'Product added successfully!'
          : 'Product updated successfully!'
      );

      setForm(emptyForm);
      setEditingId(null);

      setLoading(true);
      await loadProducts();
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
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

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setMessage('');
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Delete "${product.name}" and its associated variants?`
    );

    if (!confirmed) return;

    setError('');
    setMessage('');

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage('Product deleted successfully.');
    setLoading(true);

    if (String(variantForm.product_id) === String(product.id)) {
      setVariantForm(emptyVariantForm);
      setEditingVariantId(null);
    }

    await loadProducts();
  }

  // --------------------------------------------------
  // VARIANT FORM
  // --------------------------------------------------

  function handleVariantChange(event) {
    const { name, value } = event.target;

    setVariantForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleVariantSubmit(event) {
    event.preventDefault();

    if (savingVariant) return;

    setError('');
    setMessage('');

    if (!variantForm.product_id) {
      setError('Please select a product for this variant.');
      return;
    }

    if (!variantForm.variant_name.trim()) {
      setError('Please enter a variant name.');
      return;
    }

    const adjustment = Number(variantForm.price_adjustment);

    if (
      variantForm.price_adjustment === '' ||
      !Number.isFinite(adjustment)
    ) {
      setError('Please enter a valid price adjustment.');
      return;
    }

    const selectedProduct = products.find(
      (product) =>
        String(product.id) === String(variantForm.product_id)
    );

    if (!selectedProduct) {
      setError('The selected product could not be found.');
      return;
    }

    const basePrice = Number(selectedProduct.sales_price);

    if (basePrice + adjustment < 0) {
      setError('The final price cannot be negative.');
      return;
    }

    const variantData = {
      product_id: Number(variantForm.product_id),
      variant_name: variantForm.variant_name.trim(),
      price_adjustment: adjustment,
    };

    setSavingVariant(true);

    try {
      const result =
        editingVariantId === null
          ? await supabase
              .from('product_variants')
              .insert(variantData)
          : await supabase
              .from('product_variants')
              .update(variantData)
              .eq('id', editingVariantId);

      if (result.error) {
        if (result.error.code === '23505') {
          setError(
            'This variant name already exists for the selected product.'
          );
        } else {
          setError(result.error.message);
        }

        return;
      }

      setMessage(
        editingVariantId === null
          ? 'Variant added successfully!'
          : 'Variant updated successfully!'
      );

      setVariantForm(emptyVariantForm);
      setEditingVariantId(null);

      await loadVariants(products);
    } catch (err) {
      setError(err.message || 'Could not save the variant.');
    } finally {
      setSavingVariant(false);
    }
  }

  function startEditVariant(variant) {
    setVariantForm({
      product_id: String(variant.product_id),
      variant_name: variant.variant_name ?? '',
      price_adjustment: String(variant.price_adjustment ?? 0),
    });

    setEditingVariantId(variant.id);
    setError('');
    setMessage('');

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth',
    });
  }

  function cancelVariantEdit() {
    setEditingVariantId(null);
    setVariantForm(emptyVariantForm);
    setError('');
    setMessage('');
  }

  async function deleteVariant(variant) {
    const confirmed = window.confirm(
      `Delete the "${variant.variant_name}" variant?`
    );

    if (!confirmed) return;

    setError('');
    setMessage('');
    setDeletingVariantId(variant.id);

    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variant.id);

      if (error) {
        setError(error.message);
        return;
      }

      setMessage('Variant deleted successfully.');

      if (editingVariantId === variant.id) {
        cancelVariantEdit();
      }

      await loadVariants(products);
    } finally {
      setDeletingVariantId(null);
    }
  }

  // --------------------------------------------------
  // SEARCH AND PRICE CALCULATIONS
  // --------------------------------------------------

  const filteredProducts = products.filter((product) => {
    const text = [
      product.name,
      product.type,
      product.brand_variant ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const filteredVariants = variants.filter((variant) => {
    const product = products.find(
      (item) => String(item.id) === String(variant.product_id)
    );

    const text = [
      product?.name ?? '',
      variant.variant_name,
    ]
      .join(' ')
      .toLowerCase();

    return text.includes(variantSearch.toLowerCase());
  });

  const selectedProduct = products.find(
    (product) =>
      String(product.id) === String(variantForm.product_id)
  );

  const selectedBasePrice = selectedProduct
    ? Number(selectedProduct.sales_price)
    : 0;

  const selectedAdjustment =
    variantForm.price_adjustment === ''
      ? 0
      : Number(variantForm.price_adjustment);

  const calculatedFinalPrice =
    selectedBasePrice + selectedAdjustment;

  function formatPrice(value) {
    return `₹${Number(value).toFixed(2)}`;
  }

  // --------------------------------------------------
  // USER INTERFACE
  // --------------------------------------------------

  return (
    <main className="product-app">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            SUBSCRIPTION MANAGEMENT SYSTEM
          </p>

          <h1>Product Management</h1>

          <p className="subtitle">
            Manage products, variants, plans and subscriptions.
          </p>
        </div>

        <div className="product-count">
          <span>Total products</span>
          <strong>{products.length}</strong>
        </div>
      </header>

      <nav className="section-nav" aria-label="Management sections">
        <a href="#products">Products</a>
        <a href="#variants">Variants</a>
        <a href="#plans">Plans</a>
        <a href="#subscriptions">Subscriptions</a>
        <a href="#subscription-items">Subscription items</a>
      </nav>

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}

      {/* PRODUCT FORM */}

      <section className="panel" id="products">
        <h2>
          {editingId === null ? 'Add a product' : 'Edit product'}
        </h2>

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
              Base sales price *
              <input
                name="sales_price"
                type="number"
                min="0"
                step="0.01"
                value={form.sales_price}
                onChange={handleChange}
                placeholder="1000.00"
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
                placeholder="700.00"
                required
              />
            </label>

            <label>
              Brand / variant (optional legacy field)
              <input
                name="brand_variant"
                value={form.brand_variant}
                onChange={handleChange}
                placeholder="Optional brand information"
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
            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
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

      {/* PRODUCT LIST */}

      <section className="panel" id="variants">
        <div className="list-header">
          <div>
            <h2>Products</h2>
            <p className="subtitle">
              Products stored in your shared database.
            </p>
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
                  <th>Base sales price</th>
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
                    <td>
                      {formatPrice(product.sales_price)}
                    </td>
                    <td>
                      {formatPrice(product.cost_price)}
                    </td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => startEdit(product)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
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

      {/* VARIANT FORM */}

      <section className="panel">
        <h2>
          {editingVariantId === null
            ? 'Add a product variant'
            : 'Edit product variant'}
        </h2>

        <p className="subtitle">
          Add options such as Small, Medium and Large, each with
          its own price adjustment.
        </p>

        {products.length === 0 ? (
          <p className="empty-state">
            Add a product before creating its variants.
          </p>
        ) : (
          <form onSubmit={handleVariantSubmit}>
            <div className="form-grid">
              <label>
                Select product *
                <select
                  name="product_id"
                  value={variantForm.product_id}
                  onChange={handleVariantChange}
                  required
                >
                  <option value="">Choose a product</option>

                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name} —{' '}
                      {formatPrice(product.sales_price)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Variant name *
                <input
                  name="variant_name"
                  value={variantForm.variant_name}
                  onChange={handleVariantChange}
                  placeholder="e.g. Large"
                  required
                />
              </label>

              <label>
                Price adjustment (₹) *
                <input
                  name="price_adjustment"
                  type="number"
                  step="0.01"
                  value={variantForm.price_adjustment}
                  onChange={handleVariantChange}
                  placeholder="0.00"
                  required
                />
              </label>
            </div>

            <div className="price-preview">
              <p>
                Base price:{' '}
                <strong>{formatPrice(selectedBasePrice)}</strong>
              </p>

              <p>
                Price adjustment:{' '}
                <strong>
                  {formatPrice(selectedAdjustment)}
                </strong>
              </p>

              <p>
                Final variant price:{' '}
                <strong>
                  {formatPrice(calculatedFinalPrice)}
                </strong>
              </p>

              <small>
                Final price = Base sales price + Price adjustment
              </small>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={savingVariant}
              >
                {savingVariant
                  ? 'Saving...'
                  : editingVariantId === null
                    ? 'Add variant'
                    : 'Save changes'}
              </button>

              {editingVariantId !== null && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={cancelVariantEdit}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="panel">
        <div className="list-header">
          <div>
            <h2>Variants</h2>
            <p className="subtitle">
              Product options and their price adjustments.
            </p>
          </div>

          <input
            className="search-input"
            aria-label="Search variants"
            placeholder="Search variants..."
            value={variantSearch}
            onChange={(event) => setVariantSearch(event.target.value)}
          />
        </div>

        {variantsLoading ? (
          <p className="empty-state">Loading variants...</p>
        ) : filteredVariants.length === 0 ? (
          <p className="empty-state">
            {variants.length === 0
              ? 'No variants yet. Add one from the form above.'
              : 'No variants match your search.'}
          </p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>Adjustment</th>
                  <th>Final price</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredVariants.map((variant) => {
                  const linkedProduct = products.find(
                    (product) =>
                      String(product.id) === String(variant.product_id)
                  );

                  const finalPrice =
                    Number(linkedProduct?.sales_price ?? 0) +
                    Number(variant.price_adjustment ?? 0);

                  return (
                    <tr key={variant.id}>
                      <td>{linkedProduct?.name ?? 'Unknown product'}</td>
                      <td>{variant.variant_name}</td>
                      <td>{formatPrice(variant.price_adjustment)}</td>
                      <td>{formatPrice(finalPrice)}</td>
                      <td className="row-actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => startEditVariant(variant)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => deleteVariant(variant)}
                          disabled={deletingVariantId === variant.id}
                        >
                          {deletingVariantId === variant.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PlansSection />
      <SubscriptionsSection />
    </main>
  );
}

export default App;