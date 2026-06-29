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
    
    const da = parseInt(body.dias_adaptacao || '15');
    const ta = parseFloat(body.taxa_adaptacao || '1.0');
    const te = parseFloat(body.taxa_engorda || '2.2');
    const gmd = parseFloat(body.gmd_estimado || '1.500');
    const ciclo = parseInt(body.ciclo_dias || '90');

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
        rendimento_carcaca_previsto,
        dias_adaptacao,
        taxa_adaptacao,
        taxa_engorda,
        gmd_estimado,
        ciclo_dias
      )
      VALUES (
        ${nome_lote}, 
        CURRENT_DATE, 
        ${cabecas}, 
        ${pesoTotal}, 
        ${custoAquisicao}, 
        'ativo', 
        ${rendimento},
        ${da},
        ${ta},
        ${te},
        ${gmd},
        ${ciclo}
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

// PUT: Editar metadados do lote (nome, data de entrada, custo aquisição, rendimento previsto)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, nome_lote, data_entrada, custo_aquisicao_total, rendimento_carcaca_previsto, dias_adaptacao, taxa_adaptacao, taxa_engorda, gmd_estimado, ciclo_dias } = body;

    if (!id || !nome_lote) {
      return NextResponse.json({ error: 'ID e Nome do lote são obrigatórios.' }, { status: 400 });
    }

    const loteId = parseInt(id);
    const custo = parseFloat(custo_aquisicao_total || '0');
    const rend = parseFloat(rendimento_carcaca_previsto || '54');
    
    const da = parseInt(dias_adaptacao || '15');
    const ta = parseFloat(taxa_adaptacao || '1.0');
    const te = parseFloat(taxa_engorda || '2.2');
    const gmd = parseFloat(gmd_estimado || '1.500');
    const ciclo = parseInt(ciclo_dias || '90');

    await sql`
      UPDATE lotes 
      SET nome_lote = ${nome_lote},
          data_entrada = ${new Date(data_entrada)},
          custo_aquisicao_total = ${custo},
          rendimento_carcaca_previsto = ${rend},
          dias_adaptacao = ${da},
          taxa_adaptacao = ${ta},
          taxa_engorda = ${te},
          gmd_estimado = ${gmd},
          ciclo_dias = ${ciclo}
      WHERE id = ${loteId}
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Dados do lote atualizados com sucesso!' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao editar lote:', error);
    return NextResponse.json({ error: 'Erro ao salvar alterações do lote no Neon DB', details: error.message }, { status: 500 });
  }
}

