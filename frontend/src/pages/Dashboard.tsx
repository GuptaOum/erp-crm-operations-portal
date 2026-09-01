import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { fetchSummary } from '../api/dashboard';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import { DashboardSummary } from '../types';
import { formatDate } from '../utils/format';

export function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary()
      .then(setSummary)
      .catch((fetchError) => setError(getErrorMessage(fetchError)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="empty">Loading dashboard</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!summary) {
    return null;
  }

  const { totals } = summary;
  const showCustomers = can(user?.role, 'viewCustomers');
  const showInventory = can(user?.role, 'viewInventory');
  const showStockAlerts = can(user?.role, 'viewStockAlerts');
  const showFollowUps = can(user?.role, 'viewFollowUps');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>{user ? `Overview for the ${user.role.toLowerCase()} team` : ''}</p>
        </div>
      </div>

      <div className="grid grid-stats dashboard-stats">
        {showCustomers ? (
          <>
            <div className="stat">
              <span>Customers</span>
              <strong>{totals.totalCustomers}</strong>
            </div>
            <div className="stat">
              <span>Active</span>
              <strong>{totals.activeCustomers}</strong>
            </div>
            <div className="stat">
              <span>Open leads</span>
              <strong>{totals.leads}</strong>
            </div>
          </>
        ) : null}
        {showInventory ? (
          <div className="stat">
            <span>Products</span>
            <strong>{totals.totalProducts}</strong>
          </div>
        ) : null}
        {showStockAlerts ? (
            <div className="stat">
              <span>Low stock</span>
              <strong>{totals.lowStockProducts}</strong>
            </div>
        ) : null}
        <div className="stat">
          <span>Draft challans</span>
          <strong>{totals.draftChallans}</strong>
        </div>
        <div className="stat">
          <span>Confirmed challans</span>
          <strong>{totals.confirmedChallans}</strong>
        </div>
      </div>

      <div className="grid grid-two">
        <div className="card">
          <div className="card-header">
            <h2>Recent challans</h2>
            <Link to="/challans">View all</Link>
          </div>
          <div className="table-wrap">
            {summary.recentChallans.length === 0 ? (
              <div className="empty">No challans yet</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Challan</th>
                    <th>Customer</th>
                    <th className="text-right">Qty</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentChallans.map((challan) => (
                    <tr key={challan.id}>
                      <td className="nowrap">
                        <Link to={`/challans/${challan.id}`}>{challan.challanNumber}</Link>
                      </td>
                      <td>{challan.customer.businessName}</td>
                      <td className="text-right">{challan.totalQuantity}</td>
                      <td>
                        <StatusBadge value={challan.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {showStockAlerts ? (
          <div className="card">
            <div className="card-header">
              <h2>Stock alerts</h2>
              <Link to="/products?lowStock=true">View all</Link>
            </div>
            <div className="table-wrap">
              {summary.stockAlerts.length === 0 ? (
                <div className="empty">All products are above their alert level</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product</th>
                      <th className="text-right">In stock</th>
                      <th className="text-right">Alert at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.stockAlerts.map((product) => (
                      <tr key={product.id}>
                        <td className="nowrap">{product.sku}</td>
                        <td>{product.name}</td>
                        <td className="text-right">{product.currentStock}</td>
                        <td className="text-right">{product.minStockAlert}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : null}

        {showFollowUps ? (
          <div className="card">
            <div className="card-header">
              <h2>Follow ups due</h2>
              <Link to="/customers">View all</Link>
            </div>
            <div className="table-wrap">
              {summary.upcomingFollowUps.length === 0 ? (
                <div className="empty">Nothing scheduled in the next seven days</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Contact</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.upcomingFollowUps.map((customer) => (
                      <tr key={customer.id}>
                        <td>
                          <Link to={`/customers/${customer.id}`}>{customer.businessName}</Link>
                        </td>
                        <td className="nowrap">{customer.mobile}</td>
                        <td className="nowrap">{formatDate(customer.followUpDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
