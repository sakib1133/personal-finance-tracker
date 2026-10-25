import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import PasswordInput from '../components/PasswordInput';
import GoogleSignIn from '../components/GoogleSignIn';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const handleGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const result = await loginWithGoogle(credential);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-form-panel" aria-labelledby="login-title">
        <div className="login-form-wrap">
          <div className="login-heading">
            <h2 id="login-title">Sign in</h2>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error" role="alert">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 6.5v4M10 13.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="login-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="login-input"
                style={{ backgroundColor: '#f8faf9', borderColor: '#dce5df', color: '#172b24' }}
                placeholder="you@example.com"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="login-input"
                style={{ backgroundColor: '#f8faf9', borderColor: '#dce5df', color: '#172b24' }}
                placeholder="Enter your password"
              />
            </div>

            <button type="submit" disabled={loading} className="login-submit">
              <span>{loading ? 'Signing in...' : 'Sign in'}</span>
              {!loading && (
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </form>

          <GoogleSignIn
            loading={loading}
            onCredential={handleGoogleCredential}
            onError={setError}
          />

          {isInstallable && !isInstalled && (
            <button type="button" onClick={promptInstall} className="login-install">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Install app
            </button>
          )}

          <p className="login-signup">
            Don&apos;t have an account? <Link to="/signup">Create an account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
