-- SCHEMA SQL PARA NEON POSTGRESQL (GMDTech)

-- Habilitar extensão UUID caso necessário (opcional, usaremos SERIAL para simplificar o MVP)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Lotes
CREATE TABLE IF NOT EXISTS lotes (
    id SERIAL PRIMARY KEY,
    nome_lote VARCHAR(100) NOT NULL,
    data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
    qtd_cabecas INTEGER NOT NULL CHECK (qtd_cabecas > 0),
    peso_total_entrada NUMERIC(10, 2) NOT NULL CHECK (peso_total_entrada > 0), -- peso total do lote na entrada em kg
    custo_aquisicao_total NUMERIC(12, 2) NOT NULL CHECK (custo_aquisicao_total >= 0), -- custo total de aquisição em R$
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado')),
    data_saida DATE,
    preco_venda_arroba NUMERIC(10, 2) CHECK (preco_venda_arroba >= 0), -- R$ por @ na venda
    rendimento_carcaca_previsto NUMERIC(5, 2) DEFAULT 54.00 CHECK (rendimento_carcaca_previsto > 0 AND rendimento_carcaca_previsto <= 100) -- % de rendimento (ex: 54%)
);

-- Tabela de Dietas (Estoque simulado incluído)
CREATE TABLE IF NOT EXISTS dietas (
    id SERIAL PRIMARY KEY,
    nome_dieta VARCHAR(100) NOT NULL,
    custo_por_kg NUMERIC(10, 4) NOT NULL CHECK (custo_por_kg >= 0), -- R$ por kg da dieta
    estoque_kg NUMERIC(12, 2) NOT NULL DEFAULT 5000.00 CHECK (estoque_kg >= 0) -- Estoque simulado em kg
);

-- Tabela de Tratos
CREATE TABLE IF NOT EXISTS tratos (
    id SERIAL PRIMARY KEY,
    lote_id INTEGER REFERENCES lotes(id) ON DELETE CASCADE,
    dieta_id INTEGER REFERENCES dietas(id) ON DELETE RESTRICT,
    data_trato TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    kg_alimentado NUMERIC(10, 2) NOT NULL CHECK (kg_alimentado > 0),
    custo_total_trato NUMERIC(12, 2) NOT NULL CHECK (custo_total_trato >= 0) -- calculado: kg_alimentado * custo_por_kg
);

-- Tabela de Pesagens (Peso médio do animal no lote)
CREATE TABLE IF NOT EXISTS pesagens (
    id SERIAL PRIMARY KEY,
    lote_id INTEGER REFERENCES lotes(id) ON DELETE CASCADE,
    data_pesagem TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    peso_medio_animal NUMERIC(10, 2) NOT NULL CHECK (peso_medio_animal > 0) -- peso médio do animal em kg
);

-- Índices para performance nas consultas do Dashboard e sincronização
CREATE INDEX IF NOT EXISTS idx_tratos_lote_id ON tratos(lote_id);
CREATE INDEX IF NOT EXISTS idx_pesagens_lote_id ON pesagens(lote_id);
CREATE INDEX IF NOT EXISTS idx_tratos_data ON tratos(data_trato);
CREATE INDEX IF NOT EXISTS idx_pesagens_data ON pesagens(data_pesagem);

-- Inserção de dados iniciais para testes (Dietas Padrão)
INSERT INTO dietas (nome_dieta, custo_por_kg, estoque_kg) VALUES
('Ração Inicial GMD 1.2kg', 1.85, 10000.00),
('Ração Crescimento GMD 1.5kg', 2.10, 15000.00),
('Ração Terminação Pro 1.8kg', 2.45, 20000.00)
ON CONFLICT DO NOTHING;

-- Inserção de um lote inicial ativo para testes
INSERT INTO lotes (nome_lote, data_entrada, qtd_cabecas, peso_total_entrada, custo_aquisicao_total, status, rendimento_carcaca_previsto) VALUES
('Lote Curral 1 - Nelore', '2026-05-01', 100, 30000.00, 180000.00, 'ativo', 54.5)
ON CONFLICT DO NOTHING;

-- Inserção de pesagem inicial do lote (peso médio de entrada: 300kg por animal)
INSERT INTO pesagens (lote_id, data_pesagem, peso_medio_animal) VALUES
(1, '2026-05-01 08:00:00-03', 300.00)
ON CONFLICT DO NOTHING;
