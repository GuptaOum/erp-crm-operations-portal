import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import {
  cancelChallan,
  confirmChallan,
  downloadChallanPdf,
  fetchChallan,
} from '../../api/challans';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../auth/AuthContext';
import { can } from '../../auth/permissions';
import { Challan } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';

export function ChallanDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    if (!id) {
      return;
    }

    fetchChallan(id)
      .then(setChallan)
      .catch((fetchError) => setError(getErrorMessage(fetchError)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  async function handleConfirm() {
    if (!id) {
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const updated = await confirmChallan(id);
      setChallan(updated);
      setMessage('Challan confirmed and stock reduced');
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!id || !window.confirm('Cancel this challan? Confirmed stock will be returned.')) {
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const updated = await cancelChallan(id);
      setChallan(updated);
      setMessage('Challan cancelled');
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    if (!challan) {
      return;
    }

    setError('');

    try {
      await downloadChallanPdf(challan.id, challan.challanNumber);
    } catch (downloadError) {
      setError(getErrorMessage(downloadError));
    }
  }

  if (loading) {
    return <div className="empty">Loading challan</div>;
  }

  if (!challan) {
    return <div className="alert alert-error">{error || 'Challan not found'}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{challan.challanNumber}</h1>
          <p>
            <StatusBadge value={challan.status} /> · raised by {challan.createdBy.name} on{' '}
            {formatDateTime(challan.createdAt)}
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-secondary" to="/challans">
            Back to list
          </Link>
          {can(user?.role, 'downloadChallan') ? (
            <button type="button" className="btn btn-secondary" onClick={handleDownload}>
              Download PDF
            </button>
          ) : null}
          {challan.status === 'DRAFT' && can(user?.role, 'confirmChallan') ? (
            <button type="button" className="btn" disabled={busy} onClick={handleConfirm}>
              Confirm challan
            </button>
          ) : null}
          {challan.status !== 'CANCELLED' && can(user?.role, 'cancelChallan') ? (
            <button type="button" className="btn btn-danger" disabled={busy} onClick={handleCancel}>
              Cancel challan
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="card">
        <div className="card-header">
          <h2>Customer</h2>
        </div>
        <div className="card-body">
          <div className="detail-list">
            <div className="detail-item">
              <span>Business</span>
              <strong>
                <Link to={`/customers/${challan.customer.id}`}>
                  {challan.customer.businessName}
                </Link>
              </strong>
            </div>
            <div className="detail-item">
              <span>Contact</span>
              <strong>
                {challan.customer.name} · {challan.customer.mobile}
              </strong>
            </div>
            <div className="detail-item">
              <span>GST number</span>
              <strong>{challan.customer.gstNumber ?? '-'}</strong>
            </div>
            <div className="detail-item">
              <span>Delivery address</span>
              <strong>
                {challan.customer.addressLine}, {challan.customer.city},{' '}
                {challan.customer.state} {challan.customer.pincode}
              </strong>
            </div>
            {challan.confirmedAt ? (
              <div className="detail-item">
                <span>Confirmed at</span>
                <strong>{formatDateTime(challan.confirmedAt)}</strong>
              </div>
            ) : null}
            {challan.cancelledAt ? (
              <div className="detail-item">
                <span>Cancelled at</span>
                <strong>{formatDateTime(challan.cancelledAt)}</strong>
              </div>
            ) : null}
          </div>

          {challan.notes ? (
            <div className="section-gap">
              <span className="muted">Notes</span>
              <p>{challan.notes}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card section-gap">
        <div className="card-header">
          <h2>Items</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Quantity</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {challan.items.map((item) => (
                <tr key={item.id}>
                  <td className="nowrap">{item.productSku}</td>
                  <td>{item.productName}</td>
                  <td className="text-right nowrap">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right nowrap">{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span className="muted">Total quantity {challan.totalQuantity}</span>
          <strong>{formatCurrency(challan.totalAmount)}</strong>
        </div>
      </div>
    </div>
  );
}
