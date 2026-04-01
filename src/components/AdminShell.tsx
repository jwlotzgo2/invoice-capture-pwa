'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Building2, BarChart3, ScrollText, Activity, ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/orgs', label: 'Organisations', icon: Building2 },
  { href: '/admin/analytics', label: 'OCR Analytics', icon: BarChart3 },
  { href: '/admin/journal', label: 'Activity Journal', icon: ScrollText },
  { href: '/admin/activity-report', label: 'Activity Report', icon: Activity },
];

const C = {
  bg:           '#0f0f0f',
  sidebar:      '#141414',
  surface:      '#1c1c1c',
  surfaceHi:    '#282828',
  border:       '#2a2a2a',
  borderHi:     '#383838',
  accent:       '#38bdf8',
  accentBright: '#7dd3fc',
  accentGlow:   'rgba(56,189,248,0.1)',
  text:         '#f0f0f0',
  dim:          '#a3a3a3',
  muted:        '#6b6b6b',
};

const shellCss = `
  @keyframes spin { to { transform: rotate(360deg); } }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body { background: ${C.bg}; }

  .shell-root {
    font-family: Inter, system-ui, sans-serif;
    min-height: 100svh;
    background: ${C.bg};
    color: ${C.text};
    display: flex;
  }

  /* ── Sidebar ── */
  .shell-sidebar {
    display: none;
    width: 220px;
    flex-shrink: 0;
    background: ${C.sidebar};
    border-right: 1px solid ${C.border};
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 50;
    flex-direction: column;
    overflow-y: auto;
  }
  @media (min-width: 769px) {
    .shell-sidebar { display: flex; }
    .shell-mobile-header { display: none !important; }
    .shell-content { margin-left: 220px; }
  }

  .shell-logo-area {
    padding: 20px 16px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .shell-logo-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: ${C.accent};
    flex-shrink: 0;
  }
  .shell-logo-text-wrap { display: flex; flex-direction: column; }
  .shell-logo-admin {
    font-family: Inter, system-ui, sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: ${C.text};
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .shell-logo-sub {
    font-size: 10px;
    color: ${C.dim};
    margin-top: 1px;
  }

  .shell-divider {
    height: 1px;
    background: ${C.border};
    margin: 0 0;
  }

  .shell-nav {
    padding: 8px 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .shell-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 16px;
    font-size: 13px;
    font-weight: 500;
    color: ${C.dim};
    text-decoration: none;
    transition: color 0.14s, background 0.14s;
    border-left: 2px solid transparent;
    cursor: pointer;
  }
  .shell-nav-item:hover {
    color: ${C.text};
    background: rgba(255,255,255,0.03);
  }
  .shell-nav-item.active {
    color: ${C.accentBright};
    background: ${C.accentGlow};
    border-left-color: ${C.accentBright};
  }

  .shell-nav-spacer { flex: 1; }

  .shell-back-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 500;
    color: ${C.dim};
    text-decoration: none;
    transition: color 0.14s;
  }
  .shell-back-link:hover { color: ${C.text}; }

  /* ── Content area ── */
  .shell-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .shell-topbar {
    height: 52px;
    background: ${C.surface};
    border-bottom: 1px solid ${C.border};
    display: flex;
    align-items: center;
    padding: 0 24px;
    gap: 16px;
    position: sticky;
    top: 0;
    z-index: 40;
    flex-shrink: 0;
  }
  .shell-topbar-title {
    font-family: Inter, system-ui, sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: ${C.text};
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .shell-topbar-subtitle {
    font-size: 11px;
    color: ${C.dim};
    margin-top: 1px;
  }
  .shell-topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  /* ── Mobile header ── */
  .shell-mobile-header {
    background: ${C.surface};
    border-bottom: 1px solid ${C.border};
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    position: sticky;
    top: 0;
    z-index: 40;
  }
  .shell-mobile-title {
    font-size: 16px;
    font-weight: 700;
    color: ${C.text};
    flex: 1;
  }

  .shell-page-body {
    flex: 1;
    overflow: auto;
  }
`;

interface AdminShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function AdminShell({ children, title, subtitle, actions }: AdminShellProps) {
  const pathname = usePathname();

  const isActive = (item: typeof NAV[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <>
      <style>{shellCss}</style>
      <div className="shell-root">

        {/* Fixed left sidebar */}
        <aside className="shell-sidebar">
          <div className="shell-logo-area">
            <div className="shell-logo-dot" />
            <div className="shell-logo-text-wrap">
              <span className="shell-logo-admin">Admin</span>
              <span className="shell-logo-sub">Go Capture</span>
            </div>
          </div>

          <div className="shell-divider" />

          <nav className="shell-nav">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shell-nav-item${isActive(item) ? ' active' : ''}`}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
            <div className="shell-nav-spacer" />
          </nav>

          <div className="shell-divider" />

          <Link href="/" className="shell-back-link">
            <ArrowLeft size={13} />
            App
          </Link>
        </aside>

        {/* Content area */}
        <div className="shell-content">

          {/* Mobile header */}
          <header className="shell-mobile-header">
            <Link href="/admin" style={{ color: C.dim, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={18} />
            </Link>
            <span className="shell-mobile-title">{title || 'Admin'}</span>
            {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
          </header>

          {/* Topbar */}
          {(title || actions) && (
            <div className="shell-topbar">
              <div style={{ flex: 1, minWidth: 0 }}>
                {title && <div className="shell-topbar-title">{title}</div>}
                {subtitle && <div className="shell-topbar-subtitle">{subtitle}</div>}
              </div>
              {actions && (
                <div className="shell-topbar-actions">{actions}</div>
              )}
            </div>
          )}

          {/* Page body */}
          <div className="shell-page-body">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
