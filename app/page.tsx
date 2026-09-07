'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          router.replace('/warehouses');
        } else {
          router.replace('/login');
        }
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-white p-2 border border-warm-border flex items-center justify-center shadow-warm">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center gap-2 text-ink-muted text-xs font-semibold">
          <RefreshCw className="w-4 h-4 animate-spin text-teal" />
          <span>Opening Wallpaper Manager...</span>
        </div>
      </div>
    </div>
  );
}
