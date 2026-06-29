'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Wheat, Scale } from 'lucide-react';

// Carregar componentes dinamicamente desativando SSR, pois dependem de IndexedDB (Dexie) no navegador
const NetworkStatus = dynamic(
  () => import('../../components/NetworkStatus'),
  { ssr: false }
);

const FormTrato = dynamic(
  () => import('../../components/FormTrato'),
  { ssr: false }
);

const FormPesagem = dynamic(
  () => import('../../components/FormPesagem'),
  { ssr: false }
);

export default function TratoPage() {
  const [activeTab, setActiveTab] = useState<'trato' | 'pesagem'>('trato');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href="/" style={styles.backBtn}>
          <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Voltar ao Painel
        </Link>
      </div>

      <NetworkStatus />

      {/* Tabs para alternar entre registrar Trato ou Pesagem */}
      <div style={styles.tabsContainer}>
        <button 
          onClick={() => setActiveTab('trato')}
          style={{
            ...styles.tabBtn,
            color: activeTab === 'trato' ? 'var(--color-brand)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'trato' ? '2px solid var(--color-brand)' : '2px solid transparent',
            backgroundColor: activeTab === 'trato' ? 'rgba(21, 128, 61, 0.05)' : 'transparent'
          }}
        >
          <Wheat size={16} style={{ marginRight: '6px' }} /> Trato (Ração)
        </button>
        <button 
          onClick={() => setActiveTab('pesagem')}
          style={{
            ...styles.tabBtn,
            color: activeTab === 'pesagem' ? 'var(--color-accent)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'pesagem' ? '2px solid var(--color-accent)' : '2px solid transparent',
            backgroundColor: activeTab === 'pesagem' ? 'rgba(217, 119, 6, 0.05)' : 'transparent'
          }}
        >
          <Scale size={16} style={{ marginRight: '6px' }} /> Pesar Boi (Brinco)
        </button>
      </div>

      <div style={styles.formWrapper}>
        {activeTab === 'trato' ? <FormTrato /> : <FormPesagem />}
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
  tabsContainer: {
    display: 'flex',
    borderBottom: '1px solid var(--border-color)',
    marginTop: '0.5rem'
  },
  tabBtn: {
    flex: 1,
    padding: '1rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-fast)',
    border: 'none',
    outline: 'none'
  },
  formWrapper: {
    marginTop: '0.5rem'
  }
};
