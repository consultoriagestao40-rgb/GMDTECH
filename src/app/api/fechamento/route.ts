import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lote_id, preco_venda_arroba } = body;

    if (!lote_id || !preco_venda_arroba) {
      return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
    }

    const precoVenda = parseFloat(preco_venda_arroba);
    if (precoVenda <= 0) {
      return NextResponse.json({ error: 'Preço de venda inválido' }, { status: 400 });
    }

    // 1. Obter informações completas do lote
    const loteResult = await sql`
      SELECT id, qtd_cabecas, custo_aquisicao_total, rendimento_carcaca_previsto, status
      FROM lotes 
      WHERE id = ${lote_id}
    `;

    if (loteResult.length === 0) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
    }

    const lote = loteResult[0];

    // 2. Calcular o peso médio real atual dos animais ativos do lote
    const animaisResult = await sql`
      SELECT a.id, a.peso_entrada,
             COALESCE(
               (SELECT p.peso FROM pesagens p WHERE p.animal_id = a.id ORDER BY p.data_pesagem DESC LIMIT 1),
               a.peso_entrada
             ) as peso_atual
      FROM animais a
      WHERE a.lote_id = ${lote_id} AND a.status = 'ativo'
    `;

    if (animaisResult.length === 0) {
      return NextResponse.json({ error: 'Nenhum animal ativo encontrado para este lote para poder realizar o fechamento.' }, { status: 400 });
    }

    const sumPeso = animaisResult.reduce((acc: number, cur: any) => acc + parseFloat(cur.peso_atual), 0);
    const pesoMedioVenda = sumPeso / animaisResult.length;
    const qtdCabecas = animaisResult.length;
    const rendimento = parseFloat(lote.rendimento_carcaca_previsto) / 100;

    // Fórmulas Financeiras da Pecuária de Corte:
    // Peso de carcaça total (kg) = peso médio * rendimento de carcaça * qtd cabeças
    const pesoCarcacaTotalKg = pesoMedioVenda * rendimento * qtdCabecas;
    // Total de Arrobas (@) vendidas = Peso de carcaça total / 15 (1 @ = 15kg de carne de carcaça)
    const totalArrobasVenda = pesoCarcacaTotalKg / 15;
    // Faturamento Bruto de Venda = Total de Arrobas * Preço de venda por arroba
    const faturamentoTotal = totalArrobasVenda * precoVenda;

    // 3. Buscar custo total acumulado com alimentação (tratos)
    const tratosResult = await sql`
      SELECT COALESCE(SUM(custo_total_trato), 0) as total_alimentacao
      FROM tratos 
      WHERE lote_id = ${lote_id}
    `;
    const custoTratosTotal = parseFloat(tratosResult[0].total_alimentacao);
    const custoAquisicao = parseFloat(lote.custo_aquisicao_total);
    const custoTotal = custoAquisicao + custoTratosTotal;

    // Lucro Líquido = Faturamento - (Custo Aquisição + Custos de Alimentação)
    const lucroLiquido = faturamentoTotal - custoTotal;

    // 4. Encerrar o lote no Neon DB
    await sql`
      UPDATE lotes 
      SET 
        status = 'encerrado', 
        data_saida = CURRENT_DATE, 
        preco_venda_arroba = ${precoVenda}
      WHERE id = ${lote_id}
    `;

    return NextResponse.json({
      message: 'Lote fechado com sucesso!',
      nome_lote: lote.nome_lote,
      peso_medio_venda_kg: pesoMedioVenda,
      total_arrobas_venda: totalArrobasVenda,
      faturamento_total: faturamentoTotal,
      custo_aquisicao: custoAquisicao,
      custo_tratos: custoTratosTotal,
      custo_total: custoTotal,
      lucro_liquido: lucroLiquido
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao processar fechamento do lote:', error);
    return NextResponse.json({ error: 'Erro no servidor', details: error.message }, { status: 500 });
  }
}
