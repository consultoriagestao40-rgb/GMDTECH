import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

export async function GET(request: Request) {
  try {
    // 1. Localizar o Lote 02 (por nome ou fêmeas)
    const lotes = await sql`
      SELECT id, nome_lote 
      FROM lotes 
      WHERE nome_lote ILIKE '%Lote 02%' OR nome_lote ILIKE '%Fêmeas%'
      LIMIT 1
    `;

    if (lotes.length === 0) {
      return NextResponse.json({ error: 'Lote 02 não localizado.' }, { status: 404 });
    }

    const loteId = lotes[0].id;
    const nomeLote = lotes[0].nome_lote;

    // Gerar lista de brincos de '1' a '60'
    const brincosParaExcluir: string[] = [];
    for (let i = 1; i <= 60; i++) {
      brincosParaExcluir.push(String(i));
    }

    // 2. Localizar IDs dos animais que serão deletados para limpar também as pesagens deles
    const animaisDeletar = await sql`
      SELECT id, brinco FROM animais 
      WHERE lote_id = ${loteId} AND brinco = ANY(${brincosParaExcluir})
    `;
    
    const idsDeletar = animaisDeletar.map((a: any) => a.id);

    let pesagensDeletadas = 0;
    let animaisDeletados = 0;

    if (idsDeletar.length > 0) {
      // Deletar pesagens vinculadas
      const delPesagensRes = await sql`
        DELETE FROM pesagens 
        WHERE animal_id = ANY(${idsDeletar})
      `;
      pesagensDeletadas = idsDeletar.length; // Cada animal tinha pelo menos 1 pesagem inicial

      // Deletar os animais do lote
      const delAnimaisRes = await sql`
        DELETE FROM animais 
        WHERE id = ANY(${idsDeletar})
      `;
      animaisDeletados = idsDeletar.length;
    }

    // 3. Recalcular contagem e peso total do lote com os animais restantes (61 a 104)
    const animaisRestantes = await sql`
      SELECT id, peso_entrada FROM animais 
      WHERE lote_id = ${loteId}
    `;

    const qtdRestantes = animaisRestantes.length;
    const pesoTotalRestantes = animaisRestantes.reduce((acc: number, cur: any) => acc + parseFloat(cur.peso_entrada), 0);

    // 4. Atualizar estatísticas do lote
    await sql`
      UPDATE lotes 
      SET qtd_cabecas = ${qtdRestantes},
          peso_total_entrada = ${pesoTotalRestantes}
      WHERE id = ${loteId}
    `;

    return NextResponse.json({
      success: true,
      message: `Animais de 1 a 60 excluídos com sucesso do lote "${nomeLote}"!`,
      animaisDeletados,
      pesagensDeletadas,
      cabecasRestantes: qtdRestantes,
      novoPesoTotalLote: pesoTotalRestantes
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao excluir animais de 1 a 60:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
