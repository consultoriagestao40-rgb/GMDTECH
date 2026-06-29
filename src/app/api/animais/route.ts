import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

// POST: Registrar nova pesagem individual OU atualizar o brinco de identificação e data de entrada do animal
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { animal_id, peso, data_pesagem, brinco, data_entrada } = body;

    if (!animal_id) {
      return NextResponse.json({ error: 'ID do animal é obrigatório.' }, { status: 400 });
    }

    const animalId = parseInt(animal_id);

    // Operação 1: Registrar nova Pesagem
    if (peso !== undefined) {
      const pesoNum = parseFloat(peso);
      if (pesoNum <= 0) {
        return NextResponse.json({ error: 'O peso deve ser maior que zero.' }, { status: 400 });
      }

      await sql`
        INSERT INTO pesagens (animal_id, peso, data_pesagem)
        VALUES (${animalId}, ${pesoNum}, ${data_pesagem ? new Date(data_pesagem) : new Date()})
      `;

      return NextResponse.json({ 
        success: true, 
        message: 'Pesagem registrada e vinculada com sucesso!' 
      }, { status: 201 });
    }

    // Operação 2: Atualizar Identificação do Brinco e/ou Data de Entrada
    if (brinco || data_entrada) {
      if (brinco && data_entrada) {
        const brincoLimpo = brinco.trim().toUpperCase();
        await sql`
          UPDATE animais 
          SET brinco = ${brincoLimpo}, data_entrada = ${new Date(data_entrada)}
          WHERE id = ${animalId}
        `;
      } else if (brinco) {
        const brincoLimpo = brinco.trim().toUpperCase();
        await sql`
          UPDATE animais 
          SET brinco = ${brincoLimpo}
          WHERE id = ${animalId}
        `;
      } else if (data_entrada) {
        await sql`
          UPDATE animais 
          SET data_entrada = ${new Date(data_entrada)}
          WHERE id = ${animalId}
        `;
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Dados do animal atualizados com sucesso!' 
      }, { status: 200 });
    }

    return NextResponse.json({ error: 'Nenhuma ação (peso, brinco ou data_entrada) informada.' }, { status: 400 });

  } catch (error: any) {
    console.error('Erro na API de animais (POST):', error);
    return NextResponse.json({ error: 'Erro ao processar alteração do animal.', details: error.message }, { status: 500 });
  }
}

// PUT: Realizar a Venda/Abate individual de uma cabeça de gado (Venda Parcial)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { animal_id, peso_saida, preco_venda_arroba, rendimento_carcaca_real } = body;

    if (!animal_id || !peso_saida || !preco_venda_arroba) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const animalId = parseInt(animal_id);
    const pSaida = parseFloat(peso_saida);
    const precoArroba = parseFloat(preco_venda_arroba);
    const rendReal = parseFloat(rendimento_carcaca_real || '54');

    if (pSaida <= 0 || precoArroba <= 0 || rendReal <= 0 || rendReal > 100) {
      return NextResponse.json({ error: 'Valores numéricos de venda inválidos.' }, { status: 400 });
    }

    // 1. Atualizar o status do animal para 'vendido'
    const updateAnimalRes = await sql`
      UPDATE animais
      SET status = 'vendido',
          data_saida = CURRENT_DATE,
          peso_saida = ${pSaida},
          preco_venda_arroba = ${precoArroba},
          rendimento_carcaca_real = ${rendReal}
      WHERE id = ${animalId}
      RETURNING lote_id
    `;

    if (updateAnimalRes.length === 0) {
      return NextResponse.json({ error: 'Animal não encontrado.' }, { status: 404 });
    }

    const loteId = updateAnimalRes[0].lote_id;

    // 2. Registrar a pesagem final na tabela de pesagens
    await sql`
      INSERT INTO pesagens (animal_id, peso, data_pesagem)
      VALUES (${animalId}, ${pSaida}, CURRENT_TIMESTAMP)
    `;

    // 3. Verificar se ainda restam animais ATIVOS no lote. 
    // Se não restarem mais animais ativos, o lote inteiro é dado como 'encerrado' automaticamente.
    const activeAnimalsRes = await sql`
      SELECT COUNT(*) as ativos_count 
      FROM animais 
      WHERE lote_id = ${loteId} AND status = 'ativo'
    `;
    const ativosCount = parseInt(activeAnimalsRes[0].ativos_count);

    let loteEncerrado = false;
    if (ativosCount === 0) {
      // Atualiza o lote para encerrado
      await sql`
        UPDATE lotes
        SET status = 'encerrado',
            data_saida = CURRENT_DATE
        WHERE id = ${loteId}
      `;
      loteEncerrado = true;
    }

    return NextResponse.json({
      success: true,
      message: loteEncerrado 
        ? 'Animal vendido com sucesso! Como este era o último animal, o lote foi encerrado automaticamente.' 
        : 'Animal vendido e retirado do lote com sucesso!',
      lote_encerrado: loteEncerrado
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao processar venda de animal:', error);
    return NextResponse.json({ error: 'Erro ao salvar venda de animal no Neon DB.', details: error.message }, { status: 500 });
  }
}
