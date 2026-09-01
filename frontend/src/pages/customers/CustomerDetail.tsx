import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { addFollowUpNote, fetchCustomer } from '../../api/customers';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../auth/AuthContext';
import { can } from '../../auth/permissions';
import { CustomerDetail } from '../../types';
import { formatDate, formatDateTime, titleCase } from '../../utils/format';

export function CustomerDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(() => {
    if (!id) {
      return;
    }

    fetchCustomer(id)
      .then(setCustomer)
      .catch((fetchError) => setError(getErrorMessage(fetchError)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  async function handleAddNote(event: FormEvent) {
    event.preventDefault();

    if (!id) {
      return;
    }

    setSavingNote(true);
    setError('');

    try {
      await addFollowUpNote(id, note, followUpDate || undefined);
      setNote('');
      setFollowUpDate('');
      load();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) {
    return <div className="empty">Loading customer</div>;
  }

  if (!customer) {
    return <div className="alert alert-error">{error || 'Customer not found'}</div>;
  }

  const canManage = can(user?.role, 'manageCustomers');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{customer.businessName}</h1>
          <p>
            {customer.name} · {titleCase(customer.type)} · <StatusBadge value={customer.status} />
          </p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-secondary" to="/customers">
            Back to list
          </Link>
          {canManage ? (
            <Link className="btn" to={`/customers/${customer.id}/edit`}>
              Edit customer
            </Link>
          ) : null}
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="card-header">
          <h2>Details</h2>
        </div>
        <div className="card-body">
          <div className="detail-list">
            <div className="detail-item">
              <span>Mobile</span>
              <strong>{customer.mobile}</strong>
            </div>
            <div className="detail-item">
              <span>Email</span>
              <strong>{customer.email ?? '-'}</strong>
            </div>
            <div className="detail-item">
              <span>GST number</span>
              <strong>{customer.gstNumber ?? '-'}</strong>
            </div>
            <div className="detail-item">
              <span>Address</span>
              <strong>
                {customer.addressLine}, {customer.city}, {customer.state} {customer.pincode}
              </strong>
            </div>
            <div className="detail-item">
              <span>Next follow up</span>
              <strong>{formatDate(customer.followUpDate)}</strong>
            </div>
            <div className="detail-item">
              <span>Added by</span>
              <strong>{customer.createdBy.name}</strong>
            </div>
          </div>

          {customer.notes ? (
            <div className="section-gap">
              <span className="muted">Notes</span>
              <p>{customer.notes}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-two section-gap">
        <div className="card">
          <div className="card-header">
            <h2>Follow up history</h2>
          </div>
          <div className="card-body">
            {canManage ? (
              <form onSubmit={handleAddNote}>
                <div className="field">
                  <label htmlFor="note">Add a follow up note</label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Called about pending quotation"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="followUpDate">Next follow up date</label>
                  <input
                    id="followUpDate"
                    type="date"
                    value={followUpDate}
                    onChange={(event) => setFollowUpDate(event.target.value)}
                  />
                </div>
                <button type="submit" className="btn" disabled={savingNote}>
                  {savingNote ? 'Saving' : 'Add note'}
                </button>
              </form>
            ) : null}

            <div className="note-list section-gap">
              {customer.followUps.length === 0 ? (
                <p className="muted">No follow ups recorded yet</p>
              ) : (
                customer.followUps.map((entry) => (
                  <div className="note" key={entry.id}>
                    <div>{entry.note}</div>
                    <div className="note-meta">
                      {entry.createdBy.name} · {formatDateTime(entry.createdAt)}
                      {entry.followUpDate ? ` · next ${formatDate(entry.followUpDate)}` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Recent challans</h2>
          </div>
          <div className="table-wrap">
            {customer.challans.length === 0 ? (
              <div className="empty">No challans raised for this customer</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Challan</th>
                    <th className="text-right">Qty</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.challans.map((challan) => (
                    <tr key={challan.id}>
                      <td className="nowrap">
                        <Link to={`/challans/${challan.id}`}>{challan.challanNumber}</Link>
                      </td>
                      <td className="text-right">{challan.totalQuantity}</td>
                      <td>
                        <StatusBadge value={challan.status} />
                      </td>
                      <td className="nowrap">{formatDate(challan.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
