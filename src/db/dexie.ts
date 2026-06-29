import Dexie, { type Table } from 'dexie';

// Interfaces de tipos para o banco local
export interface LocalLote {
  id: number;
  nome_lote: string;
  qtd_cabecas: number;
  status: 'ativo' | 'encerrado';
  peso_total_entrada: number;
}

export interface LocalDieta {
  id: number;
  nome_dieta: string;
  custo_por_kg: number;
  estoque_kg: number;
}

export interface LocalTrato {
  id?: number;
  lote_id: number;
  dieta_id: number;
  nome_dieta: string; // cache do nome para exibição offline
  nome_lote: string; // cache do nome
  data_trato: string;
  kg_alimentado: number;
  custo_total_trato: number;
  sync_status: 'pendente' | 'sincronizado' | 'erro';
  erro_mensagem?: string;
}

export interface LocalPesagem {
  id?: number;
  lote_id: number;
  nome_lote: string; // cache do nome
  data_pesagem: string;
  peso_medio_animal: number;
  sync_status: 'pendente' | 'sincronizado' | 'erro';
  erro_mensagem?: string;
}

// Configuração do Banco de Dados Local Dexie.js
class GMDTechDatabase extends Dexie {
  lotes!: Table<LocalLote, number>;
  dietas!: Table<LocalDieta, number>;
  tratos_offline!: Table<LocalTrato, number>;
  pesagens_offline!: Table<LocalPesagem, number>;

  constructor() {
    super('GMDTechLocalDB');
    this.version(1).stores({
      lotes: 'id, nome_lote, status',
      dietas: 'id, nome_dieta',
      tratos_offline: '++id, lote_id, sync_status',
      pesagens_offline: '++id, lote_id, sync_status'
    });
  }
}

export const db = new GMDTechDatabase();
