import { useState, useEffect } from 'react';

const UPDATE_PROMPT_SHOWN_FOR_KEY = 'pwa_update_prompt_shown_for';

function getSwIdentifier(registration) {
  // Use script URL as stable identifier across deployments.
  // If your build produces a versioned sw URL, this becomes a perfect “only once per deployment” gate.
  try {
    const swUrl = registration?.waiting?.scriptURL || registration?.active?.scriptURL || '';
    return swUrl;
  } catch {
    return '';
  }
}

export default function PWAUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let didCancel = false;

    navigator.serviceWorker.ready.then((reg) => {
      if (didCancel) return;
      setRegistration(reg);

      const maybeShow = () => {
        if (didCancel) return;
        if (!reg.waiting) return;
        if (!navigator.serviceWorker.controller) {
          // If there is no controller yet, we don't treat it as an “update available”.
          return;
        }

        const swId = getSwIdentifier(reg);
        const lastShown = window.localStorage.getItem(UPDATE_PROMPT_SHOWN_FOR_KEY);
        if (swId && lastShown === swId) {
          return; // already shown for this waiting SW version
        }

        window.localStorage.setItem(UPDATE_PROMPT_SHOWN_FOR_KEY, swId || 'unknown');
        setShowUpdate(true);
      };

      // Show if there's already a waiting SW (e.g., user refreshed after deployment)
      maybeShow();

      // Show when a new SW is installed and is waiting to activate
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            maybeShow();
          }
        });
      });
    });

    // No periodic polling. Let browser-triggered update checks or reloads handle update detection.
    return () => {
      didCancel = true;
    };
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      registration.waiting.addEventListener('statechange', () => {
        if (registration.waiting?.state === 'activated') {
          window.location.reload();
        }
      });
    }
  };

  const handleDismiss = () => {
    // Keep gating so “Later” doesn't re-open the same prompt repeatedly.
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            A new version of the app is available.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleUpdate}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Update Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-500"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

