import { useCallback, useState } from 'react';

/**
 * Custom hook encapsulating toast notification state.
 * @returns {{ toasts: Array, addToast: function, dismissToast: function }}
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    setToasts((currentToasts) => [...currentToasts, { id, type: 'success', ...toast }]);
    setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}
