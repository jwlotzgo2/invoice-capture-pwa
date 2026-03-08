'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Camera, Settings, Monitor, BarChart2 } from 'lucide-react';

const T = {
  bg: '#1c1c1c', surface: '#282828', border: '#383838',
  yellow: '#e5e5e5', textMuted: '#6b6b6b',
};

const tabs = [
  { href: '/',              icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/documents',     icon: FileText,         label: 'Documents', exact: false },
  { href: '/capture',       icon: Camera,           label: 'Capture',   exact: true, primary: true },
  { href: '/review',        icon: Monitor,          label: 'Review',    exact: false },
  { href: '/reports',       icon: BarChart2,        label: 'Reports',   exact: false },
  { href: '/settings',      icon: Settings,         label: 'Settings',  exact: false },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin') || pathname.startsWith('/auth') || pathname === '/capture') return null;

  return (
    <>
      <div style={{ height: 72 }} />
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: T.surface, borderTop: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {tabs.map(({ href, icon: Icon, label, primary, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} style={{
              flex: '1 1 0',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, padding: '10px 4px',
              textDecoration: 'none', position: 'relative',
            }}>
              {primary ? (
                <div style={{
                  width: 46, height: 46, borderRadius: 6, background: T.yellow,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(250,204,21,0.35)', marginTop: -18,
                }}>
                  <Icon size={22} color={T.bg} />
                </div>
              ) : (
                <Icon size={20} color={active ? T.yellow : T.textMuted} strokeWidth={active ? 2.5 : 1.8} />
              )}
              <span style={{
                fontSize: 8, letterSpacing: '1px', textTransform: 'uppercase',
                fontFamily: "Inter, system-ui, sans-serif",
                color: active || primary ? T.yellow : T.textMuted,
                marginTop: primary ? 4 : 0,
                whiteSpace: 'nowrap',
              }}>{label}</span>
              {active && !primary && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 24, height: 2, background: T.yellow,
                  boxShadow: '0 0 6px rgba(250,204,21,0.6)',
                }} />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
