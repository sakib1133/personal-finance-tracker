import { useState } from 'react';

export default function PasswordInput({
  id,
  value,
  onChange,
  required = false,
  minLength,
  maxLength,
  autoComplete,
  ariaDescribedBy,
  placeholder = '••••••••',
  className = '',
  style = {}
}) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      togglePasswordVisibility();
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-describedby={ariaDescribedBy}
        placeholder={placeholder}
        className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-md border focus:outline-none focus:ring-2 text-sm pr-16 ${className}`}
        style={{
          backgroundColor: 'var(--bg-input)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
          ...style
        }}
      />

      <button
        type="button"
        onClick={togglePasswordVisibility}
        onKeyDown={handleKeyDown}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium px-2 py-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 transition-colors z-10 cursor-pointer"
        style={{
          color: 'var(--text-secondary)'
        }}
      >
        {showPassword ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
