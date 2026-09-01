import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { fetchChallans } from '../../api/challans';
import { Pagination } from '../../components/Pagination';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../auth/AuthContext';
import { can } from '../../auth/permissions';
import { useDebounce } from '../../hooks/useDebounce';
import { Challan, PageMeta } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';

const STATUSES = ['DRAFT', 'CONFIRMED', 'CANCELLED'];

export function ChallanList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [challans, setChallans] = useState<Challan[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    const params: Record<string, string> = {};

    if (debouncedSearch) {
      params.search = debouncedSearch;
    }

    if (status) {
      params.status = status;
    }

    setSearchParams(params, { replace: true });

    setLoading(true);
    fetchChallans({ page, limit: 20, search: debouncedSearch, status })
      .then((result) => {
        setChallans(result.data);
        setMeta(result.meta);
        setError('');
      })
      .catch((fetchError) => setError(getErrorMessage(fetchError)))
      .finally(() => setLoading(false));
  }, [debouncedSearch, status, page, setSearchParams]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Sales challans</h1>
          <p>Outward delivery documents and their stock impact</p>
        </div>
        {can(user?.role, 'createChallan') ? (
          <div className="page-actions">
            <Link className="btn" to="/challans/new">
              New challan
            </Link>
          </div>
        ) : null}
      </div>

      <div className="filters">
        <div className="field">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            value={search}
            placeholder="Challan number or customer"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0) + value.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="empty">Loading challans</div>
          ) : challans.length === 0 ? (
            <div className="empty">No challans match these filters</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Challan</th>
                  <th>Customer</th>
                  <th className="text-right">Items</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Value</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {challans.map((challan) => (
                  <tr key={challan.id}>
                    <td className="nowrap">
                      <Link to={`/challans/${challan.id}`}>{challan.challanNumber}</Link>
                    </td>
                    <td>{challan.customer.businessName}</td>
                    <td className="text-right">{challan.items.length}</td>
                    <td className="text-right">{challan.totalQuantity}</td>
                    <td className="text-right nowrap">{formatCurrency(challan.totalAmount)}</td>
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
        {meta ? <Pagination meta={meta} onChange={setPage} /> : null}
      </div>
    </div>
  );
}
