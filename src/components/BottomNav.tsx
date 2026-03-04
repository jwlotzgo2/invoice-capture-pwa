'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Camera, Settings } from 'lucide-react';

const tabs = [
  { href: '/invoices', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/invoices/list', icon: FileText, label: 'Documents' },
  { href: '/capture', icon: Camera, label: 'Capture', primary: true },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide on admin, auth, and capture camera pages
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth') ||
    pathname === '/capture'
  ) return null;

  return (
    <>
      {/* Spacer so content isn't hidden behind nav */}
      <div style={{ height: 72 }} />

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: '#fff', borderTop: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
      }}>
        {tabs.map(({ href, icon: Icon, label, primary }) => {
          const active = pathname === href || (href === '/invoices' && pathname === '/invoices');
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 3, padding: '10px 0',
                textDecoration: 'none', position: 'relative',
              }}
            >
              {primary ? (
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                  marginTop: -20,
                }}>
                  <Icon size={22} color="#fff" />
                </div>
              ) : (
                <Icon
                  size={22}
                  color={active ? '#2563eb' : '#94a3b8'}
                  strokeWidth={active ? 2.5 : 1.8}
                />
              )}
              <span style={{
                fontSize: 10, fontWeight: primary ? 600 : active ? 700 : 500,
                color: primary ? '#2563eb' : active ? '#2563eb' : '#94a3b8',
                fontFamily: 'DM Sans, sans-serif',
                marginTop: primary ? 4 : 0,
              }}>
                {label}
              </span>
              {active && !primary && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 24, height: 3, background: '#2563eb', borderRadius: '0 0 3px 3px',
                }} />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
