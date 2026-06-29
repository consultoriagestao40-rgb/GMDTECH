'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Sliders, Info, CheckCircle, AlertTriangle, Calendar, Scale, TrendingUp, Layers } from 'lucide-react';

interface LotePremissas {
  id: number;
  nome_lote: string;
  dias_adaptacao: number;
  taxa_adaptacao: number;
  taxa_engorda: number;
  gmd_estimado: number;
}

export default function PremissasPage() {
  const [lotes, setLotes] = useState<LotePremissas[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<string>('');

  // Formulário de premissas do lote selecionado
  const [diasAdaptacao, setDiasAdaptacao] = useState<string>('15');
  const [taxaAdaptacao, setTaxaAdaptacao] = useState<string>('1.0');
  const [taxaEngorda, setTaxaEngorda] = useState<string>('2.2');
  const [gmdEstimado, setGmdEstimado] = useState<string>('1.500');

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar todos os lotes ativos e suas premissas
  const loadLotesPremissas = async () => {
    try {
      const res = await fetch('/api/premissas');
      if (res.ok) {
        const data = await res.json();
        setLotes(data.lotes || []);
        
        // Pré-selecionar o primeiro se houver lotes
        if (data.lotes && data.lotes.length > 0) {
          const firstLote = data.lotes[0];
          setSelectedLoteId(String(firstLote.id));
          setDiasAdaptacao(String(firstLote.dias_adaptacao));
          setTaxaAdaptacao(String(firstLote.taxa_adaptacao));
          setTaxaEngorda(String(firstLote.taxa_engorda));
          setGmdEstimado(String(firstLote.gmd_estimado));
        }
      }
    } catch (e) {
      console.error('Erro ao buscar premissas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLotesPremissas();
  }, []);

  // Quando o lote selecionado muda, atualiza o formulário
  const handleLoteChange = (id: string) => {
    setSelectedLoteId(id);
    const lote = lotes.find((l) => String(l.id) === id);
    if (lote) {
      setDiasAdaptacao(String(lote.dias_adaptacao));
      setTaxaAdaptacao(String(lote.taxa_adaptacao));
      setTaxaEngorda(String(lote.taxa_engorda));
      setGmdEstimado(String(lote.gmd_estimado));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoteId) {
      setStatusMessage({ type: 'error', text: 'Selecione um lote para parametrizar.' });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/premissas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lote_id: parseInt(selectedLoteId),
          dias_adaptacao: parseInt(diasAdaptacao) || 15,
          taxa_adaptacao: parseFloat(taxaAdaptacao) || 1.0,
          taxa_engorda: parseFloat(taxaEngorda) || 2.2,
          gmd_estimado: parseFloat(gmdEstimado) || 1.500
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar alterações.');
      }

      setStatusMessage({ type: 'success', text: 'Premissas do lote salvas com sucesso!' });
      
      // Atualizar lista local com novos dados
      setLotes(lotes.map((l) => {
        if (String(l.id) === selectedLoteId) {
          return {
            ...l,
            dias_adaptacao: parseInt(diasAdaptacao),
            taxa_adaptacao: parseFloat(taxaAdaptacao),
            taxa_engorda: parseFloat(taxaEngorda),
            gmd_estimado: parseFloat(gmdEstimado)
          };
        }
        return l;
      }));

      setTimeout(() => setStatusMessage(null), 3000);

    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao conectar ao servidor.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href="/" style={styles.backBtn}>
          <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Voltar ao Painel
        </Link>
      </div>

      <div style={styles.titleSection}>
        <h1 style={styles.title}>Premissas de Trato</h1>
        <p style={styles.subtitle}>Parametrize o consumo (%) e o GMD de forma individualizada para cada lote</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Carregando parâmetros do Neon DB...
        </div>
      ) : lotes.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Nenhum lote ativo encontrado. Cadastre um novo lote primeiro para poder configurar suas premissas!
        </div>
      ) : (
        <div style={styles.content}>
          {/* Formulário de Configuração */}
          <form onSubmit={handleSubmit} className="glass-panel" style={styles.formCard}>
            <div style={styles.cardHeader}>
              <Sliders size={20} color="var(--color-accent)" style={{ marginRight: '8px' }} />
              <h2 style={styles.cardTitle}>Parâmetros Operacionais</h2>
            </div>

            {/* SELETOR DE LOTE */}
            <div style={styles.dropdownSection}>
              <label style={{ ...styles.label, fontWeight: 600 }}>Selecione o Lote para Configurar:</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', width: '100%' }}>
                <Layers size={18} style={{ color: 'var(--color-accent)', alignSelf: 'center', marginLeft: '0.25rem' }} />
                <select 
                  value={selectedLoteId} 
                  onChange={(e) => handleLoteChange(e.target.value)}
                  style={styles.select}
                >
                  {lotes.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome_lote} (GMD: {l.gmd_estimado.toFixed(3)} kg/dia)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fase de Adaptação */}
            <div style={styles.sectionTitle}>1. Fase de Adaptação (Acolhimento)</div>
            <div style={styles.row}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Duração da Adaptação (Dias):</label>
                <div style={styles.inputWrapper}>
                  <Calendar size={16} style={styles.icon} />
                  <input 
                    type="number"
                    value={diasAdaptacao}
                    onChange={(e) => setDiasAdaptacao(e.target.value)}
                    style={styles.input}
                    required
                  />
                  <span style={styles.suffix}>dias</span>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Consumo Diário (% do Peso Vivo):</label>
                <div style={styles.inputWrapper}>
                  <Scale size={16} style={styles.icon} />
                  <input 
                    type="number"
                    step="0.1"
                    value={taxaAdaptacao}
                    onChange={(e) => setTaxaAdaptacao(e.target.value)}
                    style={styles.input}
                    required
                  />
                  <span style={styles.suffix}>% PV</span>
                </div>
              </div>
            </div>

            {/* Fase de Engorda */}
            <div style={styles.sectionTitle}>2. Fase de Crescimento e Engorda</div>
            <div style={styles.row}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Consumo Diário (% do Peso Vivo):</label>
                <div style={styles.inputWrapper}>
                  <Scale size={16} style={styles.icon} />
                  <input 
                    type="number"
                    step="0.1"
                    value={taxaEngorda}
                    onChange={(e) => setTaxaEngorda(e.target.value)}
                    style={styles.input}
                    required
                  />
                  <span style={styles.suffix}>% PV</span>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>GMD Estimado (kg por dia):</label>
                <div style={styles.inputWrapper}>
                  <TrendingUp size={16} style={styles.icon} />
                  <input 
                    type="number"
                    step="0.001"
                    value={gmdEstimado}
                    onChange={(e) => setGmdEstimado(e.target.value)}
                    style={styles.input}
                    required
                  />
                  <span style={styles.suffix}>kg/dia</span>
                </div>
              </div>
            </div>

            <button type="submit" disabled={submitting} style={styles.saveBtn}>
              <Save size={18} style={{ marginRight: '8px' }} />
              {submitting ? 'Salvando Parâmetros...' : 'Salvar Alterações para este Lote'}
            </button>
          </form>

          {/* Card Explicativo de Conceito */}
          <div className="glass-panel" style={styles.infoCard}>
            <div style={styles.cardHeader}>
              <Info size={20} color="var(--color-info)" style={{ marginRight: '8px' }} />
              <h2 style={styles.cardTitle}>Funcionamento Dinâmico</h2>
            </div>
            
            <p style={styles.infoText}>
              O sistema calcula a sugestão diária de trato de forma individual por boi, considerando sua respectiva data de entrada:
            </p>

            <div style={styles.equationBox}>
              <div style={styles.equationTitle}>Equação de Projeção de Peso</div>
              <div style={styles.equation}>
                Peso Atual = Peso Inicial + GMD Estimado × Dias Confinados
              </div>
            </div>

            <div style={styles.equationBox}>
              <div style={styles.equationTitle}>Equação de Consumo do Boi</div>
              <div style={styles.equation}>
                Consumo (kg) = Peso Atual × Taxa (%)
              </div>
              <div style={styles.equationDetail}>
                • Dias ≤ {diasAdaptacao} dias: Taxa = {taxaAdaptacao}% do Peso Vivo<br />
                • Dias &gt; {diasAdaptacao} dias: Taxa = {taxaEngorda}% do Peso Vivo
              </div>
            </div>

            <p style={styles.infoFooter}>
              💡 Como cada lote possui sua própria nutrição e estágio, você pode definir premissas diferentes. Exemplo: um lote em terminação pode consumir 2.2% com 1.5kg de GMD, enquanto um lote recém-chegado de recria pode consumir 1.2% com 1.0kg de GMD.
            </p>
          </div>
        </div>
      )}

      {/* Feedback Flutuante */}
      {statusMessage && (
        <div style={{
          ...styles.statusMessage,
          backgroundColor: statusMessage.type === 'success' ? '#10b981' : '#ef4444'
        }}>
          {statusMessage.type === 'success' ? (
            <CheckCircle size={18} style={{ marginRight: '8px' }} />
          ) : (
            <AlertTriangle size={18} style={{ marginRight: '8px' }} />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
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
  content: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
    marginTop: '0.5rem'
  },
  formCard: {
    flex: '1 1 450px',
    padding: '1.5rem',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  dropdownSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    width: '100%'
  },
  select: {
    flex: 1,
    padding: '0.65rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    cursor: 'pointer'
  },
  infoCard: {
    flex: '1 1 350px',
    padding: '1.5rem',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    backgroundColor: 'rgba(255,255,255,0.01)'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '0.75rem',
    marginBottom: '0.25rem'
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#fff'
  },
  sectionTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--color-accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '0.5rem'
  },
  row: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  inputGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    minWidth: '200px'
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  icon: {
    position: 'absolute',
    left: '0.75rem',
    color: 'var(--text-muted)'
  },
  input: {
    width: '100%',
    padding: '0.65rem 0.75rem 0.65rem 2.25rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none'
  },
  suffix: {
    position: 'absolute',
    right: '0.75rem',
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    fontWeight: 500
  },
  saveBtn: {
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
    padding: '0.85rem',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    fontSize: '0.9rem',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px var(--color-brand-glow)',
    marginTop: '1rem',
    cursor: 'pointer'
  },
  infoText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4
  },
  equationBox: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.85rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem'
  },
  equationTitle: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: 600
  },
  equation: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--color-brand)',
    fontFamily: 'monospace'
  },
  equationDetail: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    marginTop: '0.2rem'
  },
  infoFooter: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    lineHeight: 1.35,
    marginTop: 'auto'
  },
  statusMessage: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '0.85rem 1.25rem',
    borderRadius: 'var(--radius-md)',
    color: '#fff',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem',
    zIndex: 1000,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
  }
};
