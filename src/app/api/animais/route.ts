import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

// POST: Registrar nova pesagem individual OU atualizar o brinco de identificação e data de entrada do animal
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { animal_id, lote_id, peso, data_pesagem, brinco, data_entrada, peso_entrada } = body;

    // Operação 0: Se NÃO houver animal_id, mas houver lote_id, criamos um novo animal do zero!
    if (!animal_id) {
      if (!lote_id || !brinco || !peso_entrada) {
        return NextResponse.json({ error: 'Lote, código do brinco e peso de entrada são obrigatórios para novo animal.' }, { status: 400 });
      }

      const loteId = parseInt(lote_id);
      const pesoEntradaNum = parseFloat(peso_entrada);
      const brincoLimpo = brinco.trim().toUpperCase();
      const dataEntradaDate = data_entrada ? new Date(data_entrada) : new Date();

      if (pesoEntradaNum <= 0) {
        return NextResponse.json({ error: 'O peso de entrada deve ser maior que zero.' }, { status: 400 });
      }

      // Verificar duplicados no mesmo lote
      const brincoExiste = await sql`
        SELECT id FROM animais WHERE lote_id = ${loteId} AND brinco = ${brincoLimpo}
      `;

      if (brincoExiste.length > 0) {
        return NextResponse.json({ error: `Já existe um animal com o brinco "${brincoLimpo}" neste lote.` }, { status: 400 });
      }

      // 1. Inserir na tabela animais
      const insertAnimalRes = await sql`
        INSERT INTO animais (lote_id, brinco, peso_entrada, status, data_entrada)
        VALUES (${loteId}, ${brincoLimpo}, ${pesoEntradaNum}, 'ativo', ${dataEntradaDate})
        RETURNING id
      `;

      const newAnimalId = insertAnimalRes[0].id;

      // 2. Inserir a pesagem inicial vinculada
      await sql`
        INSERT INTO pesagens (animal_id, peso, data_pesagem)
        VALUES (${newAnimalId}, ${pesoEntradaNum}, ${dataEntradaDate})
      `;

      // 3. Atualizar a contagem de cabeças no lote
      await sql`
        UPDATE lotes 
        SET qtd_cabecas = qtd_cabecas + 1,
            peso_total_entrada = peso_total_entrada + ${pesoEntradaNum}
        WHERE id = ${loteId}
      `;

      return NextResponse.json({
        success: true,
        message: 'Novo animal (brinco) cadastrado com sucesso no lote!',
        animal_id: newAnimalId
      }, { status: 201 });
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

// GET: Retornar histórico de pesagens de um animal específico para o gráfico
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const animalIdParam = searchParams.get('animal_id');

    if (!animalIdParam) {
      return NextResponse.json({ error: 'ID do animal é obrigatório.' }, { status: 400 });
    }

    const animalId = parseInt(animalIdParam);

    // Buscar dados do animal
    const animalResult = await sql`
      SELECT id, brinco, peso_entrada, status, data_entrada, data_saida, peso_saida, lote_id
      FROM animais 
      WHERE id = ${animalId}
    `;

    if (animalResult.length === 0) {
      return NextResponse.json({ error: 'Animal não encontrado.' }, { status: 404 });
    }

    const animal = animalResult[0];

    // Buscar histórico de pesagens do animal ordenados por data
    const pesagens = await sql`
      SELECT id, peso, data_pesagem
      FROM pesagens
      WHERE animal_id = ${animalId}
      ORDER BY data_pesagem ASC
    `;

    const dataEntrada = new Date(animal.data_entrada);

    const historico = pesagens.map((p: any) => {
      const dataPesagem = new Date(p.data_pesagem);
      const diffTime = Math.abs(dataPesagem.getTime() - dataEntrada.getTime());
      const dias = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      return {
        id: p.id,
        peso: parseFloat(p.peso),
        data: dataPesagem.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        dias: dias
      };
    });

    return NextResponse.json({ animal, historico }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao buscar histórico de pesagens do animal:', error);
    return NextResponse.json({ error: 'Erro no Neon DB', details: error.message }, { status: 500 });
  }
}

// DELETE: Excluir/Remover um animal do lote (por perda/morte ou erro de cadastro) e registrar o log
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const animalIdParam = searchParams.get('animal_id');
    const motivo = searchParams.get('motivo') || 'Não informado';

    if (!animalIdParam) {
      return NextResponse.json({ error: 'ID do animal é obrigatório.' }, { status: 400 });
    }

    const animalId = parseInt(animalIdParam);

    // 1. Garantir que a tabela de perdas_animais exista
    await sql`
      CREATE TABLE IF NOT EXISTS perdas_animais (
        id SERIAL PRIMARY KEY,
        lote_id INTEGER NOT NULL,
        nome_lote VARCHAR(255) NOT NULL,
        brinco VARCHAR(50) NOT NULL,
        peso_entrada NUMERIC(10,2) NOT NULL,
        peso_atual NUMERIC(10,2) NOT NULL,
        motivo VARCHAR(255) NOT NULL,
        data_perda TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Buscar informações detalhadas do animal e do lote antes da exclusão
    const animalResult = await sql`
      SELECT a.id, a.lote_id, a.brinco, a.peso_entrada, l.nome_lote,
             COALESCE(
               (SELECT p.peso FROM pesagens p WHERE p.animal_id = a.id ORDER BY p.data_pesagem DESC LIMIT 1),
               a.peso_entrada
             ) as peso_atual
      FROM animais a
      JOIN lotes l ON a.lote_id = l.id
      WHERE a.id = ${animalId}
    `;

    if (animalResult.length === 0) {
      return NextResponse.json({ error: 'Animal não encontrado.' }, { status: 404 });
    }

    const animal = animalResult[0];

    // 3. Registrar o log de perda na tabela 'perdas_animais'
    await sql`
      INSERT INTO perdas_animais (lote_id, nome_lote, brinco, peso_entrada, peso_atual, motivo)
      VALUES (${animal.lote_id}, ${animal.nome_lote}, ${animal.brinco}, ${animal.peso_entrada}, ${animal.peso_atual}, ${motivo})
    `;

    // 4. Deletar as pesagens associadas para manter o banco íntegro
    await sql`
      DELETE FROM pesagens 
      WHERE animal_id = ${animalId}
    `;

    // 5. Deletar o animal da tabela 'animais'
    await sql`
      DELETE FROM animais 
      WHERE id = ${animalId}
    `;

    // 6. Atualizar contagem de cabeças e peso total de entrada no lote correspondente
    await sql`
      UPDATE lotes 
      SET qtd_cabecas = GREATEST(0, qtd_cabecas - 1),
          peso_total_entrada = GREATEST(0, peso_total_entrada - ${animal.peso_entrada})
      WHERE id = ${animal.lote_id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Animal removido do lote com sucesso e registrado no histórico de perdas!'
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao excluir animal:', error);
    return NextResponse.json({ error: 'Erro ao processar exclusão no Neon DB.', details: error.message }, { status: 500 });
  }
}
