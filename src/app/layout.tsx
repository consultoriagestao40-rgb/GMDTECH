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
