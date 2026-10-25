import { useEffect, useRef } from 'react';

export default function GoogleSignIn({ loading, onCredential, onError, text = 'signin_with' }) {
  const googleButtonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  onCredentialRef.current = onCredential;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!googleClientId) {
      return undefined;
    }

    let isActive = true;
    let script = document.getElementById('google-identity-services');
    const shouldLoadScript = !script;
    if (!script) {
      script = document.createElement('script');
      script.id = 'google-identity-services';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
    }
    const onScriptError = () => {
      if (isActive) {
        script.dataset.loadFailed = 'true';
        onErrorRef.current('Google sign-in could not load. Please try email and password instead.');
      }
    };
    const onScriptLoad = () => {
      if (!isActive) {
        return;
      }
      if (!window.google?.accounts?.id) {
        onScriptError();
        return;
      }
      if (!googleButtonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          if (!credential) {
            onErrorRef.current('Google did not provide a sign-in credential. Please try again.');
            return;
          }

          await onCredentialRef.current(credential);
        }
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text,
        shape: 'rectangular',
        width: Math.min(400, googleButtonRef.current.clientWidth || 320)
      });
    };
    if (window.google?.accounts?.id) {
      onScriptLoad();
    } else if (script.dataset.loadFailed === 'true') {
      onScriptError();
    } else if (script) {
      script.addEventListener('load', onScriptLoad);
      script.addEventListener('error', onScriptError);
      if (shouldLoadScript) {
        document.head.appendChild(script);
      }
    } else {
      onScriptError();
    }

    return () => {
      isActive = false;
      script?.removeEventListener('load', onScriptLoad);
      script?.removeEventListener('error', onScriptError);
    };
  }, [googleClientId, text]);

  if (!googleClientId) {
    return (
      <p className="google-signin-unavailable">
        Google sign-in is not configured. Use email and password instead.
      </p>
    );
  }

  return (
    <div className={`google-signin${loading ? ' google-signin-loading' : ''}`} aria-busy={loading}>
      <div className="google-signin-divider"><span>or continue with</span></div>
      <div ref={googleButtonRef} className="google-signin-button" />
      {loading && <p className="google-signin-status" role="status">Signing in...</p>}
    </div>
  );
}
