'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Lock, AlertCircle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export type ProtectionType = 'delete' | 'hide' | 'payment' | 'supplier';

export interface PasswordPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onAuthorized?: () => void | Promise<void>;
  type?: ProtectionType;
  protectionType?: ProtectionType;
  title?: string;
  description?: string;
  actionDescription?: string;
}

const defaultDetails: Record<ProtectionType, { title: string; desc: string }> = {
  delete: {
    title: 'Delete Protection Password Required',
    desc: 'This item will be permanently removed. Enter the Admin Delete Protection password to proceed.',
  },
  hide: {
    title: 'Reveal Sensitive Figures',
    desc: 'Enter the Hide Protection password to display sales revenue and collected payments.',
  },
  payment: {
    title: 'Payment Update Authorization',
    desc: 'Enter the Payment Update Protection password to record new customer payments or settle udhar balances.',
  },
  supplier: {
    title: 'Supplier Invoices Lock',
    desc: 'Supplier transactions are restricted. Enter the Supplier Invoices Lock password to open this section.',
  },
};

export function PasswordPromptModal({
  isOpen,
  onClose,
  onSuccess,
  onAuthorized,
  type,
  protectionType,
  title,
  description,
  actionDescription,
}: PasswordPromptModalProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const effectiveType: ProtectionType = protectionType || type || 'delete';
  const effectiveDesc = actionDescription || description;
  const meta = defaultDetails[effectiveType];

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('Please enter your security password');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setNotConfigured(false);

    try {
      const res = await fetch('/api/settings/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: effectiveType, password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.notConfigured) {
          setNotConfigured(true);
          setErrorMsg(json.error || 'Password is not set in Settings yet.');
        } else {
          setErrorMsg(json.error || 'Incorrect security password. Please try again.');
        }
        setLoading(false);
        return;
      }

      toast.success('Password verified successfully');
      setPassword('');
      setErrorMsg(null);
      onClose();
      if (onAuthorized) {
        await onAuthorized();
      }
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      setErrorMsg('Network error while verifying password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setErrorMsg(null);
    setNotConfigured(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title || meta.title}
      size="sm"
    >
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 leading-relaxed">
            {effectiveDesc || meta.desc}
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 p-2.5 bg-status-dangerLight/60 rounded-lg border border-status-danger/30 text-xs text-status-danger">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {notConfigured ? (
          <div className="pt-2 text-center space-y-3">
            <p className="text-xs text-ink-muted">
              You must configure this password in Settings before performing this action.
            </p>
            <Button
              type="button"
              variant="teal"
              size="sm"
              onClick={() => {
                handleClose();
                router.push('/settings');
              }}
            >
              Open Settings
            </Button>
          </div>
        ) : (
          <>
            <Input
              label="Admin Security Password"
              type="password"
              required
              autoFocus
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-warm-borderLight">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" variant="teal" size="sm" isLoading={loading}>
                Authorize &amp; Proceed
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
