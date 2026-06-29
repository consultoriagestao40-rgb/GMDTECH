-- SCHEMA SQL PARA NEON POSTGRESQL (GMDTech - Rastreamento Individual)

-- Dropar tabelas anteriores na ordem correta para recriar
DROP TABLE IF EXISTS pesagens CASCADE;
DROP TABLE IF EXISTS tratos CASCADE;
DROP TABLE IF EXISTS animais CASCADE;
DROP TABLE IF EXISTS dietas CASCADE;
DROP TABLE IF EXISTS lotes CASCADE;

-- Tabela de Lotes
CREATE TABLE lotes (
    id SERIAL PRIMARY KEY,
    nome_lote VARCHAR(100) NOT NULL,
    data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
    qtd_cabecas INTEGER NOT NULL CHECK (qtd_cabecas > 0),
    peso_total_entrada NUMERIC(10, 2) NOT NULL CHECK (peso_total_entrada > 0),
    custo_aquisicao_total NUMERIC(12, 2) NOT NULL CHECK (custo_aquisicao_total >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado')),
    data_saida DATE,
    preco_venda_arroba NUMERIC(10, 2) CHECK (preco_venda_arroba >= 0),
    rendimento_carcaca_previsto NUMERIC(5, 2) DEFAULT 54.00 CHECK (rendimento_carcaca_previsto > 0 AND rendimento_carcaca_previsto <= 100),
    dias_adaptacao INTEGER NOT NULL DEFAULT 15,
    taxa_adaptacao NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    taxa_engorda NUMERIC(5, 2) NOT NULL DEFAULT 2.20,
    gmd_estimado NUMERIC(5, 3) NOT NULL DEFAULT 1.500,
    ciclo_dias INTEGER NOT NULL DEFAULT 90
);

-- Tabela de Dietas
CREATE TABLE dietas (
    id SERIAL PRIMARY KEY,
    nome_dieta VARCHAR(100) NOT NULL,
    custo_por_kg NUMERIC(10, 4) NOT NULL CHECK (custo_por_kg >= 0),
    estoque_kg NUMERIC(12, 2) NOT NULL DEFAULT 5000.00 CHECK (estoque_kg >= 0),
    formula_receita JSONB
);

-- Tabela de Animais (Rastreamento Individual por Brinco)
CREATE TABLE animais (
    id SERIAL PRIMARY KEY,
    lote_id INTEGER REFERENCES lotes(id) ON DELETE CASCADE,
    brinco VARCHAR(50) NOT NULL,
    peso_entrada NUMERIC(10, 2) NOT NULL CHECK (peso_entrada > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'vendido')),
    data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
    data_saida DATE,
    peso_saida NUMERIC(10, 2) CHECK (peso_saida > 0),
    preco_venda_arroba NUMERIC(10, 2) CHECK (preco_venda_arroba >= 0),
    rendimento_carcaca_real NUMERIC(5, 2) CHECK (rendimento_carcaca_real > 0 AND rendimento_carcaca_real <= 100),
    UNIQUE (lote_id, brinco)
);

-- Tabela de Tratos (Alimentação a nível de lote/cocho)
CREATE TABLE tratos (
    id SERIAL PRIMARY KEY,
    lote_id INTEGER REFERENCES lotes(id) ON DELETE CASCADE,
    dieta_id INTEGER REFERENCES dietas(id) ON DELETE RESTRICT,
    data_trato TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    kg_alimentado NUMERIC(10, 2) NOT NULL CHECK (kg_alimentado > 0),
    custo_total_trato NUMERIC(12, 2) NOT NULL CHECK (custo_total_trato >= 0)
);

-- Tabela de Pesagens (Vincular à cabeça individual)
CREATE TABLE pesagens (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER REFERENCES animais(id) ON DELETE CASCADE,
    data_pesagem TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    peso NUMERIC(10, 2) NOT NULL CHECK (peso > 0)
);

-- Índices de Performance
CREATE INDEX idx_animais_lote_id ON animais(lote_id);
CREATE INDEX idx_tratos_lote_id ON tratos(lote_id);
CREATE INDEX idx_pesagens_animal_id ON pesagens(animal_id);
CREATE INDEX idx_pesagens_data ON pesagens(data_pesagem);

-- Inserção de Dietas iniciais
INSERT INTO dietas (nome_dieta, custo_por_kg, estoque_kg) VALUES
('Ração Inicial GMD 1.2kg', 1.85, 10000.00),
('Ração Crescimento GMD 1.5kg', 2.10, 15000.00),
('Ração Terminação Pro 1.8kg', 2.45, 20000.00);

-- Inserção de um lote inicial ativo
INSERT INTO lotes (nome_lote, data_entrada, qtd_cabecas, peso_total_entrada, custo_aquisicao_total, status, rendimento_carcaca_previsto) VALUES
('Lote Curral 1 - Nelore', '2026-05-01', 5, 1500.00, 9000.00, 'ativo', 54.5);

-- Inserção de 5 animais individuais para esse lote de teste
INSERT INTO animais (lote_id, brinco, peso_entrada, status, data_entrada) VALUES
(1, 'NELORE-001', 300.00, 'ativo', '2026-05-01'),
(1, 'NELORE-002', 290.00, 'ativo', '2026-05-01'),
(1, 'NELORE-003', 310.00, 'ativo', '2026-05-01'),
(1, 'NELORE-004', 280.00, 'ativo', '2026-05-01'),
(1, 'NELORE-005', 320.00, 'ativo', '2026-05-01');

-- Inserção de pesagens iniciais para cada um dos 5 animais
INSERT INTO pesagens (animal_id, data_pesagem, peso) VALUES
(1, '2026-05-01 08:00:00-03', 300.00),
(2, '2026-05-01 08:05:00-03', 290.00),
(3, '2026-05-01 08:10:00-03', 310.00),
(4, '2026-05-01 08:15:00-03', 280.00),
(5, '2026-05-01 08:20:00-03', 320.00);

-- Tabela de Premissas de Trato (Parâmetros)
CREATE TABLE premissas_trato (
    id SERIAL PRIMARY KEY,
    dias_adaptacao INTEGER NOT NULL DEFAULT 15,
    taxa_adaptacao NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    taxa_engorda NUMERIC(5, 2) NOT NULL DEFAULT 2.20,
    gmd_estimado NUMERIC(5, 3) NOT NULL DEFAULT 1.500
);

-- Seeding inicial para premissas
INSERT INTO premissas_trato (dias_adaptacao, taxa_adaptacao, taxa_engorda, gmd_estimado)
VALUES (15, 1.00, 2.20, 1.500);

-- Tabela de Usuários e Autenticação
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin'
);

-- Seed de Usuário Administrador Inicial (Com variações para evitar bloqueio por digitação)
INSERT INTO usuarios (email, senha, role) VALUES 
('cristiano.godoi@hotmail.com', '123456', 'admin'),
('critiano.godoi@homtmail.com', '123456', 'admin')
ON CONFLICT (email) DO NOTHING;
