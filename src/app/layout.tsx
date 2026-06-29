import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import PWARegister from '../components/PWARegister';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'GMDTech - Confinamento Inteligente',
  description: 'Controle de custos por @ produzida e GMD para pequenos pecuaristas.',
  manifest: '/manifest.json',
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
        
        {/* Header Superior Desktop */}
        <header style={styles.header} className="glass-panel">
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logo}>
              <span style={styles.logoIcon}>🐂</span>
              <strong style={{ color: '#fff', fontSize: '1.2rem' }}>GMD</strong>
              <span style={{ color: 'var(--color-brand)', fontSize: '1.2rem', fontWeight: 600 }}>Tech</span>
            </Link>

            <nav style={styles.nav}>
              <Link href="/" style={styles.navLink}>Painel Web</Link>
              <Link href="/trato" style={styles.navLinkMobile}>Lançar Trato (PWA)</Link>
            </nav>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main style={styles.main}>
          {children}
        </main>

        {/* Tab Bar Inferior para Mobile (PWA Standalone UX) */}
        <div style={styles.bottomNav} className="glass-panel">
          <Link href="/" style={styles.tabItem}>
            <span style={styles.tabIcon}>📊</span>
            <span style={styles.tabText}>Painel</span>
          </Link>
          <Link href="/trato" style={styles.tabItem}>
            <span style={styles.tabIcon}>🌾</span>
            <span style={styles.tabText}>Trato</span>
          </Link>
        </div>
      </body>
    </html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderRadius: '0px 0px var(--radius-md) var(--radius-md)',
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: 'none',
    padding: '0.85rem 1.5rem',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    textDecoration: 'none',
  },
  logoIcon: {
    fontSize: '1.5rem',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  navLink: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    transition: 'color var(--transition-fast)',
    textDecoration: 'none',
  },
  navLinkMobile: {
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
    padding: '0.45rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'background-color var(--transition-fast)',
  },
  main: {
    minHeight: 'calc(100vh - 70px)',
    paddingBottom: '80px', // Espaço para a Tab Bar inferior
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '64px',
    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
    borderBottom: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 100,
    padding: '0.25rem 0',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
  },
  tabItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    color: 'var(--text-secondary)',
    fontSize: '0.75rem',
    fontWeight: 500,
    gap: '2px',
    flex: 1,
    height: '100%',
  },
  tabIcon: {
    fontSize: '1.4rem',
  },
  tabText: {
    fontSize: '0.75rem',
  }
};
