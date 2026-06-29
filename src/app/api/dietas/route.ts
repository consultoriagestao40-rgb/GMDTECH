import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

export const dynamic = 'force-dynamic';

// POST: Salvar nova ração formulada no Neon PostgreSQL
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome_dieta, custo_por_kg, estoque_kg, formula_receita } = body;

    if (!nome_dieta || custo_por_kg === undefined || estoque_kg === undefined) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const custo = parseFloat(custo_por_kg);
    const estoque = parseFloat(estoque_kg);

    if (custo < 0 || estoque < 0) {
      return NextResponse.json({ error: 'Valores numéricos inválidos.' }, { status: 400 });
    }

    const formulaJson = formula_receita ? JSON.stringify(formula_receita) : null;

    // Inserir a nova dieta formulada
    const insertResult = await sql`
      INSERT INTO dietas (nome_dieta, custo_por_kg, estoque_kg, formula_receita)
      VALUES (${nome_dieta}, ${custo}, ${estoque}, ${formulaJson})
      RETURNING id, nome_dieta, custo_por_kg, estoque_kg, formula_receita
    `;

    return NextResponse.json({
      success: true,
      message: 'Ração formulada salva com sucesso na nuvem!',
      dieta: insertResult[0]
    }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao salvar dieta formulada:', error);
    return NextResponse.json({ error: 'Erro ao salvar ração no Neon DB', details: error.message }, { status: 500 });
  }
}

// PUT: Editar/Atualizar fórmula de ração existente
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, nome_dieta, custo_por_kg, estoque_kg, formula_receita } = body;

    if (!id || !nome_dieta || custo_por_kg === undefined || estoque_kg === undefined) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const custo = parseFloat(custo_por_kg);
    const estoque = parseFloat(estoque_kg);

    if (custo < 0 || estoque < 0) {
      return NextResponse.json({ error: 'Valores numéricos inválidos.' }, { status: 400 });
    }

    const formulaJson = formula_receita ? JSON.stringify(formula_receita) : null;

    await sql`
      UPDATE dietas
      SET nome_dieta = ${nome_dieta},
          custo_por_kg = ${custo},
          estoque_kg = ${estoque},
          formula_receita = ${formulaJson}
      WHERE id = ${parseInt(id)}
    `;

    return NextResponse.json({
      success: true,
      message: 'Dados da ração atualizados com sucesso!'
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao editar dieta formulada:', error);
    return NextResponse.json({ error: 'Erro ao editar ração no Neon DB', details: error.message }, { status: 500 });
  }
}
