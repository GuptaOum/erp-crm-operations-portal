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
          <table className="auth-roles">
            <caption>Demo accounts</caption>
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Password</th>
                <th scope="col">Role does</th>
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
            Four seeded examples, not a limit. There is no public sign up: an admin creates every
            account from <strong>Users</strong> and can reset its password or deactivate it, which
            takes effect on the next request. Any number of users, still four roles.
          </p>
        </div>
      </div>
    </div>
  );
}
