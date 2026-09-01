import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { createUser, fetchUsers, resetUserPassword, updateUser } from '../../api/users';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../auth/AuthContext';
import { can } from '../../auth/permissions';
import { useDebounce } from '../../hooks/useDebounce';
import { PageMeta, PortalUser } from '../../types';
import { formatDate, titleCase } from '../../utils/format';

const ROLES = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'];

const ROLE_SUMMARY: Record<string, string> = {
  ADMIN: 'Full access, including this page',
  SALES: 'Customers, challans, catalogue',
  WAREHOUSE: 'Stock and challan confirmation',
  ACCOUNTS: 'Customers, challans, PDF exports',
};

export function UserList() {
  const { user: signedInUser } = useAuth();

  const [users, setUsers] = useState<PortalUser[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PortalUser | null>(null);
  const [resetting, setResetting] = useState<PortalUser | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('SALES');
  const [formPassword, setFormPassword] = useState('');

  const debouncedSearch = useDebounce(search);

  const load = useCallback(() => {
    setLoading(true);

    return fetchUsers({ page, limit: 20, search: debouncedSearch, role, isActive: status })
      .then((result) => {
        setUsers(result.data);
        setMeta(result.meta);
        setError('');
      })
      .catch((loadError) => setError(getErrorMessage(loadError)))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, role, status]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, status]);

  useEffect(() => {
    load();
  }, [load]);

  if (!can(signedInUser?.role, 'manageUsers')) {
    return <Navigate to="/" replace />;
  }

  function closeAll() {
    setCreating(false);
    setEditing(null);
    setResetting(null);
    setFormName('');
    setFormEmail('');
    setFormRole('SALES');
    setFormPassword('');
  }

  function openCreate() {
    closeAll();
    setError('');
    setNotice('');
    setCreating(true);
  }

  function openEdit(target: PortalUser) {
    closeAll();
    setError('');
    setNotice('');
    setFormName(target.name);
    setFormRole(target.role);
    setEditing(target);
  }

  function openReset(target: PortalUser) {
    closeAll();
    setError('');
    setNotice('');
    setResetting(target);
  }

  async function run(action: () => Promise<unknown>, message: string) {
    setSaving(true);

    try {
      await action();
      closeAll();
      setNotice(message);
      await load();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setSaving(false);
    }
  }

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    return run(
      () =>
        createUser({
          name: formName,
          email: formEmail,
          role: formRole,
          password: formPassword,
        }),
      `${formName} can now sign in`,
    );
  }

  function handleEdit(event: FormEvent) {
    event.preventDefault();

    if (!editing) {
      return;
    }

    const target = editing;
    return run(
      () => updateUser(target.id, { name: formName, role: formRole }),
      `${formName} updated`,
    );
  }

  function handleReset(event: FormEvent) {
    event.preventDefault();

    if (!resetting) {
      return;
    }

    const target = resetting;
    return run(
      () => resetUserPassword(target.id, formPassword),
      `Password reset for ${target.name}, share it with them directly`,
    );
  }

  function handleToggleActive(target: PortalUser) {
    return run(
      () => updateUser(target.id, { isActive: !target.isActive }),
      target.isActive
        ? `${target.name} deactivated and signed out everywhere`
        : `${target.name} reactivated`,
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p>Staff accounts and the role each one signs in with</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={openCreate}>
            Add user
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="field">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            value={search}
            placeholder="Name or email"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="role">Role</label>
          <select id="role" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">All roles</option>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="empty">Loading users</div>
          ) : users.length === 0 ? (
            <div className="empty">No users match these filters</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.name}
                      {row.id === signedInUser?.id ? <span className="muted"> (you)</span> : null}
                    </td>
                    <td className="nowrap">{row.email}</td>
                    <td>{titleCase(row.role)}</td>
                    <td>
                      <StatusBadge value={row.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td className="nowrap">{formatDate(row.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => openEdit(row)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => openReset(row)}
                        >
                          Reset password
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          disabled={row.id === signedInUser?.id || saving}
                          onClick={() => handleToggleActive(row)}
                        >
                          {row.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {meta ? <Pagination meta={meta} onChange={setPage} /> : null}
      </div>

      {creating ? (
        <Modal title="Add user" onClose={closeAll}>
          <form onSubmit={handleCreate}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={formEmail}
                onChange={(event) => setFormEmail(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="newRole">Role</label>
              <select
                id="newRole"
                value={formRole}
                onChange={(event) => setFormRole(event.target.value)}
              >
                {ROLES.map((value) => (
                  <option key={value} value={value}>
                    {titleCase(value)}
                  </option>
                ))}
              </select>
              <span className="muted">{ROLE_SUMMARY[formRole]}</span>
            </div>
            <div className="field">
              <label htmlFor="password">Temporary password</label>
              <input
                id="password"
                type="text"
                value={formPassword}
                onChange={(event) => setFormPassword(event.target.value)}
                placeholder="At least 8 characters, one letter and one number"
                required
              />
              <span className="muted">
                Share this with them directly. There is no password email from this portal.
              </span>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Saving' : 'Create user'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeAll}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editing ? (
        <Modal title={`Edit ${editing.email}`} onClose={closeAll}>
          <form onSubmit={handleEdit}>
            <div className="field">
              <label htmlFor="editName">Name</label>
              <input
                id="editName"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="editRole">Role</label>
              <select
                id="editRole"
                value={formRole}
                onChange={(event) => setFormRole(event.target.value)}
                disabled={editing.id === signedInUser?.id}
              >
                {ROLES.map((value) => (
                  <option key={value} value={value}>
                    {titleCase(value)}
                  </option>
                ))}
              </select>
              <span className="muted">
                {editing.id === signedInUser?.id
                  ? 'You cannot change your own role'
                  : ROLE_SUMMARY[formRole]}
              </span>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Saving' : 'Save changes'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeAll}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {resetting ? (
        <Modal title={`Reset password for ${resetting.name}`} onClose={closeAll}>
          <form onSubmit={handleReset}>
            <div className="field">
              <label htmlFor="resetPassword">New password</label>
              <input
                id="resetPassword"
                type="text"
                value={formPassword}
                onChange={(event) => setFormPassword(event.target.value)}
                placeholder="At least 8 characters, one letter and one number"
                required
              />
            </div>
            <p className="muted">
              Their current password stops working straight away. Any session they already have
              stays open until the token expires.
            </p>
            <div className="form-actions">
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Saving' : 'Reset password'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeAll}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
