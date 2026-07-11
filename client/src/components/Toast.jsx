import { useState, useEffect, useCallback } from 'react';

const TOAST_TYPES = {
  success: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    bgColor: '#ecfdf5',
    borderColor: '#22c55e',
    textColor: '#166534',
    iconBg: '#22c55e',
  },
  error: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    bgColor: '#fef2f2',
    borderColor: '#ef4444',
    textColor: '#991b1b',
    iconBg: '#ef4444',
  },
  info: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgColor: '#eff6ff',
    borderColor: '#3b82f6',
    textColor: '#1e40af',
    iconBg: '#3b82f6',
  },
};

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const config = TOAST_TYPES[type] || TOAST_TYPES.info;

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    // Trigger enter animation on next frame
    const enterTimer = requestAnimationFrame(() => setIsVisible(true));
    const exitTimer = setTimeout(handleClose, duration);

    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [duration, handleClose]);

  if (!isVisible && !isExiting) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 99999,
        transform: isExiting
          ? 'translateX(120%)'
          : isVisible
            ? 'translateX(0)'
            : 'translateX(120%)',
        opacity: isExiting ? 0 : isVisible ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
        maxWidth: '420px',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          backgroundColor: config.bgColor,
          border: `2px solid ${config.borderColor}`,
          borderRadius: '14px',
          padding: '14px 18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 4px 4px 0 rgba(0,0,0,0.06)',
          position: 'relative',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: config.iconBg,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {config.icon}
        </div>

        {/* Message */}
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: config.textColor,
            lineHeight: 1.4,
            flex: 1,
            wordBreak: 'break-word',
          }}
        >
          {message}
        </p>

        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: config.textColor,
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            borderRadius: '6px',
            transition: 'opacity 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.6';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
