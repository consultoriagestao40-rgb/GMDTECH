import { neon } from '@neondatabase/serverless';

// Exporta o cliente Neon configurado com a variável de ambiente DATABASE_URL
// Se a variável não estiver definida, lança um aviso ou usa um fallback para compilação segura
const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl) {
  console.warn('AVISO: DATABASE_URL não está configurada. A conexão com o Neon DB falhará.');
}

export const sql = neon(databaseUrl);
