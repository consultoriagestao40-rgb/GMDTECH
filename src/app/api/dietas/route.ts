import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

export const dynamic = 'force-dynamic';

// POST: Salvar nova ração formulada no Neon PostgreSQL
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome_dieta, custo_por_kg, estoque_kg } = body;

    if (!nome_dieta || custo_por_kg === undefined || estoque_kg === undefined) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const custo = parseFloat(custo_por_kg);
    const estoque = parseFloat(estoque_kg);

    if (custo < 0 || estoque < 0) {
      return NextResponse.json({ error: 'Valores numéricos inválidos.' }, { status: 400 });
    }

    // Inserir a nova dieta formulada
    const insertResult = await sql`
      INSERT INTO dietas (nome_dieta, custo_por_kg, estoque_kg)
      VALUES (${nome_dieta}, ${custo}, ${estoque})
      RETURNING id, nome_dieta, custo_por_kg, estoque_kg
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
