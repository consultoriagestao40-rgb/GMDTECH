import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Garantir que a tabela de perdas exista
    await sql`
      CREATE TABLE IF NOT EXISTS perdas_animais (
        id SERIAL PRIMARY KEY,
        lote_id INTEGER NOT NULL,
        nome_lote VARCHAR(255) NOT NULL,
        brinco VARCHAR(50) NOT NULL,
        peso_entrada NUMERIC(10,2) NOT NULL,
        peso_atual NUMERIC(10,2) NOT NULL,
        motivo VARCHAR(255) NOT NULL,
        data_perda TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Buscar extrato de Lotes
    const lotes = await sql`
      SELECT id, nome_lote, status, qtd_cabecas, peso_total_entrada, data_entrada, data_saida, custo_aquisicao_total, rendimento_carcaca_previsto
      FROM lotes
      ORDER BY status ASC, data_entrada DESC
    `;

    // 3. Buscar extrato de lançamentos de ração (Tratos)
    // Calcula as cabeças de gado aproximadas ativas no lote na data do trato
    const tratos = await sql`
      SELECT t.id, t.lote_id, t.dieta_id, t.kg_alimentado, t.custo_total_trato, t.data_trato,
             l.nome_lote, d.nome_dieta,
             COALESCE(
               (
                 SELECT COUNT(*) 
                 FROM animais a 
                 WHERE a.lote_id = t.lote_id 
                   AND a.data_entrada <= t.data_trato 
                   AND (a.status = 'ativo' OR a.data_saida > t.data_trato)
               ),
               l.qtd_cabecas
             ) as cabecas_na_data
      FROM tratos t
      JOIN lotes l ON t.lote_id = l.id
      JOIN dietas d ON t.dieta_id = d.id
      ORDER BY t.data_trato DESC
    `;

    // Formatar os tratos com médias por cabeça
    const tratosFormatados = tratos.map((trato: any) => {
      const cabecas = Math.max(1, parseInt(trato.cabecas_na_data));
      const kg = parseFloat(trato.kg_alimentado);
      const custo = parseFloat(trato.custo_total_trato);

      return {
        id: trato.id,
        lote_id: trato.lote_id,
        nome_lote: trato.nome_lote,
        nome_dieta: trato.nome_dieta,
        data: trato.data_trato,
        quantidade_total: kg,
        quantidade_media: kg / cabecas,
        custo_total: custo,
        custo_medio: custo / cabecas,
        cabecas_na_data: cabecas
      };
    });

    // 4. Buscar extrato de perdas
    const perdas = await sql`
      SELECT id, lote_id, nome_lote, brinco, peso_entrada, peso_atual, motivo, data_perda
      FROM perdas_animais
      ORDER BY data_perda DESC
    `;

    return NextResponse.json({
      lotes,
      tratos: tratosFormatados,
      perdas
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro na API de extrato:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do extrato no Neon DB', details: error.message }, { status: 500 });
  }
}
