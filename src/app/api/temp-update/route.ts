import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

export async function GET(request: Request) {
  try {
    // 1. Localizar o Lote 02 (por nome ou prefixo)
    const lotes = await sql`
      SELECT id, nome_lote, qtd_cabecas, peso_total_entrada 
      FROM lotes 
      WHERE nome_lote ILIKE '%Lote 02%' OR nome_lote ILIKE '%Fêmeas%'
      LIMIT 1
    `;

    if (lotes.length === 0) {
      return NextResponse.json({ error: 'Lote 02 não localizado.' }, { status: 404 });
    }

    const loteId = lotes[0].id;
    const nomeLote = lotes[0].nome_lote;

    // Mapeamento dos pesos da foto (brinco -> peso)
    const pesosFoto: Record<number, number> = {
      61: 250, 62: 270, 63: 240, 64: 240, 65: 240, 66: 260, 67: 240, 68: 270, 
      69: 250, 70: 240, 71: 240, 72: 240, 73: 275, 74: 240, 75: 240, 76: 240, 
      77: 290, 78: 240, 79: 240, 80: 255, 81: 255, 82: 240, 83: 245, 84: 245, 
      85: 240, 86: 240, 87: 240, 88: 250, 89: 240, 90: 240, 91: 240, 92: 250, 
      93: 240, 94: 245, 95: 285, 96: 260, 97: 290, 98: 240, 99: 240, 100: 240, 
      101: 255, 102: 290, 103: 240, 104: 275
    };

    // 2. Buscar animais deste lote
    const animais = await sql`
      SELECT id, brinco, peso_entrada 
      FROM animais 
      WHERE lote_id = ${loteId}
    `;

    let totalRenomeados = 0;
    let totalPesosAtualizados = 0;
    const logs: string[] = [];

    for (const animal of animais) {
      // O brinco antigo tem o formato "LOTE02FEMIAS-XXX" ou similar
      // Vamos tentar extrair os números finais do brinco
      const match = animal.brinco.match(/\d+$/);
      if (!match) {
        logs.push(`Brinco ${animal.brinco} não possui sufixo numérico. Ignorado.`);
        continue;
      }

      const brincoNumero = parseInt(match[0]);
      const novoBrinco = String(brincoNumero);

      // Renomear o brinco para apenas o número
      await sql`
        UPDATE animais 
        SET brinco = ${novoBrinco}
        WHERE id = ${animal.id}
      `;
      totalRenomeados++;

      // Se o brinco estiver na lista da foto (61 a 104), atualizar o peso de entrada e a primeira pesagem
      if (pesosFoto[brincoNumero] !== undefined) {
        const novoPeso = pesosFoto[brincoNumero];

        // Atualizar peso de entrada na tabela animais
        await sql`
          UPDATE animais
          SET peso_entrada = ${novoPeso}
          WHERE id = ${animal.id}
        `;

        // Atualizar o primeiro registro de pesagem (geralmente criado junto com o lote)
        const pesagens = await sql`
          SELECT id FROM pesagens 
          WHERE animal_id = ${animal.id} 
          ORDER BY data_pesagem ASC, id ASC 
          LIMIT 1
        `;

        if (pesagens.length > 0) {
          await sql`
            UPDATE pesagens 
            SET peso = ${novoPeso}
            WHERE id = ${pesagens[0].id}
          `;
        } else {
          // Se por algum motivo não houver pesagem inicial, criamos uma
          await sql`
            INSERT INTO pesagens (animal_id, peso, data_pesagem)
            VALUES (${animal.id}, ${novoPeso}, CURRENT_TIMESTAMP)
          `;
        }

        totalPesosAtualizados++;
      }
    }

    // 3. Recalcular o peso total de entrada do lote
    const somaPesosRes = await sql`
      SELECT SUM(peso_entrada) as total 
      FROM animais 
      WHERE lote_id = ${loteId}
    `;
    const novoPesoTotal = parseFloat(somaPesosRes[0].total || '0');

    await sql`
      UPDATE lotes 
      SET peso_total_entrada = ${novoPesoTotal}
      WHERE id = ${loteId}
    `;

    return NextResponse.json({
      success: true,
      message: `Migração concluída para o lote "${nomeLote}"!`,
      totalRenomeados,
      totalPesosAtualizados,
      novoPesoTotalLote: novoPesoTotal,
      logs
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro na migração temporária:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
