import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { fetchStockMovements } from '../../api/stock';
import { Pagination } from '../../components/Pagination';
import { StatusBadge } from '../../components/StatusBadge';
import { PageMeta, StockMovement } from '../../types';
import { formatDateTime } from '../../utils/format';

export function StockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [type]);

  useEffect(() => {
    setLoading(true);

    fetchStockMovements({ page, limit: 20, type: type || undefined })
      .then((result) => {
        setMovements(result.data);
        setMeta(result.meta);
        setError('');
      })
      .catch((fetchError) => setError(getErrorMessage(fetchError)))
      .finally(() => setLoading(false));
  }, [page, type]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Stock movements</h1>
          <p>Every inward and outward change with its reason and author</p>
        </div>
        <div className="page-actions">
          <Link className="btn btn-secondary" to="/products">
            Back to products
          </Link>
        </div>
      </div>

      <div className="filters">
        <div className="field">
          <label htmlFor="type">Movement type</label>
          <select id="type" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">All movements</option>
            <option value="IN">Stock in</option>
            <option value="OUT">Stock out</option>
          </select>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="empty">Loading stock movements</div>
          ) : movements.length === 0 ? (
            <div className="empty">No stock movements recorded</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th className="text-right">Quantity</th>
                  <th>Reason</th>
                  <th>Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="nowrap">{formatDateTime(movement.createdAt)}</td>
                    <td className="nowrap">{movement.product.sku}</td>
                    <td>{movement.product.name}</td>
                    <td>
                      <StatusBadge value={movement.type} />
                    </td>
                    <td className="text-right">{movement.quantity}</td>
                    <td>{movement.reason}</td>
                    <td className="nowrap">{movement.createdBy.name}</td>
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
