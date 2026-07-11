import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Register service worker for PWA with update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
        
        // Immediately tell current worker to skip waiting
        if (registration.waiting) {
          console.log('Waiting worker found, sending SKIP_WAITING message');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Listen for new SW installs
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New SW installed, telling it to skip waiting...');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
        
        // Listen for controller change — new SW took over, reload
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('Service Worker controller changed');
        });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
