import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { fetchFollowUps } from '../../api/customers';
import { Pagination } from '../../components/Pagination';
import { StatusBadge } from '../../components/StatusBadge';
import { FollowUpCustomer, PageMeta } from '../../types';
import { formatDate } from '../../utils/format';

const BUCKETS = ['all', 'overdue', 'today', 'upcoming'] as const;
type Bucket = (typeof BUCKETS)[number];

const EMPTY_COUNTS = { overdue: 0, today: 0, upcoming: 0 };

function isBucket(value: string): value is Bucket {
  return (BUCKETS as readonly string[]).includes(value);
}

function dueLabel(value: string) {
  const due = new Date(value);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (days < 0) {
    return `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`;
  }

  if (days === 0) {
    return 'Due today';
  }

  return `In ${days} day${days === 1 ? '' : 's'}`;
}

export function FollowUps() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBucket = searchParams.get('bucket');

  const [bucket, setBucket] = useState<Bucket>(
    initialBucket && isBucket(initialBucket) ? initialBucket : 'all',
  );
  const [rows, setRows] = useState<FollowUpCustomer[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [bucket]);

  useEffect(() => {
    setSearchParams(bucket === 'all' ? {} : { bucket }, { replace: true });

    setLoading(true);
    fetchFollowUps({ bucket, page, limit: 20 })
      .then((result) => {
        setRows(result.data);
        setMeta(result.meta);
        setCounts(result.counts);
        setError('');
      })
      .catch((fetchError) => setError(getErrorMessage(fetchError)))
      .finally(() => setLoading(false));
  }, [bucket, page, setSearchParams]);

  const tabs: { key: Bucket; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'overdue', label: 'Overdue', count: counts.overdue },
    { key: 'today', label: 'Today', count: counts.today },
    { key: 'upcoming', label: 'Upcoming', count: counts.upcoming },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Follow ups</h1>
          <p>Accounts with a follow up date, most urgent first</p>
        </div>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={bucket === tab.key ? 'tab active' : 'tab'}
            onClick={() => setBucket(tab.key)}
          >
            {tab.label}
            {tab.count !== undefined ? <span className="tab-count">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="empty">Loading follow ups</div>
          ) : rows.length === 0 ? (
            <div className="empty">Nothing due here</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Mobile</th>
                  <th>Status</th>
                  <th>Follow up</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const overdue = new Date(row.followUpDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

                  return (
                    <tr key={row.id}>
                      <td>
                        <Link to={`/customers/${row.id}`}>{row.businessName}</Link>
                      </td>
                      <td>{row.name}</td>
                      <td className="nowrap">{row.mobile}</td>
                      <td>
                        <StatusBadge value={row.status} />
                      </td>
                      <td className="nowrap">{formatDate(row.followUpDate)}</td>
                      <td className={overdue ? 'nowrap text-danger' : 'nowrap'}>
                        {dueLabel(row.followUpDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {meta ? <Pagination meta={meta} onChange={setPage} /> : null}
      </div>
    </div>
  );
}
