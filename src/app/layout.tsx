import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import PWARegister from '../components/PWARegister';
import Sidebar from '../components/Sidebar';
import AuthWrapper from '../components/AuthWrapper';

export const metadata: Metadata = {
  title: 'GMDTech - Confinamento Inteligente',
  description: 'Controle de custos por @ produzida e GMD para pequenos pecuaristas.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GMDTech'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#15803d'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#15803d" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="GMDTech" />
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body>
        <PWARegister />
        
        <AuthWrapper>
          {/* Renderiza o Menu Lateral (Sidebar responsivo) */}
          <Sidebar />

          {/* Container de Layout Principal ajustável via CSS responsivo */}
          <div className="layout-content">
            <main className="main-content">
              {children}
            </main>
          </div>
        </AuthWrapper>
      </body>
    </html>
  );
}
