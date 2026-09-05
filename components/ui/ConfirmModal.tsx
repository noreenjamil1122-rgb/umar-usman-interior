'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'teal';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-paper rounded-xl border border-warm-border">
          <AlertTriangle
            className={`w-5 h-5 shrink-0 mt-0.5 ${
              variant === 'danger'
                ? 'text-status-danger'
                : variant === 'warning'
                  ? 'text-brass-dark'
                  : 'text-teal'
            }`}
          />
          <p className="text-xs text-ink leading-relaxed">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-warm-borderLight">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'brass' : 'teal'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
