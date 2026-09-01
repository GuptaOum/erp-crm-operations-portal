import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { createProduct, fetchProduct, updateProduct } from '../../api/products';

const EMPTY_FORM = {
  name: '',
  sku: '',
  category: '',
  unitPrice: '',
  currentStock: '0',
  minStockAlert: '0',
  location: '',
  isActive: true,
};

export function ProductForm() {
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

    fetchProduct(id)
      .then((product) =>
        setForm({
          name: product.name,
          sku: product.sku,
          category: product.category,
          unitPrice: String(product.unitPrice),
          currentStock: String(product.currentStock),
          minStockAlert: String(product.minStockAlert),
          location: product.location,
          isActive: product.isActive,
        }),
      )
      .catch((fetchError) => setError(getErrorMessage(fetchError)))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const payload = {
      name: form.name,
      sku: form.sku,
      category: form.category,
      unitPrice: Number(form.unitPrice),
      minStockAlert: Number(form.minStockAlert),
      location: form.location,
      isActive: form.isActive,
    };

    try {
      if (id) {
        await updateProduct(id, payload);
      } else {
        await createProduct({ ...payload, currentStock: Number(form.currentStock) });
      }

      navigate('/products');
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="empty">Loading product</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isEdit ? 'Edit product' : 'Add product'}</h1>
          <p>
            {isEdit
              ? 'Stock is changed through stock movements, not from this form'
              : 'Opening stock is recorded as an inward stock movement'}
          </p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="name">Product name</label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="sku">SKU</label>
                <input
                  id="sku"
                  value={form.sku}
                  onChange={(event) =>
                    setForm({ ...form, sku: event.target.value.toUpperCase() })
                  }
                  placeholder="CBL-1508"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="category">Category</label>
                <input
                  id="category"
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="unitPrice">Unit price</label>
                <input
                  id="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(event) => setForm({ ...form, unitPrice: event.target.value })}
                  required
                />
              </div>
              {isEdit ? null : (
                <div className="field">
                  <label htmlFor="currentStock">Opening stock</label>
                  <input
                    id="currentStock"
                    type="number"
                    min="0"
                    value={form.currentStock}
                    onChange={(event) => setForm({ ...form, currentStock: event.target.value })}
                    required
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor="minStockAlert">Minimum stock alert</label>
                <input
                  id="minStockAlert"
                  type="number"
                  min="0"
                  value={form.minStockAlert}
                  onChange={(event) => setForm({ ...form, minStockAlert: event.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  value={form.location}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                  placeholder="Rack A1"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="isActive">Status</label>
                <select
                  id="isActive"
                  value={form.isActive ? 'true' : 'false'}
                  onChange={(event) =>
                    setForm({ ...form, isActive: event.target.value === 'true' })
                  }
                >
                  <option value="true">Active</option>
                  <option value="false">Discontinued</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Saving' : 'Save product'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
