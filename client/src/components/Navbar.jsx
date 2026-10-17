import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `app-nav-link ${isActive ? 'app-nav-link-active' : ''}`;
  };

  return (
    <nav className="app-navbar shadow-md" style={{ backgroundColor: 'var(--bg-card)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <span className="app-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 17.5 10 12l3.5 3.5L20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15.5 8H20v4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h1 className="app-brand-title text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Mini Expense Tracker
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/dashboard" className={navLinkClass('/dashboard')}>
              Dashboard
            </Link>
            <Link to="/analytics" className={navLinkClass('/analytics')}>
              Analytics
            </Link>
            <Link to="/budgets" className={navLinkClass('/budgets')}>
              Budgets
            </Link>
          </div>

          {/* Desktop User Info */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Welcome, {user?.fullName}
            </span>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-text)' }}
            >
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMenuOpen}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="app-mobile-menu md:hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/dashboard"
              className={navLinkClass('/dashboard')}
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              to="/analytics"
              className={navLinkClass('/analytics')}
              onClick={() => setIsMenuOpen(false)}
            >
              Analytics
            </Link>
            <Link
              to="/budgets"
              className={navLinkClass('/budgets')}
              onClick={() => setIsMenuOpen(false)}
            >
              Budgets
            </Link>
            <div className="border-t pt-3 mt-3" style={{ borderColor: 'var(--border)' }}>
              <p className="px-3 py-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Welcome, {user?.fullName}
              </p>
              <button
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-text)' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
