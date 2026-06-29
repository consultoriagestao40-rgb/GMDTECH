'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, PlusCircle, Wheat, Menu, X, Calculator, Sliders, TrendingUp, LogOut, Users } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: 'Painel Geral', href: '/', icon: <BarChart3 size={18} /> },
    { name: 'Novo Lote', href: '/lote', icon: <PlusCircle size={18} /> },
    { name: 'Lançar Trato', href: '/trato', icon: <Wheat size={18} /> },
    { name: 'Formulação Ração', href: '/formulacao', icon: <Calculator size={18} /> },
    { name: 'Premissas Trato', href: '/premissas', icon: <Sliders size={18} /> },
    { name: 'Fluxo e Resultados', href: '/fluxo', icon: <TrendingUp size={18} /> },
    { name: 'Usuários', href: '/usuarios', icon: <Users size={18} /> }
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* HEADER MOBILE (Barra superior que só aparece em telas menores) */}
      <div className="mobile-header">
        <button onClick={toggleSidebar} style={styles.menuBtn} aria-label="Menu">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <Link href="/" style={styles.logo} onClick={() => setIsOpen(false)}>
          <span style={{ marginRight: '6px', fontSize: '1.25rem' }}>🐂</span>
          <strong style={{ color: '#fff' }}>GMD</strong>
          <span style={{ color: 'var(--color-brand)', fontWeight: 600 }}>Tech</span>
        </Link>
      </div>

      {/* OVERLAY DE MÁSCARA MOBILE (Fundo escuro translúcido ao abrir menu no celular) */}
      {isOpen && (
        <div 
          onClick={toggleSidebar} 
          style={styles.overlay}
        />
      )}

      {/* MENU LATERAL COMPLETO (Desktop fixo / Mobile deslizante) */}
      <aside className={`sidebar-container glass-panel ${isOpen ? 'open' : ''}`}>
        {/* Logo Desktop */}
        <div style={styles.logoWrapper}>
          <Link href="/" style={styles.logoDesktop}>
            <span style={{ fontSize: '2rem' }}>🐂</span>
            <span style={styles.logoText}>
              <strong style={{ color: '#fff' }}>GMD</strong>
              <span style={{ color: 'var(--color-brand)', fontWeight: 600 }}>Tech</span>
            </span>
          </Link>
        </div>

        {/* Links de Navegação */}
        <nav style={styles.nav}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setIsOpen(false)}
                style={{
                  ...styles.navLink,
                  backgroundColor: isActive ? 'var(--color-brand-glow)' : 'transparent',
                  color: isActive ? 'var(--color-brand)' : 'var(--text-secondary)',
                  borderLeft: isActive ? '3px solid var(--color-brand)' : '3px solid transparent'
                }}
              >
                <span style={{ marginRight: '10px', display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer do Menu - Substituído pelo Botão de Sair */}
        <div style={styles.footer}>
          <button
            onClick={() => {
              localStorage.removeItem('gmdtech_user');
              window.location.reload();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '0.65rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              color: 'var(--color-danger)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <LogOut size={16} />
            Sair da Conta
          </button>
        </div>
      </aside>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  mobileHeader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    display: 'none', // Ocultado no desktop via CSS media query (ou JS)
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 1rem',
    zIndex: 99,
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: 'none',
    borderRadius: '0'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    textDecoration: 'none',
    fontSize: '1.1rem'
  },
  menuBtn: {
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 98
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: '240px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 99,
    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
    borderTop: 'none',
    borderLeft: 'none',
    borderBottom: 'none',
    padding: '1.5rem 0',
    transition: 'transform var(--transition-normal)'
  },
  logoWrapper: {
    padding: '0 1.5rem 2rem 1.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    marginBottom: '1.5rem'
  },
  logoDesktop: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none'
  },
  logoText: {
    fontSize: '1.4rem'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '0 0.5rem'
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.85rem 1rem',
    textDecoration: 'none',
    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
    fontSize: '0.95rem',
    fontWeight: 500,
    transition: 'all var(--transition-fast)'
  },
  footer: {
    marginTop: 'auto',
    padding: '0 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  version: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  },
  status: {
    fontSize: '0.7rem',
    color: 'var(--color-brand)',
    fontWeight: 500
  }
};
