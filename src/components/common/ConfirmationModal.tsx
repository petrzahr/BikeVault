import React from 'react';
import { Modal, ModalFooter } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Zrušit',
  isDestructive = false,
}) => {
  const resolvedConfirmText = confirmText || (isDestructive ? 'Smazat' : 'Potvrdit');
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${isDestructive ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="text-sm text-slate-700 space-y-2 pt-1.5">
          <p>{message}</p>
        </div>
      </div>
      <ModalFooter>
        <button type="button" className="btn-secondary" onClick={onClose}>
          {cancelText}
        </button>
        <button
          type="button"
          className={isDestructive ? 'btn-danger' : 'btn-primary'}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {resolvedConfirmText}
        </button>
      </ModalFooter>
    </Modal>
  );
};
