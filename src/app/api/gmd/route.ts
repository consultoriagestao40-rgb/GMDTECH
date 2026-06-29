import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loteIdParam = searchParams.get('lote_id');

  try {
    // 1. Caso queira buscar o histórico detalhado de um lote específico (para o gráfico)
    if (loteIdParam) {
      const loteId = parseInt(loteIdParam);
      
      const loteResult = await sql`
        SELECT id, data_entrada, peso_total_entrada, qtd_cabecas 
        FROM lotes 
        WHERE id = ${loteId}
      `;

      if (loteResult.length === 0) {
        return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
      }

      const lote = loteResult[0];
      const pesoMedioEntrada = parseFloat(lote.peso_total_entrada) / lote.qtd_cabecas;
      const dataEntrada = new Date(lote.data_entrada);

      // Buscar histórico de pesagens
      const pesagensResult = await sql`
        SELECT data_pesagem, peso_medio_animal 
        FROM pesagens 
        WHERE lote_id = ${loteId} 
        ORDER BY data_pesagem ASC
      `;

      // Calcular o GMD para cada pesagem ao longo do tempo
      const historico = pesagensResult.map((pesagem: any) => {
        const dataPesagem = new Date(pesagem.data_pesagem);
        const diffTime = Math.abs(dataPesagem.getTime() - dataEntrada.getTime());
        const dias = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const pesoMedio = parseFloat(pesagem.peso_medio_animal);
        
        // GMD = (Peso Atual - Peso Entrada) / Dias no Confinamento
        const gmd = (pesoMedio - pesoMedioEntrada) / dias;

        return {
          data: dataPesagem.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          peso: pesoMedio,
          gmd: Math.max(0, gmd)
        };
      });

      return NextResponse.json({ historico }, { status: 200 });
    }

    // 2. Retornar dados agregados de todos os lotes ativos para a visualização dos cards do Dashboard
    const lotesDb = await sql`
      SELECT 
        l.id, 
        l.nome_lote, 
        l.qtd_cabecas, 
        l.data_entrada, 
        l.data_saida,
        l.peso_total_entrada, 
        l.custo_aquisicao_total, 
        l.status,
        l.rendimento_carcaca_previsto
      FROM lotes l
      ORDER BY l.status ASC, l.data_entrada DESC
    `;

    const stats = await Promise.all(lotesDb.map(async (lote: any) => {
      const loteId = lote.id;
      const qtdCabecas = lote.qtd_cabecas;
      const dataEntrada = new Date(lote.data_entrada);
      const dataFim = lote.data_saida ? new Date(lote.data_saida) : new Date();

      // Calcular dias de confinamento
      const diffTime = Math.abs(dataFim.getTime() - dataEntrada.getTime());
      const diasConfinamento = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const pesoTotalEntrada = parseFloat(lote.peso_total_entrada);
      const pesoMedioEntrada = pesoTotalEntrada / qtdCabecas;

      // Buscar custo total de tratos para este lote
      const tratosSumResult = await sql`
        SELECT COALESCE(SUM(custo_total_trato), 0) as total_trato 
        FROM tratos 
        WHERE lote_id = ${loteId}
      `;
      const custoTratosTotal = parseFloat(tratosSumResult[0].total_trato);

      // Buscar peso médio atual (última pesagem)
      const ultimaPesagemResult = await sql`
        SELECT peso_medio_animal 
        FROM pesagens 
        WHERE lote_id = ${loteId} 
        ORDER BY data_pesagem DESC 
        LIMIT 1
      `;

      const pesoMedioAtual = ultimaPesagemResult.length > 0 
        ? parseFloat(ultimaPesagemResult[0].peso_medio_animal)
        : pesoMedioEntrada;

      // Calcular GMD do Lote
      const gmdLote = (pesoMedioAtual - pesoMedioEntrada) / diasConfinamento;

      // Cálculo de Arrobas (@) Produzidas
      // Formula: (@ Produzida por animal) = (Peso Atual - Peso Entrada) * Rendimento Carcaça (%) / 15
      // Total Produzido = @ Produzida por animal * Quantidade de Cabeças
      const rendimento = parseFloat(lote.rendimento_carcaca_previsto) / 100;
      
      const arrobasEntradaTotal = (pesoTotalEntrada * rendimento) / 15;
      const arrobasAtualTotal = ((pesoMedioAtual * qtdCabecas) * rendimento) / 15;
      const arrobasProduzidasTotal = Math.max(0.1, arrobasAtualTotal - arrobasEntradaTotal);

      // Custo Alimentar por @ Produzida
      const custoPorArrobaProduzida = custoTratosTotal / arrobasProduzidasTotal;

      const custoAquisicao = parseFloat(lote.custo_aquisicao_total);

      return {
        id: loteId,
        nome_lote: lote.nome_lote,
        qtd_cabecas: qtdCabecas,
        data_entrada: lote.data_entrada,
        dias_confinamento: diasConfinamento,
        peso_medio_entrada: Math.round(pesoMedioEntrada),
        peso_medio_atual: pesoMedioAtual,
        gmd_lote: Math.max(0, gmdLote),
        custo_aquisicao: custoAquisicao,
        custo_tratos_total: custoTratosTotal,
        custo_total_lote: custoAquisicao + custoTratosTotal,
        arrobas_produzidas_total: arrobasProduzidasTotal,
        custo_por_arroba_produzida: custoPorArrobaProduzida,
        status: lote.status
      };
    }));

    return NextResponse.json({ stats, lotes: lotesDb }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao buscar dados de GMD:', error);
    return NextResponse.json({ error: 'Erro no cálculo do GMD no Neon DB', details: error.message }, { status: 500 });
  }
}
