import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const FormFormulacao = dynamic(
  () => import('../../components/FormFormulacao'),
  { ssr: false }
);

export default function FormulacaoPage() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href="/" style={styles.backBtn}>
          <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Voltar ao Painel
        </Link>
      </div>

      <div style={styles.titleSection}>
        <h1 style={styles.title}>Formulação de Ração</h1>
        <p style={styles.subtitle}>Misture ingredientes, simule proporções e calcule custos reais de alimentação</p>
      </div>

      <div style={styles.formWrapper}>
        <FormFormulacao />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
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
  titleSection: {
    marginTop: '0.5rem'
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    marginTop: '0.2rem'
  },
  formWrapper: {
    marginTop: '0.75rem'
  }
};
