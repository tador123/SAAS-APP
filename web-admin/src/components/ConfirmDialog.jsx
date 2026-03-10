import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmContext = createContext(null);

/**
 * Provider that enables `useConfirm()` hook globally.
 * Renders a proper accessible confirmation dialog instead of `window.confirm`.
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, title: '', message: '', variant: 'danger' });
  const resolveRef = useRef(null);
  const cancelBtnRef = useRef(null);

  const confirm = useCallback(({ title = 'Confirm', message = 'Are you sure?', variant = 'danger' } = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, title, message, variant });
    });
  }, []);

  const handleConfirm = () => {
    resolveRef.current?.(true);
    setState((s) => ({ ...s, open: false }));
  };

  const handleCancel = () => {
    resolveRef.current?.(false);
    setState((s) => ({ ...s, open: false }));
  };

  // Focus cancel button on open
  useEffect(() => {
    if (state.open) cancelBtnRef.current?.focus();
  }, [state.open]);

  // Escape key
  useEffect(() => {
    if (!state.open) return;
    const handler = (e) => { if (e.key === 'Escape') handleCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state.open]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={handleCancel} />
            <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${state.variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                  <AlertTriangle size={20} className={state.variant === 'danger' ? 'text-red-600' : 'text-yellow-600'} />
                </div>
                <div className="flex-1">
                  <h3 id="confirm-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">{state.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{state.message}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleConfirm} className={`flex-1 ${state.variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}>
                  Confirm
                </button>
                <button ref={cancelBtnRef} onClick={handleCancel} className="flex-1 btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
