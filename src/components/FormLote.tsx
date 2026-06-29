'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Users, Scale, DollarSign, Target, Save, CheckCircle, AlertTriangle } from 'lucide-react';

export default function FormLote() {
  const router = useRouter();

  // Estados do formulário
  const [nomeLote, setNovoLoteNome] = useState<string>('');
  const [qtdCabecas, setNovoLoteCabecas] = useState<string>('');
  const [pesoTotalEntrada, setNovoLotePeso] = useState<string>('');
  const [custoAquisicaoTotal, setNovoLoteCusto] = useState<string>('');
  const [rendimentoCarcacaPrevisto, setNovoLoteRendimento] = useState<string>('54.0');
  const [cicloDias, setCicloDias] = useState<string>('90');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeLote || !qtdCabecas || !pesoTotalEntrada || !custoAquisicaoTotal) {
      setStatusMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/lotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_lote: nomeLote,
          qtd_cabecas: parseInt(qtdCabecas),
          peso_total_entrada: parseFloat(pesoTotalEntrada),
          custo_aquisicao_total: parseFloat(custoAquisicaoTotal),
          rendimento_carcaca_previsto: parseFloat(rendimentoCarcacaPrevisto),
          ciclo_dias: parseInt(cicloDias) || 90
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao registrar novo lote no Neon DB.');
      }

      setStatusMessage({
        type: 'success',
        text: 'Novo lote e pesagem de entrada criados com sucesso!'
      });

      // Limpar formulário
      setNovoLoteNome('');
      setNovoLoteCabecas('');
      setNovoLotePeso('');
      setNovoLoteCusto('');
      setNovoLoteRendimento('54.0');
      setCicloDias('90');

      // Redirecionar para o painel após 1.5 segundos
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);

    } catch (error: any) {
      setStatusMessage({
        type: 'error',
        text: error.message || 'Falha ao registrar lote.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.card} className="glass-panel">
      <div style={styles.header}>
        <Layers size={24} color="var(--color-brand)" style={{ marginRight: '8px' }} />
        <h2 style={styles.title}>Cadastrar Novo Lote</h2>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Nome do Lote */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            <Layers size={14} style={{ marginRight: '6px' }} />
            Identificação / Nome do Lote
          </label>
          <input 
            type="text"
            placeholder="Ex: Nelore Confinamento 2026-B"
            value={nomeLote}
            onChange={(e) => setNovoLoteNome(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        {/* Quantidade de Cabeças */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            <Users size={14} style={{ marginRight: '6px' }} />
            Quantidade de Cabeças (Animais)
          </label>
          <input 
            type="number"
            placeholder="Ex: 100"
            value={qtdCabecas}
            onChange={(e) => setNovoLoteCabecas(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        {/* Peso Total de Entrada */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            <Scale size={14} style={{ marginRight: '6px' }} />
            Peso Total de Entrada (kg vivo total)
          </label>
          <input 
            type="number"
            placeholder="Ex: 30000 (peso de balança)"
            value={pesoTotalEntrada}
            onChange={(e) => setNovoLotePeso(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        {/* Custo de Aquisição */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            <DollarSign size={14} style={{ marginRight: '6px' }} />
            Custo Total de Aquisição (R$)
          </label>
          <input 
            type="number"
            placeholder="Ex: 180000.00"
            value={custoAquisicaoTotal}
            onChange={(e) => setNovoLoteCusto(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        {/* Rendimento Previsto */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            <Target size={14} style={{ marginRight: '6px' }} />
            Rendimento de Carcaça Previsto (%)
          </label>
          <input 
            type="number"
            step="0.1"
            placeholder="Ex: 54.0"
            value={rendimentoCarcacaPrevisto}
            onChange={(e) => setNovoLoteRendimento(e.target.value)}
            style={styles.input}
          />
          <span style={styles.tip}>Média padrão no confinamento: 54%</span>
        </div>

        {/* Ciclo Planejado */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            <Calendar size={14} style={{ marginRight: '6px' }} />
            Ciclo Planejado em Dias (entrada à venda)
          </label>
          <input 
            type="number"
            placeholder="Ex: 90"
            value={cicloDias}
            onChange={(e) => setCicloDias(e.target.value)}
            style={styles.input}
            required
          />
          <span style={styles.tip}>Média padrão no confinamento: 90 dias</span>
        </div>

        {/* Botão de Envio */}
        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{
            ...styles.submitButton,
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          <Save size={18} style={{ marginRight: '8px' }} />
          {isSubmitting ? 'Registrando...' : 'Gravar Lote e Balanço'}
        </button>
      </form>

      {/* Mensagens de Sucesso / Erro */}
      {statusMessage && (
        <div style={{
          ...styles.statusMessage,
          backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderColor: statusMessage.type === 'success' ? 'var(--color-brand)' : 'var(--color-danger)',
          color: statusMessage.type === 'success' ? 'var(--color-brand)' : 'var(--color-danger)'
        }}>
          {statusMessage.type === 'success' ? (
            <CheckCircle size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
          ) : (
            <AlertTriangle size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: '1.5rem',
    width: '100%',
    maxWidth: '550px',
    margin: '0 auto',
    boxShadow: 'var(--shadow-lg)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '0.75rem'
  },
  title: {
    fontSize: '1.3rem',
    fontWeight: 600,
    color: '#fff'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center'
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color var(--transition-fast)'
  },
  tip: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.1rem'
  },
  submitButton: {
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color var(--transition-fast)',
    boxShadow: '0 4px 12px var(--color-brand-glow)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    marginTop: '0.5rem',
    fontSize: '1rem'
  },
  statusMessage: {
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.9rem'
  }
};
