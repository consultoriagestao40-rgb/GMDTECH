import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

// POST: Sincronização em lote (Batch Sync) de tratos e pesagens offline
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tratos = [], pesagens = [] } = body;

    console.log(`[Sync Route] Recebendo lote com ${tratos.length} tratos e ${pesagens.length} pesagens.`);

    let sincronizadosTratos = 0;
    let sincronizadasPesagens = 0;

    // 1. Processar Tratos Offline
    for (const trato of tratos) {
      const { lote_id, dieta_id, kg_alimentado, custo_total_trato, data_trato } = trato;

      if (!lote_id || !dieta_id || !kg_alimentado) continue;

      const kg = parseFloat(kg_alimentado);
      const custo = parseFloat(custo_total_trato);
      const dataIso = data_trato ? new Date(data_trato) : new Date();

      // Inserir o trato no PostgreSQL com a data original registrada no curral
      await sql`
        INSERT INTO tratos (lote_id, dieta_id, kg_alimentado, custo_total_trato, data_trato)
        VALUES (${lote_id}, ${dieta_id}, ${kg}, ${custo}, ${dataIso})
      `;

      // Atualizar o estoque físico de ração no Neon
      await sql`
        UPDATE dietas 
        SET estoque_kg = GREATEST(0, estoque_kg - ${kg}) 
        WHERE id = ${dieta_id}
      `;

      sincronizadosTratos++;
    }

    // 2. Processar Pesagens Offline
    for (const pesagem of pesagens) {
      const { animal_id, peso, data_pesagem } = pesagem;

      if (!animal_id || !peso) continue;

      const pesoNum = parseFloat(peso);
      const dataIso = data_pesagem ? new Date(data_pesagem) : new Date();

      // Inserir a pesagem no PostgreSQL vinculada ao animal
      await sql`
        INSERT INTO pesagens (animal_id, data_pesagem, peso)
        VALUES (${animal_id}, ${dataIso}, ${pesoNum})
      `;

      sincronizadasPesagens++;
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronização em lote concluída!',
      tratos_sincronizados: sincronizadosTratos,
      pesagens_sincronizadas: sincronizadasPesagens
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro na sincronização em lote:', error);
    return NextResponse.json({ 
      error: 'Erro crítico ao salvar dados de sincronização', 
      details: error.message 
    }, { status: 500 });
  }
}
