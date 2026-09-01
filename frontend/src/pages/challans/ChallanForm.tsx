import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { createChallan } from '../../api/challans';
import { fetchCustomers } from '../../api/customers';
import { fetchProducts } from '../../api/products';
import { Customer, Product } from '../../types';
import { formatCurrency } from '../../utils/format';

interface LineItem {
  productId: string;
  quantity: string;
}

const EMPTY_LINE: LineItem = { productId: '', quantity: '1' };

export function ChallanForm() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([EMPTY_LINE]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetchCustomers({ page: 1, limit: 100, status: 'ACTIVE' }),
      fetchProducts({ page: 1, limit: 100 }),
    ])
      .then(([customerResult, productResult]) => {
        setCustomers(customerResult.data);
        setProducts(productResult.data);
      })
      .catch((fetchError) => setError(getErrorMessage(fetchError)))
      .finally(() => setLoading(false));
  }, []);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const total = lines.reduce((sum, line) => {
    const product = productById.get(line.productId);
    return product ? sum + product.unitPrice * Number(line.quantity || 0) : sum;
  }, 0);

  function updateLine(index: number, changes: Partial<LineItem>) {
    setLines((current) =>
      current.map((line, position) => (position === index ? { ...line, ...changes } : line)),
    );
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, position) => position !== index));
  }

  async function submit(confirm: boolean) {
    setError('');
    setSubmitting(true);

    const items = lines
      .filter((line) => line.productId && Number(line.quantity) > 0)
      .map((line) => ({ productId: line.productId, quantity: Number(line.quantity) }));

    if (items.length === 0) {
      setError('Add at least one product with a quantity');
      setSubmitting(false);
      return;
    }

    try {
      const challan = await createChallan({
        customerId,
        notes: notes || undefined,
        confirm,
        items,
      });

      navigate(`/challans/${challan.id}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit(false);
  }

  if (loading) {
    return <div className="empty">Loading customers and products</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>New sales challan</h1>
          <p>Confirming a challan reduces stock and writes an outward movement</p>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-body">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="customerId">Customer</label>
                <select
                  id="customerId"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.businessName} ({customer.name})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="notes">Notes</label>
                <input
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Vehicle number, delivery instructions"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card section-gap">
          <div className="card-header">
            <h2>Products</h2>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setLines([...lines, { ...EMPTY_LINE }])}
            >
              Add line
            </button>
          </div>
          <div className="card-body">
            <div className="line-items">
              {lines.map((line, index) => {
                const product = productById.get(line.productId);

                return (
                  <div className="line-item" key={index}>
                    <select
                      value={line.productId}
                      onChange={(event) => updateLine(index, { productId: event.target.value })}
                    >
                      <option value="">Select a product</option>
                      {products.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.sku} · {option.name} · {option.currentStock} in stock
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(event) => updateLine(index, { quantity: event.target.value })}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => removeLine(index)}
                      disabled={lines.length === 1}
                    >
                      X
                    </button>
                    {product ? (
                      <div className="line-note muted">
                        {formatCurrency(product.unitPrice)} each ·{' '}
                        {formatCurrency(product.unitPrice * Number(line.quantity || 0))} line total
                        {Number(line.quantity) > product.currentStock
                          ? ' · quantity exceeds available stock'
                          : ''}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="challan-total">
              <span className="muted">Estimated value</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </div>
        </div>

        <div className="form-actions section-gap">
          <button type="submit" className="btn btn-secondary" disabled={submitting}>
            Save as draft
          </button>
          <button
            type="button"
            className="btn"
            disabled={submitting}
            onClick={() => submit(true)}
          >
            Save and confirm
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/challans')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
