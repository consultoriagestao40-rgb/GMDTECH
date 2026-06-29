'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Award, Users, RefreshCw, BarChart2, Calendar, Target, AlertTriangle } from 'lucide-react';

interface LoteStats {
  id: number;
  nome_lote: string;
  qtd_cabecas: number;
  data_entrada: string;
  dias_confinamento: number;
  peso_medio_entrada: number;
  peso_medio_atual: number;
  gmd_lote: number;
  custo_aquisicao: number;
  custo_tratos_total: number;
  custo_total_lote: number;
  arrobas_produzidas_total: number;
  custo_por_arroba_produzida: number;
  status: string;
}

interface PesagemHistorico {
  data: string;
  peso: number;
  gmd: number;
}

export default function Dashboard() {
  const [lotes, setLotes] = useState<LoteStats[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<number | null>(null);
  const [historicoPesagens, setHistoricoPesagens] = useState<PesagemHistorico[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fechamentoInfo, setFechamentoInfo] = useState<any | null>(null);
  const [precoVendaInput, setPrecoVendaInput] = useState<string>('300.00'); // Valor médio do mercado R$/@ Nelore

  const activeLote = lotes.find(l => l.id === selectedLoteId);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Carregar lotes e métricas gerais do GMD
      const resGmd = await fetch('/api/gmd');
      if (resGmd.ok) {
        const data = await resGmd.json();
        setLotes(data.stats || []);
        if (data.stats && data.stats.length > 0 && !selectedLoteId) {
          setSelectedLoteId(data.stats[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Neon:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar histórico de pesagens do lote selecionado para o gráfico
  useEffect(() => {
    if (selectedLoteId) {
      fetchHistoricoPesagens(selectedLoteId);
      setFechamentoInfo(null);
    }
  }, [selectedLoteId]);

  const fetchHistoricoPesagens = async (loteId: number) => {
    try {
      const res = await fetch(`/api/gmd?lote_id=${loteId}`);
      if (res.ok) {
        const data = await res.json();
        setHistoricoPesagens(data.historico || []);
      }
    } catch (e) {
      console.error('Erro ao buscar histórico de pesagens:', e);
    }
  };

  const handleFechamento = async () => {
    if (!selectedLoteId) return;
    try {
      const res = await fetch('/api/fechamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lote_id: selectedLoteId,
          preco_venda_arroba: parseFloat(precoVendaInput)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setFechamentoInfo(data);
        // Atualizar lista
        loadDashboardData();
      }
    } catch (e) {
      console.error('Erro no fechamento do lote:', e);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <RefreshCw size={32} className="animate-spin" color="var(--color-brand)" />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Carregando métricas da nuvem Neon...</p>
      </div>
    );
  }

  if (lotes.length === 0) {
    return (
      <div style={styles.emptyContainer} className="glass-panel">
        <AlertTriangle size={48} color="var(--color-accent)" />
        <h2>Nenhum lote de gado ativo encontrado</h2>
        <p>Cadastre um lote no banco de dados Neon para visualizar as métricas do painel.</p>
        <button onClick={loadDashboardData} style={styles.reloadBtn}>
          <RefreshCw size={14} style={{ marginRight: '6px' }} /> Atualizar
        </button>
      </div>
    );
  }

  // Desenhar Gráfico SVG do Histórico de GMD
  const renderGmdChart = () => {
    if (historicoPesagens.length < 2) {
      return (
        <div style={styles.emptyChart}>
          <BarChart2 size={24} style={{ marginBottom: '8px' }} />
          <span>Dados insuficientes para traçar evolução do GMD.</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mínimo de 2 pesagens necessárias.</span>
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const padding = 30;

    const gmds = historicoPesagens.map(p => p.gmd);
    const minGmd = Math.min(...gmds, 0.5); // valor mínimo para eixo Y
    const maxGmd = Math.max(...gmds, 2.0); // valor máximo para eixo Y
    const rangeY = maxGmd - minGmd;

    // Calcular coordenadas dos pontos
    const points = historicoPesagens.map((p, index) => {
      const x = padding + (index / (historicoPesagens.length - 1)) * (width - padding * 2);
      const y = height - padding - ((p.gmd - minGmd) / rangeY) * (height - padding * 2);
      return { x, y, label: p.data, value: p.gmd };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    // Área sombreada sob a linha
    const areaPath = `
      ${linePath} 
      L ${points[points.length - 1].x} ${height - padding} 
      L ${points[0].x} ${height - padding} 
      Z
    `;

    return (
      <div style={styles.chartWrapper}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.0"/>
            </linearGradient>
          </defs>

          {/* Linhas de Grade de Fundo (Y) */}
          {[0, 0.5, 1.0, 1.5, 2.0].map((val, idx) => {
            if (val < minGmd || val > maxGmd) return null;
            const y = height - padding - ((val - minGmd) / rangeY) * (height - padding * 2);
            return (
              <g key={idx}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                <text x={padding - 5} y={y + 4} fill="var(--text-muted)" fontSize="8" textAnchor="end">{val.toFixed(1)} kg</text>
              </g>
            );
          })}

          {/* Área com gradiente */}
          <path d={areaPath} fill="url(#chartGradient)" />

          {/* Linha principal */}
          <path d={linePath} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Pontos nos valores */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="4" fill="var(--bg-secondary)" stroke="var(--color-brand)" strokeWidth="2" />
              <text x={p.x} y={p.y - 8} fill="#fff" fontSize="8" fontWeight="600" textAnchor="middle">
                {p.value.toFixed(2)} kg
              </text>
              <text x={p.x} y={height - padding + 12} fill="var(--text-muted)" fontSize="8" textAnchor="middle">
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div style={styles.dashboard}>
      {/* Cabeçalho */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Painel GMDTech</h1>
          <p style={styles.subtitle}>Gestão e Custos por Arroba de Confinamento</p>
        </div>
        <div style={styles.selectorWrapper}>
          <label style={styles.selectLabel}>Selecione o Lote:</label>
          <select 
            value={selectedLoteId || ''} 
            onChange={(e) => setSelectedLoteId(Number(e.target.value))}
            style={styles.select}
          >
            {lotes.map(lote => (
              <option key={lote.id} value={lote.id}>
                {lote.nome_lote} ({lote.status === 'ativo' ? '🟢 Ativo' : '🔴 Encerrado'})
              </option>
            ))}
          </select>
          <button onClick={loadDashboardData} style={styles.refreshBtn} title="Atualizar dados da nuvem">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {activeLote && (
        <>
          {/* Grid de Cards de Indicadores */}
          <div style={styles.grid}>
            {/* CARD 1: GMD MÉDIO */}
            <div className="glass-card" style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>GMD Médio Lote</span>
                <TrendingUp size={20} color="var(--color-brand)" />
              </div>
              <div style={styles.cardValue}>
                {activeLote.gmd_lote.toFixed(3)} <span style={styles.unit}>kg/dia</span>
              </div>
              <div style={styles.cardFooter}>
                Ganho diário por cabeça ({activeLote.dias_confinamento} dias em confinamento)
              </div>
            </div>

            {/* CARD 2: CUSTO POR @ PRODUZIDA */}
            <div className="glass-card" style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Custo por @ Produzida</span>
                <Award size={20} color="var(--color-accent)" />
              </div>
              <div style={styles.cardValue}>
                R$ {activeLote.custo_por_arroba_produzida.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={styles.cardFooter}>
                Baseado no ganho de carcaça e tratos totais
              </div>
            </div>

            {/* CARD 3: CUSTO TOTAL ACUMULADO */}
            <div className="glass-card" style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Custo Total Acumulado</span>
                <DollarSign size={20} color="var(--color-info)" />
              </div>
              <div style={styles.cardValue}>
                R$ {activeLote.custo_total_lote.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </div>
              <div style={styles.cardFooter}>
                Aquisição: R$ {activeLote.custo_aquisicao.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} | Tratos: R$ {activeLote.custo_tratos_total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </div>
            </div>

            {/* CARD 4: REBANHO */}
            <div className="glass-card" style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Rebanho e Pesagem</span>
                <Users size={20} color="var(--text-secondary)" />
              </div>
              <div style={styles.cardValue}>
                {activeLote.qtd_cabecas} <span style={styles.unit}>cab.</span>
              </div>
              <div style={styles.cardFooter}>
                Peso Médio Inicial: {activeLote.peso_medio_entrada}kg | Atual: {activeLote.peso_medio_atual.toFixed(1)}kg
              </div>
            </div>
          </div>

          {/* Gráfico e Operações do Lote */}
          <div style={styles.row}>
            {/* Gráfico do GMD */}
            <div className="glass-panel" style={styles.chartPanel}>
              <h3 style={styles.panelTitle}>Evolução de Peso & GMD</h3>
              {renderGmdChart()}
            </div>

            {/* Fechamento Financeiro */}
            <div className="glass-panel" style={styles.operationsPanel}>
              <h3 style={styles.panelTitle}>Fechamento e Simulação de Lucro</h3>
              
              {activeLote.status === 'ativo' && !fechamentoInfo ? (
                <div style={styles.fechamentoBox}>
                  <p style={styles.opDescription}>
                    Calcule o faturamento e o lucro líquido simulando a venda de todo o lote com base nas arrobas atuais.
                  </p>
                  
                  <div style={styles.inputField}>
                    <label style={styles.inputLabel}>Preço de Venda do Mercado (R$/@):</label>
                    <input 
                      type="number" 
                      value={precoVendaInput} 
                      onChange={(e) => setPrecoVendaInput(e.target.value)} 
                      style={styles.input}
                    />
                  </div>

                  <button onClick={handleFechamento} style={styles.closeBtn}>
                    Fechar Lote e Calcular Lucro
                  </button>
                </div>
              ) : (
                <div style={styles.fechamentoInfoBox}>
                  <div style={styles.successBadge}>Lote Encerrado Financeiramente</div>
                  
                  <div style={styles.fechamentoStats}>
                    <div style={styles.statsRow}>
                      <span>Total de @ Vendidas:</span>
                      <strong style={{ color: '#fff' }}>
                        {fechamentoInfo ? fechamentoInfo.total_arrobas_venda.toFixed(2) : ((activeLote.peso_medio_atual * activeLote.qtd_cabecas * 0.54) / 15).toFixed(2)} @
                      </strong>
                    </div>
                    <div style={styles.statsRow}>
                      <span>Faturamento Bruto:</span>
                      <strong style={{ color: 'var(--color-brand)' }}>
                        R$ {fechamentoInfo ? fechamentoInfo.faturamento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                      </strong>
                    </div>
                    <div style={styles.statsRow}>
                      <span>Custo Total de Produção:</span>
                      <strong style={{ color: 'var(--color-danger)' }}>
                        R$ {fechamentoInfo ? fechamentoInfo.custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : activeLote.custo_total_lote.toLocaleString('pt-BR')}
                      </strong>
                    </div>
                    <div style={{ ...styles.statsRow, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 600 }}>Lucro Líquido Realizado:</span>
                      <strong style={{ 
                        fontSize: '1.2rem', 
                        color: (fechamentoInfo?.lucro_liquido >= 0) ? 'var(--color-brand)' : 'var(--color-danger)'
                      }}>
                        R$ {fechamentoInfo ? fechamentoInfo.lucro_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                      </strong>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setFechamentoInfo(null);
                      loadDashboardData();
                    }} 
                    style={styles.resetBtn}
                  >
                    Simular Nova Cotação
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  dashboard: {
    padding: '1.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)'
  },
  selectorWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  selectLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: 500
  },
  select: {
    padding: '0.6rem 1rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontWeight: 500,
    outline: 'none',
    cursor: 'pointer'
  },
  refreshBtn: {
    padding: '0.6rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color var(--transition-fast)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.25rem'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    minHeight: '130px'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: 500
  },
  cardValue: {
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#fff',
    margin: '0.25rem 0'
  },
  unit: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: 'var(--text-muted)'
  },
  cardFooter: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    paddingTop: '0.4rem',
    marginTop: 'auto'
  },
  row: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap'
  },
  chartPanel: {
    flex: '2 1 500px',
    padding: '1.5rem',
    minHeight: '260px'
  },
  operationsPanel: {
    flex: '1 1 320px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column'
  },
  panelTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '1rem',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '0.5rem'
  },
  emptyChart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '180px',
    color: 'var(--text-muted)',
    fontSize: '0.9rem'
  },
  chartWrapper: {
    marginTop: '0.5rem'
  },
  fechamentoBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    height: '100%',
    justifyContent: 'space-between'
  },
  opDescription: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4
  },
  inputField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  inputLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: 500
  },
  input: {
    padding: '0.6rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    outline: 'none'
  },
  closeBtn: {
    backgroundColor: 'var(--color-danger)',
    color: '#fff',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '0 4px 12px var(--color-danger-glow)',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'background-color var(--transition-fast)'
  },
  fechamentoInfoBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    height: '100%'
  },
  successBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: 'var(--color-brand)',
    padding: '0.4rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    fontWeight: 600,
    textAlign: 'center',
    border: '1px solid var(--color-brand)'
  },
  fechamentoStats: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    alignItems: 'center'
  },
  resetBtn: {
    marginTop: 'auto',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    padding: '0.6rem',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'center',
    border: '1px solid var(--border-color)',
    fontSize: '0.85rem',
    transition: 'background-color var(--transition-fast)'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px'
  },
  emptyContainer: {
    padding: '3rem',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '3rem auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem'
  },
  reloadBtn: {
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
    padding: '0.6rem 1.2rem',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  }
};
