import { NextResponse } from 'next/server';
import { sql } from '../../../db/neon';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loteIdParam = searchParams.get('lote_id');

  try {
    // 1. Caso de pesquisa detalhada de um lote específico (para o gráfico e tabela de animais)
    if (loteIdParam) {
      const loteId = parseInt(loteIdParam);
      
      const loteResult = await sql`
        SELECT id, nome_lote, data_entrada, peso_total_entrada, qtd_cabecas, status, rendimento_carcaca_previsto, dias_adaptacao, taxa_adaptacao, taxa_engorda, gmd_estimado, ciclo_dias
        FROM lotes 
        WHERE id = ${loteId}
      `;

      if (loteResult.length === 0) {
        return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 });
      }

      const lote = loteResult[0];
      const dataEntrada = new Date(lote.data_entrada);

      // Buscar animais individuais deste lote
      const animaisResult = await sql`
        SELECT a.id, a.brinco, a.peso_entrada, a.status, a.data_entrada, a.data_saida, a.peso_saida, a.preco_venda_arroba, a.rendimento_carcaca_real,
               COALESCE(
                 (SELECT p.peso FROM pesagens p WHERE p.animal_id = a.id ORDER BY p.data_pesagem DESC LIMIT 1),
                 a.peso_entrada
               ) as peso_atual,
               (SELECT MAX(p.data_pesagem) FROM pesagens p WHERE p.animal_id = a.id) as data_ultima_pesagem
        FROM animais a
        WHERE a.lote_id = ${loteId}
        ORDER BY a.status ASC, a.brinco ASC
      `;

      // Buscar tratos para rateio do custo de alimentação por animal
      const tratosLote = await sql`
        SELECT data_trato, custo_total_trato 
        FROM tratos 
        WHERE lote_id = ${loteId}
      `;

      const custoAquisicaoIndividual = parseFloat(lote.custo_aquisicao_total) / lote.qtd_cabecas;

      // Calcular o GMD individual e os custos acumulados de cada animal
      const animais = animaisResult.map((animal: any) => {
        const dEntrada = new Date(animal.data_entrada);
        const dFim = animal.data_saida ? new Date(animal.data_saida) : new Date();
        const diffTime = Math.abs(dFim.getTime() - dEntrada.getTime());
        const dias = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        
        const pEntrada = parseFloat(animal.peso_entrada);
        const pAtual = parseFloat(animal.peso_atual);
        const gmd = (pAtual - pEntrada) / dias;

        // Ratear custos de alimentação do lote
        let custoAlimentacaoIndividual = 0;
        tratosLote.forEach((trato: any) => {
          const dataTrato = new Date(trato.data_trato);
          // Contar quantos animais estavam ativos na data deste trato
          const activeCount = animaisResult.filter((a: any) => {
            const ent = new Date(a.data_entrada);
            const sai = a.data_saida ? new Date(a.data_saida) : null;
            return dataTrato >= ent && (!sai || dataTrato <= sai);
          }).length;

          if (activeCount > 0) {
            const sai = animal.data_saida ? new Date(animal.data_saida) : null;
            if (dataTrato >= dEntrada && (!sai || dataTrato <= sai)) {
              custoAlimentacaoIndividual += parseFloat(trato.custo_total_trato) / activeCount;
            }
          }
        });

        return {
          id: animal.id,
          brinco: animal.brinco,
          peso_entrada: pEntrada,
          peso_atual: pAtual,
          status: animal.status,
          data_entrada: animal.data_entrada,
          data_saida: animal.data_saida,
          peso_saida: animal.peso_saida ? parseFloat(animal.peso_saida) : null,
          preco_venda_arroba: animal.preco_venda_arroba ? parseFloat(animal.preco_venda_arroba) : null,
          rendimento_carcaca_real: animal.rendimento_carcaca_real ? parseFloat(animal.rendimento_carcaca_real) : null,
          dias_confinamento: dias,
          gmd: Math.max(0, gmd),
          custo_aquisicao: custoAquisicaoIndividual,
          custo_alimentacao: custoAlimentacaoIndividual,
          custo_total: custoAquisicaoIndividual + custoAlimentacaoIndividual
        };
      });

      // Buscar histórico de pesagens médias diárias do lote para desenhar o gráfico
      const pesagensResult = await sql`
        SELECT DATE(p.data_pesagem) as data_grupo, AVG(p.peso) as peso_medio
        FROM pesagens p
        JOIN animais a ON p.animal_id = a.id
        WHERE a.lote_id = ${loteId}
        GROUP BY DATE(p.data_pesagem)
        ORDER BY data_grupo ASC
      `;

      const pesoMedioEntradaLote = parseFloat(lote.peso_total_entrada) / lote.qtd_cabecas;

      const historico = pesagensResult.map((p: any) => {
        const dataGrupo = new Date(p.data_grupo);
        const diffTime = Math.abs(dataGrupo.getTime() - dataEntrada.getTime());
        const dias = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const pesoMedio = parseFloat(p.peso_medio);
        
        // GMD médio do lote nessa data
        const gmd = (pesoMedio - pesoMedioEntradaLote) / dias;

        return {
          data: dataGrupo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          peso: pesoMedio,
          gmd: Math.max(0, gmd),
          dias: dias
        };
      });

      return NextResponse.json({ lote, animais, historico }, { status: 200 });
    }

    // 2. Retornar dados agregados de todos os lotes para o Dashboard
    const lotesDb = await sql`
      SELECT id, nome_lote, qtd_cabecas, data_entrada, data_saida, peso_total_entrada, custo_aquisicao_total, status, rendimento_carcaca_previsto, dias_adaptacao, taxa_adaptacao, taxa_engorda, gmd_estimado, ciclo_dias
      FROM lotes 
      ORDER BY status ASC, data_entrada DESC
    `;

    const stats = await Promise.all(lotesDb.map(async (lote: any) => {
      const loteId = lote.id;
      const dataEntrada = new Date(lote.data_entrada);
      const dataFim = lote.data_saida ? new Date(lote.data_saida) : new Date();

      const diffTime = Math.abs(dataFim.getTime() - dataEntrada.getTime());
      const diasConfinamento = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const totalTratosRes = await sql`
        SELECT COALESCE(SUM(custo_total_trato), 0) as total_trato 
        FROM tratos 
        WHERE lote_id = ${loteId}
      `;
      const custoTratosTotal = parseFloat(totalTratosRes[0].total_trato);

      // Quantidade de animais ativos e vendidos
      const countRes = await sql`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'ativo') as ativas,
          COUNT(*) FILTER (WHERE status = 'vendido') as vendidas
        FROM animais 
        WHERE lote_id = ${loteId}
      `;
      const cabecasAtivas = parseInt(countRes[0].ativas || '0');
      const cabecasVendidas = parseInt(countRes[0].vendidas || '0');
      const totalCabecas = cabecasAtivas + cabecasVendidas;

      // Calcular Peso Médio Inicial do lote
      const pesoTotalEntrada = parseFloat(lote.peso_total_entrada);
      const pesoMedioEntrada = totalCabecas > 0 ? pesoTotalEntrada / totalCabecas : 0;

      // Buscar pesos atuais dos animais ativos
      const pesosAtivosRes = await sql`
        SELECT a.id, a.peso_entrada,
               COALESCE(
                 (SELECT p.peso FROM pesagens p WHERE p.animal_id = a.id ORDER BY p.data_pesagem DESC LIMIT 1),
                 a.peso_entrada
               ) as peso_atual
        FROM animais a
        WHERE a.lote_id = ${loteId} AND a.status = 'ativo'
      `;

      // Peso médio atual do lote (animais ativos). Se todos foram vendidos, calcula a média de peso_saida dos vendidos
      let pesoMedioAtual = 0;
      if (cabecasAtivas > 0) {
        const somaPesosAtivos = pesosAtivosRes.reduce((acc: number, cur: any) => acc + parseFloat(cur.peso_atual), 0);
        pesoMedioAtual = somaPesosAtivos / cabecasAtivas;
      } else {
        const pesosSaidaRes = await sql`
          SELECT COALESCE(AVG(peso_saida), 0) as avg_saida 
          FROM animais 
          WHERE lote_id = ${loteId} AND status = 'vendido'
        `;
        pesoMedioAtual = parseFloat(pesosSaidaRes[0].avg_saida) || pesoMedioEntrada;
      }

      // Calcular GMD Médio do Lote
      const gmdLote = (pesoMedioAtual - pesoMedioEntrada) / diasConfinamento;

      // Calcular Arrobas (@) Produzidas detalhadas
      // @ Produzida = SUM((peso_atual_ou_saida - peso_entrada) * rendimento / 15)
      const rendimentoPrevisto = parseFloat(lote.rendimento_carcaca_previsto) / 100;
      
      const animaisGmdRes = await sql`
        SELECT status, peso_entrada, peso_saida, rendimento_carcaca_real,
               COALESCE(
                 (SELECT p.peso FROM pesagens p WHERE p.animal_id = a.id ORDER BY p.data_pesagem DESC LIMIT 1),
                 a.peso_entrada
               ) as peso_atual
        FROM animais a
        WHERE a.lote_id = ${loteId}
      `;

      let arrobasProduzidasTotal = 0;
      animaisGmdRes.forEach((animal: any) => {
        const pEntrada = parseFloat(animal.peso_entrada);
        if (animal.status === 'ativo') {
          const pAtual = parseFloat(animal.peso_atual);
          const ganho = pAtual - pEntrada;
          arrobasProduzidasTotal += (ganho * rendimentoPrevisto) / 15;
        } else {
          const pSaida = parseFloat(animal.peso_saida || pEntrada);
          const ganho = pSaida - pEntrada;
          const rendReal = animal.rendimento_carcaca_real ? parseFloat(animal.rendimento_carcaca_real) / 100 : rendimentoPrevisto;
          arrobasProduzidasTotal += (ganho * rendReal) / 15;
        }
      });

      arrobasProduzidasTotal = Math.max(0.1, arrobasProduzidasTotal);

      // Custo Alimentar por @ Produzida
      const custoPorArrobaProduzida = custoTratosTotal / arrobasProduzidasTotal;
      const custoAquisicao = parseFloat(lote.custo_aquisicao_total);

      return {
        id: loteId,
        nome_lote: lote.nome_lote,
        qtd_cabecas: cabecasAtivas, // Mostrar apenas as cabeças que continuam ativas no painel
        cabecas_totais: totalCabecas,
        cabecas_vendidas: cabecasVendidas,
        data_entrada: lote.data_entrada,
        dias_confinamento: diasConfinamento,
        peso_medio_entrada: Math.round(pesoMedioEntrada),
        peso_medio_atual: pesoMedioAtual,
        peso_total_entrada: pesoTotalEntrada,
        gmd_lote: Math.max(0, gmdLote),
        custo_aquisicao: custoAquisicao,
        custo_tratos_total: custoTratosTotal,
        custo_total_lote: custoAquisicao + custoTratosTotal,
        arrobas_produzidas_total: arrobasProduzidasTotal,
        custo_por_arroba_produzida: custoPorArrobaProduzida,
        status: lote.status,
        rendimento_carcaca_previsto: parseFloat(lote.rendimento_carcaca_previsto),
        dias_adaptacao: parseInt(lote.dias_adaptacao),
        taxa_adaptacao: parseFloat(lote.taxa_adaptacao),
        taxa_engorda: parseFloat(lote.taxa_engorda),
        gmd_estimado: parseFloat(lote.gmd_estimado),
        ciclo_dias: parseInt(lote.ciclo_dias)
      };
    }));

    return NextResponse.json({ stats, lotes: lotesDb }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao buscar dados de GMD:', error);
    return NextResponse.json({ error: 'Erro no cálculo do GMD no Neon DB', details: error.message }, { status: 500 });
  }
}
