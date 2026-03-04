'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, FileText, Mail, BarChart3, TrendingUp, ArrowRight, Loader2, Shield, Camera, Upload, AlertCircle } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalInvoices: number;
  invoicesThisWeek: number;
  totalEmailInvoices: number;
  totalOCREdits: number;
  invoicesByStatus: { pending: number; reviewed: number; approved: number; rejected: number };
  invoicesBySource: { camera: number; upload: number; email: number };
  recentActivity: number;
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');
  .adm { font-family: 'DM Sans', sans-serif; min-height: 100svh; background: #f8fafc; }
  .adm-header { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 16px; display: flex; align-items: center; justify-content: space-between; }
  .adm-logo { display: flex; align-items: center; gap: 12px; }
  .adm-logo-mark { width: 40px; height: 40px; background: linear-gradient(135deg,#7c3aed,#a855f7); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .adm-title { font-size: 18px; font-weight: 700; color: #0f172a; }
  .adm-sub { font-size: 13px; color: #64748b; }
  .adm-back { font-size: 13px; font-weight: 600; color: #2563eb; text-decoration: none; }
  .adm-main { max-width: 960px; margin: 0 auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 20px; }
  .adm-grid-4 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  @media(min-width:640px){ .adm-grid-4 { grid-template-columns: repeat(4,1fr); } }
  .adm-grid-2 { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media(min-width:640px){ .adm-grid-2 { grid-template-columns: 1fr 1fr; } }
  .adm-grid-3 { display: grid; grid-template-columns: 1fr; gap: 12px; }
  @media(min-width:640px){ .adm-grid-3 { grid-template-columns: repeat(3,1fr); } }
  .adm-card { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
  .adm-kpi-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
  .adm-kpi-val { font-size: 24px; font-weight: 700; color: #0f172a; font-family: 'DM Mono',monospace; }
  .adm-kpi-label { font-size: 13px; color: #64748b; margin-top: 2px; }
  .adm-kpi-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
  .adm-section-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 14px; }
  .adm-bar-row { margin-bottom: 12px; }
  .adm-bar-top { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; }
  .adm-bar-label { color: #475569; font-weight: 500; }
  .adm-bar-val { color: #0f172a; font-weight: 700; }
  .adm-bar-track { height: 8px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
  .adm-bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s; }
  .adm-quick-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; text-decoration: none; display: block; transition: box-shadow 0.15s, border-color 0.15s; }
  .adm-quick-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-color: #bfdbfe; }
  .adm-quick-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
  .adm-quick-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
  .adm-quick-desc { font-size: 12px; color: #64748b; }
  .adm-quick-arrow { float: right; margin-top: -28px; color: #cbd5e1; }
  .adm-status-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; }
  .adm-dot { width: 8px; height: 8px; border-radius: 50%; }
`;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/stats').then(async (res) => {
      if (res.status === 403) { router.push('/invoices'); return; }
      if (!res.ok) throw new Error('Failed to fetch stats');
      setStats(await res.json());
    }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} color="#7c3aed" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <AlertCircle size={48} color="#e11d48" />
      <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '16px 0 8px' }}>{error}</p>
      <button onClick={() => router.push('/invoices')} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Back to invoices</button>
    </div>
  );

  const total = stats?.totalInvoices || 1;

  return (
    <>
      <style>{css}</style>
      <div className="adm">
        <header className="adm-header">
          <div className="adm-logo">
            <div className="adm-logo-mark"><Shield size={20} color="#fff" /></div>
            <div>
              <div className="adm-title">Admin Console</div>
              <div className="adm-sub">Invoice Capture PWA</div>
            </div>
          </div>
          <Link href="/invoices" className="adm-back">← Back to App</Link>
        </header>

        <main className="adm-main">
          {/* KPI Grid */}
          <div className="adm-grid-4">
            {[
              { icon: <Users size={18} color="#2563eb" />, bg: '#eff6ff', val: stats?.totalUsers || 0, label: 'Total Users', sub: `${stats?.activeUsers || 0} active` },
              { icon: <FileText size={18} color="#16a34a" />, bg: '#f0fdf4', val: stats?.totalInvoices || 0, label: 'Total Invoices', sub: `+${stats?.invoicesThisWeek || 0} this week` },
              { icon: <Mail size={18} color="#7c3aed" />, bg: '#f5f3ff', val: stats?.totalEmailInvoices || 0, label: 'Email Invoices', sub: 'via Postmark' },
              { icon: <BarChart3 size={18} color="#d97706" />, bg: '#fffbeb', val: stats?.totalOCREdits || 0, label: 'OCR Corrections', sub: 'total edits' },
            ].map((k) => (
              <div key={k.label} className="adm-card">
                <div className="adm-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                <div className="adm-kpi-val">{k.val.toLocaleString()}</div>
                <div className="adm-kpi-label">{k.label}</div>
                <div className="adm-kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="adm-grid-2">
            <div className="adm-card">
              <div className="adm-section-title">Invoices by Status</div>
              {[
                { label: 'Pending', val: stats?.invoicesByStatus.pending || 0, color: '#f59e0b' },
                { label: 'Reviewed', val: stats?.invoicesByStatus.reviewed || 0, color: '#3b82f6' },
                { label: 'Approved', val: stats?.invoicesByStatus.approved || 0, color: '#22c55e' },
                { label: 'Rejected', val: stats?.invoicesByStatus.rejected || 0, color: '#ef4444' },
              ].map((b) => (
                <div key={b.label} className="adm-bar-row">
                  <div className="adm-bar-top">
                    <span className="adm-bar-label">{b.label}</span>
                    <span className="adm-bar-val">{b.val}</span>
                  </div>
                  <div className="adm-bar-track">
                    <div className="adm-bar-fill" style={{ width: `${(b.val / total) * 100}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="adm-card">
              <div className="adm-section-title">Invoices by Source</div>
              {[
                { icon: <Camera size={14} />, label: 'Camera', val: stats?.invoicesBySource.camera || 0, color: '#3b82f6' },
                { icon: <Upload size={14} />, label: 'Upload', val: stats?.invoicesBySource.upload || 0, color: '#22c55e' },
                { icon: <Mail size={14} />, label: 'Email', val: stats?.invoicesBySource.email || 0, color: '#a855f7' },
              ].map((b) => (
                <div key={b.label} className="adm-bar-row">
                  <div className="adm-bar-top">
                    <span className="adm-bar-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{b.icon}{b.label}</span>
                    <span className="adm-bar-val">{b.val} ({Math.round((b.val / total) * 100)}%)</span>
                  </div>
                  <div className="adm-bar-track">
                    <div className="adm-bar-fill" style={{ width: `${(b.val / total) * 100}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="adm-grid-3">
            {[
              { href: '/admin/users', icon: <Users size={20} color="#2563eb" />, bg: '#eff6ff', title: 'User Management', desc: 'View and manage users, roles and activity' },
              { href: '/admin/analytics', icon: <TrendingUp size={20} color="#16a34a" />, bg: '#f0fdf4', title: 'OCR Analytics', desc: 'Track scan accuracy and correction patterns' },
              { href: '/invoices', icon: <FileText size={20} color="#7c3aed" />, bg: '#f5f3ff', title: 'All Invoices', desc: 'Browse and manage all system invoices' },
            ].map((q) => (
              <Link key={q.href} href={q.href} className="adm-quick-card">
                <div className="adm-quick-icon" style={{ background: q.bg }}>{q.icon}</div>
                <div className="adm-quick-title">{q.title}</div>
                <div className="adm-quick-desc">{q.desc}</div>
                <div className="adm-quick-arrow"><ArrowRight size={16} /></div>
              </Link>
            ))}
          </div>

          {/* System Status */}
          <div className="adm-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="adm-section-title" style={{ margin: 0 }}>System Status</div>
              <span style={{ fontSize: 12, color: '#64748b' }}>{stats?.recentActivity || 0} actions in last 24h</span>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div className="adm-status-row"><div className="adm-dot" style={{ background: '#22c55e' }} />System operational</div>
              <div className="adm-status-row"><div className="adm-dot" style={{ background: '#3b82f6' }} />Database connected</div>
              <div className="adm-status-row"><div className="adm-dot" style={{ background: '#a855f7' }} />Email webhook ready</div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
