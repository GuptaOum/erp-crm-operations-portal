import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { fetchCustomers } from '../../api/customers';
import { Pagination } from '../../components/Pagination';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../auth/AuthContext';
import { can } from '../../auth/permissions';
import { useDebounce } from '../../hooks/useDebounce';
import { Customer, PageMeta } from '../../types';
import { formatDate, titleCase } from '../../utils/format';

const STATUSES = ['LEAD', 'ACTIVE', 'INACTIVE'];
const TYPES = ['RETAIL', 'WHOLESALE', 'DISTRIBUTOR'];

export function CustomerList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [type, setType] = useState(searchParams.get('type') ?? '');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, type]);

  useEffect(() => {
    const params: Record<string, string> = {};

    if (debouncedSearch) {
      params.search = debouncedSearch;
    }

    if (status) {
      params.status = status;
    }

    if (type) {
      params.type = type;
    }

    setSearchParams(params, { replace: true });

    setLoading(true);
    fetchCustomers({ page, limit: 20, search: debouncedSearch, status, type })
      .then((result) => {
        setCustomers(result.data);
        setMeta(result.meta);
        setError('');
      })
      .catch((fetchError) => setError(getErrorMessage(fetchError)))
      .finally(() => setLoading(false));
  }, [debouncedSearch, status, type, page, setSearchParams]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>Leads and active accounts with follow up history</p>
        </div>
        {can(user?.role, 'manageCustomers') ? (
          <div className="page-actions">
            <Link className="btn" to="/customers/new">
              Add customer
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
            placeholder="Name, business, mobile or GST"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">All</option>
            {TYPES.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="empty">Loading customers</div>
          ) : customers.length === 0 ? (
            <div className="empty">No customers match these filters</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Mobile</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Follow up</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <Link to={`/customers/${customer.id}`}>{customer.businessName}</Link>
                    </td>
                    <td>{customer.name}</td>
                    <td className="nowrap">{customer.mobile}</td>
                    <td>{titleCase(customer.type)}</td>
                    <td>
                      <StatusBadge value={customer.status} />
                    </td>
                    <td className="nowrap">{formatDate(customer.followUpDate)}</td>
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
