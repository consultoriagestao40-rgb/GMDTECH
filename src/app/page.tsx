import Dashboard from '../components/Dashboard';
import NetworkStatus from '../components/NetworkStatus';

export default function HomePage() {
  return (
    <div style={styles.container}>
      {/* Indicador de Status Offline e Sincronização na parte superior do Dashboard */}
      <div style={styles.statusBar}>
        <NetworkStatus />
      </div>
      
      {/* Componente principal do Dashboard Web */}
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
