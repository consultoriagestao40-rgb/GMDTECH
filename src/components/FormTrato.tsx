'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/dexie';
import { Scale, Wheat, Layers, Save, ShoppingBag, CheckCircle, AlertTriangle } from 'lucide-react';

export default function FormTrato() {
  // Estados do formulário
  const [selectedLoteId, setSelectedLoteId] = useState<string>('');
  const [selectedDietaId, setSelectedDietaId] = useState<string>('');
  const [kgAlimentado, setKgAlimentado] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados para a Sugestão de Trato baseada em premissas do lote
  const [sugestaoKg, setSugestaoKg] = useState<number | null>(null);
  const [totalPesoEstimado, setTotalPesoEstimado] = useState<number | null>(null);
  const [loteParams, setLoteParams] = useState<any | null>(null);
  const [calculatingSuggestion, setCalculatingSuggestion] = useState<boolean>(false);

  // Carregar dados de cache local (Dexie) de forma reativa
  const localLotes = useLiveQuery(() => db.lotes.where('status').equals('ativo').toArray()) ?? [];
  const localDietas = useLiveQuery(() => db.dietas.toArray()) ?? [];

  // Calcular o custo projetado em tempo real
  const selectedDieta = localDietas.find(d => d.id === Number(selectedDietaId));
  const custoPorKg = selectedDieta ? Number(selectedDieta.custo_por_kg) : 0;
  const estoqueDisponivel = selectedDieta ? Number(selectedDieta.estoque_kg) : 0;
  
  const kgNum = parseFloat(kgAlimentado) || 0;
  const custoProjetado = kgNum * custoPorKg;

  // Lote selecionado para cache de nome
  const selectedLote = localLotes.find(l => l.id === Number(selectedLoteId));

  // Pré-selecionar lote e dieta padrão se houver apenas um
  useEffect(() => {
    if (localLotes.length === 1 && !selectedLoteId) {
      setSelectedLoteId(localLotes[0].id.toString());
    }
    if (localDietas.length === 1 && !selectedDietaId) {
      setSelectedDietaId(localDietas[0].id.toString());
    }
  }, [localLotes, localDietas]);

  // Buscar animais do lote e calcular consumo sugerido (premissas por lote)
  useEffect(() => {
    if (!selectedLoteId) {
      setSugestaoKg(null);
      setTotalPesoEstimado(null);
      setLoteParams(null);
      return;
    }

    const calculateLoteSuggestion = async () => {
      setCalculatingSuggestion(true);
      try {
        const res = await fetch(`/api/gmd?lote_id=${selectedLoteId}`);
        if (res.ok) {
          const data = await res.json();
          const lote = data.lote;
          const animaisAtivos = (data.animais || []).filter((a: any) => a.status === 'ativo');

          if (!lote || animaisAtivos.length === 0) {
            setSugestaoKg(0);
            setTotalPesoEstimado(0);
            setLoteParams(null);
            return;
          }

          // Parâmetros de premissas específicos do lote
          const da = parseInt(lote.dias_adaptacao ?? '15');
          const ta = parseFloat(lote.taxa_adaptacao ?? '1.0');
          const te = parseFloat(lote.taxa_engorda ?? '2.2');
          const gmd = parseFloat(lote.gmd_estimado ?? '1.500');

          setLoteParams({
            dias_adaptacao: da,
            taxa_adaptacao: ta,
            taxa_engorda: te,
            gmd_estimado: gmd
          });

          let sumConsumo = 0;
          let sumPeso = 0;
          const hoje = new Date();

          animaisAtivos.forEach((animal: any) => {
            const dEntrada = new Date(animal.data_entrada);
            const diffTime = hoje.getTime() - dEntrada.getTime();
            const dias = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

            // Peso Estimado = Peso Entrada + GMD Estimado * dias confinado
            const pesoEstimado = parseFloat(animal.peso_entrada) + (gmd * dias);
            sumPeso += pesoEstimado;

            // Se dias <= dias_adaptacao, consome taxa_adaptacao. Senão, taxa_engorda
            const taxa = (dias <= da) ? ta : te;
            const consumo = pesoEstimado * (taxa / 100);
            sumConsumo += consumo;
          });

          setSugestaoKg(sumConsumo);
          setTotalPesoEstimado(sumPeso);
        } else {
          setSugestaoKg(null);
        }
      } catch (err) {
        console.error('Erro ao buscar dados do lote para sugestão:', err);
        setSugestaoKg(null);
      } finally {
        setCalculatingSuggestion(false);
      }
    };

    calculateLoteSuggestion();
  }, [selectedLoteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoteId || !selectedDietaId || !kgAlimentado) {
      setStatusMessage({ type: 'error', text: 'Preencha todos os campos do trato.' });
      return;
    }

    if (kgNum <= 0) {
      setStatusMessage({ type: 'error', text: 'A quantidade de ração deve ser maior que zero.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const dataTrato = {
        lote_id: Number(selectedLoteId),
        dieta_id: Number(selectedDietaId),
        nome_dieta: selectedDieta?.nome_dieta || 'Dieta Especial',
        nome_lote: selectedLote?.nome_lote || 'Lote',
        data_trato: new Date().toISOString(),
        kg_alimentado: kgNum,
        custo_total_trato: Number(custoProjetado.toFixed(2)),
        sync_status: 'pendente' as const
      };

      // Salvar no IndexedDB local (Dexie.js)
      await db.tratos_offline.add(dataTrato);

      // Simular atualização de estoque local para visualização imediata offline
      if (selectedDieta) {
        const novoEstoque = Math.max(0, selectedDieta.estoque_kg - kgNum);
        await db.dietas.update(selectedDieta.id, { estoque_kg: novoEstoque });
      }

      setStatusMessage({ 
        type: 'success', 
        text: `Trato salvo localmente com sucesso! Custo: R$ ${custoProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
      });

      // Limpar formulário de kg
      setKgAlimentado('');

      // Se estiver online, tentar sincronizar imediatamente no background
      if (navigator.onLine) {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          await (registration as any).sync.register('gmdtech-sync-tratos');
        } else {
          window.dispatchEvent(new Event('online'));
        }
      }

      // Limpar mensagem após 5 segundos
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error: any) {
      console.error(error);
      setStatusMessage({ type: 'error', text: 'Falha ao registrar trato localmente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.card} className="glass-panel">
      <div style={styles.header}>
        <Wheat size={24} color="var(--color-brand)" style={{ marginRight: '8px' }} />
        <h2 style={styles.title}>Lançamento de Trato</h2>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Seletor de Lote */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            <Layers size={14} style={{ marginRight: '6px' }} />
            Lote de Animais
          </label>
          <select 
            value={selectedLoteId}
            onChange={(e) => setSelectedLoteId(e.target.value)}
            style={styles.select}
            required
          >
            <option value="">Selecione o Lote...</option>
            {localLotes.slice().sort((a, b) => a.nome_lote.localeCompare(b.nome_lote, undefined, { numeric: true, sensitivity: 'base' })).map((lote) => (
              <option key={lote.id} value={lote.id}>
                {lote.nome_lote} ({lote.qtd_cabecas} cab.)
              </option>
            ))}
          </select>
        </div>

        {/* Seletor de Dieta */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            <Wheat size={14} style={{ marginRight: '6px' }} />
            Dieta / Ração Utilizada
          </label>
          <select 
            value={selectedDietaId}
            onChange={(e) => setSelectedDietaId(e.target.value)}
            style={styles.select}
            required
          >
            <option value="">Selecione a Dieta...</option>
            {localDietas.map((dieta) => (
              <option key={dieta.id} value={dieta.id}>
                {dieta.nome_dieta} (R$ {Number(dieta.custo_por_kg).toFixed(2)}/kg)
              </option>
            ))}
          </select>
          {selectedDieta && (
            <div style={styles.stockInfo}>
              <ShoppingBag size={12} style={{ marginRight: '4px' }} />
              Estoque disponível: <strong style={{ color: 'var(--color-brand)' }}>{estoqueDisponivel.toLocaleString()} kg</strong>
            </div>
          )}
        </div>

        {/* BOX DE SUGESTÃO BASEADA NAS PREMISSAS DO LOTE */}
        {selectedLoteId && (
          <div style={styles.suggestionBox}>
            {calculatingSuggestion ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Calculando sugestão com base nas premissas...
              </div>
            ) : sugestaoKg !== null && loteParams ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Sugestão de Trato para Hoje:
                  </span>
                  <strong style={{ color: 'var(--color-brand)', fontSize: '1rem' }}>
                    {sugestaoKg.toFixed(1)} kg
                  </strong>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.35, marginTop: '0.15rem' }}>
                  • Peso lote estimado: {totalPesoEstimado?.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg vivo.<br />
                  • Parâmetros do Lote: Adaptação {loteParams.taxa_adaptacao}% ({loteParams.dias_adaptacao} dias) | Engorda {loteParams.taxa_engorda}% | GMD {loteParams.gmd_estimado} kg/dia.
                </div>
                <button 
                  type="button" 
                  onClick={() => setKgAlimentado(sugestaoKg.toFixed(2))}
                  style={styles.suggestionBtn}
                >
                  Usar Quantidade Sugerida ({sugestaoKg.toFixed(1)} kg)
                </button>
              </>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ℹ️ Sugestão de consumo indisponível no momento (modo offline).
              </div>
            )}
          </div>
        )}

        {/* Input de Kilogramas */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            <Scale size={14} style={{ marginRight: '6px' }} />
            Quantidade Alimentada (kg)
          </label>
          <input 
            type="number"
            step="0.01"
            placeholder="Ex: 250.00"
            value={kgAlimentado}
            onChange={(e) => setKgAlimentado(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        {/* Custo Projetado e Resumo */}
        {kgNum > 0 && selectedDieta && (
          <div style={styles.summaryBox}>
            <div style={styles.summaryRow}>
              <span>Preço por kg da ração:</span>
              <span>R$ {custoPorKg.toFixed(2)}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Quantidade:</span>
              <span>{kgNum.toLocaleString('pt-BR')} kg</span>
            </div>
            <div style={{ ...styles.summaryRow, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontWeight: 600 }}>Custo Total do Trato:</span>
              <span style={{ color: 'var(--color-brand)', fontWeight: 700, fontSize: '1.1rem' }}>
                R$ {custoProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Botão de Envio (Tamanho Grande para Mobile) */}
        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{
            ...styles.submitButton,
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          <Save size={18} style={{ marginRight: '8px' }} />
          {isSubmitting ? 'Registrando...' : 'Registrar Trato no Curral'}
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
    maxWidth: '500px',
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
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#fff'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem'
  },
  label: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center'
  },
  select: {
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    width: '100%',
    cursor: 'pointer'
  },
  stockInfo: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
    display: 'flex',
    alignItems: 'center'
  },
  input: {
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    width: '100%'
  },
  suggestionBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    border: '1px solid rgba(16, 185, 129, 0.15)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    marginTop: '0.25rem'
  },
  suggestionBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--color-brand)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.45rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all var(--transition-fast)',
    marginTop: '0.25rem'
  },
  summaryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)'
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
