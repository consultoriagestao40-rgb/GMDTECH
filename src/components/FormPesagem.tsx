'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/dexie';
import { Scale, Layers, Tag, Save, CheckCircle, AlertTriangle } from 'lucide-react';

export default function FormPesagem() {
  // Carregar lotes e animais do cache local IndexedDB
  const localLotes = useLiveQuery(() => db.lotes.where('status').equals('ativo').toArray()) ?? [];
  const localAnimais = useLiveQuery(() => db.animais.where('status').equals('ativo').toArray()) ?? [];

  const [selectedLoteId, setSelectedLoteId] = useState<string>('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('');
  const [peso, setPeso] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtrar os animais pertencentes ao lote selecionado e ordenar de forma natural
  const animaisFiltrados = localAnimais
    .filter((a) => a.lote_id === Number(selectedLoteId))
    .sort((a, b) => a.brinco.localeCompare(b.brinco, undefined, { numeric: true, sensitivity: 'base' }));

  // Pré-selecionar lote se houver apenas um
  useEffect(() => {
    if (localLotes.length === 1 && !selectedLoteId) {
      setSelectedLoteId(localLotes[0].id.toString());
    }
  }, [localLotes]);

  // Resetar animal selecionado ao mudar de lote
  useEffect(() => {
    setSelectedAnimalId('');
  }, [selectedLoteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLoteId || !selectedAnimalId || !peso) {
      setStatusMessage({ type: 'error', text: 'Preencha todos os campos da pesagem.' });
      return;
    }

    const pesoNum = parseFloat(peso);
    if (isNaN(pesoNum) || pesoNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Informe um peso válido maior que zero.' });
      return;
    }

    const animalSelecionado = localAnimais.find(
      (a) => a.id === Number(selectedAnimalId)
    );

    if (!animalSelecionado) {
      setStatusMessage({ type: 'error', text: 'Animal não encontrado.' });
      return;
    }

    try {
      // Salvar a pesagem no IndexedDB local com status pendente
      await db.pesagens_offline.add({
        animal_id: animalSelecionado.id,
        brinco: animalSelecionado.brinco,
        data_pesagem: new Date().toISOString(),
        peso: pesoNum,
        sync_status: 'pendente'
      });

      // Se o Service Worker de Background Sync estiver registrado, notifica
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await (registration as any).sync.register('sync-gmdtech');
        } catch (swError) {
          console.warn('Erro ao registrar Background Sync:', swError);
        }
      }

      setStatusMessage({
        type: 'success',
        text: `Pesagem do brinco ${animalSelecionado.brinco} salva no dispositivo! Será sincronizada quando houver internet.`
      });

      // Limpar inputs
      setPeso('');
      setSelectedAnimalId('');

      // Auto limpar mensagem de sucesso
      setTimeout(() => setStatusMessage(null), 4000);

    } catch (err: any) {
      console.error('Erro ao salvar pesagem localmente:', err);
      setStatusMessage({ type: 'error', text: 'Erro ao gravar pesagem local.' });
    }
  };

  return (
    <div style={styles.card} className="glass-panel">
      <div style={styles.header}>
        <Scale size={24} color="var(--color-accent)" style={{ marginRight: '8px' }} />
        <h2 style={styles.title}>Lançar Pesagem (Offline)</h2>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Lote */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            <Layers size={14} style={{ marginRight: '6px' }} />
            Lote de Confinamento
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

        {/* Animal por Brinco */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            <Tag size={14} style={{ marginRight: '6px' }} />
            Cadeça de Gado (Brinco)
          </label>
          <select 
            value={selectedAnimalId}
            onChange={(e) => setSelectedAnimalId(e.target.value)}
            style={styles.select}
            disabled={!selectedLoteId}
            required
          >
            <option value="">
              {!selectedLoteId ? 'Selecione um lote primeiro...' : 'Selecione o Brinco...'}
            </option>
            {animaisFiltrados.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {animal.brinco}
              </option>
            ))}
          </select>
        </div>

        {/* Peso Médio/Atual */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>
            <Scale size={14} style={{ marginRight: '6px' }} />
            Peso Registrado (kg vivo)
          </label>
          <input 
            type="number"
            step="0.1"
            placeholder="Ex: 342.5"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        {/* Botão de Envio */}
        <button type="submit" style={styles.submitBtn}>
          <Save size={18} style={{ marginRight: '8px' }} />
          Salvar Pesagem Offline
        </button>
      </form>

      {/* Status Message */}
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
    borderRadius: 'var(--radius-md)',
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
    cursor: 'pointer'
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    outline: 'none'
  },
  submitBtn: {
    backgroundColor: 'var(--color-accent)',
    color: '#fff',
    padding: '0.9rem',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'background-color var(--transition-fast)',
    fontSize: '0.95rem',
    marginTop: '0.5rem'
  },
  statusMessage: {
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem'
  }
};
