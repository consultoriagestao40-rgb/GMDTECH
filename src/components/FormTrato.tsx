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

  // Carregar dados de cache local (Dexie) de forma reativa
  const localLotes = useLiveQuery(() => db.lotes.where('status').equals('ativo').toArray()) ?? [];
  const localDietas = useLiveQuery(() => db.dietas.toArray()) ?? [];

  // Calcular o custo projetado em tempo real
  const selectedDieta = localDietas.find(d => d.id === Number(selectedDietaId));
  const custoPorKg = selectedDieta ? selectedDieta.custo_por_kg : 0;
  const estoqueDisponivel = selectedDieta ? selectedDieta.estoque_kg : 0;
  
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
        // Enviar evento de sincronização
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          await registration.sync.register('gmdtech-sync-tratos');
        } else {
          // Fallback se Background Sync não for suportado (Safari/Firefox)
          // Dispara evento de sync programático (a ser pego pelo NetworkStatus ou executado aqui)
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
            {localLotes.map((lote) => (
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
                {dieta.nome_dieta} (R$ {dieta.custo_por_kg.toFixed(2)}/kg)
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
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color var(--transition-fast)'
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
  stockInfo: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
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
