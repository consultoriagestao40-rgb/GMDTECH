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
  peso_total_entrada: number;
  gmd_lote: number;
  custo_aquisicao: number;
  custo_tratos_total: number;
  custo_total_lote: number;
  arrobas_produzidas_total: number;
  custo_por_arroba_produzida: number;
  status: string;
  rendimento_carcaca_previsto: number;
  gmd_estimado: number;
  ciclo_dias: number;
}

interface PesagemHistorico {
  data: string;
  peso: number;
  gmd: number;
  dias: number;
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
  
  // Estados para o Gráfico (Lote vs Individual)
  const [chartViewMode, setChartViewMode] = useState<'lote_medio' | 'lote_total' | 'individual'>('lote_medio');
  const [selectedAnimalIdForChart, setSelectedAnimalIdForChart] = useState<number | null>(null);
  const [animalHistoricoPesagens, setAnimalHistoricoPesagens] = useState<PesagemHistorico[]>([]);
  const [loadingAnimalChart, setLoadingAnimalChart] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

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

  // Estados para Edição do Lote
  const [showEditLoteModal, setShowEditLoteModal] = useState<boolean>(false);
  const [editLoteNome, setEditLoteNome] = useState<string>('');
  const [editLoteDataEntrada, setEditLoteDataEntrada] = useState<string>('');
  const [editLoteCusto, setEditLoteCusto] = useState<string>('');
  const [editLoteRendimento, setEditLoteRendimento] = useState<string>('');
  const [editLoteCiclo, setEditLoteCiclo] = useState<string>('90');

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
        const sortedStats = (data.stats || []).sort((a: any, b: any) => 
          a.nome_lote.localeCompare(b.nome_lote, undefined, { numeric: true, sensitivity: 'base' })
        );
        setLotes(sortedStats);
        if (sortedStats.length > 0 && !selectedLoteId) {
          setSelectedLoteId(sortedStats[0].id);
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
        if (data.animais && data.animais.length > 0) {
          setSelectedAnimalIdForChart(data.animais[0].id);
        } else {
          setSelectedAnimalIdForChart(null);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar detalhamento do lote:', e);
    }
  };

  // Carregar histórico de pesagens do animal selecionado para o gráfico individual
  useEffect(() => {
    if (chartViewMode !== 'individual' || !selectedAnimalIdForChart) {
      setAnimalHistoricoPesagens([]);
      return;
    }

    const loadAnimalHistory = async () => {
      setLoadingAnimalChart(true);
      try {
        const res = await fetch(`/api/animais?animal_id=${selectedAnimalIdForChart}`);
        if (res.ok) {
          const data = await res.json();
          setAnimalHistoricoPesagens(data.historico || []);
        }
      } catch (e) {
        console.error('Erro ao buscar histórico de pesagens do animal:', e);
      } finally {
        setLoadingAnimalChart(false);
      }
    };

    loadAnimalHistory();
  }, [selectedAnimalIdForChart, chartViewMode]);

  const handleFechamento = async () => {
    if (!selectedLoteId) return;
    try {
      const res = await fetch('/api/fechamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lote_id: selectedLoteId,
          preco_venda_arroba: parseFloat(precoVendaInput.replace(',', '.')),
          confirm: false // APENAS SIMULAÇÃO
        })
      });

      if (res.ok) {
        const data = await res.json();
        setFechamentoInfo(data);
      }
    } catch (e) {
      console.error('Erro no fechamento do lote:', e);
    }
  };

  const handleConfirmarFechamento = async () => {
    if (!selectedLoteId) return;
    const confirmClose = window.confirm("ATENÇÃO: Deseja realmente confirmar a venda e encerrar este lote? Todos os animais serão considerados vendidos e o lote será marcado como encerrado definitivamente.");
    if (!confirmClose) return;

    try {
      const res = await fetch('/api/fechamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lote_id: selectedLoteId,
          preco_venda_arroba: parseFloat(precoVendaInput.replace(',', '.')),
          confirm: true // CONFIRMA E ENCERRA NO DB!
        })
      });

      if (res.ok) {
        const data = await res.json();
        setFechamentoInfo(data);
        alert("Venda confirmada e lote encerrado com sucesso!");
        loadDashboardData();
      }
    } catch (e) {
      console.error('Erro ao encerrar lote:', e);
      alert("Falha ao encerrar lote.");
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

  // Abrir Modal de Edição do Lote
  const openEditLoteModal = () => {
    if (!activeLote) return;
    setEditLoteNome(activeLote.nome_lote);
    setEditLoteDataEntrada(new Date(activeLote.data_entrada).toISOString().split('T')[0]);
    setEditLoteCusto(String(activeLote.custo_aquisicao));
    setEditLoteRendimento(String(activeLote.rendimento_carcaca_previsto || '54.0'));
    setEditLoteCiclo(String(activeLote.ciclo_dias || '90'));
    setShowEditLoteModal(true);
    setFormError(null);
    setFormSuccess(null);
  };

  // Submeter Edição do Lote
  const handleEditLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoteId || !editLoteNome || !editLoteDataEntrada) {
      setFormError('Nome do lote e Data de Entrada são obrigatórios.');
      return;
    }

    setSubmittingAction(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const res = await fetch('/api/lotes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLoteId,
          nome_lote: editLoteNome,
          data_entrada: editLoteDataEntrada,
          custo_aquisicao_total: parseFloat(editLoteCusto) || 0,
          rendimento_carcaca_previsto: parseFloat(editLoteRendimento) || 54.0,
          ciclo_dias: parseInt(editLoteCiclo) || 90
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao salvar alterações.');
      }

      setFormSuccess('Dados do lote atualizados com sucesso!');

      setTimeout(() => {
        setShowEditLoteModal(false);
        loadDashboardData();
      }, 1200);

    } catch (err: any) {
      setFormError(err.message || 'Erro ao atualizar informações do lote.');
    } finally {
      setSubmittingAction(false);
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

  const renderGmdChart = () => {
    const activeLote = lotes.find(l => l.id === selectedLoteId);
    if (!activeLote) {
      return (
        <div style={styles.emptyChart}>
          <BarChart2 size={24} style={{ marginBottom: '8px' }} />
          <span>Selecione um lote para visualizar o gráfico.</span>
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const ciclo_dias = activeLote.ciclo_dias || 90;
    const gmdEst = activeLote.gmd_estimado || 1.500;

    // Configurar pontos iniciais e dados baseados no modo de exibição (Lote Médio, Lote Total ou Individual)
    let pesoIni = 300;
    let titleReal = 'Realizado';
    let realPointsRaw: PesagemHistorico[] = [];
    let gmdDiario = gmdEst;

    if (chartViewMode === 'lote_medio') {
      // MODO LOTE MÉDIO: Peso Médio por Cabeça
      pesoIni = activeLote.peso_medio_entrada || 300;
      titleReal = 'Realizado (Média por Cabeça)';
      realPointsRaw = [...historicoPesagens];
      gmdDiario = gmdEst;
    } else if (chartViewMode === 'lote_total') {
      // MODO LOTE TOTAL: Peso TOTAL do Lote
      pesoIni = Number(activeLote.peso_total_entrada) || 14000;
      titleReal = 'Realizado (Peso Total do Lote)';
      // Multiplica os pesos médios históricos pela quantidade de cabeças ativas para obter o peso total do lote
      realPointsRaw = historicoPesagens.map(p => ({
        ...p,
        peso: p.peso * activeLote.qtd_cabecas
      }));
      gmdDiario = gmdEst * activeLote.qtd_cabecas;
    } else {
      // MODO INDIVIDUAL: Peso Individual de um Boi
      if (loadingAnimalChart) {
        return (
          <div style={styles.emptyChart}>
            <RefreshCw size={24} className="animate-spin" color="var(--color-brand)" style={{ marginBottom: '8px' }} />
            <span>Carregando pesagens do animal...</span>
          </div>
        );
      }
      const activeAnimal = animais.find(a => a.id === selectedAnimalIdForChart);
      if (!activeAnimal) {
        return (
          <div style={styles.emptyChart}>
            <BarChart2 size={24} style={{ marginBottom: '8px' }} />
            <span>Selecione um animal acima para ver o gráfico.</span>
          </div>
        );
      }
      pesoIni = activeAnimal.peso_entrada;
      titleReal = `Realizado (Boi ${activeAnimal.brinco})`;
      realPointsRaw = [...animalHistoricoPesagens];
      gmdDiario = gmdEst;
    }

    // Linha Teórica de Projeção (Meta)
    const pesoProjetadoFim = pesoIni + gmdDiario * ciclo_dias;

    // Coletar pesos reais ordenados cronologicamente
    realPointsRaw.sort((a, b) => (a.dias || 0) - (b.dias || 0));

    const realPoints: { dias: number; peso: number; label: string }[] = [];
    
    // Adicionar ponto inicial
    realPoints.push({
      dias: 0,
      peso: pesoIni,
      label: 'Dia 0'
    });

    // Adicionar outros pontos do histórico real
    realPointsRaw.forEach(p => {
      if (p.dias > 0) {
        realPoints.push({
          dias: p.dias,
          peso: p.peso,
          label: p.data
        });
      }
    });

    // Encontrar min e max pesos para escala do eixo Y
    const todosPesos = [...realPoints.map(p => p.peso), pesoIni, pesoProjetadoFim];
    const minPeso = Math.min(...todosPesos) - 15;
    const maxPeso = Math.max(...todosPesos) + 15;
    const rangeY = maxPeso - minPeso || 1.0;

    // Funções de conversão para coordenadas SVG
    const getX = (dias: number) => {
      return paddingLeft + (dias / ciclo_dias) * (width - paddingLeft - paddingRight);
    };

    const getY = (peso: number) => {
      return height - paddingBottom - ((peso - minPeso) / rangeY) * (height - paddingTop - paddingBottom);
    };

    // Gerar caminhos SVG
    const targetPath = `M ${getX(0)} ${getY(pesoIni)} L ${getX(ciclo_dias)} ${getY(pesoProjetadoFim)}`;

    const realPointsCoords = realPoints.map(p => ({
      x: getX(p.dias),
      y: getY(p.peso),
      peso: p.peso,
      label: p.label,
      dias: p.dias
    }));

    const realLinePath = realPointsCoords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const realAreaPath = realPointsCoords.length > 0 
      ? `${realLinePath} L ${realPointsCoords[realPointsCoords.length - 1].x} ${height - paddingBottom} L ${realPointsCoords[0].x} ${height - paddingBottom} Z`
      : '';

    const yGridValues = [
      minPeso + 15,
      minPeso + 15 + (maxPeso - minPeso - 30) / 2,
      maxPeso - 15
    ];

    // Manipular o movimento do mouse sobre todo o SVG do gráfico para traçar a guia de região
    const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
      const svgElement = e.currentTarget;
      const rect = svgElement.getBoundingClientRect();
      const clickX = e.clientX - rect.left; // Posição X do mouse relativa ao SVG
      const scaleX = width / rect.width;
      const svgX = clickX * scaleX; // Posição X convertida para a escala original do SVG (500)

      // Determinar o dia correspondente com base no X
      const dias = Math.round(((svgX - paddingLeft) / (width - paddingLeft - paddingRight)) * ciclo_dias);
      if (dias < 0 || dias > ciclo_dias) {
        setHoveredPoint(null);
        return;
      }

      // Encontrar a data correspondente
      let label = `Dia ${dias}`;
      if (dias === 0) {
        label = 'Entrada';
      } else {
        // Encontrar ponto real mais próximo do dia selecionado
        const maisProximo = realPoints.reduce((prev, curr) => {
          return Math.abs(curr.dias - dias) < Math.abs(prev.dias - dias) ? curr : prev;
        });
        if (Math.abs(maisProximo.dias - dias) <= 5) {
          label = maisProximo.label;
        }
      }

      // Calcular peso previsto para este dia
      const pesoPrevisto = pesoIni + gmdDiario * dias;

      // Calcular peso real baseado na interpolação linear dos pontos de pesagem reais
      let pesoReal = null;
      
      // Ordenar os pontos para garantir a ordem cronológica
      const sortedReal = [...realPoints].sort((a, b) => a.dias - b.dias);
      
      if (sortedReal.length > 0) {
        if (dias <= sortedReal[0].dias) {
          pesoReal = sortedReal[0].peso;
        } else if (dias >= sortedReal[sortedReal.length - 1].dias) {
          pesoReal = sortedReal[sortedReal.length - 1].peso;
        } else {
          // Interpolar entre dois pontos consecutivos
          for (let i = 0; i < sortedReal.length - 1; i++) {
            const p1 = sortedReal[i];
            const p2 = sortedReal[i + 1];
            if (dias >= p1.dias && dias <= p2.dias) {
              const t = (dias - p1.dias) / (p2.dias - p1.dias);
              pesoReal = p1.peso + t * (p2.peso - p1.peso);
              break;
            }
          }
        }
      }

      setHoveredPoint({
        x: getX(dias),
        y: getY(pesoReal || pesoPrevisto),
        dias: dias,
        label: label,
        pesoReal: pesoReal || pesoPrevisto,
        pesoPrevisto: pesoPrevisto
      });
    };

    return (
      <div style={styles.chartWrapper}>
        <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginBottom: '0.75rem', fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: '12px', height: '3px', backgroundColor: 'var(--color-accent)', borderRadius: '1px' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>Meta Projetada ({gmdEst.toFixed(1)} kg/dia GMD)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: '12px', height: '3px', backgroundColor: 'var(--color-brand)', borderRadius: '1px' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>{titleReal}</span>
          </div>
        </div>

        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          style={{ width: '100%', height: 'auto', overflow: 'visible' }}
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.0"/>
            </linearGradient>
          </defs>

          {/* Eixo Y */}
          {yGridValues.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3" />
                <text x={paddingLeft - 8} y={y + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end">{Math.round(val).toLocaleString('pt-BR')} kg</text>
              </g>
            );
          })}

          {/* Eixo X */}
          {[0, Math.round(ciclo_dias / 2), ciclo_dias].map((dia, idx) => {
            const x = getX(dia);
            return (
              <g key={idx}>
                <line x1={x} y1={paddingTop} x2={x} y2={height - paddingBottom} stroke="rgba(255,255,255,0.03)" />
                <text x={x} y={height - paddingBottom + 12} fill="var(--text-muted)" fontSize="8" textAnchor="middle">
                  {dia === 0 ? 'Entrada' : `Dia ${dia}`}
                </text>
              </g>
            );
          })}

          {realPointsCoords.length > 1 && (
            <path d={realAreaPath} fill="url(#chartGradient)" />
          )}

          <path d={targetPath} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeDasharray="4 3" opacity="0.8" />

          {realPointsCoords.length > 1 ? (
            <path d={realLinePath} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" />
          ) : null}

          {/* Desenhar os pontos reais fixos de pesagem */}
          {realPointsCoords.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="var(--bg-secondary)" stroke="var(--color-brand)" strokeWidth="2" />
              <text 
                x={p.dias === 0 ? p.x + 8 : p.x} 
                y={p.dias === 0 ? p.y + 3 : p.y - 7} 
                fill="#fff" 
                fontSize="8" 
                fontWeight="600" 
                textAnchor={p.dias === 0 ? "start" : "middle"}
              >
                {Math.round(p.peso).toLocaleString('pt-BR')} kg
              </text>
              {p.dias > 0 && (
                <text x={p.x} y={height - paddingBottom + 20} fill="var(--text-muted)" fontSize="7" textAnchor="middle">
                  ({p.label})
                </text>
              )}
            </g>
          ))}

          {/* Linha guia vertical e marcador dinâmico que seguem o cursor */}
          {hoveredPoint && (
            <g>
              <line 
                x1={hoveredPoint.x} 
                y1={paddingTop} 
                x2={hoveredPoint.x} 
                y2={height - paddingBottom} 
                stroke="rgba(255,255,255,0.2)" 
                strokeDasharray="2 2"
                pointerEvents="none"
              />
              <circle 
                cx={hoveredPoint.x} 
                cy={getY(hoveredPoint.pesoPrevisto)} 
                r="4.5" 
                fill="var(--color-accent)" 
                pointerEvents="none"
              />
              <circle 
                cx={hoveredPoint.x} 
                cy={getY(hoveredPoint.pesoReal)} 
                r="4.5" 
                fill="var(--color-brand)" 
                pointerEvents="none"
              />
            </g>
          )}
        </svg>

        {/* Card do Tooltip Flutuante */}
        {hoveredPoint && (
          <div style={{
            position: 'absolute',
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `10%`,
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(23, 23, 37, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '6px',
            padding: '8px 12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: 10,
            pointerEvents: 'none',
            minWidth: '165px',
            backdropFilter: 'blur(4px)',
            transition: 'opacity var(--transition-fast)'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '2px', fontWeight: 600 }}>
              {hoveredPoint.dias === 0 ? 'Entrada' : `Dia ${hoveredPoint.dias}`} ({hoveredPoint.label})
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.8rem', margin: '2px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Previsto:</span>
              <strong style={{ color: 'var(--color-accent)' }}>{Math.round(hoveredPoint.pesoPrevisto).toLocaleString('pt-BR')} kg</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.8rem', margin: '2px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Realizado:</span>
              <strong style={{ color: 'var(--color-brand)' }}>{Math.round(hoveredPoint.pesoReal).toLocaleString('pt-BR')} kg</strong>
            </div>
            
            {/* Desvio */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              gap: '8px', 
              fontSize: '0.78rem', 
              marginTop: '4px',
              borderTop: '1px dotted rgba(255,255,255,0.08)',
              paddingTop: '4px',
              color: (hoveredPoint.pesoReal >= hoveredPoint.pesoPrevisto) ? 'var(--color-brand)' : 'var(--color-danger)'
            }}>
              <span>Desvio:</span>
              <strong>
                {hoveredPoint.pesoReal >= hoveredPoint.pesoPrevisto ? '+' : ''}
                {Math.round(hoveredPoint.pesoReal - hoveredPoint.pesoPrevisto).toLocaleString('pt-BR')} kg 
                ({hoveredPoint.pesoPrevisto > 0 ? ((hoveredPoint.pesoReal - hoveredPoint.pesoPrevisto) / hoveredPoint.pesoPrevisto * 100).toFixed(1) : 0}%)
              </strong>
            </div>
          </div>
        )}
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

            {/* CUSTO DE AQUISIÇÃO POR ANIMAL */}
            <div className="glass-card" style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Custo Aquisição / Cab.</span>
                <DollarSign size={20} color="var(--color-accent)" />
              </div>
              <div style={styles.cardValue}>
                R$ {activeLote.cabecas_totais > 0 ? (activeLote.custo_aquisicao / activeLote.cabecas_totais).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
              </div>
              <div style={styles.cardFooter}>
                Custo de compra unitário médio das {activeLote.cabecas_totais} cabeças do lote
              </div>
            </div>

            {/* PESO VIVO ENTRADA */}
            <div className="glass-card" style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Peso Vivo de Entrada</span>
                <Scale size={20} color="var(--color-brand)" />
              </div>
              <div style={styles.cardValue}>
                {Number(activeLote.peso_total_entrada).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} <span style={styles.unit}>kg</span>
              </div>
              <div style={styles.cardFooter}>
                Média inicial: {activeLote.peso_medio_entrada} kg/cabeça ({activeLote.cabecas_totais} cab.)
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ ...styles.panelTitle, marginBottom: 0 }}>Evolução de Peso & GMD</h3>
                
                {/* Seletores de Modo de Visualização */}
                <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.04)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <button 
                    onClick={() => setChartViewMode('lote_medio')}
                    style={{
                      padding: '0.35rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: chartViewMode === 'lote_medio' ? 'var(--color-brand)' : 'transparent',
                      color: chartViewMode === 'lote_medio' ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      border: 'none',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    Peso Médio (Cabeça)
                  </button>
                  <button 
                    onClick={() => setChartViewMode('lote_total')}
                    style={{
                      padding: '0.35rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: chartViewMode === 'lote_total' ? 'var(--color-brand)' : 'transparent',
                      color: chartViewMode === 'lote_total' ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      border: 'none',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    Peso Total (Lote)
                  </button>
                  <button 
                    onClick={() => setChartViewMode('individual')}
                    style={{
                      padding: '0.35rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: chartViewMode === 'individual' ? 'var(--color-brand)' : 'transparent',
                      color: chartViewMode === 'individual' ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      border: 'none',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    Individual (Boi)
                  </button>
                </div>
              </div>

              {/* Seletor de Animal (Apenas em modo individual) */}
              {chartViewMode === 'individual' && animais.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', width: 'fit-content' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Filtrar por brinco:</span>
                  <select
                    value={selectedAnimalIdForChart || ''}
                    onChange={(e) => setSelectedAnimalIdForChart(Number(e.target.value))}
                    style={{
                      padding: '0.35rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: '#fff',
                      fontSize: '0.8rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {animais.map((animal) => (
                      <option key={animal.id} value={animal.id}>
                        Brinco {animal.brinco} ({animal.status === 'ativo' ? '🟢 ativo' : '🔴 vendido'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

                  <button onClick={openEditLoteModal} style={styles.editLoteBtn}>
                    Editar Informações do Lote
                  </button>

                  <button onClick={handleDeleteLote} style={styles.deleteBtn}>
                    Excluir Lote Permanentemente
                  </button>
                </div>
              ) : (
                <div style={styles.fechamentoInfoBox}>
                  <div style={{
                    ...styles.successBadge,
                    backgroundColor: activeLote.status === 'encerrado' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    borderColor: activeLote.status === 'encerrado' ? 'var(--color-danger)' : 'var(--color-brand)',
                    color: activeLote.status === 'encerrado' ? 'var(--color-danger)' : 'var(--color-brand)'
                  }}>
                    {activeLote.status === 'encerrado' ? 'Consolidação de Venda (Lote Encerrado)' : 'Simulação de Fechamento'}
                  </div>
                  
                  <div style={styles.fechamentoStats}>
                    <div style={styles.statsRow}>
                      <span>Total de @ Vendidas/Projetadas:</span>
                      <strong style={{ color: '#fff' }}>
                        {fechamentoInfo ? fechamentoInfo.total_arrobas_venda.toFixed(2) : ((activeLote.peso_medio_atual * activeLote.cabecas_totais * (activeLote.rendimento_carcaca_previsto / 100)) / 15).toFixed(2)} @
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
                    {activeLote.status === 'ativo' && (
                      <button 
                        onClick={handleConfirmarFechamento}
                        style={{ ...styles.closeBtn, marginTop: 0 }}
                      >
                        Confirmar Venda (Encerrar Lote)
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setFechamentoInfo(null);
                      }} 
                      style={styles.resetBtn}
                    >
                      {activeLote.status === 'encerrado' ? 'Voltar' : 'Simular Outro Preço'}
                    </button>
                    {activeLote.status === 'ativo' && (
                      <>
                        <button onClick={openEditLoteModal} style={styles.editLoteBtn}>
                          Editar Informações do Lote
                        </button>
                        <button onClick={handleDeleteLote} style={styles.deleteBtn}>
                          Excluir Lote Permanentemente
                        </button>
                      </>
                    )}
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

      {/* MODAL PARA EDIÇÃO DO LOTE */}
      {showEditLoteModal && activeLote && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Editar Informações do Lote</h3>
            <form onSubmit={handleEditLote} style={styles.modalForm}>
              <div style={styles.inputField}>
                <label style={styles.inputLabel}>Nome do Lote:</label>
                <input 
                  type="text" 
                  value={editLoteNome}
                  onChange={(e) => setEditLoteNome(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.inputField}>
                <label style={styles.inputLabel}>Data de Entrada:</label>
                <input 
                  type="date" 
                  value={editLoteDataEntrada}
                  onChange={(e) => setEditLoteDataEntrada(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.inputField}>
                <label style={styles.inputLabel}>Custo de Aquisição (R$):</label>
                <input 
                  type="number" 
                  value={editLoteCusto}
                  onChange={(e) => setEditLoteCusto(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.inputField}>
                <label style={styles.inputLabel}>Rendimento Carcaça Previsto (%):</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={editLoteRendimento}
                  onChange={(e) => setEditLoteRendimento(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.inputField}>
                <label style={styles.inputLabel}>Ciclo Planejado (Dias):</label>
                <input 
                  type="number" 
                  value={editLoteCiclo}
                  onChange={(e) => setEditLoteCiclo(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.modalActions}>
                <button type="submit" disabled={submittingAction} style={styles.modalSubmitBtn}>
                  {submittingAction ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button type="button" onClick={() => setShowEditLoteModal(false)} style={styles.modalCancelBtn}>
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
    marginTop: '0.5rem',
    position: 'relative'
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
  editLoteBtn: {
    backgroundColor: 'transparent',
    color: 'var(--color-accent)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    border: '1px solid var(--color-accent)',
    fontSize: '0.85rem',
    transition: 'all var(--transition-fast)',
    marginTop: '0.5rem',
    marginBottom: '0.5rem'
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
