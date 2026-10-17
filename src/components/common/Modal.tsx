import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/ui';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg'
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocusedElement = document.activeElement as HTMLElement | null;

    // Trap focus inside modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on first interactive element or modal container
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
        );
        firstFocusable?.focus();
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-slate-900/40 transition-opacity"
        onClick={onClose} 
        aria-hidden="true"
      />
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        <div 
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 w-full ${maxWidth} border border-slate-200`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-3.5 sm:py-4">
            <div className="min-w-0 pr-2">
              <h2 id={titleId} className="text-base font-bold text-slate-900 truncate">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Zavřít"
              className="btn-icon -mr-1.5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-4 sm:px-6 py-4 sm:py-5 max-h-[82vh] overflow-y-auto overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Dialog action bar: cancel first, the primary action last (it ends up on the right, or on top on phones). */
export const ModalFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('modal-footer', className)}>{children}</div>
);
