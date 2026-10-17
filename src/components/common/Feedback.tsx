'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { cn } from '@/lib/ui';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface FeedbackApi {
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

const TOAST_DURATION_MS = 5000;

const toastStyles: Record<ToastKind, { box: string; icon: React.ReactNode }> = {
  success: {
    box: 'panel-success',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
  },
  error: {
    box: 'panel-error',
    icon: <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />,
  },
  info: {
    box: 'panel-info',
    icon: <Info className="w-4 h-4 text-signal-600 shrink-0" />,
  },
};

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
      }),
    [],
  );

  const settle = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  // Resolve a still-open confirmation as "cancelled" if the provider unmounts.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => () => pendingRef.current?.resolve(false), []);

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-[60] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'panel pointer-events-auto flex items-start gap-2.5 shadow-lg font-medium animate-fade-in',
              toastStyles[t.kind].box,
            )}
          >
            {toastStyles[t.kind].icon}
            <p className="flex-1 break-words">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Zavřít oznámení"
              className="btn-icon -mr-1.5 -my-1.5 text-current opacity-70 hover:opacity-100 hover:bg-black/5 hover:text-current"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={pending !== null}
        onClose={() => settle(false)}
        onConfirm={() => pending?.resolve(true)}
        title={pending?.title ?? 'Potvrzení'}
        message={pending?.message ?? ''}
        confirmText={pending?.confirmText}
        cancelText={pending?.cancelText}
        isDestructive={pending?.isDestructive}
      />
    </FeedbackContext.Provider>
  );
};

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}
