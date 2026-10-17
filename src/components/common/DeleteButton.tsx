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
        className={`btn-icon btn-icon-danger ${className}`}
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
