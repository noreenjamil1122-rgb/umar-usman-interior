'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, LogIn } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/warehouses';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('last_used_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.error || 'Login failed. Please check your credentials.';
        setError(msg);
        toast.error('Login Failed', { description: msg });
        setLoading(false);
        return;
      }

      try {
        localStorage.setItem('last_used_email', email);
      } catch {
        // ignore
      }

      toast.success('Login Kamyab!', {
        description: 'Welcome back',
      });

      router.push(from);
      router.refresh();
    } catch {
      setError('Connection error. Please try again.');
      toast.error('Network Error', { description: 'Could not connect to server' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-paper">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white p-2 shadow-warm-md mb-3 border border-warm-border">
            <img
              src="/logo.png"
              alt="Umar Usman Interior Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Umar Usman Interior
          </h1>
          <p className="text-sm text-ink-muted mt-0.5 font-medium">
            Wallpaper Manager • Lahore
          </p>
        </div>

        {/* Login Card */}
        <Card variant="elevated" className="border-t-4 border-t-teal bg-paper-light">
          <CardContent className="pt-2">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-ink">Sign In</h2>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-status-dangerLight border border-rose-200 text-status-danger text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@umarusman.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
                autoComplete="email"
              />

              <div className="space-y-1.5">
                <Input
                  label="Password"
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
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                variant="teal"
                className="w-full mt-2"
                size="lg"
                isLoading={loading}
                leftIcon={<LogIn className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-warm-borderLight text-center">
              <p className="text-xs text-ink-muted">
                Need a new business account?{' '}
                <Link
                  href="/signup"
                  className="font-semibold text-teal hover:text-teal-light underline underline-offset-2"
                >
                  Register Business
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="text-center text-xs text-ink-muted/80 mt-8">
          Umar Usman Interior Management System • Lahore, Pakistan
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-paper flex items-center justify-center text-ink-muted text-sm">
          Loading login portal...
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
