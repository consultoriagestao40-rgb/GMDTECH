'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Users, Trash2, Shield, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface Usuario {
  id: number;
  email: string;
  senha: string;
  role: string;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Form states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<string>('operador');
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar lista de usuários
  const loadUsers = async () => {
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Erro ao carregar usuários:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Cadastrar usuário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setStatusMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Usuário cadastrado com sucesso!' });
        setEmail('');
        setPassword('');
        setRole('operador');
        loadUsers(); // Recarregar lista
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Erro ao cadastrar usuário.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Erro de conexão com o servidor.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Excluir usuário
  const handleDelete = async (id: number, emailToDelete: string) => {
    // Obter dados do usuário logado para evitar que ele se exclua
    const loggedUserStr = localStorage.getItem('gmdtech_user');
    if (loggedUserStr) {
      const loggedUser = JSON.parse(loggedUserStr);
      if (loggedUser.email.toLowerCase() === emailToDelete.toLowerCase()) {
        setStatusMessage({ type: 'error', text: 'Você não pode excluir a sua própria conta ativa.' });
        return;
      }
    }

    if (!confirm(`Tem certeza que deseja remover o acesso do usuário "${emailToDelete}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/usuarios?id=${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Usuário removido com sucesso!' });
        loadUsers();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Erro ao remover usuário.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Erro ao remover usuário.' });
    }
  };

  return (
    <div style={styles.container}>
      {/* Botão de Voltar */}
      <div style={styles.backButtonWrapper}>
        <Link href="/" style={styles.backBtn}>
          <ArrowLeft size={16} /> Voltar ao Painel Geral
        </Link>
      </div>

      <div style={styles.header}>
        <h1 style={styles.title}>Gerenciamento de Usuários e Acessos</h1>
        <p style={styles.subtitle}>
          Adicione e remova credenciais de operadores e administradores que têm acesso ao Neon PostgreSQL.
        </p>
      </div>

      {statusMessage && (
        <div style={{
          ...styles.alert,
          backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          color: statusMessage.type === 'success' ? 'var(--color-brand)' : 'var(--color-danger)'
        }}>
          {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div style={styles.mainGrid}>
        {/* Formulário de Cadastro */}
        <div className="glass-panel" style={styles.panel}>
          <h3 style={styles.panelTitle}>
            <UserPlus size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="var(--color-brand)" />
            Novo Acesso
          </h3>
          
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>E-mail</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@gmdtech.com"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Senha de Acesso</label>
              <input 
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ex: gmd123"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nível de Acesso (Role)</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={styles.select}
              >
                <option value="operador">Operador (Acesso Comum)</option>
                <option value="admin">Administrador (Acesso Completo)</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              style={{
                ...styles.btnSubmit,
                opacity: submitting ? 0.75 : 1
              }}
            >
              {submitting ? 'Salvando...' : 'Cadastrar Usuário'}
            </button>
          </form>
        </div>

        {/* Lista de Usuários */}
        <div className="glass-panel" style={styles.panel}>
          <h3 style={styles.panelTitle}>
            <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} color="var(--color-accent)" />
            Usuários Cadastrados
          </h3>

          {loading ? (
            <div style={styles.loader}>
              <RefreshCw size={24} className="animate-spin" color="var(--color-accent)" />
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Buscando cadastros...</p>
            </div>
          ) : (
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>E-mail</th>
                    <th style={styles.th}>Senha</th>
                    <th style={styles.th}>Nível</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Excluir</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={styles.td}>{u.email}</td>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 600 }}>{u.senha}</td>
                      <td style={styles.td}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          backgroundColor: u.role === 'admin' ? 'rgba(21, 128, 61, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: u.role === 'admin' ? 'var(--color-brand)' : 'var(--text-secondary)'
                        }}>
                          {u.role === 'admin' && <Shield size={12} />}
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {u.id !== 1 ? (
                          <button 
                            onClick={() => handleDelete(u.id, u.email)}
                            style={styles.deleteBtn}
                            title="Remover acesso"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Bloqueado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '1.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
    color: '#f3f4f6'
  },
  backButtonWrapper: {
    marginBottom: '1rem'
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '0.85rem'
  },
  header: {
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.025em',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '0.92rem',
    color: 'var(--text-secondary)',
    maxWidth: '800px'
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem'
  },
  panel: {
    padding: '1.5rem'
  },
  panelTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '1.25rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '0.75rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-secondary)'
  },
  input: {
    padding: '0.55rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: '#fff',
    fontSize: '0.875rem',
    outline: 'none'
  },
  select: {
    padding: '0.55rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: '#fff',
    fontSize: '0.875rem',
    outline: 'none',
    cursor: 'pointer'
  },
  btnSubmit: {
    padding: '0.65rem',
    borderRadius: '8px',
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.5rem',
    transition: 'background-color var(--transition-fast)'
  },
  loader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 0'
  },
  tableResponsive: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.875rem'
  },
  th: {
    padding: '0.75rem',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    fontWeight: 600
  },
  td: {
    padding: '0.75rem',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    color: 'var(--text-secondary)'
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-danger)',
    cursor: 'pointer',
    padding: '0.25rem',
    transition: 'color var(--transition-fast)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  alert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    border: '1px solid',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '1.5rem'
  }
};
