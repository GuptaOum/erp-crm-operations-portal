import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { can, Permission } from '../auth/permissions';
import { titleCase } from '../utils/format';

interface NavItem {
  to: string;
  label: string;
  end: boolean;
  permission?: Permission;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/customers', label: 'Customers', end: false, permission: 'viewCustomers' },
  { to: '/products', label: 'Products', end: false, permission: 'viewInventory' },
  {
    to: '/stock-movements',
    label: 'Stock movements',
    end: false,
    permission: 'viewStockMovements',
  },
  { to: '/challans', label: 'Sales challans', end: false, permission: 'viewChallans' },
];

export function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSignOut() {
    signOut();
    navigate('/login');
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || can(user?.role, item.permission),
  );

  return (
    <div className="shell">
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-brand">
          <strong>Operations Portal</strong>
          <span>ERP and CRM</span>
        </div>
        <nav className="sidebar-nav">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">{user ? `${titleCase(user.role)} access` : ''}</div>
      </aside>

      <div
        className={menuOpen ? 'sidebar-backdrop open' : 'sidebar-backdrop'}
        onClick={() => setMenuOpen(false)}
      />

      <div className="main">
        <header className="topbar">
          <button type="button" className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            Menu
          </button>
          <div className="topbar-user">
            <div>
              <strong>{user?.name}</strong>
              <span className="muted">{user?.email}</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
