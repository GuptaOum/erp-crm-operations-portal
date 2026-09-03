import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function Login() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Operations Portal</h1>
        <p>Sign in to continue</p>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn auth-submit" disabled={submitting}>
            {submitting ? 'Signing in' : 'Sign in'}
          </button>
        </form>

        <div className="auth-hint">
          <strong>Demo accounts</strong>
          <table className="auth-roles">
            <thead>
              <tr>
                <th>Email</th>
                <th>Password</th>
                <th>Role does</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>admin@example.com</td>
                <td>Portal@2026</td>
                <td>Everything, and the only role that manages staff accounts</td>
              </tr>
              <tr>
                <td>sales@example.com</td>
                <td>Portal@2026</td>
                <td>Customers, follow ups, challans</td>
              </tr>
              <tr>
                <td>warehouse@example.com</td>
                <td>Portal@2026</td>
                <td>Products, stock movements, confirming challans</td>
              </tr>
              <tr>
                <td>accounts@example.com</td>
                <td>Portal@2026</td>
                <td>Reads everything, downloads challan PDFs</td>
              </tr>
            </tbody>
          </table>
          <p>
            These are four seeded examples, one per role, not a limit. There is no public sign up:
            an admin creates every account from <strong>Users</strong>, sets its role and can reset
            its password or deactivate it at any time. A deactivated account stops working on its
            very next request, not when its token expires. Add fifty warehouse staff or five hundred
            sales users the same way, the four roles stay the same.
          </p>
        </div>
      </div>
    </div>
  );
}
