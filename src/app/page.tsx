'use client';

import dynamic from 'next/dynamic';
import Dashboard from '../components/Dashboard';

// Carregar o NetworkStatus dinamicamente sem SSR, pois ele utiliza o Dexie.js/IndexedDB (recurso exclusivo do navegador)
const NetworkStatus = dynamic(
  () => import('../components/NetworkStatus'),
  { ssr: false }
);

export default function HomePage() {
  return (
    <div style={styles.container}>
      <div style={styles.statusBar}>
        <NetworkStatus />
      </div>
      <Dashboard />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  statusBar: {
    marginTop: '1.5rem'
  }
};
