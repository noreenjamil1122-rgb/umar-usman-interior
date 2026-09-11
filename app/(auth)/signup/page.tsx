'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Building2, UserPlus, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState('Umar Usman Interior');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!businessName || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.error || 'Registration failed. Please try again.';
        setError(msg);
        toast.error('Signup Failed', { description: msg });
        setLoading(false);
        return;
      }

      toast.success('Account ban gaya!');

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Connection error. Please try again.');
      toast.error('Network Error', { description: 'Could not connect to server' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-paper">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white p-2 shadow-warm-md mb-3 border border-warm-border">
            <img
              src="/logo.png"
              alt="Umar Usman Interior Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Umar Usman Interior
          </h1>
          <p className="text-sm text-ink-muted mt-1 font-medium">
            Wallpaper Manager • Lahore
          </p>
        </div>

        {/* Signup Card */}
        <Card variant="elevated" className="border-t-4 border-t-brass bg-paper-light p-6 sm:p-8 rounded-3xl shadow-warm-lg">
          <CardContent className="p-0">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-ink">Create Account</h2>
              <p className="text-xs sm:text-sm text-ink-muted mt-1">Register your interior design company and start managing stock</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-status-dangerLight border border-rose-200 text-status-danger text-xs sm:text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <Input
                label="Business Name"
                type="text"
                placeholder="Umar Usman Interior"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                leftIcon={<Building2 className="w-4 h-4" />}
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="manager@umarusman.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
                autoComplete="email"
              />

              <div className="space-y-1.5">
                <Input
                  label="Password (min 4 characters)"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-ink-muted hover:text-ink focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                  required
                  autoComplete="new-password"
                />
              </div>

              {/* Automatic Provisioning Checklist */}
              <div className="p-4 rounded-2xl bg-paper border border-warm-border space-y-2 text-xs sm:text-sm text-ink-muted">
                <div className="flex items-center gap-2 text-status-success font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Auto-seeds 3 Wallpaper Catalog Books</span>
                </div>
                <div className="flex items-center gap-2 text-status-success font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Auto-seeds 5 Default Warehouses</span>
                </div>
                <div className="flex items-center gap-2 text-status-success font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Initializes Atomic Counters &amp; Isolated Ledger</span>
                </div>
              </div>

              <Button
                type="submit"
                variant="brass"
                className="w-full mt-3 min-h-[50px] sm:min-h-[54px] text-base font-bold shadow-warm"
                size="lg"
                isLoading={loading}
                leftIcon={<UserPlus className="w-5 h-5" />}
              >
                Register &amp; Launch
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-warm-borderLight text-center">
              <p className="text-xs text-ink-muted">
                Already registered?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-teal hover:text-teal-light underline underline-offset-2"
                >
                  Sign In to Existing Account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
