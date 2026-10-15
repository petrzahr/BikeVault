"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmationModal } from "./ConfirmationModal";

interface DeleteButtonProps {
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  className?: string;
}

/**
 * Small "trash" icon button that asks for confirmation before running a destructive action.
 */
export function DeleteButton({ onConfirm, title, message, confirmText = "Smazat", className = "" }: DeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer ${className}`}
        title={title}
        aria-label={title}
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <ConfirmationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={onConfirm}
        title={title}
        message={message}
        confirmText={confirmText}
        isDestructive
      />
    </>
  );
}

export default DeleteButton;
