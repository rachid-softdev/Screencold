import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@screencold/ui';
import { Providers } from '@/components/providers';
import './globals.css';

// Optimize font loading - zero layout shift, preconnect to Google
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

export const metadata: Metadata = {
  title: 'ScreenCold - Audit de sites et emails de prospection',
  description: 'Analysez n\'importe quel site web et générez des emails de prospection personnalisés en quelques secondes.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-screen bg-neutral-50 antialiased font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-info-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <Providers>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}