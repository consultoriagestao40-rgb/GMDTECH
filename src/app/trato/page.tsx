import FormTrato from '../../components/FormTrato';
import NetworkStatus from '../../components/NetworkStatus';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TratoPage() {
  return (
    <div style={styles.container}>
      {/* Botão de Retorno */}
      <div style={styles.header}>
        <Link href="/" style={styles.backBtn}>
          <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Voltar ao Painel
        </Link>
      </div>

      {/* Monitor de rede com indicadores de fila pendente no curral */}
      <NetworkStatus />

      {/* Formulário móvel de lançamento */}
      <div style={styles.formWrapper}>
        <FormTrato />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  header: {
    display: 'flex',
    alignItems: 'center'
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '0.9rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    transition: 'color var(--transition-fast)'
  },
  formWrapper: {
    marginTop: '0.5rem'
  }
};
