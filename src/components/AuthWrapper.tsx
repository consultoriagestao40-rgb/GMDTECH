'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Mail, RefreshCw, AlertCircle } from 'lucide-react';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState<boolean>(true);
  
  // Login Form States
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Verificar sessão no localStorage
    const savedUser = localStorage.getItem('gmdtech_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('gmdtech_user');
      }
    }
    setChecking(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('gmdtech_user', JSON.stringify(data.user));
        setUser(data.user);
      } else {
        setError(data.error || 'Falha ao autenticar.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={styles.loadingContainer}>
        <RefreshCw size={36} className="animate-spin" color="var(--color-brand)" />
        <p style={{ marginTop: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Verificando credenciais...</p>
      </div>
    );
  }

  // Se não autenticado, renderizar tela de login elegante
  if (!user) {
    return (
      <div style={styles.loginPageContainer}>
        <div style={styles.bgGlow1}></div>
        <div style={styles.bgGlow2}></div>

        <div className="glass-panel" style={styles.loginCard}>
          <div style={styles.logoArea}>
            <div style={styles.logoIcon}>🐂</div>
            <h2 style={styles.logoText}>
              <strong>GMD</strong>
              <span style={{ color: 'var(--color-brand)', fontWeight: 600 }}>Tech</span>
            </h2>
            <p style={styles.tagline}>Painel Administrativo Confinamento</p>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            {error && (
              <div style={styles.errorAlert}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div style={styles.inputGroup}>
              <label style={styles.label}>E-mail</label>
              <div style={styles.inputWrapper}>
                <Mail size={16} style={styles.inputIcon} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmdtech.com"
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Senha</label>
              <div style={styles.inputWrapper}>
                <Lock size={16} style={styles.inputIcon} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.75 : 1
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Entrando...
                </>
              ) : 'Entrar no Painel'}
            </button>
          </form>

          <div style={styles.cardFooter}>
            🔒 Conexão Neon PostgreSQL Criptografada
          </div>
        </div>
      </div>
    );
  }

  // Se autenticado, renderizar o conteúdo real
  return <>{children}</>;
}

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0c0c14',
    color: '#fff'
  },
  loginPageContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#07070c',
    overflow: 'hidden',
    padding: '1.5rem'
  },
  bgGlow1: {
    position: 'absolute',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(21, 128, 61, 0.18) 0%, rgba(0,0,0,0) 70%)',
    top: '-50px',
    left: '-50px',
    pointerEvents: 'none'
  },
  bgGlow2: {
    position: 'absolute',
    width: '450px',
    height: '450px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(0,0,0,0) 70%)',
    bottom: '-100px',
    right: '-100px',
    pointerEvents: 'none'
  },
  loginCard: {
    width: '100%',
    maxWidth: '400px',
    padding: '2.5rem 2rem',
    borderRadius: '16px',
    zIndex: 5,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  logoIcon: {
    fontSize: '2.5rem',
    marginBottom: '0.25rem'
  },
  logoText: {
    fontSize: '1.5rem',
    color: '#fff',
    letterSpacing: '-0.025em',
    margin: 0
  },
  tagline: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    color: 'var(--color-danger)',
    fontSize: '0.8rem',
    lineHeight: '1.4'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  label: {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--text-secondary)'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '0.75rem',
    color: 'var(--text-muted)'
  },
  input: {
    width: '100%',
    padding: '0.625rem 0.75rem 0.625rem 2.25rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: '#fff',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color var(--transition-fast)'
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    backgroundColor: 'var(--color-brand)',
    color: '#fff',
    border: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast), transform var(--transition-fast)'
  },
  cardFooter: {
    textAlign: 'center',
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    marginTop: '1.75rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '1rem'
  }
};
