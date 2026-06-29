'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, Plus, Trash2, Save, CheckCircle, AlertTriangle, Scale, DollarSign, RefreshCw } from 'lucide-react';

interface Ingrediente {
  id: string;
  nome: string;
  custoPorKg: number;
  porcentagem: number;
}

interface Dieta {
  id: number;
  nome_dieta: string;
  custo_por_kg: number;
  estoque_kg: number;
  formula_receita: any;
}

export default function FormFormulacao() {
  const router = useRouter();

  // Ingredientes padrão para iniciar o simulador
  const defaultIngredients: Ingrediente[] = [
    { id: '1', nome: 'Milho Moído', custoPorKg: 1.60, porcentagem: 70 },
    { id: '2', nome: 'Farelo de Soja', custoPorKg: 2.50, porcentagem: 20 },
    { id: '3', nome: 'Núcleo Mineral Confinamento', custoPorKg: 5.00, porcentagem: 8 },
    { id: '4', nome: 'Uréia Pecuária', custoPorKg: 4.50, porcentagem: 2 }
  ];

  const [ingredientes, setIngredientes] = useState<Ingrediente[]>(defaultIngredients);
  
  // Estados para salvar a Ração formulada
  const [nomeRacao, setNomeRacao] = useState<string>('Ração Customizada 1.5kg');
  const [estoqueInicial, setEstoqueInicial] = useState<string>('5000');
  
  // Lista de dietas salvas no banco
  const [savedDietas, setSavedDietas] = useState<Dieta[]>([]);
  const [selectedDietId, setSelectedDietId] = useState<string>('');
  const [loadingDietas, setLoadingDietas] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar dietas salvas no Neon DB
  const loadSavedDietas = async () => {
    setLoadingDietas(true);
    try {
      const res = await fetch('/api/tratos');
      if (res.ok) {
        const data = await res.json();
        setSavedDietas(data.dietas || []);
      }
    } catch (e) {
      console.error('Erro ao buscar dietas:', e);
    } finally {
      setLoadingDietas(false);
    }
  };

  useEffect(() => {
    loadSavedDietas();
  }, []);

  // Cálculos dinâmicos
  const totalPorcentagem = ingredientes.reduce((acc, cur) => acc + cur.porcentagem, 0);
  
  // Custo por kg da ração formulada
  const custoPorKg = ingredientes.reduce(
    (acc, cur) => acc + cur.custoPorKg * (cur.porcentagem / 100),
    0
  );

  // Custo por saco de 40 kg (padrão de comércio no Brasil)
  const custoPorSaco40kg = custoPorKg * 40;

  // Selecionar uma ração cadastrada
  const handleSelectDiet = (id: string) => {
    setSelectedDietId(id);
    if (!id) {
      setIngredientes(defaultIngredients);
      setNomeRacao('Nova Ração Formulada');
      setEstoqueInicial('5000');
      return;
    }
    const diet = savedDietas.find(d => String(d.id) === id);
    if (diet) {
      setNomeRacao(diet.nome_dieta);
      setEstoqueInicial(String(diet.estoque_kg));
      if (diet.formula_receita) {
        try {
          const parsed = typeof diet.formula_receita === 'string' 
            ? JSON.parse(diet.formula_receita) 
            : diet.formula_receita;
          if (Array.isArray(parsed)) {
            setIngredientes(parsed);
            return;
          }
        } catch (e) {
          console.error('Erro ao fazer parse da receita:', e);
        }
      }
      // Caso não tenha receita salva (padrões sementes)
      setIngredientes([
        { id: '1', nome: 'Dieta Base', custoPorKg: Number(diet.custo_por_kg), porcentagem: 100 }
      ]);
    }
  };

  const handleResetToNew = () => {
    handleSelectDiet('');
  };

  // Adicionar nova linha de ingrediente
  const handleAddIngredient = () => {
    const newId = String(Date.now());
    setIngredientes([
      ...ingredientes,
      { id: newId, nome: 'Novo Ingrediente', custoPorKg: 1.00, porcentagem: 0 }
    ]);
  };

  // Remover ingrediente
  const handleRemoveIngredient = (id: string) => {
    if (ingredientes.length <= 1) {
      alert("A formulação precisa ter pelo menos 1 ingrediente.");
      return;
    }
    setIngredientes(ingredientes.filter((ing) => ing.id !== id));
  };

  // Atualizar valores do ingrediente
  const handleUpdateIngredient = (id: string, field: keyof Ingrediente, value: any) => {
    setIngredientes(
      ingredientes.map((ing) => {
        if (ing.id === id) {
          return { ...ing, [field]: value };
        }
        return ing;
      })
    );
  };

  // Salvar como NOVA Ração (POST)
  const handleSaveNewFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitFormula('POST');
  };

  // Atualizar Ração Existente (PUT)
  const handleUpdateFormula = async () => {
    await submitFormula('PUT');
  };

  const submitFormula = async (method: 'POST' | 'PUT') => {
    if (totalPorcentagem !== 100) {
      setStatusMessage({
        type: 'error',
        text: 'A soma das porcentagens dos ingredientes deve ser exatamente 100%!'
      });
      return;
    }

    if (!nomeRacao.trim()) {
      setStatusMessage({ type: 'error', text: 'Informe um nome para a ração.' });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const payload: any = {
        nome_dieta: nomeRacao,
        custo_por_kg: Number(custoPorKg.toFixed(4)),
        estoque_kg: parseFloat(estoqueInicial) || 0,
        formula_receita: ingredientes
      };

      if (method === 'PUT') {
        payload.id = selectedDietId;
      }

      const response = await fetch('/api/dietas', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao salvar a ração no servidor.');
      }

      setStatusMessage({
        type: 'success',
        text: method === 'POST'
          ? `Ração "${nomeRacao}" formulada e integrada com sucesso ao curral!`
          : `Ração "${nomeRacao}" atualizada com sucesso!`
      });

      // Recarregar lista e ir para trato
      loadSavedDietas();
      setTimeout(() => {
        router.push('/trato');
        router.refresh();
      }, 1500);

    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Erro ao processar integração da ração.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = totalPorcentagem === 100;

  return (
    <div style={styles.container}>
      {/* Coluna 1: Formulação dos Ingredientes */}
      <div className="glass-panel" style={styles.cardIngredients}>
        <div style={styles.cardHeader}>
          <Calculator size={22} color="var(--color-accent)" style={{ marginRight: '8px' }} />
          <h2 style={styles.cardTitle}>Mistura de Ingredientes (% e Custos)</h2>
        </div>

        {/* DROPDOWN DE RAÇÕES EXISTENTES */}
        <div style={styles.dropdownSection}>
          <label style={styles.label}>Carregar Ração Cadastrada para Editar:</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <select 
              value={selectedDietId} 
              onChange={(e) => handleSelectDiet(e.target.value)}
              style={styles.select}
              disabled={loadingDietas}
            >
              <option value="">-- Nova Fórmula em Branco --</option>
              {savedDietas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome_dieta} (R$ {Number(d.custo_por_kg).toFixed(2)}/kg)
                </option>
              ))}
            </select>
            {selectedDietId && (
              <button onClick={handleResetToNew} style={styles.clearBtn}>
                Limpar
              </button>
            )}
          </div>
        </div>

        <p style={styles.description}>
          Insira os ingredientes da sua mistura, o custo unitário (R$/kg) e a proporção (%) na receita.
        </p>

        <div style={styles.ingredientList}>
          {ingredientes.map((ing) => (
            <div key={ing.id} style={styles.ingredientRow}>
              {/* Nome */}
              <input 
                type="text"
                value={ing.nome}
                onChange={(e) => handleUpdateIngredient(ing.id, 'nome', e.target.value)}
                placeholder="Ex: Milho Moído"
                style={{ ...styles.input, flex: 3 }}
              />

              {/* Preço por kg */}
              <div style={styles.inputIconWrapper}>
                <span style={styles.inputPrefix}>R$</span>
                <input 
                  type="number"
                  step="0.01"
                  value={ing.custoPorKg}
                  onChange={(e) => handleUpdateIngredient(ing.id, 'custoPorKg', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  style={{ ...styles.input, paddingLeft: '2rem', flex: 1 }}
                  title="Custo por Kilograma do ingrediente"
                />
                <span style={styles.inputSuffix}>/kg</span>
              </div>

              {/* Porcentagem */}
              <div style={styles.inputIconWrapper}>
                <input 
                  type="number"
                  value={ing.porcentagem}
                  onChange={(e) => handleUpdateIngredient(ing.id, 'porcentagem', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  style={{ ...styles.input, paddingRight: '1.5rem', flex: 1, textAlign: 'center' }}
                  title="Porcentagem na mistura"
                />
                <span style={styles.inputSuffixRight}>%</span>
              </div>

              {/* Botão de Excluir */}
              <button 
                onClick={() => handleRemoveIngredient(ing.id)}
                style={styles.deleteBtn}
                title="Remover este ingrediente"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <button onClick={handleAddIngredient} style={styles.addBtn}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Adicionar Ingrediente
        </button>
      </div>

      {/* Coluna 2: Resultados e Integração */}
      <div className="glass-panel" style={styles.cardSummary}>
        <div style={styles.cardHeader}>
          <DollarSign size={22} color="var(--color-brand)" style={{ marginRight: '8px' }} />
          <h2 style={styles.cardTitle}>Resultado da Formulação</h2>
        </div>

        {/* INDICADOR CHAVE: CUSTO DO KILO */}
        <div style={styles.costBox}>
          <div style={styles.costLabel}>CUSTO DO KG DA RAÇÃO</div>
          <div style={styles.costValue}>
            R$ {custoPorKg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/ kg</span>
          </div>
          <div style={styles.subCost}>
            Saco de 40 kg comercial: <strong>R$ {custoPorSaco40kg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
        </div>

        {/* PROGRESSO DA PROPORÇÃO (Deve ser 100%) */}
        <div style={styles.proportionStatus}>
          <div style={styles.proportionHeader}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Soma das Proporções</span>
            <strong style={{ 
              color: isFormValid ? 'var(--color-brand)' : 'var(--color-danger)', 
              fontSize: '1rem' 
            }}>
              {totalPorcentagem}%
            </strong>
          </div>
          <div style={styles.progressBarBg}>
            <div style={{
              ...styles.progressBarFill,
              width: `${Math.min(100, totalPorcentagem)}%`,
              backgroundColor: isFormValid ? 'var(--color-brand)' : 'var(--color-danger)'
            }} />
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: isFormValid ? 'var(--color-brand)' : 'var(--color-accent)', 
            marginTop: '0.4rem',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {isFormValid ? (
              <>✓ Fórmula balanceada em 100%!</>
            ) : (
              <>⚠️ A soma está em {totalPorcentagem}%. Ajuste para exatamente 100% para poder salvar.</>
            )}
          </div>
        </div>

        {/* INTEGRAR COM O CONFINAMENTO */}
        <div style={styles.saveSection}>
          <h3 style={styles.saveTitle}>Disponibilizar no Confinamento</h3>
          <p style={styles.saveDescription}>
            Salve a formulação para usá-la nos tratos diários dos lotes.
          </p>

          <form onSubmit={handleSaveNewFormula} style={styles.saveForm}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nome da Ração / Dieta:</label>
              <input 
                type="text"
                value={nomeRacao}
                onChange={(e) => setNomeRacao(e.target.value)}
                placeholder="Ex: Ração Terminação Nelore"
                style={styles.input}
                required
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Estoque de Fabricação (kg):</label>
              <div style={styles.inputIconWrapper}>
                <input 
                  type="number"
                  value={estoqueInicial}
                  onChange={(e) => setEstoqueInicial(e.target.value)}
                  placeholder="Ex: 5000"
                  style={styles.input}
                  required
                />
                <span style={styles.inputSuffixRight}>kg</span>
              </div>
            </div>

            {/* Ações de Salvar (Diferencia Novo vs Edição) */}
            {selectedDietId ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={handleUpdateFormula}
                  disabled={submitting || !isFormValid}
                  style={{
                    ...styles.saveBtn,
                    backgroundColor: 'var(--color-accent)',
                    boxShadow: 'none',
                    opacity: (submitting || !isFormValid) ? 0.6 : 1,
                    cursor: (submitting || !isFormValid) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Save size={18} style={{ marginRight: '8px' }} />
                  Salvar Alterações (Atualizar)
                </button>
                <button 
                  type="submit" 
                  disabled={submitting || !isFormValid}
                  style={{
                    ...styles.saveBtn,
                    backgroundColor: 'transparent',
                    border: '1px solid var(--color-brand)',
                    color: 'var(--color-brand)',
                    boxShadow: 'none',
                    opacity: (submitting || !isFormValid) ? 0.6 : 1,
                    cursor: (submitting || !isFormValid) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Plus size={18} style={{ marginRight: '8px' }} />
                  Salvar como Nova Ração
                </button>
              </div>
            ) : (
              <button 
                type="submit" 
                disabled={submitting || !isFormValid}
                style={{
                  ...styles.saveBtn,
                  opacity: (submitting || !isFormValid) ? 0.6 : 1,
                  cursor: (submitting || !isFormValid) ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem'
                }}
              >
                <Save size={18} style={{ marginRight: '8px' }} />
                {submitting ? 'Salvando Ração...' : 'Salvar e Disponibilizar'}
              </button>
            )}
          </form>
        </div>

        {/* Mensagens de feedback */}
        {statusMessage && (
          <div style={{
            ...styles.statusMessage,
            backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: statusMessage.type === 'success' ? 'var(--color-brand)' : 'var(--color-danger)',
            color: statusMessage.type === 'success' ? 'var(--color-brand)' : 'var(--color-danger)'
          }}>
            {statusMessage.type === 'success' ? (
              <CheckCircle size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
    width: '100%'
  },
  cardIngredients: {
    flex: '2 1 500px',
    padding: '1.5rem',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  dropdownSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  select: {
    flex: 1,
    padding: '0.65rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    cursor: 'pointer'
  },
  clearBtn: {
    padding: '0.65rem 1rem',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    transition: 'all var(--transition-fast)'
  },
  cardSummary: {
    flex: '1 1 350px',
    padding: '1.5rem',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '0.75rem',
    marginBottom: '0.25rem'
  },
  cardTitle: {
    fontSize: '1.15rem',
    fontWeight: 600,
    color: '#fff'
  },
  description: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    marginTop: '0.25rem'
  },
  ingredientList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  ingredientRow: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  input: {
    padding: '0.65rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%'
  },
  inputIconWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    minWidth: '110px'
  },
  inputPrefix: {
    position: 'absolute',
    left: '0.75rem',
    color: 'var(--text-muted)',
    fontSize: '0.85rem'
  },
  inputSuffix: {
    position: 'absolute',
    right: '0.75rem',
    color: 'var(--text-muted)',
    fontSize: '0.8rem'
  },
  inputSuffixRight: {
    position: 'absolute',
    right: '0.75rem',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: 600
  },
  deleteBtn: {
    padding: '0.65rem',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-danger)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-fast)'
  },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    color: 'var(--text-primary)',
    padding: '0.7rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px dashed var(--border-color)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-fast)',
    marginTop: '0.5rem'
  },
  costBox: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '1.25rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  costLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    letterSpacing: '1px'
  },
  costValue: {
    fontSize: '1.8rem',
    fontWeight: 700,
    color: 'var(--color-brand)',
    margin: '0.25rem 0'
  },
  subCost: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)'
  },
  proportionStatus: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  proportionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  progressBarBg: {
    width: '100%',
    height: '6px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    transition: 'width var(--transition-normal)'
  },
  saveSection: {
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    paddingTop: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  saveTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#fff'
  },
  saveDescription: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    lineHeight: 1.3
  },
  saveForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem'
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)'
  },
  saveBtn: {
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
    padding: '0.85rem',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    fontSize: '0.9rem',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px var(--color-brand-glow)',
    marginTop: '0.25rem',
    transition: 'all var(--transition-fast)'
  },
  statusMessage: {
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.8rem'
  }
};
