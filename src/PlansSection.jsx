import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const frequencies = ['daily', 'weekly', 'monthly', 'yearly'];
const emptyPlan = {
  name: '',
  billing_frequency: 'monthly',
  min_quantity: '1',
  start_date: '',
  end_date: '',
  is_auto_close: false,
};

function getErrorMessage(error) {
  if (error?.code === '42501' || error?.code === '401' || error?.code === '403') {
    return `Supabase denied the operation (RLS or permissions): ${error.message}`;
  }

  return error?.message || 'An unexpected error occurred.';
}

function PlansSection() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(emptyPlan);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadPlans() {
    try {
      const { data, error: queryError } = await supabase
        .from('plans')
        .select('id,name,billing_frequency,min_quantity,start_date,end_date,is_auto_close')
        .order('id', { ascending: false });

      if (queryError) {
        setError(`Could not load plans: ${getErrorMessage(queryError)}`);
        setPlans([]);
      } else {
        setPlans(data ?? []);
      }
    } catch (loadError) {
      setError(`Could not load plans: ${getErrorMessage(loadError)}`);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadPlans);
  }, []);

  function refreshPlans() {
    setLoading(true);
    setError('');
    void loadPlans();
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function resetForm() {
    setForm(emptyPlan);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    setError('');
    setMessage('');

    const minimumQuantity = Number(form.min_quantity);
    if (!form.name.trim()) {
      setError('Enter a plan name.');
      return;
    }

    if (!frequencies.includes(form.billing_frequency)) {
      setError('Choose a valid billing frequency.');
      return;
    }

    if (!Number.isInteger(minimumQuantity) || minimumQuantity < 1) {
      setError('Minimum quantity must be a whole number greater than zero.');
      return;
    }

    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError('The end date cannot be earlier than the start date.');
      return;
    }

    const planData = {
      name: form.name.trim(),
      billing_frequency: form.billing_frequency,
      min_quantity: minimumQuantity,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_auto_close: form.is_auto_close,
    };

    setSaving(true);
    try {
      const result = editingId === null
        ? await supabase.from('plans').insert(planData)
        : await supabase
            .from('plans')
            .update(planData)
            .eq('id', editingId)
            .select('id')
            .maybeSingle();

      if (result.error) {
        setError(`Could not save plan: ${getErrorMessage(result.error)}`);
        return;
      }

      if (editingId !== null && !result.data) {
        setError('Plan was not updated. It may no longer be visible, or update access may be denied.');
        return;
      }

      setMessage(editingId === null ? 'Plan created successfully.' : 'Plan updated successfully.');
      resetForm();
      setLoading(true);
      await loadPlans();
    } catch (saveError) {
      setError(`Could not save plan: ${getErrorMessage(saveError)}`);
    } finally {
      setSaving(false);
    }
  }

  function editPlan(plan) {
    setForm({
      name: plan.name ?? '',
      billing_frequency: plan.billing_frequency ?? 'monthly',
      min_quantity: String(plan.min_quantity ?? 1),
      start_date: plan.start_date ?? '',
      end_date: plan.end_date ?? '',
      is_auto_close: Boolean(plan.is_auto_close),
    });
    setEditingId(plan.id);
    setError('');
    setMessage('');
  }

  async function deletePlan(plan) {
    if (!window.confirm(`Delete plan "${plan.name}"?`)) return;

    setError('');
    setMessage('');
    setDeletingId(plan.id);

    try {
      const { data: deletedRows, error: deleteError } = await supabase
        .from('plans')
        .delete()
        .eq('id', plan.id)
        .select('id');

      if (deleteError) {
        if (deleteError.code === '23503') {
          setError(`Plan "${plan.name}" cannot be deleted because it is referenced by other records. ${deleteError.message}`);
        } else {
          setError(`Could not delete plan: ${getErrorMessage(deleteError)}`);
        }
        return;
      }

      if (!deletedRows?.length) {
        setError('Plan was not deleted. It may no longer be visible, or delete access may be denied.');
        return;
      }

      setMessage('Plan deleted successfully.');
      if (editingId === plan.id) resetForm();
      setLoading(true);
      await loadPlans();
    } catch (deleteError) {
      setError(`Could not delete plan: ${getErrorMessage(deleteError)}`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="panel" id="plans">
      <h2>{editingId === null ? 'Create a plan' : 'Edit plan'}</h2>
      {error && <div className="notice error" role="alert">{error}</div>}
      {message && <div className="notice success" role="status">{message}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Plan name *
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>

          <label>
            Billing frequency *
            <select name="billing_frequency" value={form.billing_frequency} onChange={handleChange} required>
              {frequencies.map((frequency) => (
                <option key={frequency} value={frequency}>{frequency}</option>
              ))}
            </select>
          </label>

          <label>
            Minimum quantity *
            <input
              name="min_quantity"
              type="number"
              min="1"
              step="1"
              value={form.min_quantity}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Start date
            <input name="start_date" type="date" value={form.start_date} onChange={handleChange} />
          </label>

          <label>
            End date
            <input name="end_date" type="date" value={form.end_date} onChange={handleChange} />
          </label>

          <label className="checkbox-field">
            <input
              name="is_auto_close"
              type="checkbox"
              checked={form.is_auto_close}
              onChange={handleChange}
            />
            Automatically close this plan
          </label>
        </div>

        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingId === null ? 'Create plan' : 'Save plan'}
          </button>
          {editingId !== null && (
            <button className="secondary-button" type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="list-header plan-list-header">
        <h2>Plans</h2>
        <button className="secondary-button" type="button" onClick={refreshPlans} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="empty-state">Loading plans...</p>
      ) : plans.length === 0 ? (
        <p className="empty-state">No plans are visible. Add a plan above or check Supabase read access.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Billing</th>
                <th>Min. quantity</th>
                <th>Start</th>
                <th>End</th>
                <th>Auto close</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td>{plan.name}</td>
                  <td>{plan.billing_frequency}</td>
                  <td>{plan.min_quantity}</td>
                  <td>{plan.start_date || '—'}</td>
                  <td>{plan.end_date || '—'}</td>
                  <td>{plan.is_auto_close ? 'Yes' : 'No'}</td>
                  <td className="row-actions">
                    <button className="edit-button" type="button" onClick={() => editPlan(plan)}>Edit</button>
                    <button
                      className="delete-button"
                      type="button"
                      onClick={() => deletePlan(plan)}
                      disabled={deletingId === plan.id}
                    >
                      {deletingId === plan.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default PlansSection;
