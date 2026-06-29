import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

export const dynamic = 'force-dynamic';

// GET: Retornar a lista de lotes ativos com seus respectivos parâmetros de premissas
export async function GET() {
  try {
    const lotes = await sql`
      SELECT id, nome_lote, dias_adaptacao, taxa_adaptacao, taxa_engorda, gmd_estimado 
      FROM lotes 
      WHERE status = 'ativo'
      ORDER BY nome_lote ASC
    `;

    return NextResponse.json({
      lotes: lotes.map((l: any) => ({
        id: l.id,
        nome_lote: l.nome_lote,
        dias_adaptacao: parseInt(l.dias_adaptacao),
        taxa_adaptacao: parseFloat(l.taxa_adaptacao),
        taxa_engorda: parseFloat(l.taxa_engorda),
        gmd_estimado: parseFloat(l.gmd_estimado)
      }))
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao buscar premissas por lote:', error);
    return NextResponse.json({ error: 'Erro ao conectar com Neon DB', details: error.message }, { status: 500 });
  }
}

// PUT: Atualizar/Salvar as premissas de um lote específico
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { lote_id, dias_adaptacao, taxa_adaptacao, taxa_engorda, gmd_estimado } = body;

    if (!lote_id || dias_adaptacao === undefined || taxa_adaptacao === undefined || taxa_engorda === undefined || gmd_estimado === undefined) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }

    const loteId = parseInt(lote_id);
    const da = parseInt(dias_adaptacao);
    const ta = parseFloat(taxa_adaptacao);
    const te = parseFloat(taxa_engorda);
    const gmd = parseFloat(gmd_estimado);

    if (da < 0 || ta < 0 || te < 0 || gmd < 0) {
      return NextResponse.json({ error: 'Os parâmetros não podem ser negativos.' }, { status: 400 });
    }

    await sql`
      UPDATE lotes
      SET dias_adaptacao = ${da},
          taxa_adaptacao = ${ta},
          taxa_engorda = ${te},
          gmd_estimado = ${gmd}
      WHERE id = ${loteId}
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Premissas do lote atualizadas com sucesso!' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao salvar premissas do lote:', error);
    return NextResponse.json({ error: 'Erro ao salvar alterações no Neon DB', details: error.message }, { status: 500 });
  }
}
