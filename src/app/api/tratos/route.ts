import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

export const dynamic = 'force-dynamic';

// GET: Retornar todas as dietas e estoques + lista de animais ativos para sincronização/exibição
export async function GET() {
  try {
    const dietas = await sql`
      SELECT id, nome_dieta, custo_por_kg, estoque_kg, formula_receita 
      FROM dietas 
      ORDER BY nome_dieta ASC
    `;
    const animais = await sql`
      SELECT id, lote_id, brinco, peso_entrada, status 
      FROM animais 
      WHERE status = 'ativo'
      ORDER BY brinco ASC
    `;
    return NextResponse.json({ dietas, animais }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar dietas e animais:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados no Neon DB', details: error.message }, { status: 500 });
  }
}

// POST: Registrar trato individual e dar baixa no estoque simulado
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lote_id, dieta_id, kg_alimentado } = body;

    if (!lote_id || !dieta_id || !kg_alimentado) {
      return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
    }

    const kg = parseFloat(kg_alimentado);
    if (kg <= 0) {
      return NextResponse.json({ error: 'Quantidade de ração inválida' }, { status: 400 });
    }

    // 1. Obter os dados da dieta (para pegar o custo por kg e estoque atual)
    const dietasResult = await sql`
      SELECT custo_por_kg, estoque_kg, nome_dieta 
      FROM dietas 
      WHERE id = ${dieta_id}
    `;

    if (dietasResult.length === 0) {
      return NextResponse.json({ error: 'Dieta não encontrada' }, { status: 404 });
    }

    const dieta = dietasResult[0];
    const custoPorKg = parseFloat(dieta.custo_por_kg);
    const estoqueAtual = parseFloat(dieta.estoque_kg);

    if (estoqueAtual < kg) {
      return NextResponse.json({ 
        error: `Estoque insuficiente para a dieta "${dieta.nome_dieta}". Disponível: ${estoqueAtual} kg.` 
      }, { status: 400 });
    }

    // 2. Calcular custo total do trato
    const custoTotalTrato = kg * custoPorKg;

    // 3. Registrar o trato e atualizar o estoque no banco de dados Neon
    // Como a API Serverless do Neon não suporta transactions no client simples de forma fácil
    // sem pool, podemos encadear as queries com segurança
    
    // Inserir Trato
    const insertResult = await sql`
      INSERT INTO tratos (lote_id, dieta_id, kg_alimentado, custo_total_trato, data_trato)
      VALUES (${lote_id}, ${dieta_id}, ${kg}, ${custoTotalTrato}, CURRENT_TIMESTAMP)
      RETURNING id, data_trato, kg_alimentado, custo_total_trato
    `;

    // Atualizar Estoque
    await sql`
      UPDATE dietas 
      SET estoque_kg = estoque_kg - ${kg} 
      WHERE id = ${dieta_id}
    `;

    return NextResponse.json({
      message: 'Trato cadastrado com sucesso e estoque atualizado!',
      trato: insertResult[0]
    }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao cadastrar trato:', error);
    return NextResponse.json({ error: 'Erro no servidor', details: error.message }, { status: 500 });
  }
}
