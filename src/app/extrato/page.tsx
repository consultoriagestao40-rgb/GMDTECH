'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { FileText, Calendar, TrendingUp, AlertTriangle, HelpCircle, ArrowLeft, RefreshCw, BarChart2, PlusCircle } from 'lucide-react';

interface Lote {
  id: number;
  nome_lote: string;
  status: 'ativo' | 'encerrado';
  qtd_cabecas: number;
  peso_total_entrada: number;
  data_entrada: string;
  data_saida: string | null;
  custo_aquisicao_total: number;
  rendimento_carcaca_previsto: number;
}

interface TratoFormatado {
  id: number;
  lote_id: number;
  nome_lote: string;
  nome_dieta: string;
  data: string;
  quantidade_total: number;
  quantidade_media: number;
  custo_total: number;
  custo_medio: number;
  cabecas_na_data: number;
  automatico?: boolean;
}

interface Perda {
  id: number;
  lote_id: number;
  nome_lote: string;
  brinco: string;
  peso_entrada: number;
  peso_atual: number;
  motivo: string;
  data_perda: string;
}

function ExtratoPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'lotes';
  
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [tratos, setTratos] = useState<TratoFormatado[]>([]);
  const [perdas, setPerdas] = useState<Perda[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Detectar mobile
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Se for mobile, força a aba de perdas já que Lotes e Ração são Web-Only
      if (mobile) {
        setActiveTab('perdas');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sincronizar aba caso mude via URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && !isMobile) {
      setActiveTab(tabParam);
    }
  }, [searchParams, isMobile]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/extrato');
      if (res.ok) {
        const data = await res.json();
        setLotes(data.lotes || []);
        setTratos(data.tratos || []);
        setPerdas(data.perdas || []);
      }
    } catch (e) {
      console.error('Erro ao buscar dados do extrato:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar />
      
      <main className="main-content" style={{ flex: 1, padding: '2rem', boxSizing: 'border-box' }}>
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Cabeçalho */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                {isMobile ? 'Histórico de Perdas' : 'Extratos e Relatórios'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
                {isMobile 
                  ? 'Consulta de cabeças removidas por perda ou descarte no aplicativo'
                  : 'Visão unificada de lotes cadastrados, tratos fornecidos e perdas registradas'
                }
              </p>
            </div>
            <button onClick={loadData} style={styles.refreshBtn} title="Atualizar">
              <RefreshCw size={16} className={loading ? 'spin' : ''} /> Atualizar
            </button>
          </div>

          {/* Navegação por Abas - Omitida no celular */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '2px' }}>
              <button 
                onClick={() => setActiveTab('lotes')}
                style={{
                  ...styles.tabBtn,
                  color: activeTab === 'lotes' ? 'var(--color-brand)' : 'var(--text-muted)',
                  borderBottom: activeTab === 'lotes' ? '2px solid var(--color-brand)' : '2px solid transparent'
                }}
              >
                Lotes Cadastrados
              </button>
              <button 
                onClick={() => setActiveTab('tratos')}
                style={{
                  ...styles.tabBtn,
                  color: activeTab === 'tratos' ? 'var(--color-brand)' : 'var(--text-muted)',
                  borderBottom: activeTab === 'tratos' ? '2px solid var(--color-brand)' : '2px solid transparent'
                }}
              >
                Lançamentos de Ração
              </button>
              <button 
                onClick={() => setActiveTab('perdas')}
                style={{
                  ...styles.tabBtn,
                  color: activeTab === 'perdas' ? 'var(--color-brand)' : 'var(--text-muted)',
                  borderBottom: activeTab === 'perdas' ? '2px solid var(--color-brand)' : '2px solid transparent'
                }}
              >
                Histórico de Perdas (App)
              </button>
            </div>
          )}

          {loading ? (
            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', flexDirection: 'column', gap: '12px' }}>
              <RefreshCw className="spin" size={32} color="var(--color-brand)" />
              <span style={{ color: 'var(--text-secondary)' }}>Carregando dados da nuvem...</span>
            </div>
          ) : (
            <>
              {/* ABA 1: LOTES CADASTRADOS (Somente Desktop) */}
              {activeTab === 'lotes' && !isMobile && (
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={styles.th}>Nome do Lote</th>
                          <th style={styles.th}>Data de Entrada</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Cabeças Ativas</th>
                          <th style={styles.th}>Peso Entrada (Total)</th>
                          <th style={styles.th}>Custo Aquisição</th>
                          <th style={styles.th}>Rend. Previsto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lotes.map((lote) => (
                          <tr key={lote.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={styles.td}>
                              <strong style={{ color: '#fff' }}>{lote.nome_lote}</strong>
                            </td>
                            <td style={styles.td}>{new Date(lote.data_entrada).toLocaleDateString('pt-BR')}</td>
                            <td style={styles.td}>
                              <span style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                backgroundColor: lote.status === 'ativo' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: lote.status === 'ativo' ? 'var(--color-brand)' : 'var(--color-danger)'
                              }}>
                                {lote.status === 'ativo' ? '🟢 Ativo' : '🔴 Encerrado'}
                              </span>
                            </td>
                            <td style={styles.td}>{lote.qtd_cabecas} cab.</td>
                            <td style={styles.td}>{lote.peso_total_entrada.toLocaleString('pt-BR')} kg</td>
                            <td style={styles.td}>R$ {lote.custo_aquisicao_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td style={styles.td}>{lote.rendimento_carcaca_previsto}%</td>
                          </tr>
                        ))}
                        {lotes.length === 0 && (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                              Nenhum lote cadastrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ABA 2: LANÇAMENTOS DE RAÇÃO (Somente Desktop) */}
              {activeTab === 'tratos' && !isMobile && (
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={styles.th}>Data/Hora</th>
                          <th style={styles.th}>Lote</th>
                          <th style={styles.th}>Dieta Utilizada</th>
                          <th style={styles.th}>Quantidade Total</th>
                          <th style={styles.th}>Média por Cabeça</th>
                          <th style={styles.th}>Custo do Dia</th>
                          <th style={styles.th}>Custo Médio / Cabeça</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tratos.map((trato) => (
                          <tr key={trato.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={styles.td}>{new Date(trato.data).toLocaleString('pt-BR')}</td>
                            <td style={styles.td}><strong style={{ color: '#fff' }}>{trato.nome_lote}</strong></td>
                            <td style={styles.td}>
                              {trato.nome_dieta}
                              {trato.automatico && (
                                <span style={styles.autoBadge} title="Lançado automaticamente pelo sistema">
                                  Auto
                                </span>
                              )}
                            </td>
                            <td style={styles.td}>{trato.quantidade_total.toLocaleString('pt-BR')} kg</td>
                            <td style={styles.td}>
                              <strong style={{ color: 'var(--color-brand)' }}>{trato.quantidade_media.toFixed(2)}</strong> kg/cab
                            </td>
                            <td style={styles.td}>R$ {trato.custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td style={styles.td}>
                              <strong style={{ color: 'var(--color-accent)' }}>R$ {trato.custo_medio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> /cab
                            </td>
                          </tr>
                        ))}
                        {tratos.length === 0 && (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                              Nenhum lançamento de ração encontrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ABA 3: HISTÓRICO DE PERDAS (Desktop e Celular) */}
              {activeTab === 'perdas' && (
                isMobile ? (
                  /* Layout Mobile de Perdas em Cards */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {perdas.map((perda) => (
                      <div key={perda.id} className="glass-card" style={{ padding: '1rem', border: '1px solid rgba(239, 68, 68, 0.15)', backgroundColor: 'rgba(239, 68, 68, 0.02)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                            🐂 Brinco: {perda.brinco}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {new Date(perda.data_perda).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Lote: <strong style={{ color: '#fff' }}>{perda.nome_lote}</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '0.4rem 0', borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Peso de Entrada</span>
                            <strong style={{ color: '#fff', fontSize: '0.85rem' }}>{parseFloat(perda.peso_entrada as any).toFixed(1)} kg</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Peso na Perda</span>
                            <strong style={{ color: '#fff', fontSize: '0.85rem' }}>{parseFloat(perda.peso_atual as any).toFixed(1)} kg</strong>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                          Motivo: <span style={{ color: '#fff', fontWeight: 'normal' }}>{perda.motivo}</span>
                        </div>
                      </div>
                    ))}
                    {perdas.length === 0 && (
                      <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        Nenhuma perda registrada no histórico.
                      </div>
                    )}
                  </div>
                ) : (
                  /* Layout Desktop de Perdas em Tabela */
                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <th style={styles.th}>Data/Hora</th>
                            <th style={styles.th}>Lote</th>
                            <th style={styles.th}>Brinco</th>
                            <th style={styles.th}>Peso de Entrada</th>
                            <th style={styles.th}>Peso na Ocorrência</th>
                            <th style={styles.th}>Motivo / Observação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {perdas.map((perda) => (
                            <tr key={perda.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', backgroundColor: 'rgba(239, 68, 68, 0.01)' }}>
                              <td style={styles.td}>{new Date(perda.data_perda).toLocaleString('pt-BR')}</td>
                              <td style={styles.td}><strong>{perda.nome_lote}</strong></td>
                              <td style={styles.td}>
                                <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>{perda.brinco}</span>
                              </td>
                              <td style={styles.td}>{parseFloat(perda.peso_entrada as any).toFixed(1)} kg</td>
                              <td style={styles.td}>{parseFloat(perda.peso_atual as any).toFixed(1)} kg</td>
                              <td style={{ ...styles.td, color: 'var(--color-danger)', fontWeight: 600 }}>
                                {perda.motivo}
                              </td>
                            </tr>
                          ))}
                          {perdas.length === 0 && (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                Nenhuma perda registrada no histórico.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tabBtn: {
    padding: '0.75rem 1.25rem',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none'
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: '#fff',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  th: {
    padding: '1rem 0.75rem',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '0.8rem',
    borderBottom: '1px solid var(--border-color)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  td: {
    padding: '1rem 0.75rem',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)'
  },
  autoBadge: {
    display: 'inline-block',
    fontSize: '0.65rem',
    fontWeight: 700,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    color: 'var(--color-accent)',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '8px',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }
};

export default function ExtratoPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '12px' }}>
        <RefreshCw className="spin" size={32} color="var(--color-brand)" />
        <span style={{ color: 'var(--text-secondary)' }}>Carregando extratos...</span>
      </div>
    }>
      <ExtratoPageContent />
    </Suspense>
  );
}
