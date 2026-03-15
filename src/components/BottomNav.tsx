'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Camera, Settings, Monitor, BarChart2, Menu, FileText, List, X, TrendingUp } from 'lucide-react';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  yellow: '#e5e5e5', textMuted: '#6b6b6b', text: '#f0f0f0',
};

const tabs = [
  { href: '/',        icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/capture', icon: Camera,          label: 'Capture',   exact: true, primary: true },
  { href: '/reports', icon: BarChart2,       label: 'Reports',   exact: false },
  { href: '/review',  icon: Monitor,         label: 'Review',    exact: false },
  { href: '/settings',icon: Settings,        label: 'Settings',  exact: false },
];

const menuItems = [
  { href: '/documents',     icon: FileText,    label: 'Documents',       desc: 'Browse and preview files' },
  { href: '/invoices/list', icon: List,        label: 'Invoice Listing',  desc: 'Full list with filters & export' },
  { href: '/invoices/open', icon: TrendingUp,  label: 'Open Invoices',    desc: 'Aging, outstanding & suppliers' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname.startsWith('/admin') || pathname.startsWith('/auth') || pathname === '/capture' || pathname === '/onboarding') return null;

  const menuActive = menuItems.some(m => pathname === m.href || pathname.startsWith(m.href + '/'));

  return (
    <>
      <div style={{ height: 72 }} />

      {/* Backdrop */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,0.6)' }}
        />
      )}

      {/* Slide-up menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', bottom: 72, left: 16, right: 16, zIndex: 49,
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: 8,
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
          animation: 'slideUp 0.18s ease',
        }}>
          <style>{`@keyframes slideUp { from { transform:translateY(12px);opacity:0 } to { transform:translateY(0);opacity:1 } }`}</style>
          <div style={{ padding: '6px 10px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>More</span>
            <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 2 }}>
              <X size={14} />
            </button>
          </div>
          {menuItems.map(({ href, icon: Icon, label, desc }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 12px', borderRadius: 10, textDecoration: 'none',
                background: active ? 'rgba(229,229,229,0.07)' : 'transparent',
                border: `1px solid ${active ? 'rgba(229,229,229,0.15)' : 'transparent'}`,
                marginBottom: 4,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: active ? 'rgba(229,229,229,0.12)' : T.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={17} color={active ? T.yellow : T.textMuted} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: active ? T.yellow : T.text }}>{label}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: T.surface, borderTop: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      }}>
        {tabs.map(({ href, icon: Icon, label, primary, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} style={{
              flex: '1 1 0', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '10px 4px', textDecoration: 'none', position: 'relative',
            }}>
              {primary ? (
                <div style={{ width: 46, height: 46, borderRadius: 6, background: T.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(250,204,21,0.35)', marginTop: -18 }}>
                  <Icon size={22} color={T.bg} />
                </div>
              ) : (
                <Icon size={20} color={active ? T.yellow : T.textMuted} strokeWidth={active ? 2.5 : 1.8} />
              )}
              <span style={{ fontSize: 8, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'Inter, system-ui, sans-serif', color: active || primary ? T.yellow : T.textMuted, marginTop: primary ? 4 : 0, whiteSpace: 'nowrap' }}>{label}</span>
              {active && !primary && (
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 2, background: T.yellow, boxShadow: '0 0 6px rgba(250,204,21,0.6)' }} />
              )}
            </Link>
          );
        })}

        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
        >
          <Menu size={20} color={menuActive || menuOpen ? T.yellow : T.textMuted} strokeWidth={menuActive || menuOpen ? 2.5 : 1.8} />
          <span style={{ fontSize: 8, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'Inter, system-ui, sans-serif', color: menuActive || menuOpen ? T.yellow : T.textMuted, whiteSpace: 'nowrap' }}>More</span>
          {(menuActive) && (
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 2, background: T.yellow, boxShadow: '0 0 6px rgba(250,204,21,0.6)' }} />
          )}
        </button>
      </nav>
    </>
  );
}
