'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, DollarSign, Calendar, Users, Scale, ArrowRight, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface Dieta {
  id: number;
  nome_dieta: string;
  custo_por_kg: number;
}

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
  dias_adaptacao: number;
  taxa_adaptacao: number;
  taxa_engorda: number;
  gmd_estimado: number;
  ciclo_dias: number;
  dieta_id: number | null;
}

interface Animal {
  id: number;
  status: string;
  peso_entrada: number;
  peso_atual: number;
  peso_saida: number | null;
  preco_venda_arroba: number | null;
  rendimento_carcaca_real: number | null;
}

export default function FluxoPage() {
  const [lotes, setLotes] = useState<LoteStats[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<string>('');
  const [activeLote, setActiveLote] = useState<LoteStats | null>(null);
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [dietas, setDietas] = useState<Dieta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingLoteDetalhe, setLoadingLoteDetalhe] = useState<boolean>(false);
  const [selectedDietaId, setSelectedDietaId] = useState<string>('');

  // Parâmetros simuláveis
  const [precoVendaProjetado, setPrecoVendaProjetado] = useState<string>('300');
  const [rendimentoCarcacaProjetado, setRendimentoCarcacaProjetado] = useState<string>('54');

  // Carregar dados iniciais
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Buscar todos os lotes e estatísticas
        const resGmd = await fetch('/api/gmd');
        if (resGmd.ok) {
          const data = await resGmd.json();
          setLotes(data.stats || []);
          if (data.stats && data.stats.length > 0) {
            setSelectedLoteId(String(data.stats[0].id));
          }
        }
        
        // Buscar todas as dietas para saber o custo por kg
        const resDieta = await fetch('/api/tratos');
        if (resDieta.ok) {
          const data = await resDieta.json();
          setDietas(data.dietas || []);
          if (data.dietas && data.dietas.length > 0) {
            setSelectedDietaId(String(data.dietas[0].id));
          }
        }
      } catch (e) {
        console.error('Erro ao buscar dados do fluxo:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Monitorar seleção de lote para atualizar parâmetros e buscar animais
  useEffect(() => {
    if (!selectedLoteId) {
      setActiveLote(null);
      setAnimais([]);
      return;
    }

    const current = lotes.find(l => String(l.id) === selectedLoteId);
    if (current) {
      setActiveLote(current);
      setPrecoVendaProjetado('300');
      setRendimentoCarcacaProjetado(String(current.rendimento_carcaca_previsto || 54));
      
      // Buscar animais do lote para cálculos reais de vendas
      const fetchLoteDetalhe = async () => {
        setLoadingLoteDetalhe(true);
        try {
          const res = await fetch(`/api/gmd?lote_id=${current.id}`);
          if (res.ok) {
            const data = await res.json();
            setAnimais(data.animais || []);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingLoteDetalhe(false);
        }
      };
      fetchLoteDetalhe();
    }
  }, [selectedLoteId, lotes]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <RefreshCw size={32} className="animate-spin" color="var(--color-brand)" />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Carregando dados financeiros...</p>
      </div>
    );
  }

  // Obter o custo por kg da dieta do lote ou selecionada
  const getCustoDieta = () => {
    const dieta = dietas.find(d => String(d.id) === selectedDietaId);
    return dieta ? Number(dieta.custo_por_kg) : 1.41;
  };

  const getNomeDieta = () => {
    const dieta = dietas.find(d => String(d.id) === selectedDietaId);
    return dieta ? dieta.nome_dieta : 'Dieta Padrão GMDTech';
  };

  // Fazer o cálculo da simulação
  const runSimulation = () => {
    if (!activeLote) return null;

    const cabecas = activeLote.cabecas_totais;
    const pesoMedioEntrada = activeLote.peso_medio_entrada;
    const custoAquisicaoTotal = activeLote.custo_aquisicao;
    const cicloDias = activeLote.ciclo_dias;
    const gmd = activeLote.gmd_estimado;
    const diasAd = activeLote.dias_adaptacao;
    const taxaAd = activeLote.taxa_adaptacao / 100;
    const taxaEng = activeLote.taxa_engorda / 100;
    const custoDieta = getCustoDieta();
    const precoArrobaVenda = parseFloat(precoVendaProjetado) || 300;
    const rendCarcaca = (parseFloat(rendimentoCarcacaProjetado) || 54) / 100;

    // Simulação dia a dia do confinamento para calcular custo de ração
    let custoAlimentarAcumulado = 0;
    let consumoRacaoTotalKg = 0;
    const custosDiarios: number[] = [];

    for (let d = 1; d <= cicloDias; d++) {
      // Peso do animal no dia d (Day 0: pesoMedioEntrada)
      const pesoMedioDia = pesoMedioEntrada + gmd * (d - 1);
      const taxa = d <= diasAd ? taxaAd : taxaEng;
      const consumoIndividualKg = pesoMedioDia * taxa;
      const consumoLoteKg = consumoIndividualKg * cabecas;
      const custoLoteDia = consumoLoteKg * custoDieta;

      consumoRacaoTotalKg += consumoLoteKg;
      custoAlimentarAcumulado += custoLoteDia;
      custosDiarios.push(custoLoteDia);
    }

    // Projeções finais
    const pesoFinalMedioProjetado = pesoMedioEntrada + gmd * cicloDias;
    const pesoCarcacaTotalKg = pesoFinalMedioProjetado * rendCarcaca * cabecas;
    const totalArrobasProjetadas = pesoCarcacaTotalKg / 15;
    const faturamentoBrutoProjetado = totalArrobasProjetadas * precoArrobaVenda;
    
    const custoTotalProjetado = custoAquisicaoTotal + custoAlimentarAcumulado;
    const lucroLiquidoProjetado = faturamentoBrutoProjetado - custoTotalProjetado;
    const lucroPorCabecaProjetado = lucroLiquidoProjetado / cabecas;
    const roiProjetado = (lucroLiquidoProjetado / custoTotalProjetado) * 100;

    // Agrupamento mensal do fluxo de caixa (a cada 30 dias)
    const fluxoMensal: { mes: number; descricao: string; entradas: number; saídas: number; saldo: number; acumulado: number }[] = [];
    
    // Mês 0: Aquisição
    fluxoMensal.push({
      mes: 0,
      descricao: 'Compra do Gado (Dia 0)',
      entradas: 0,
      saídas: custoAquisicaoTotal,
      saldo: -custoAquisicaoTotal,
      acumulado: -custoAquisicaoTotal
    });

    let acumuladoTemp = -custoAquisicaoTotal;
    const numMeses = Math.ceil(cicloDias / 30);
    
    for (let m = 1; m <= numMeses; m++) {
      const diaInicio = (m - 1) * 30;
      const diaFim = Math.min(m * 30, cicloDias);
      
      let custoMes = 0;
      for (let d = diaInicio; d < diaFim; d++) {
        custoMes += custosDiarios[d] || 0;
      }

      acumuladoTemp -= custoMes;
      
      fluxoMensal.push({
        mes: m,
        descricao: `Custo Alimentar (Dias ${diaInicio + 1} a ${diaFim})`,
        entradas: 0,
        saídas: custoMes,
        saldo: -custoMes,
        acumulado: acumuladoTemp
      });
    }

    // Mês Final: Recebimento da Venda
    acumuladoTemp += faturamentoBrutoProjetado;
    fluxoMensal.push({
      mes: numMeses + 1,
      descricao: `Faturamento Venda (${cabecas} cab.)`,
      entradas: faturamentoBrutoProjetado,
      saídas: 0,
      saldo: faturamentoBrutoProjetado,
      acumulado: acumuladoTemp
    });

    return {
      custoAlimentarAcumulado,
      consumoRacaoTotalKg,
      pesoFinalMedioProjetado,
      totalArrobasProjetadas,
      faturamentoBrutoProjetado,
      custoTotalProjetado,
      lucroLiquidoProjetado,
      lucroPorCabecaProjetado,
      roiProjetado,
      fluxoMensal
    };
  };

  // Calcular o realizado financeiro real
  const calculateRealResult = () => {
    if (!activeLote) return null;

    const custoAquisicaoReal = activeLote.custo_aquisicao;
    const custoAlimentarReal = activeLote.custo_tratos_total;
    const custoTotalReal = custoAquisicaoReal + custoAlimentarReal;

    // Faturamento das vendas reais (animais com status 'vendido')
    const faturamentoRealVendas = animais.reduce((acc, a) => {
      if (a.status === 'vendido' && a.peso_saida && a.preco_venda_arroba) {
        const rend = (a.rendimento_carcaca_real || 54) / 100;
        const arrobas = (a.peso_saida * rend) / 15;
        return acc + (arrobas * a.preco_venda_arroba);
      }
      return acc;
    }, 0);

    // Se o lote ainda tiver animais ativos, podemos simular a "Valorização Atual"
    // das cabeças restantes com base no preço de mercado digitado
    const cabecasAtivas = animais.filter(a => a.status === 'ativo');
    const precoArrobaMercado = parseFloat(precoVendaProjetado) || 300;
    const rendCarcacaProjetado = (parseFloat(rendimentoCarcacaProjetado) || 54) / 100;
    
    const faturamentoProjetadoAtivos = cabecasAtivas.reduce((acc, a) => {
      const pesoAtual = a.peso_atual || a.peso_entrada;
      const arrobas = (pesoAtual * rendCarcacaProjetado) / 15;
      return acc + (arrobas * precoArrobaMercado);
    }, 0);

    const faturamentoTotalRealEstimado = faturamentoRealVendas + faturamentoProjetadoAtivos;
    const lucroLiquidoRealEstimado = faturamentoTotalRealEstimado - custoTotalReal;
    const roiRealEstimado = (lucroLiquidoRealEstimado / (custoTotalReal || 1)) * 100;

    return {
      custoAquisicaoReal,
      custoAlimentarReal,
      custoTotalReal,
      faturamentoRealVendas,
      faturamentoTotalRealEstimado,
      lucroLiquidoRealEstimado,
      roiRealEstimado
    };
  };

  const proj = runSimulation();
  const real = calculateRealResult();

  return (
    <div style={styles.container}>
      {/* Botão de Voltar */}
      <div style={styles.backButtonWrapper}>
        <Link href="/" style={styles.backBtn}>
          <ArrowLeft size={16} /> Voltar ao Painel Geral
        </Link>
      </div>

      <div style={styles.header}>
        <h1 style={styles.title}>Fluxo de Caixa & Resultados Financeiros</h1>
        <p style={styles.subtitle}>
          Analise o fluxo financeiro planejado do confinamento e compare com as despesas reais acumuladas na nuvem.
        </p>
      </div>

      {/* Seleção do Lote e Inputs de Simulação */}
      <div className="glass-panel" style={styles.selectorPanel}>
        <div style={styles.gridForm}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Selecione o Lote para Analisar:</label>
            <select 
              value={selectedLoteId} 
              onChange={(e) => setSelectedLoteId(e.target.value)} 
              style={styles.select}
            >
              {lotes.map(l => (
                <option key={l.id} value={l.id}>
                  {l.nome_lote} ({l.status === 'ativo' ? '🟢 Ativo' : '🔴 Encerrado'})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Ração para Simulação:</label>
            <select 
              value={selectedDietaId} 
              onChange={(e) => setSelectedDietaId(e.target.value)} 
              style={styles.select}
            >
              {dietas.map(d => (
                <option key={d.id} value={d.id}>
                  {d.nome_dieta} (R$ {Number(d.custo_por_kg).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/kg)
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Preço Projetado de Venda (R$/@):</label>
            <input 
              type="text" 
              value={precoVendaProjetado} 
              onChange={(e) => setPrecoVendaProjetado(e.target.value)} 
              style={styles.input}
              placeholder="300,00"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Rendimento Carcaça Projetado (%):</label>
            <input 
              type="text" 
              value={rendimentoCarcacaProjetado} 
              onChange={(e) => setRendimentoCarcacaProjetado(e.target.value)} 
              style={styles.input}
              placeholder="54.0"
            />
          </div>
        </div>
      </div>

      {activeLote && proj && real && (
        <>
          {/* Fichas de Premissas */}
          <div style={styles.cardGrid}>
            <div className="glass-card" style={styles.cardSmall}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Cabeças Planejadas</span>
                <Users size={18} color="var(--color-brand)" />
              </div>
              <div style={styles.cardValue}>{activeLote.cabecas_totais} <span style={styles.unit}>cab.</span></div>
              <div style={styles.cardFooter}>Ativos: {activeLote.qtd_cabecas} | Vendidos: {activeLote.cabecas_vendidas}</div>
            </div>

            <div className="glass-card" style={styles.cardSmall}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Ciclo & GMD Estimado</span>
                <Calendar size={18} color="var(--color-accent)" />
              </div>
              <div style={styles.cardValue}>{activeLote.ciclo_dias} <span style={styles.unit}>dias</span></div>
              <div style={styles.cardFooter}>Meta de GMD: {activeLote.gmd_estimado.toFixed(3)} kg/dia</div>
            </div>

            <div className="glass-card" style={styles.cardSmall}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Ração Associada</span>
                <Scale size={18} color="var(--color-info)" />
              </div>
              <div style={styles.cardValue}>R$ {getCustoDieta().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<span style={styles.unit}>/kg</span></div>
              <div style={styles.cardFooter}>{getNomeDieta()}</div>
            </div>
          </div>

          {/* DRE Comparativo: Projetado vs Realizado */}
          <div className="glass-panel" style={styles.panel}>
            <h3 style={styles.panelTitle}>Demonstrativo de Resultados (DRE) do Lote</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', marginTop: '-0.75rem' }}>
              Compara o planejamento inicial do lote com a realidade dos lançamentos. 
              {activeLote.status === 'ativo' && ' (Como o lote está ativo, o Faturamento Realizado inclui as vendas efetuadas mais a valorização estimada do rebanho atual).'}
            </p>

            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Indicador Financeiro</th>
                    <th style={styles.th}>Projetado (Meta)</th>
                    <th style={styles.th}>Realizado (Atual)</th>
                    <th style={styles.th}>Desvio / Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.td}>Faturamento Bruto</td>
                    <td style={styles.td}>R$ {proj.faturamentoBrutoProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={styles.td}>R$ {real.faturamentoTotalRealEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ 
                      ...styles.td, 
                      color: (real.faturamentoTotalRealEstimado >= proj.faturamentoBrutoProjetado) ? 'var(--color-brand)' : 'var(--color-danger)',
                      fontWeight: 600
                    }}>
                      R$ {(real.faturamentoTotalRealEstimado - proj.faturamentoBrutoProjetado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td style={styles.td}>(-) Custo de Aquisição (Compra)</td>
                    <td style={styles.td}>R$ {proj.custoTotalProjetado >= 0 ? activeLote.custo_aquisicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</td>
                    <td style={styles.td}>R$ {real.custoAquisicaoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>R$ 0,00 (Fixo)</td>
                  </tr>
                  <tr>
                    <td style={styles.td}>(-) Custo Alimentar (Ração)</td>
                    <td style={styles.td}>R$ {proj.custoAlimentarAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={styles.td}>R$ {real.custoAlimentarReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ 
                      ...styles.td, 
                      color: (real.custoAlimentarReal <= proj.custoAlimentarAcumulado) ? 'var(--color-brand)' : 'var(--color-danger)',
                      fontWeight: 600
                    }}>
                      R$ {(proj.custoAlimentarAcumulado - real.custoAlimentarReal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {real.custoAlimentarReal > proj.custoAlimentarAcumulado ? ' (Gasto extra)' : ' (Economia)'}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', fontWeight: 600 }}>
                    <td style={styles.td}>Custo Total de Produção</td>
                    <td style={styles.td}>R$ {proj.custoTotalProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={styles.td}>R$ {real.custoTotalReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ 
                      ...styles.td, 
                      color: (real.custoTotalReal <= proj.custoTotalProjetado) ? 'var(--color-brand)' : 'var(--color-danger)',
                    }}>
                      R$ {(proj.custoTotalProjetado - real.custoTotalReal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}>
                    <td style={{ ...styles.td, fontSize: '1rem', color: '#fff' }}>Resultado Líquido do Lote</td>
                    <td style={{ ...styles.td, fontSize: '1rem', color: proj.lucroLiquidoProjetado >= 0 ? 'var(--color-brand)' : 'var(--color-danger)' }}>
                      R$ {proj.lucroLiquidoProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ ...styles.td, fontSize: '1rem', color: real.lucroLiquidoRealEstimado >= 0 ? 'var(--color-brand)' : 'var(--color-danger)' }}>
                      R$ {real.lucroLiquidoRealEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ 
                      ...styles.td, 
                      fontSize: '1rem', 
                      color: (real.lucroLiquidoRealEstimado >= proj.lucroLiquidoProjetado) ? 'var(--color-brand)' : 'var(--color-danger)'
                    }}>
                      R$ {(real.lucroLiquidoRealEstimado - proj.lucroLiquidoProjetado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: 600 }}>
                    <td style={styles.td}>Margem ROI (%)</td>
                    <td style={styles.td}>{proj.roiProjetado.toFixed(1)}%</td>
                    <td style={styles.td}>{real.roiRealEstimado.toFixed(1)}%</td>
                    <td style={{ 
                      ...styles.td, 
                      color: (real.roiRealEstimado >= proj.roiProjetado) ? 'var(--color-brand)' : 'var(--color-danger)'
                    }}>
                      {(real.roiRealEstimado - proj.roiProjetado).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Fluxo de Caixa Projetado Mês a Mês */}
          <div className="glass-panel" style={styles.panel}>
            <h3 style={styles.panelTitle}>Cronograma de Fluxo de Caixa Projetado</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', marginTop: '-0.75rem' }}>
              Mostra o desembolso inicial (compra), o custo alimentar previsto mês a mês e a entrada do faturamento da venda do lote ao fim do ciclo.
            </p>

            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Período</th>
                    <th style={styles.th}>Descrição da Operação</th>
                    <th style={styles.th}>Entradas (Créditos)</th>
                    <th style={styles.th}>Saídas (Débitos)</th>
                    <th style={styles.th}>Saldo do Período</th>
                    <th style={styles.th}>Saldo de Caixa Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {proj.fluxoMensal.map((item, idx) => (
                    <tr key={idx} style={{ 
                      backgroundColor: item.mes === 0 ? 'rgba(239, 68, 68, 0.02)' : item.entradas > 0 ? 'rgba(16, 185, 129, 0.02)' : 'transparent'
                    }}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>
                        {item.mes === 0 ? 'Início' : item.entradas > 0 ? 'Fim do Ciclo' : `Mês ${item.mes}`}
                      </td>
                      <td style={styles.td}>{item.descricao}</td>
                      <td style={{ ...styles.td, color: item.entradas > 0 ? 'var(--color-brand)' : 'var(--text-secondary)' }}>
                        {item.entradas > 0 ? `R$ ${item.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td style={{ ...styles.td, color: item.saídas > 0 ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                        {item.saídas > 0 ? `R$ ${item.saídas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td style={{ 
                        ...styles.td, 
                        fontWeight: 600,
                        color: item.saldo >= 0 ? 'var(--color-brand)' : 'var(--color-danger)'
                      }}>
                        R$ {item.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ 
                        ...styles.td, 
                        fontWeight: 'bold',
                        color: item.acumulado >= 0 ? 'var(--color-brand)' : 'var(--color-danger)'
                      }}>
                        R$ {item.acumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '1.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
    color: '#f3f4f6'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '70vh',
    color: '#fff'
  },
  backButtonWrapper: {
    marginBottom: '1rem'
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '0.85rem',
    transition: 'color var(--transition-fast)'
  },
  header: {
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.025em',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '0.92rem',
    color: 'var(--text-secondary)',
    maxWidth: '800px'
  },
  selectorPanel: {
    padding: '1.25rem',
    marginBottom: '1.5rem'
  },
  gridForm: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-secondary)'
  },
  select: {
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: '#fff',
    fontSize: '0.875rem',
    outline: 'none',
    cursor: 'pointer'
  },
  input: {
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: '#fff',
    fontSize: '0.875rem',
    outline: 'none'
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  cardSmall: {
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text-secondary)'
  },
  cardValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#fff'
  },
  unit: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginLeft: '0.25rem'
  },
  cardFooter: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: 'auto'
  },
  panel: {
    padding: '1.5rem',
    marginBottom: '1.5rem'
  },
  panelTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '1rem'
  },
  tableResponsive: {
    overflowX: 'auto',
    width: '100%'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.875rem'
  },
  th: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '0.8rem'
  },
  td: {
    padding: '0.85rem 1rem',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: 'var(--text-secondary)'
  }
};
