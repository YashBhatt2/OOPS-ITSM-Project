import { createContext, useContext, useState, ReactNode } from 'react';
import * as RadixToast from '@radix-ui/react-toast';
import { X } from '@phosphor-icons/react';
import styles from './Toast.module.css';

interface ToastOptions {
  title: string;
  type?: 'success' | 'error';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);

  const showToast = (options: ToastOptions) => {
    setToast({ ...options, id: Date.now() });
  };

  const isError = toast?.type === 'error';

  return (
    <ToastContext.Provider value={{ showToast }}>
      <RadixToast.Provider swipeDirection="down" duration={isError ? Infinity : 4000}>
        {children}
        {toast && (
          <RadixToast.Root
            key={toast.id}
            className={styles.toast}
            aria-live={isError ? 'assertive' : 'polite'}
            onOpenChange={(open) => {
              if (!open) setToast(null);
            }}
          >
            <RadixToast.Title className={styles.title}>
              {toast.title}
            </RadixToast.Title>
            {toast.action && (
              <RadixToast.Action
                asChild
                altText={toast.action.label}
                onClick={toast.action.onClick}
              >
                <button type="button" className={styles.action}>
                  {toast.action.label}
                </button>
              </RadixToast.Action>
            )}
            <RadixToast.Close asChild aria-label="Close notification">
              <button type="button" className={styles.close}>
                <X size={16} weight="light" />
              </button>
            </RadixToast.Close>
          </RadixToast.Root>
        )}
        <RadixToast.Viewport className={styles.viewport} />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
