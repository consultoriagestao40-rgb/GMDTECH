'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('GMDTech Service Worker registrado com sucesso:', registration.scope);
            
            // Forçar atualização imediata do sw se houver nova versão
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('Novo Service Worker disponível. Recarregando...');
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.error('Falha ao registrar o Service Worker da GMDTech:', err);
          });
      });
    }
  }, []);

  return null;
}
