import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const statuses = ['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'];
const emptySubscription = {
  customer_id: '',
  plan_id: '',
  start_date: '',
  expiry_date: '',
  payment_terms: '',
};
const emptyItem = {
  subscription_id: '',
  product_id: '',
  quantity: '1',
  unit_price: '',
};

function getErrorMessage(error) {
  if (error?.code === '42501' || error?.code === '401' || error?.code === '403') {
    return `Supabase denied the operation (RLS or permissions): ${error.message}`;
  }

  return error?.message || 'An unexpected error occurred.';
}

function getProfileLabel(profile) {
  const primary = profile.full_name || profile.company_name || profile.email || profile.id;
  return profile.email && profile.email !== primary ? `${primary} (${profile.email})` : primary;
}

function SubscriptionsSection() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptySubscription);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadData() {
    try {
      const queries = await Promise.all([
        supabase.from('plans')
          .select('id,name,billing_frequency,min_quantity,start_date,end_date,is_auto_close')
          .order('id', { ascending: false }),
        supabase.from('profiles')
          .select('id,full_name,email,company_name')
          .order('full_name', { ascending: true }),
        supabase.from('products')
          .select('id,name,sales_price')
          .order('id', { ascending: false }),
        supabase.from('subscriptions')
          .select('id,subscription_number,customer_id,plan_id,start_date,expiry_date,payment_terms,status')
          .order('id', { ascending: false }),
        supabase.from('subscription_items')
          .select('id,subscription_id,product_id,quantity,unit_price')
          .order('id', { ascending: false }),
      ]);

      const [planResult, profileResult, productResult, subscriptionResult, itemResult] = queries;
      const errors = [];
      if (planResult.error) errors.push(`plans: ${getErrorMessage(planResult.error)}`);
      if (profileResult.error) errors.push(`profiles (customers): ${getErrorMessage(profileResult.error)}`);
      if (productResult.error) errors.push(`products: ${getErrorMessage(productResult.error)}`);
      if (subscriptionResult.error) errors.push(`subscriptions: ${getErrorMessage(subscriptionResult.error)}`);
      if (itemResult.error) errors.push(`subscription_items: ${getErrorMessage(itemResult.error)}`);

      setPlans(planResult.data ?? []);
      setProfiles(profileResult.data ?? []);
      setProducts(productResult.data ?? []);
      setSubscriptions(subscriptionResult.data ?? []);
      setItems(itemResult.data ?? []);
      setError(errors.length ? `Could not load all subscription data. ${errors.join(' | ')}` : '');
    } catch (loadError) {
      setError(`Could not load subscription data: ${getErrorMessage(loadError)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  function refreshData() {
    setLoading(true);
    setError('');
    void loadData();
  }

  function handleSubscriptionChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleItemChange(event) {
    const { name, value } = event.target;
    setItemForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubscriptionSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setError('');
    setMessage('');

    if (!form.customer_id || !form.plan_id || !form.start_date || !form.expiry_date || !form.payment_terms.trim()) {
      setError('Select a customer and plan, and enter start date, expiry date, and payment terms.');
      return;
    }

    if (form.expiry_date < form.start_date) {
      setError('Expiry date cannot be earlier than the start date.');
      return;
    }

    const selectedProfile = profiles.find((profile) => profile.id === form.customer_id);
    const selectedPlan = plans.find((plan) => String(plan.id) === form.plan_id);
    if (!selectedProfile || !selectedPlan) {
      setError('The selected customer or plan is no longer available. Refresh and try again.');
      return;
    }

    const subscriptionData = {
      subscription_number: `SUB-${Date.now().toString(36).toUpperCase()}`,
      customer_id: selectedProfile.id,
      plan_id: selectedPlan.id,
      start_date: form.start_date,
      expiry_date: form.expiry_date,
      payment_terms: form.payment_terms.trim(),
      status: 'Draft',
    };

    setSaving(true);
    try {
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData);

      if (insertError) {
        setError(`Could not create subscription: ${getErrorMessage(insertError)}`);
        return;
      }

      setMessage(`Subscription ${subscriptionData.subscription_number} created.`);
      setForm(emptySubscription);
      setLoading(true);
      await loadData();
    } catch (saveError) {
      setError(`Could not create subscription: ${getErrorMessage(saveError)}`);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(subscription, status) {
    if (!statuses.includes(status) || subscription.status === status) return;
    setError('');
    setMessage('');
    setUpdatingStatusId(subscription.id);

    try {
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('subscriptions')
        .update({ status })
        .eq('id', subscription.id)
        .select('id')
        .maybeSingle();

      if (updateError) {
        setError(`Could not update subscription status: ${getErrorMessage(updateError)}`);
        return;
      }

      if (!updatedSubscription) {
        setError('Subscription status was not updated. The record may no longer be visible, or update access may be denied.');
        return;
      }

      setSubscriptions((previous) => previous.map((item) => (
        item.id === subscription.id ? { ...item, status } : item
      )));
      setMessage(`Subscription ${subscription.subscription_number} status updated to ${status}.`);
    } catch (updateError) {
      setError(`Could not update subscription status: ${getErrorMessage(updateError)}`);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleItemSubmit(event) {
    event.preventDefault();
    if (savingItem) return;
    setError('');
    setMessage('');

    const quantity = Number(itemForm.quantity);
    const unitPrice = Number(itemForm.unit_price);
    const subscription = subscriptions.find((item) => String(item.id) === itemForm.subscription_id);
    const product = products.find((item) => String(item.id) === itemForm.product_id);

    if (!subscription || !product) {
      setError('Select an available subscription and product.');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError('Quantity must be a whole number greater than zero.');
      return;
    }
    if (itemForm.unit_price === '' || !Number.isFinite(unitPrice) || unitPrice < 0) {
      setError('Enter a valid, non-negative unit price.');
      return;
    }

    setSavingItem(true);
    try {
      const { error: insertError } = await supabase
        .from('subscription_items')
        .insert({
          subscription_id: subscription.id,
          product_id: product.id,
          quantity,
          unit_price: unitPrice,
        });

      if (insertError) {
        setError(`Could not add subscription item: ${getErrorMessage(insertError)}`);
        return;
      }

      setMessage(`${product.name} added to subscription ${subscription.subscription_number}.`);
      setItemForm(emptyItem);
      setLoading(true);
      await loadData();
    } catch (saveError) {
      setError(`Could not add subscription item: ${getErrorMessage(saveError)}`);
    } finally {
      setSavingItem(false);
    }
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const planById = new Map(plans.map((plan) => [String(plan.id), plan]));
  const subscriptionById = new Map(subscriptions.map((item) => [String(item.id), item]));
  const productById = new Map(products.map((product) => [String(product.id), product]));

  return (
    <>
      <section className="panel" id="subscriptions">
        <h2>Create a subscription</h2>
        {error && <div className="notice error" role="alert">{error}</div>}
        {message && <div className="notice success" role="status">{message}</div>}

        <form onSubmit={handleSubscriptionSubmit}>
          <div className="form-grid">
            <label>
              Customer / profile *
              <select name="customer_id" value={form.customer_id} onChange={handleSubscriptionChange} required>
                <option value="">Select a customer</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{getProfileLabel(profile)}</option>
                ))}
              </select>
            </label>

            <label>
              Plan *
              <select name="plan_id" value={form.plan_id} onChange={handleSubscriptionChange} required>
                <option value="">Select a plan</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.billing_frequency})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Start date *
              <input name="start_date" type="date" value={form.start_date} onChange={handleSubscriptionChange} required />
            </label>

            <label>
              Expiry date *
              <input name="expiry_date" type="date" value={form.expiry_date} onChange={handleSubscriptionChange} required />
            </label>

            <label>
              Payment terms *
              <input
                name="payment_terms"
                value={form.payment_terms}
                onChange={handleSubscriptionChange}
                placeholder="e.g. Net 30"
                required
              />
            </label>

            <label>
              Initial status
              <input value="Draft" readOnly />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={saving || loading || !profiles.length || !plans.length}>
              {saving ? 'Creating...' : 'Create subscription'}
            </button>
          </div>
          {!loading && profiles.length === 0 && (
            <p className="form-hint">No customer profiles are visible. Check the `profiles` table and its SELECT policy.</p>
          )}
          {!loading && plans.length === 0 && (
            <p className="form-hint">Create or grant access to a plan before creating subscriptions.</p>
          )}
        </form>

        <div className="list-header plan-list-header">
          <h2>Subscriptions</h2>
          <button className="secondary-button" type="button" onClick={refreshData} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="empty-state">Loading subscriptions...</p>
        ) : subscriptions.length === 0 ? (
          <p className="empty-state">No subscriptions are visible yet.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Start</th>
                  <th>Expiry</th>
                  <th>Payment terms</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td>{subscription.subscription_number}</td>
                    <td>
                      {profileById.has(subscription.customer_id)
                        ? getProfileLabel(profileById.get(subscription.customer_id))
                        : 'Unavailable profile'}
                    </td>
                    <td>{planById.get(String(subscription.plan_id))?.name ?? 'Unavailable plan'}</td>
                    <td>{subscription.start_date}</td>
                    <td>{subscription.expiry_date}</td>
                    <td>{subscription.payment_terms}</td>
                    <td>
                      <select
                        aria-label={`Status for subscription ${subscription.subscription_number}`}
                        value={subscription.status ?? 'Draft'}
                        onChange={(event) => updateStatus(subscription, event.target.value)}
                        disabled={updatingStatusId === subscription.id}
                      >
                        {!statuses.includes(subscription.status) && (
                          <option value={subscription.status}>{subscription.status}</option>
                        )}
                        {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel" id="subscription-items">
        <h2>Add a subscription item</h2>
        <p className="subtitle">Attach a product to a subscription with its quantity and unit price.</p>
        <form onSubmit={handleItemSubmit}>
          <div className="form-grid">
            <label>
              Subscription *
              <select
                name="subscription_id"
                value={itemForm.subscription_id}
                onChange={handleItemChange}
                required
              >
                <option value="">Select a subscription</option>
                {subscriptions.map((subscription) => (
                  <option key={subscription.id} value={subscription.id}>
                    {subscription.subscription_number}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Product *
              <select name="product_id" value={itemForm.product_id} onChange={handleItemChange} required>
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </label>

            <label>
              Quantity *
              <input
                name="quantity"
                type="number"
                min="1"
                step="1"
                value={itemForm.quantity}
                onChange={handleItemChange}
                required
              />
            </label>

            <label>
              Unit price *
              <input
                name="unit_price"
                type="number"
                min="0"
                step="0.01"
                value={itemForm.unit_price}
                onChange={handleItemChange}
                required
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={savingItem || loading || !subscriptions.length || !products.length}>
              {savingItem ? 'Adding...' : 'Add item'}
            </button>
          </div>
        </form>

        {loading ? (
          <p className="empty-state">Loading subscription items...</p>
        ) : items.length === 0 ? (
          <p className="empty-state">No subscription items are visible yet.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Subscription</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{subscriptionById.get(String(item.subscription_id))?.subscription_number ?? 'Unavailable subscription'}</td>
                    <td>{productById.get(String(item.product_id))?.name ?? 'Unavailable product'}</td>
                    <td>{item.quantity}</td>
                    <td>{Number(item.unit_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export default SubscriptionsSection;
