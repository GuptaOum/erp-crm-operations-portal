import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { createCustomer, fetchCustomer, updateCustomer } from '../../api/customers';
import { titleCase, toDateInput } from '../../utils/format';

const STATUSES = ['LEAD', 'ACTIVE', 'INACTIVE'];
const TYPES = ['RETAIL', 'WHOLESALE', 'DISTRIBUTOR'];

const EMPTY_FORM = {
  name: '',
  mobile: '',
  email: '',
  businessName: '',
  gstNumber: '',
  type: 'RETAIL',
  addressLine: '',
  city: '',
  state: 'Maharashtra',
  pincode: '',
  status: 'LEAD',
  followUpDate: '',
  notes: '',
};

export function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }

    fetchCustomer(id)
      .then((customer) =>
        setForm({
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email ?? '',
          businessName: customer.businessName,
          gstNumber: customer.gstNumber ?? '',
          type: customer.type,
          addressLine: customer.addressLine,
          city: customer.city,
          state: customer.state,
          pincode: customer.pincode,
          status: customer.status,
          followUpDate: toDateInput(customer.followUpDate),
          notes: customer.notes ?? '',
        }),
      )
      .catch((fetchError) => setError(getErrorMessage(fetchError)))
      .finally(() => setLoading(false));
  }, [id]);

  function update(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const payload = {
      ...form,
      followUpDate: form.followUpDate || undefined,
      notes: form.notes || undefined,
    };

    try {
      if (id) {
        await updateCustomer(id, payload);
        navigate(`/customers/${id}`);
      } else {
        const customer = await createCustomer(payload);
        navigate(`/customers/${customer.id}`);
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="empty">Loading customer</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isEdit ? 'Edit customer' : 'Add customer'}</h1>
          <p>Business, contact and follow up details</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="businessName">Business name</label>
                <input
                  id="businessName"
                  value={form.businessName}
                  onChange={(event) => update('businessName', event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="name">Contact person</label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="mobile">Mobile</label>
                <input
                  id="mobile"
                  value={form.mobile}
                  onChange={(event) => update('mobile', event.target.value)}
                  placeholder="10 digit number"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => update('email', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="gstNumber">GST number</label>
                <input
                  id="gstNumber"
                  value={form.gstNumber}
                  onChange={(event) => update('gstNumber', event.target.value.toUpperCase())}
                  placeholder="Optional"
                />
              </div>
              <div className="field">
                <label htmlFor="type">Customer type</label>
                <select
                  id="type"
                  value={form.type}
                  onChange={(event) => update('type', event.target.value)}
                >
                  {TYPES.map((value) => (
                    <option key={value} value={value}>
                      {titleCase(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="addressLine">Address</label>
                <input
                  id="addressLine"
                  value={form.addressLine}
                  onChange={(event) => update('addressLine', event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  value={form.city}
                  onChange={(event) => update('city', event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="state">State</label>
                <input
                  id="state"
                  value={form.state}
                  onChange={(event) => update('state', event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="pincode">Pincode</label>
                <input
                  id="pincode"
                  value={form.pincode}
                  onChange={(event) => update('pincode', event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(event) => update('status', event.target.value)}
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {titleCase(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="followUpDate">Follow up date</label>
                <input
                  id="followUpDate"
                  type="date"
                  value={form.followUpDate}
                  onChange={(event) => update('followUpDate', event.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(event) => update('notes', event.target.value)}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Saving' : 'Save customer'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
