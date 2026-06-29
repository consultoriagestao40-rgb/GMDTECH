import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

// POST: Criar um novo lote, gerar animais individuais de forma sequencial e suas pesagens iniciais
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      nome_lote, 
      qtd_cabecas, 
      peso_total_entrada, 
      custo_aquisicao_total, 
      rendimento_carcaca_previsto 
    } = body;

    if (!nome_lote || !qtd_cabecas || !peso_total_entrada || !custo_aquisicao_total) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const cabecas = parseInt(qtd_cabecas);
    const pesoTotal = parseFloat(peso_total_entrada);
    const custoAquisicao = parseFloat(custo_aquisicao_total);
    const rendimento = parseFloat(rendimento_carcaca_previsto || '54');

    if (cabecas <= 0 || pesoTotal <= 0 || custoAquisicao < 0) {
      return NextResponse.json({ error: 'Valores numéricos inválidos.' }, { status: 400 });
    }

    // 1. Inserir o lote na tabela 'lotes'
    const insertLoteResult = await sql`
      INSERT INTO lotes (
        nome_lote, 
        data_entrada, 
        qtd_cabecas, 
        peso_total_entrada, 
        custo_aquisicao_total, 
        status, 
        rendimento_carcaca_previsto
      )
      VALUES (
        ${nome_lote}, 
        CURRENT_DATE, 
        ${cabecas}, 
        ${pesoTotal}, 
        ${custoAquisicao}, 
        'ativo', 
        ${rendimento}
      )
      RETURNING id
    `;

    const novoLoteId = insertLoteResult[0].id;
    const pesoMedioInicial = pesoTotal / cabecas;

    // 2. Gerar individualmente as cabeças de gado na tabela 'animais' e suas pesagens iniciais
    for (let i = 1; i <= cabecas; i++) {
      // Padroniza a string de identificação do brinco, ex: "LOTE B3-001"
      const brincoTag = `${nome_lote.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${String(i).padStart(3, '0')}`;

      // Inserir animal
      const insertAnimalResult = await sql`
        INSERT INTO animais (lote_id, brinco, peso_entrada, status, data_entrada)
        VALUES (${novoLoteId}, ${brincoTag}, ${pesoMedioInicial}, 'ativo', CURRENT_DATE)
        RETURNING id
      `;
      
      const animalId = insertAnimalResult[0].id;

      // Inserir pesagem inicial vinculada à cabeça individual
      await sql`
        INSERT INTO pesagens (animal_id, data_pesagem, peso)
        VALUES (${animalId}, CURRENT_TIMESTAMP, ${pesoMedioInicial})
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Lote e cabeças individuais criados com sucesso!',
      lote_id: novoLoteId
    }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao cadastrar novo lote:', error);
    return NextResponse.json({ error: 'Erro ao salvar o lote no Neon DB', details: error.message }, { status: 500 });
  }
}

// DELETE: Excluir um lote específico (e em cascata seus tratos e pesagens)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do lote ausente.' }, { status: 400 });
    }

    const loteId = parseInt(id);

    // O cascade delete configurado no PostgreSQL cuidará de excluir os animais, tratos e pesagens
    await sql`
      DELETE FROM lotes 
      WHERE id = ${loteId}
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Lote e todos os dados associados foram excluídos com sucesso!' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao excluir lote:', error);
    return NextResponse.json({ error: 'Erro ao excluir lote no Neon DB', details: error.message }, { status: 500 });
  }
}
