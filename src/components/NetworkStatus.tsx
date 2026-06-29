'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/dexie';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Monitorar contagem de pendências no IndexedDB
  const pendingTratosCount = useLiveQuery(() => 
    db.tratos_offline.where('sync_status').equals('pendente').count()
  ) ?? 0;

  const pendingPesagensCount = useLiveQuery(() => 
    db.pesagens_offline.where('sync_status').equals('pendente').count()
  ) ?? 0;

  const totalPending = pendingTratosCount + pendingPesagensCount;

  // Atualizar status online
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      
      const handleOnline = () => {
        setIsOnline(true);
        // Tentar sincronização automática ao detectar internet
        triggerSync();
      };
      
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Ouvir mensagens do Service Worker
      const handleServiceWorkerMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'TRIGGER_SYNC') {
          triggerSync();
        }
      };
      
      if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        if (navigator.serviceWorker) {
          navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
        }
      };
    }
  }, []);

  // Lógica de Sincronização em Lote com o Neon via Vercel Functions
  const triggerSync = async () => {
    if (isSyncing || !navigator.onLine) return;
    
    // Obter todos os registros pendentes
    const pendentesTratos = await db.tratos_offline.where('sync_status').equals('pendente').toArray();
    const pendentesPesagens = await db.pesagens_offline.where('sync_status').equals('pendente').toArray();

    if (pendentesTratos.length === 0 && pendentesPesagens.length === 0) {
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      // Chamar a rota serverless de sincronização
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tratos: pendentesTratos,
          pesagens: pendentesPesagens
        })
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor');
      }

      const result = await response.json();
      console.log('Sincronização realizada com sucesso:', result);

      // Limpar os itens sincronizados do Dexie ou marcar como sincronizados
      // Para o MVP, limparemos para poupar espaço no IndexedDB
      const tratosIds = pendentesTratos.map(t => t.id!).filter(Boolean);
      const pesagensIds = pendentesPesagens.map(p => p.id!).filter(Boolean);

      if (tratosIds.length > 0) {
        await db.tratos_offline.bulkDelete(tratosIds);
      }
      if (pesagensIds.length > 0) {
        await db.pesagens_offline.bulkDelete(pesagensIds);
      }

      // Atualizar cache de lotes e dietas após sincronização (para pegar estoque correto)
      fetchLotesEDietas();

      setSyncResult({ type: 'success', message: `${tratosIds.length + pesagensIds.length} registros sincronizados!` });
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSyncResult(null), 3000);
    } catch (error: any) {
      console.error('Erro de sincronização:', error);
      
      // Marcar registros como erro para o usuário ver
      await Promise.all([
        ...pendentesTratos.map(t => db.tratos_offline.update(t.id!, { sync_status: 'erro', erro_mensagem: error.message })),
        ...pendentesPesagens.map(p => db.pesagens_offline.update(p.id!, { sync_status: 'erro', erro_mensagem: error.message }))
      ]);

      setSyncResult({ type: 'error', message: 'Erro ao enviar dados. Ficarão no dispositivo.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Função para puxar e atualizar o IndexedDB com dados atualizados do Neon DB
  const fetchLotesEDietas = async () => {
    if (!navigator.onLine) return;
    try {
      const [resLotes, resDietas] = await Promise.all([
        fetch('/api/gmd'), // Rota que também retorna listagem de lotes ativos
        fetch('/api/tratos') // Retorna listagem de dietas e estoques
      ]);

      if (resLotes.ok && resDietas.ok) {
        const dataLotes = await resLotes.json();
        const dataDietas = await resDietas.json();

        // Atualizar IndexedDB local
        await db.lotes.clear();
        await db.lotes.bulkPut(dataLotes.lotes || []);

        await db.dietas.clear();
        await db.dietas.bulkPut(dataDietas.dietas || []);

        await db.animais.clear();
        await db.animais.bulkPut(dataDietas.animais || []);
      }
    } catch (e) {
      console.error('Erro ao buscar dados para cache offline:', e);
    }
  };

  // Puxar lotes e dietas na montagem caso esteja online
  useEffect(() => {
    if (isOnline) {
      fetchLotesEDietas();
    }
  }, [isOnline]);

  return (
    <div style={styles.container} className="glass-panel">
      <div style={styles.statusRow}>
        <div style={styles.badgeWrapper}>
          {isOnline ? (
            <span style={{ ...styles.badge, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-brand)' }}>
              <Wifi size={14} style={{ marginRight: '6px' }} />
              Dispositivo Conectado
            </span>
          ) : (
            <span style={{ ...styles.badge, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)' }}>
              <WifiOff size={14} style={{ marginRight: '6px' }} />
              Modo Offline no Curral
            </span>
          )}
        </div>

        {totalPending > 0 && (
          <div style={styles.pendingBadge}>
            <AlertTriangle size={14} color="var(--color-accent)" />
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              {totalPending} lançamento{totalPending > 1 ? 's' : ''} pendente{totalPending > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {totalPending > 0 && isOnline && (
        <button 
          onClick={triggerSync} 
          disabled={isSyncing}
          style={styles.syncButton}
        >
          {isSyncing ? (
            <>
              <RefreshCw size={14} className="animate-spin" style={{ marginRight: '6px' }} />
              Enviando ao Servidor...
            </>
          ) : (
            <>
              <RefreshCw size={14} style={{ marginRight: '6px' }} />
              Sincronizar Lote Agora
            </>
          )}
        </button>
      )}

      {syncResult && (
        <div style={{
          ...styles.resultMsg,
          backgroundColor: syncResult.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderColor: syncResult.type === 'success' ? 'var(--color-brand)' : 'var(--color-danger)'
        }}>
          {syncResult.type === 'success' ? (
            <CheckCircle size={14} color="var(--color-brand)" style={{ marginRight: '6px' }} />
          ) : (
            <AlertTriangle size={14} color="var(--color-danger)" style={{ marginRight: '6px' }} />
          )}
          <span style={{ fontSize: '0.85rem' }}>{syncResult.message}</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '0.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    margin: '1rem 0',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  badgeWrapper: {
    display: 'flex',
    alignItems: 'center'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.75rem',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.85rem',
    fontWeight: 500
  },
  pendingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: '0.25rem 0.75rem',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.85rem',
  },
  syncButton: {
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color var(--transition-fast)',
    width: '100%'
  },
  resultMsg: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    marginTop: '0.25rem'
  }
};
