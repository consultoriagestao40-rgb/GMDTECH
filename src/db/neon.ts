import { neon } from '@neondatabase/serverless';

// String de conexão direta do Neon PostgreSQL como fallback para deploy imediato via Git
const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_efFX6NTRyoY9@ep-restless-shadow-aiiyr4sp-pooler.c-4.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

export const sql = neon(databaseUrl);

