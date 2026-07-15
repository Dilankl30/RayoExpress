import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Toaster, toast as sonnerToast } from 'sonner';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const toast = (message: string, type: ToastType = 'info', options?: ToastOptions) => {
    const duration = options?.duration ?? 4000;
    const opts = { description: options?.description, duration };
    switch (type) {
      case 'success':
        sonnerToast.success(message, opts);
        break;
      case 'error':
        sonnerToast.error(message, opts);
        break;
      case 'warning':
        sonnerToast.warning(message, opts);
        break;
      default:
        sonnerToast.info(message, opts);
        break;
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toaster theme={theme} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
