'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, TrendingUp, Award, Users, RefreshCw, BarChart2, Calendar, Target, AlertTriangle, PlusCircle, Scale, Tag, Trash2, Edit2, ShoppingCart, Check } from 'lucide-react';

interface LoteStats {
  id: number;
  nome_lote: string;
  qtd_cabecas: number;
  cabecas_totais: number;
  cabecas_vendidas: number;
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

interface Animal {
  id: number;
  brinco: string;
  peso_entrada: number;
  peso_atual: number;
  status: 'ativo' | 'vendido';
  data_entrada: string;
  data_saida: string | null;
  peso_saida: number | null;
  preco_venda_arroba: number | null;
  rendimento_carcaca_real: number | null;
  dias_confinamento: number;
  gmd: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [lotes, setLotes] = useState<LoteStats[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<number | null>(null);
  const [historicoPesagens, setHistoricoPesagens] = useState<PesagemHistorico[]>([]);
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fechamentoInfo, setFechamentoInfo] = useState<any | null>(null);
  const [precoVendaInput, setPrecoVendaInput] = useState<string>('300.00'); // Valor médio do mercado R$/@

  // Estados para Ações Individuais (Modais)
  const [activeAnimalId, setActiveAnimalId] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<'pesagem' | 'venda' | 'edicao' | null>(null);
  
  // Inputs dos Modais
  const [modalPeso, setModalPeso] = useState<string>('');
  const [modalBrinco, setModalBrinco] = useState<string>('');
  const [modalDataEntrada, setModalDataEntrada] = useState<string>('');
  const [modalVendaPesoSaida, setModalVendaPesoSaida] = useState<string>('');
  const [modalVendaPrecoArroba, setModalVendaPrecoArroba] = useState<string>('300.00');
  const [modalVendaRendimento, setModalVendaRendimento] = useState<string>('54.0');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  const activeLote = lotes.find(l => l.id === selectedLoteId);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
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

  // Carregar histórico de pesagens e lista de animais do lote selecionado
  useEffect(() => {
    if (selectedLoteId) {
      fetchLoteDetalhado(selectedLoteId);
      setFechamentoInfo(null);
    }
  }, [selectedLoteId]);

  const fetchLoteDetalhado = async (loteId: number) => {
    try {
      const res = await fetch(`/api/gmd?lote_id=${loteId}`);
      if (res.ok) {
        const data = await res.json();
        setHistoricoPesagens(data.historico || []);
        setAnimais(data.animais || []);
      }
    } catch (e) {
      console.error('Erro ao buscar detalhamento do lote:', e);
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
        loadDashboardData();
      }
    } catch (e) {
      console.error('Erro no fechamento do lote:', e);
    }
  };

  // Excluir Lote Permanentemente
  const handleDeleteLote = async () => {
    if (!selectedLoteId) return;
    const confirmDelete = window.confirm("ATENÇÃO: Deseja realmente excluir este lote e TODOS os seus animais, tratos e pesagens permanentemente? Esta ação não poderá ser desfeita.");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/lotes?id=${selectedLoteId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert("Lote e todos os dados associados foram excluídos com sucesso.");
        setSelectedLoteId(null);
        loadDashboardData();
      } else {
        const errData = await res.json();
        alert(`Erro ao excluir: ${errData.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao conectar com o banco de dados.");
    }
  };

  // Submeter Ações Individuais dos Animais (Modais)
  const handleAnimalAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnimalId) return;

    setSubmittingAction(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      let url = '/api/animais';
      let method = 'POST';
      let body: any = { animal_id: activeAnimalId };

      if (modalMode === 'pesagem') {
        body.peso = parseFloat(modalPeso);
      } else if (modalMode === 'edicao') {
        body.brinco = modalBrinco;
        body.data_entrada = modalDataEntrada;
      } else if (modalMode === 'venda') {
        method = 'PUT';
        body.peso_saida = parseFloat(modalVendaPesoSaida);
        body.preco_venda_arroba = parseFloat(modalVendaPrecoArroba);
        body.rendimento_carcaca_real = parseFloat(modalVendaRendimento);
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na operação.');
      }

      setFormSuccess('Operação registrada com sucesso!');
      
      setTimeout(() => {
        closeModal();
        if (selectedLoteId) {
          fetchLoteDetalhado(selectedLoteId);
          loadDashboardData();
        }
      }, 1200);

    } catch (err: any) {
      setFormError(err.message || 'Erro ao processar alteração.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const openModal = (animal: Animal, mode: 'pesagem' | 'venda' | 'edicao') => {
    setActiveAnimalId(animal.id);
    setModalMode(mode);
    setModalPeso('');
    setModalBrinco(animal.brinco);
    setModalDataEntrada(animal.data_entrada ? new Date(animal.data_entrada).toISOString().split('T')[0] : '');
    setModalVendaPesoSaida(String(animal.peso_atual));
    setModalVendaPrecoArroba('300.00');
    setModalVendaRendimento('54.0');
    setFormError(null);
    setFormSuccess(null);
  };

  const closeModal = () => {
    setActiveAnimalId(null);
    setModalMode(null);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading && lotes.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <RefreshCw size={32} className="animate-spin" color="var(--color-brand)" />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Carregando dados individuais do Neon...</p>
      </div>
    );
  }

  // Gráfico SVG do Histórico de GMD
  const renderGmdChart = () => {
    if (historicoPesagens.length < 2) {
      return (
        <div style={styles.emptyChart}>
          <BarChart2 size={24} style={{ marginBottom: '8px' }} />
          <span>Histórico de peso insuficiente.</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mínimo de 2 datas de pesagem necessárias.</span>
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const padding = 30;

    const gmds = historicoPesagens.map(p => p.gmd);
    const minGmd = Math.min(...gmds, 0.5);
    const maxGmd = Math.max(...gmds, 2.0);
    const rangeY = maxGmd - minGmd || 1.0;

    const points = historicoPesagens.map((p, index) => {
      const x = padding + (index / (historicoPesagens.length - 1)) * (width - padding * 2);
      const y = height - padding - ((p.gmd - minGmd) / rangeY) * (height - padding * 2);
      return { x, y, label: p.data, value: p.gmd };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <div style={styles.chartWrapper}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.0"/>
            </linearGradient>
          </defs>

          {[0.5, 1.0, 1.5, 2.0].map((val, idx) => {
            if (val < minGmd || val > maxGmd) return null;
            const y = height - padding - ((val - minGmd) / rangeY) * (height - padding * 2);
            return (
              <g key={idx}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                <text x={padding - 5} y={y + 4} fill="var(--text-muted)" fontSize="8" textAnchor="end">{val.toFixed(1)} kg</text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#chartGradient)" />
          <path d={linePath} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" />

          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="4" fill="var(--bg-secondary)" stroke="var(--color-brand)" strokeWidth="2" />
              <text x={p.x} y={p.y - 8} fill="#fff" fontSize="8" fontWeight="600" textAnchor="middle">{p.value.toFixed(2)} kg</text>
              <text x={p.x} y={height - padding + 12} fill="var(--text-muted)" fontSize="8" textAnchor="middle">{p.label}</text>
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
          <p style={styles.subtitle}>Gestão e Custos por Arroba de Confinamento Individualizado</p>
        </div>
        
        <div style={styles.actionsHeader}>
          <button onClick={() => router.push('/lote')} style={styles.addLoteBtn}>
            <PlusCircle size={16} style={{ marginRight: '6px' }} /> Novo Lote
          </button>

          <div style={styles.selectorWrapper}>
            <select 
              value={selectedLoteId || ''} 
              onChange={(e) => setSelectedLoteId(Number(e.target.value))}
              style={styles.select}
            >
              {lotes.map(lote => (
                <option key={lote.id} value={lote.id}>
                  {lote.nome_lote} ({lote.status === 'ativo' ? `🟢 ${lote.qtd_cabecas} cab.` : '🔴 Encerrado'})
                </option>
              ))}
            </select>
            <button onClick={loadDashboardData} style={styles.refreshBtn} title="Atualizar dados da nuvem">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {activeLote ? (
        <>
          {/* Grid de Cards de Indicadores */}
          <div style={styles.grid}>
            {/* GMD MÉDIO */}
            <div className="glass-card" style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>GMD Médio Lote</span>
                <TrendingUp size={20} color="var(--color-brand)" />
              </div>
              <div style={styles.cardValue}>
                {activeLote.gmd_lote.toFixed(3)} <span style={styles.unit}>kg/dia</span>
              </div>
              <div style={styles.cardFooter}>
                Ganho diário médio ({activeLote.dias_confinamento} dias de confinamento)
              </div>
            </div>

            {/* CUSTO POR @ PRODUZIDA */}
            <div className="glass-card" style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Custo por @ Produzida</span>
                <Award size={20} color="var(--color-accent)" />
              </div>
              <div style={styles.cardValue}>
                {activeLote.custo_por_arroba_produzida > 0 ? (
                  `R$ ${activeLote.custo_por_arroba_produzida.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ) : (
                  'R$ 0,00'
                )}
              </div>
              <div style={styles.cardFooter}>
                Calculado com base nas @ produzidas ativas e vendidas
              </div>
            </div>

            {/* CUSTO TOTAL ACUMULADO */}
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

            {/* REBANHO */}
            <div className="glass-card" style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Rebanho Confinado</span>
                <Users size={20} color="var(--text-secondary)" />
              </div>
              <div style={styles.cardValue}>
                {activeLote.qtd_cabecas} <span style={styles.unit}>cab.</span>
              </div>
              <div style={styles.cardFooter}>
                Total inicial: {activeLote.cabecas_totais} | Vendidos/Abatidos: {activeLote.cabecas_vendidas} cab.
              </div>
            </div>
          </div>

          {/* Gráfico e Operações do Lote */}
          <div style={styles.row}>
            {/* Gráfico */}
            <div className="glass-panel" style={styles.chartPanel}>
              <h3 style={styles.panelTitle}>Evolução de Peso & GMD</h3>
              {renderGmdChart()}
            </div>

            {/* Fechamento Consolidado do Lote */}
            <div className="glass-panel" style={styles.operationsPanel}>
              <h3 style={styles.panelTitle}>Faturamento & Fechamento Consolidado</h3>
              
              {activeLote.status === 'ativo' && !fechamentoInfo ? (
                <div style={styles.fechamentoBox}>
                  <p style={styles.opDescription}>
                    Calcule o faturamento projetado para as cabeças que **ainda estão ativas** no confinamento.
                  </p>
                  
                  <div style={styles.inputField}>
                    <label style={styles.inputLabel}>Preço de Venda Projetado (R$/@):</label>
                    <input 
                      type="number" 
                      value={precoVendaInput} 
                      onChange={(e) => setPrecoVendaInput(e.target.value)} 
                      style={styles.input}
                    />
                  </div>

                  <button onClick={handleFechamento} style={styles.closeBtn}>
                    Simular Fechamento Financeiro
                  </button>

                  <button onClick={handleDeleteLote} style={styles.deleteBtn}>
                    Excluir Lote Permanentemente
                  </button>
                </div>
              ) : (
                <div style={styles.fechamentoInfoBox}>
                  <div style={styles.successBadge}>Consolidação Financeira do Lote</div>
                  
                  <div style={styles.fechamentoStats}>
                    <div style={styles.statsRow}>
                      <span>Total de @ Vendidas/Projetadas:</span>
                      <strong style={{ color: '#fff' }}>
                        {fechamentoInfo ? fechamentoInfo.total_arrobas_venda.toFixed(2) : ((activeLote.peso_medio_atual * activeLote.cabecas_totais * (parseFloat(precoVendaInput) / 100)) / 15).toFixed(2)} @
                      </strong>
                    </div>
                    <div style={styles.statsRow}>
                      <span>Faturamento Total:</span>
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
                      <span style={{ fontSize: '1rem', fontWeight: 600 }}>Lucro Líquido Estimado:</span>
                      <strong style={{ 
                        fontSize: '1.2rem', 
                        color: (fechamentoInfo?.lucro_liquido >= 0) ? 'var(--color-brand)' : 'var(--color-danger)'
                      }}>
                        R$ {fechamentoInfo ? fechamentoInfo.lucro_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                      </strong>
                    </div>
                  </div>
                  
                  <div style={styles.closedActions}>
                    <button 
                      onClick={() => {
                        setFechamentoInfo(null);
                        loadDashboardData();
                      }} 
                      style={styles.resetBtn}
                    >
                      Simular Outro Preço
                    </button>
                    <button onClick={handleDeleteLote} style={styles.deleteBtn}>
                      Excluir Lote Permanentemente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TABELA DE CONTROLE INDIVIDUAL DE BRINCOS */}
          <div className="glass-panel" style={styles.tablePanel}>
            <div style={styles.tableHeader}>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Controle Individual de Animais (Brincos)</h3>
              <span style={styles.tableSubtitle}>Cada cabeça é pesada e vendida de forma independente</span>
            </div>

            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Identificação (Brinco)</th>
                    <th style={styles.th}>Data de Entrada</th>
                    <th style={styles.th}>Peso de Entrada</th>
                    <th style={styles.th}>Peso Atual/Saída</th>
                    <th style={styles.th}>GMD Individual</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {animais.map((animal) => (
                    <tr key={animal.id} style={styles.tr}>
                      <td style={styles.td}>
                        <span style={styles.brincoLabel}>
                          <Tag size={12} style={{ marginRight: '6px' }} />
                          {animal.brinco}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div>{new Date(animal.data_entrada).toLocaleDateString('pt-BR')}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {animal.dias_confinamento} dias confinado
                        </div>
                      </td>
                      <td style={styles.td}>{animal.peso_entrada.toFixed(1)} kg</td>
                      <td style={styles.td}>
                        <strong style={{ color: '#fff' }}>
                          {animal.status === 'vendido' ? `${animal.peso_saida?.toFixed(1)} kg` : `${animal.peso_atual.toFixed(1)} kg`}
                        </strong>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
                          +{animal.gmd.toFixed(3)} kg/dia
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: animal.status === 'ativo' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: animal.status === 'ativo' ? 'var(--color-brand)' : 'var(--color-danger)'
                        }}>
                          {animal.status === 'ativo' ? '🟢 Confinado' : '🔴 Vendido'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {animal.status === 'ativo' ? (
                          <div style={styles.actionsGroup}>
                            <button 
                              onClick={() => openModal(animal, 'pesagem')} 
                              style={styles.actionBtn} 
                              title="Lançar pesagem"
                            >
                              <Scale size={14} /> Pesar
                            </button>
                            <button 
                              onClick={() => openModal(animal, 'venda')} 
                              style={{ ...styles.actionBtn, color: 'var(--color-accent)' }} 
                              title="Registrar abate/venda individual"
                            >
                              <ShoppingCart size={14} /> Vender
                            </button>
                            <button 
                              onClick={() => openModal(animal, 'edicao')} 
                              style={{ ...styles.actionBtn, color: 'var(--text-muted)' }} 
                              title="Editar identificação do brinco"
                            >
                              <Edit2 size={14} /> Editar
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            R$ {animal.preco_venda_arroba?.toFixed(2)} / @ ({animal.rendimento_carcaca_real}% rend.)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div style={styles.emptyContainer} className="glass-panel">
          <AlertTriangle size={48} color="var(--color-accent)" />
          <h2>Nenhum lote selecionado</h2>
          <p>Selecione um lote no menu superior direito ou crie um novo lote clicando em "+ Novo Lote".</p>
        </div>
      )}

      {/* MODAL GLOBAL PARA AÇÕES DE ANIMAIS */}
      {modalMode && activeAnimalId && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>
              {modalMode === 'pesagem' && 'Registrar Nova Pesagem'}
              {modalMode === 'edicao' && 'Editar Identificação do Brinco'}
              {modalMode === 'venda' && 'Venda / Saída de Cabeça de Gado'}
            </h3>

            <form onSubmit={handleAnimalAction} style={styles.modalForm}>
              {/* Modo Pesagem */}
              {modalMode === 'pesagem' && (
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Peso do Animal (kg vivo):</label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="Ex: 345.5"
                    value={modalPeso}
                    onChange={(e) => setModalPeso(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
              )}

              {/* Modo Edição de Brinco */}
              {modalMode === 'edicao' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={styles.inputField}>
                    <label style={styles.inputLabel}>Novo Código de Brinco:</label>
                    <input 
                      type="text" 
                      value={modalBrinco}
                      onChange={(e) => setModalBrinco(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.inputField}>
                    <label style={styles.inputLabel}>Data de Entrada no Confinamento:</label>
                    <input 
                      type="date" 
                      value={modalDataEntrada}
                      onChange={(e) => setModalDataEntrada(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Modo Venda/Abate */}
              {modalMode === 'venda' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={styles.inputField}>
                    <label style={styles.inputLabel}>Peso Final na Balança (kg vivo):</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={modalVendaPesoSaida}
                      onChange={(e) => setModalVendaPesoSaida(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.inputField}>
                    <label style={styles.inputLabel}>Preço de Venda Fechado (R$ / Arroba @):</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={modalVendaPrecoArroba}
                      onChange={(e) => setModalVendaPrecoArroba(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.inputField}>
                    <label style={styles.inputLabel}>Rendimento de Carcaça Real (% frigorífico):</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={modalVendaRendimento}
                      onChange={(e) => setModalVendaRendimento(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Botões do Modal */}
              <div style={styles.modalActions}>
                <button type="submit" disabled={submittingAction} style={styles.modalSubmitBtn}>
                  {submittingAction ? 'Processando...' : 'Confirmar e Salvar'}
                </button>
                <button type="button" onClick={closeModal} style={styles.modalCancelBtn}>
                  Cancelar
                </button>
              </div>
            </form>

            {formError && <div style={styles.formErrorMsg}>{formError}</div>}
            {formSuccess && <div style={styles.formSuccessMsg}>{formSuccess}</div>}
          </div>
        </div>
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
    gap: '1.5rem'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)'
  },
  actionsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  addLoteBtn: {
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
    padding: '0.6rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid rgba(255,255,255,0.08)'
  },
  addPesagemBtn: {
    backgroundColor: 'var(--color-accent)',
    color: '#fff',
    padding: '0.6rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid rgba(255,255,255,0.08)'
  },
  selectorWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  select: {
    padding: '0.6rem 1.8rem 0.6rem 1rem',
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
    justifyContent: 'center'
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
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
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
  deleteBtn: {
    backgroundColor: 'transparent',
    color: 'var(--color-danger)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    border: '1px solid var(--color-danger)',
    fontSize: '0.85rem',
    transition: 'all var(--transition-fast)'
  },
  closedActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: 'auto'
  },
  tablePanel: {
    padding: '1.5rem',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  tableHeader: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '0.75rem'
  },
  tableSubtitle: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)'
  },
  tableResponsive: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    padding: '0.75rem 1rem',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    borderBottom: '2px solid rgba(255, 255, 255, 0.08)'
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    transition: 'background-color var(--transition-fast)'
  },
  td: {
    padding: '0.85rem 1rem',
    fontSize: '0.9rem',
    color: 'var(--text-primary)'
  },
  brincoLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: '0.25rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  },
  statusBadge: {
    padding: '0.2rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    fontWeight: 600
  },
  actionsGroup: {
    display: 'flex',
    gap: '0.5rem'
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-brand)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '0.25rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
    transition: 'background-color var(--transition-fast)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modalContent: {
    width: '100%',
    maxWidth: '420px',
    padding: '1.5rem',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#fff',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '0.5rem'
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  modalActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.5rem'
  },
  modalSubmitBtn: {
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
    padding: '0.7rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    flex: 2
  },
  modalCancelBtn: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    padding: '0.7rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    fontWeight: 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
    flex: 1
  },
  formErrorMsg: {
    fontSize: '0.85rem',
    color: 'var(--color-danger)'
  },
  formSuccessMsg: {
    fontSize: '0.85rem',
    color: 'var(--color-brand)'
  }
};
