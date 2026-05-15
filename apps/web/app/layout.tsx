import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ui/toast';
import { Providers } from '@/components/providers';
import './globals.css';

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
    <html lang="fr">
      <body className="min-h-screen bg-gray-50 antialiased">
        <Providers>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}