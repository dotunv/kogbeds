'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

type ToastType = 'default' | 'success' | 'error';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timerRef.current.get(id);
    if (timer) { clearTimeout(timer); timerRef.current.delete(id); }
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'default') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      return next.slice(-3); // max 3
    });
    timerRef.current.set(id, setTimeout(() => dismiss(id), 4000));
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'flex items-start gap-3 max-w-[320px] px-4 py-3 rounded-[var(--radius)] text-[13px] font-[var(--font-ui)]',
              'bg-[var(--color-ink)] text-[var(--color-canvas)]',
              'shadow-[var(--shadow-md)] animate-in slide-in-from-bottom-2',
              t.type === 'success' && 'border-l-4 border-[var(--color-success)]',
              t.type === 'error'   && 'border-l-4 border-[var(--color-danger)]',
            )}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="opacity-60 hover:opacity-100 transition-opacity mt-[1px]"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx.toast;
}
