import os
import psycopg2
import sys

# URL de Conexão Unpooled recomendada para migrações DDL
DATABASE_URL = "postgresql://neondb_owner:npg_efFX6NTRyoY9@ep-restless-shadow-aiiyr4sp.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
SCHEMA_FILE = "/Users/cristianosilva/GMDTech/src/db/schema.sql"

def run_migration():
    print("Iniciando migração do banco de dados Neon...")
    
    # 1. Ler o arquivo de schema
    if not os.path.exists(SCHEMA_FILE):
        print(f"Erro: Arquivo de schema não encontrado em {SCHEMA_FILE}")
        sys.exit(1)
        
    with open(SCHEMA_FILE, 'r', encoding='utf-8') as f:
        sql_commands = f.read()

    # 2. Conectar ao Neon e executar o schema
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("Conectado ao Neon PostgreSQL. Executando comandos SQL...")
        cursor.execute(sql_commands)
        
        print("Tabelas criadas e dados de teste (seed) inseridos com sucesso!")
        
    except Exception as e:
        print(f"Erro ao executar a migração no Neon: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            print("Conexão com o banco encerrada.")

if __name__ == "__main__":
    run_migration()
