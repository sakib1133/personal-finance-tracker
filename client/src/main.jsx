import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Register service worker for PWA with update detection and auto-reload
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
        
        // Unregister all old workers first
        navigator.serviceWorker.getRegistrations()
          .then((registrations) => {
            for (let registration of registrations) {
              if (registration.scope !== registration.scope) {
                console.log('Unregistering old SW:', registration.scope);
                registration.unregister();
              }
            }
          })
          .catch((error) => {
            console.warn('Error getting registrations:', error);
          });
        
        // Immediately tell current worker to skip waiting
        if (registration.waiting) {
          console.log('Waiting worker found, sending SKIP_WAITING message');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Check for updates periodically (every 3 seconds)
        const updateCheckInterval = setInterval(() => {
          console.log('Checking for SW updates...');
          registration.update();
        }, 3000);
        
        // Listen for updates - auto-reload when new SW is installed
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('New Service Worker found, state:', newWorker.state);
          
          newWorker.addEventListener('statechange', () => {
            console.log('New SW state changed to:', newWorker.state);
            
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New SW installed, telling it to skip waiting...');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              } else {
                console.log('No controller, first install, reloading...');
                window.location.reload();
              }
            }
            
            if (newWorker.state === 'activated') {
              console.log('New SW activated, reloading page for fresh data...');
              clearInterval(updateCheckInterval);
              window.location.reload();
            }
          });
        });
        
        // Listen for controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('Service Worker controller changed, reloading...');
          window.location.reload();
        });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    
    // Listen for messages from service worker (e.g., SW_UPDATED)
    navigator.serviceWorker.addEventListener('message', (event) => {
      try {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('Service Worker updated, reloading for fresh data...');
          window.location.reload();
        }
      } catch (error) {
        console.warn('Error handling SW message:', error);
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
