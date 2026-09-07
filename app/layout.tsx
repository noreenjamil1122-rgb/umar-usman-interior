import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Wallpaper Manager | Umar Usman Interior, Lahore',
  description:
    'Comprehensive full-stack business management application for Umar Usman Interior, Lahore, Pakistan. Manage inventory, wallpaper catalogs, customers, invoices, and payments.',
  icons: {
    icon: [
      { url: '/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1E6F6C',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakartaSans.variable}>
      <body className="min-h-screen bg-paper text-ink selection:bg-teal selection:text-white antialiased">
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: '#FDFBF7',
              border: '1px solid #DDD4C5',
              color: '#2D2D2D',
              boxShadow: '0 4px 12px rgba(45, 45, 45, 0.08)',
            },
          }}
        />
      </body>
    </html>
  );
}
