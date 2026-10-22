import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import PasswordInput from '../components/PasswordInput';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  const passwordRequirements = [
    { label: 'At least 12 characters', met: Array.from(password).length >= 12 },
    { label: 'No more than 72 UTF-8 bytes', met: new TextEncoder().encode(password).length <= 72 },
    { label: 'A lowercase letter', met: /[a-z]/.test(password) },
    { label: 'A number', met: /\d/.test(password) },
    { label: 'A symbol', met: /[^A-Za-z0-9]/.test(password) }
  ];
  const passwordStrength = password
    ? passwordRequirements.filter(({ met }) => met).length
    : 0;
  const isPasswordStrong = passwordStrength === passwordRequirements.length;
  const strengthLabel = !password
    ? 'Not entered'
    : isPasswordStrong
      ? 'Strong'
      : passwordStrength >= 4
        ? 'Good'
        : passwordStrength >= 2
          ? 'Fair'
          : 'Weak';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordStrong) {
      setError('Use at least 12 characters, including a lowercase letter, a number, and a symbol');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const result = await register(fullName, email, password, confirmPassword);

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
      <section className="login-form-panel" aria-labelledby="signup-title">
        <div className="login-form-wrap signup-form-wrap">
          <div className="login-heading">
            <h2 id="signup-title">Create your account</h2>
            <p>Get started managing your expenses.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error" role="alert">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 6.5v4M10 13.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}

            <div className="login-field">
              <label htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                className="login-input"
                placeholder="John Doe"
              />
            </div>

            <div className="login-field">
              <label htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="login-input"
                placeholder="you@example.com"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">
                Password
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
                ariaDescribedBy="password-strength"
                className="login-input"
                style={{ backgroundColor: '#f8faf9', borderColor: '#dce5df', color: '#172b24' }}
                placeholder="Create a password"
              />
              <div className="signup-password-strength" id="password-strength" aria-live="polite">
                <div className="password-strength-label">
                  <span>Password strength</span>
                  <strong className={`password-strength-${strengthLabel.toLowerCase().replace(' ', '-')}`}>
                    {strengthLabel}
                  </strong>
                </div>
                <div
                  className="password-strength-meter"
                  role="progressbar"
                  aria-label={`Password strength: ${strengthLabel}`}
                  aria-valuemin={0}
                  aria-valuemax={passwordRequirements.length}
                  aria-valuenow={passwordStrength}
                >
                  <span style={{ width: `${(passwordStrength / passwordRequirements.length) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
                className="login-input"
                style={{ backgroundColor: '#f8faf9', borderColor: '#dce5df', color: '#172b24' }}
                placeholder="Re-enter your password"
              />
            </div>

            <button type="submit" disabled={loading} className="login-submit">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          {isInstallable && !isInstalled && (
            <button type="button" onClick={promptInstall} className="login-install">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Install app
            </button>
          )}

          <p className="login-signup">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
