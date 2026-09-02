import { FormEvent, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { createChallan } from '../../api/challans';
import { fetchCustomers } from '../../api/customers';
import { fetchProducts } from '../../api/products';
import { SearchSelect } from '../../components/SearchSelect';
import { Customer, Product } from '../../types';
import { formatCurrency } from '../../utils/format';

interface LineItem {
  product: Product | null;
  quantity: string;
}

const EMPTY_LINE: LineItem = { product: null, quantity: '1' };

const PICKER_LIMIT = 20;

export function ChallanForm() {
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const searchCustomers = useCallback(
    (term: string) =>
      fetchCustomers({ page: 1, limit: PICKER_LIMIT, status: 'ACTIVE', search: term || undefined })
        .then((result) => result.data),
    [],
  );

  const searchProducts = useCallback(
    (term: string) =>
      fetchProducts({ page: 1, limit: PICKER_LIMIT, search: term || undefined }).then(
        (result) => result.data,
      ),
    [],
  );

  const total = lines.reduce(
    (sum, line) => (line.product ? sum + line.product.unitPrice * Number(line.quantity || 0) : sum),
    0,
  );

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

    if (!customer) {
      setError('Select a customer');
      return;
    }

    const items = lines
      .filter((line) => line.product && Number(line.quantity) > 0)
      .map((line) => ({ productId: line.product!.id, quantity: Number(line.quantity) }));

    if (items.length === 0) {
      setError('Add at least one product with a quantity');
      return;
    }

    setSubmitting(true);

    try {
      const challan = await createChallan({
        customerId: customer.id,
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
                <SearchSelect<Customer>
                  id="customerId"
                  placeholder="Search by business, name, mobile or GST"
                  disabled={submitting}
                  selectedLabel={customer ? `${customer.businessName} (${customer.name})` : ''}
                  search={searchCustomers}
                  optionKey={(item) => item.id}
                  optionLabel={(item) => `${item.businessName} · ${item.name} · ${item.mobile}`}
                  onSelect={setCustomer}
                  onClear={() => setCustomer(null)}
                />
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
              {lines.map((line, index) => (
                <div className="line-item" key={index}>
                  <SearchSelect<Product>
                    placeholder="Search by SKU or name"
                    disabled={submitting}
                    selectedLabel={line.product ? `${line.product.sku} · ${line.product.name}` : ''}
                    search={searchProducts}
                    optionKey={(item) => item.id}
                    optionLabel={(item) =>
                      `${item.sku} · ${item.name} · ${item.currentStock} in stock`
                    }
                    onSelect={(product) => updateLine(index, { product })}
                    onClear={() => updateLine(index, { product: null })}
                  />
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
                  {line.product ? (
                    <div className="line-note muted">
                      {formatCurrency(line.product.unitPrice)} each ·{' '}
                      {formatCurrency(line.product.unitPrice * Number(line.quantity || 0))} line
                      total
                      {Number(line.quantity) > line.product.currentStock
                        ? ' · quantity exceeds available stock'
                        : ''}
                    </div>
                  ) : null}
                </div>
              ))}
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
          <button type="button" className="btn" disabled={submitting} onClick={() => submit(true)}>
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
