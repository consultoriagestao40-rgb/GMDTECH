import { sql } from './neon';

// Helper para converter string YYYY-MM-DD em objeto Date local
function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export async function verificarEInserirTratosAutomaticos() {
  try {
    // 1. Garantir que a coluna 'automatico' existe na tabela de tratos
    await sql`
      ALTER TABLE tratos ADD COLUMN IF NOT EXISTS automatico BOOLEAN DEFAULT FALSE;
    `;

    // 2. Buscar todos os lotes ativos
    const lotes = await sql`
      SELECT id, nome_lote, TO_CHAR(data_entrada, 'YYYY-MM-DD') as data_entrada_str, dias_adaptacao, taxa_adaptacao, taxa_engorda, gmd_estimado, ciclo_dias, qtd_cabecas, peso_total_entrada
      FROM lotes
      WHERE status = 'ativo'
    `;

    if (lotes.length === 0) return;

    // 3. Determinar a data e hora atual no fuso de Brasília (America/Sao_Paulo)
    const now = new Date();
    const formatOptionsDate = { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
    const formatOptionsTime = { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false } as const;

    const brazilDateParts = new Intl.DateTimeFormat('en-US', formatOptionsDate).format(now).split('/');
    const brazilToday = `${brazilDateParts[2]}-${brazilDateParts[0]}-${brazilDateParts[1]}`; // YYYY-MM-DD
    const brazilHour = parseInt(new Intl.DateTimeFormat('en-US', formatOptionsTime).format(now));

    // Para cada lote, verificar se há dias sem trato
    for (const lote of lotes) {
      const start = parseLocalDate(lote.data_entrada_str);
      const end = parseLocalDate(brazilToday);
      
      if (brazilHour < 17) {
        // Se ainda não passou das 17h no fuso de Brasília, o dia de hoje ainda não é elegível para inserção automática
        end.setDate(end.getDate() - 1);
      }

      if (start > end) {
        // Se a data de entrada do lote for no futuro ou hoje antes das 17h, pula
        continue;
      }

      // Buscar todos os dias que já possuem trato lançado para este lote (retornado como YYYY-MM-DD string)
      const existingTratos = await sql`
        SELECT DISTINCT TO_CHAR(data_trato AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') as data_dia
        FROM tratos
        WHERE lote_id = ${lote.id}
      `;

      const existingDates = new Set<string>(existingTratos.map((r: any) => r.data_dia));

      // Listar todos os animais cadastrados no lote
      const animais = await sql`
        SELECT id, peso_entrada, TO_CHAR(data_entrada, 'YYYY-MM-DD') as data_entrada_str, TO_CHAR(data_saida, 'YYYY-MM-DD') as data_saida_str, status
        FROM animais
        WHERE lote_id = ${lote.id}
      `;

      // Gerar a lista de datas elegíveis
      let currentDay = new Date(start);
      const missingDays: string[] = [];

      while (currentDay <= end) {
        const yyyy = currentDay.getFullYear();
        const mm = String(currentDay.getMonth() + 1).padStart(2, '0');
        const dd = String(currentDay.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        if (!existingDates.has(dateStr)) {
          missingDays.push(dateStr);
        }
        currentDay.setDate(currentDay.getDate() + 1);
      }

      if (missingDays.length === 0) {
        continue;
      }

      // Buscar última dieta usada pelo lote
      const ultimaDietaResult = await sql`
        SELECT dieta_id 
        FROM tratos 
        WHERE lote_id = ${lote.id} 
        ORDER BY data_trato DESC 
        LIMIT 1
      `;
      let dietaId = ultimaDietaResult.length > 0 ? ultimaDietaResult[0].dieta_id : null;

      if (!dietaId) {
        // Fallback: primeira dieta do sistema
        const primeiraDietaResult = await sql`
          SELECT id 
          FROM dietas 
          ORDER BY id ASC 
          LIMIT 1
        `;
        dietaId = primeiraDietaResult.length > 0 ? primeiraDietaResult[0].id : null;
      }

      if (!dietaId) {
        console.warn(`Lote ${lote.nome_lote} tem tratos automáticos pendentes, mas nenhuma dieta está cadastrada no sistema.`);
        continue;
      }

      // Buscar custo da dieta
      const dietaInfo = await sql`
        SELECT custo_por_kg 
        FROM dietas 
        WHERE id = ${dietaId}
      `;
      const custoPorKg = dietaInfo.length > 0 ? parseFloat(dietaInfo[0].custo_por_kg) : 1.5;

      // Inserir tratos para cada dia faltante
      for (const dayStr of missingDays) {
        const dayDate = parseLocalDate(dayStr);
        let totalKg = 0;

        if (animais.length > 0) {
          // Calcular com base nos animais individuais ativos no dia correspondente
          animais.forEach((animal: any) => {
            const animalEnt = parseLocalDate(animal.data_entrada_str);
            const animalSai = animal.data_saida_str ? parseLocalDate(animal.data_saida_str) : null;

            // Animal estava ativo no dia correspondente (dayDate)?
            if (dayDate >= animalEnt && (!animalSai || dayDate <= animalSai)) {
              const diffTime = dayDate.getTime() - animalEnt.getTime();
              const dias = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
              
              const gmd = parseFloat(lote.gmd_estimado ?? '1.500');
              const da = parseInt(lote.dias_adaptacao ?? '15');
              const ta = parseFloat(lote.taxa_adaptacao ?? '1.0');
              const te = parseFloat(lote.taxa_engorda ?? '2.2');

              const pesoEstimado = parseFloat(animal.peso_entrada) + (gmd * dias);
              const taxa = (dias <= da) ? ta : te;
              const consumo = pesoEstimado * (taxa / 100);
              totalKg += consumo;
            }
          });
        } else {
          // Fallback se não houver animais individuais cadastrados ainda (usa parâmetros globais do lote)
          const loteEnt = parseLocalDate(lote.data_entrada_str);
          const diffTime = dayDate.getTime() - loteEnt.getTime();
          const dias = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

          const gmd = parseFloat(lote.gmd_estimado ?? '1.500');
          const da = parseInt(lote.dias_adaptacao ?? '15');
          const ta = parseFloat(lote.taxa_adaptacao ?? '1.0');
          const te = parseFloat(lote.taxa_engorda ?? '2.2');
          const cabecas = parseInt(lote.qtd_cabecas || '1');

          const pesoMedioEntrada = parseFloat(lote.peso_total_entrada) / cabecas;
          const pesoEstimadoMedio = pesoMedioEntrada + (gmd * dias);
          const taxa = (dias <= da) ? ta : te;
          const consumoIndividual = pesoEstimadoMedio * (taxa / 100);
          totalKg = consumoIndividual * cabecas;
        }

        if (totalKg <= 0) continue;

        const custoTotal = totalKg * custoPorKg;

        // Inserir o trato automático no banco de dados Neon
        // Define o horário do trato como 17:00 no fuso de Brasília (-03)
        const timestampStr = `${dayStr} 17:00:00-03`;
        
        await sql`
          INSERT INTO tratos (lote_id, dieta_id, kg_alimentado, custo_total_trato, data_trato, automatico)
          VALUES (${lote.id}, ${dietaId}, ${totalKg}, ${custoTotal}, ${timestampStr}, true)
        `;

        // Dar baixa no estoque da ração
        await sql`
          UPDATE dietas 
          SET estoque_kg = GREATEST(0, estoque_kg - ${totalKg}) 
          WHERE id = ${dietaId}
        `;

        console.log(`[Auto-Trato] Lançamento automático gerado para Lote ${lote.nome_lote} em ${dayStr} - ${totalKg.toFixed(2)} kg`);
      }
    }
  } catch (error) {
    console.error('Erro na verificação/inserção de tratos automáticos:', error);
  }
}
