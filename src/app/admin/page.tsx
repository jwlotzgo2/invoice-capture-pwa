'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, FileText, TrendingUp, ArrowRight, Loader2, Shield, Camera, Upload, Mail, Zap, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

interface OrgStat {
  id: string;
  name: string;
  invoice_count: number;
  user_count: number;
  avg_confidence: number | null;
}

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
  avgConfidence: number | null;
  lowConfidenceCount: number;
  orgs: OrgStat[];
}

const css = `
  .adm { font-family: 'DM Sans', sans-serif; min-height: 100svh; background: #f8fafc; }
  .adm-header { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 14px 16px; position: sticky; top: 0; z-index: 40; }
  .adm-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .adm-logo { display: flex; align-items: center; gap: 10px; }
  .adm-logo-mark { width: 36px; height: 36px; background: linear-gradient(135deg,#7c3aed,#a855f7); border-radius: 9px; display: flex; align-items: center; justify-content: center; }
  .adm-title { font-size: 17px; font-weight: 700; color: #0f172a; }
  .adm-back { font-size: 13px; font-weight: 600; color: #2563eb; text-decoration: none; }
  .adm-org-select { padding: 8px 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; color: #334155; outline: none; background: #fff; width: 100%; max-width: 280px; }
  .adm-main { max-width: 960px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
  .adm-grid-4 { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
  @media(min-width:640px){ .adm-grid-4 { grid-template-columns: repeat(4,1fr); } }
  .adm-grid-2 { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media(min-width:640px){ .adm-grid-2 { grid-template-columns: 1fr 1fr; } }
  .adm-grid-3 { display: grid; grid-template-columns: 1fr; gap: 12px; }
  @media(min-width:640px){ .adm-grid-3 { grid-template-columns: repeat(3,1fr); } }
  .adm-card { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
  .adm-kpi-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
  .adm-kpi-val { font-size: 22px; font-weight: 700; color: #0f172a; font-family: 'DM Mono',monospace; line-height: 1.1; }
  .adm-kpi-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 4px; }
  .adm-kpi-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .adm-section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 14px; }
  .adm-bar-row { margin-bottom: 12px; }
  .adm-bar-top { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; }
  .adm-bar-label { color: #475569; font-weight: 500; display: flex; align-items: center; gap: 6px; }
  .adm-bar-val { color: #0f172a; font-weight: 700; }
  .adm-bar-track { height: 8px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
  .adm-bar-fill { height: 100%; border-radius: 99px; transition: width 0.5s; }
  .adm-quick-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; text-decoration: none; display: flex; align-items: center; gap: 14px; transition: box-shadow 0.15s, border-color 0.15s; }
  .adm-quick-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-color: #bfdbfe; }
  .adm-quick-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .adm-org-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .adm-org-row:last-child { border-bottom: none; padding-bottom: 0; }
`;

function confColor(c: number | null) {
  if (!c) return '#94a3b8';
  if (c >= 0.85) return '#16a34a';
  if (c >= 0.65) return '#d97706';
  return '#e11d48';
}

function confLabel(c: number | null) {
  if (!c) return 'No data';
  if (c >= 0.85) return 'Good';
  if (c >= 0.65) return 'Fair';
  return 'Poor';
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgFilter, setOrgFilter] = useState('all');
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
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'DM Sans, sans-serif' }}>
      <AlertTriangle size={48} color="#e11d48" />
      <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '16px 0 8px' }}>{error}</p>
      <button onClick={() => router.push('/invoices')} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Back to app</button>
    </div>
  );

  const orgs = stats?.orgs || [];
  const filteredOrg = orgFilter !== 'all' ? orgs.find(o => o.id === orgFilter) : null;

  const avgConf = filteredOrg ? filteredOrg.avg_confidence : (stats?.avgConfidence ?? null);
  const confPct = avgConf ? Math.round(avgConf * 100) : null;
  const docsProcessed = filteredOrg ? filteredOrg.invoice_count : (stats?.totalInvoices || 0);
  const usersCount = filteredOrg ? filteredOrg.user_count : (stats?.totalUsers || 0);

  const srcTotal = (stats?.invoicesBySource.camera || 0) + (stats?.invoicesBySource.upload || 0) + (stats?.invoicesBySource.email || 0) || 1;

  return (
    <>
      <style>{css}</style>
      <div className="adm">
        <header className="adm-header">
          <div className="adm-header-row">
            <div className="adm-logo">
              <div className="adm-logo-mark"><Shield size={18} color="#fff" /></div>
              <div className="adm-title">Admin Console</div>
            </div>
            <Link href="/invoices" className="adm-back">← App</Link>
          </div>
          <select className="adm-org-select" value={orgFilter} onChange={e => setOrgFilter(e.target.value)}>
            <option value="all">All Organisations</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </header>

        <main className="adm-main">

          {/* Service Health KPIs */}
          <div className="adm-grid-4">
            {[
              {
                icon: <FileText size={18} color="#2563eb" />, bg: '#eff6ff',
                val: docsProcessed.toLocaleString(),
                label: 'Docs Processed',
                sub: filteredOrg ? filteredOrg.name : `+${stats?.invoicesThisWeek || 0} this week`,
              },
              {
                icon: <Activity size={18} color="#7c3aed" />, bg: '#f5f3ff',
                val: confPct !== null ? `${confPct}%` : '—',
                label: 'Avg OCR Confidence',
                sub: confLabel(avgConf),
                valColor: confColor(avgConf),
              },
              {
                icon: <AlertTriangle size={18} color="#d97706" />, bg: '#fffbeb',
                val: (stats?.lowConfidenceCount || 0).toString(),
                label: 'Low Confidence',
                sub: 'scans below 70%',
              },
              {
                icon: <Users size={18} color="#16a34a" />, bg: '#f0fdf4',
                val: usersCount.toLocaleString(),
                label: 'Users',
                sub: filteredOrg ? `in ${filteredOrg.name}` : `${stats?.activeUsers || 0} active`,
              },
            ].map((k) => (
              <div key={k.label} className="adm-card">
                <div className="adm-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                <div className="adm-kpi-val" style={{ color: (k as any).valColor || '#0f172a' }}>{k.val}</div>
                <div className="adm-kpi-label">{k.label}</div>
                <div className="adm-kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Source + OCR Health */}
          <div className="adm-grid-2">
            <div className="adm-card">
              <div className="adm-section-title">Capture Source</div>
              {[
                { icon: <Camera size={14} />, label: 'Camera', val: stats?.invoicesBySource.camera || 0, color: '#3b82f6' },
                { icon: <Upload size={14} />, label: 'Upload', val: stats?.invoicesBySource.upload || 0, color: '#22c55e' },
                { icon: <Mail size={14} />, label: 'Email', val: stats?.invoicesBySource.email || 0, color: '#a855f7' },
              ].map((b) => (
                <div key={b.label} className="adm-bar-row">
                  <div className="adm-bar-top">
                    <span className="adm-bar-label">{b.icon}{b.label}</span>
                    <span className="adm-bar-val">{b.val} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({Math.round((b.val / srcTotal) * 100)}%)</span></span>
                  </div>
                  <div className="adm-bar-track">
                    <div className="adm-bar-fill" style={{ width: `${(b.val / srcTotal) * 100}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="adm-card">
              <div className="adm-section-title">OCR Health</div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#475569', fontWeight: 500 }}>Average Confidence</span>
                  <span style={{ fontWeight: 700, color: confColor(avgConf) }}>{confPct !== null ? `${confPct}%` : '—'}</span>
                </div>
                <div className="adm-bar-track">
                  <div className="adm-bar-fill" style={{ width: `${confPct || 0}%`, background: confColor(avgConf) }} />
                </div>
              </div>
              {[
                { label: 'Manual Corrections', val: stats?.totalOCREdits || 0, warn: false },
                { label: 'Scans below 70%', val: stats?.lowConfidenceCount || 0, warn: (stats?.lowConfidenceCount || 0) > 0 },
                { label: 'Email Invoices', val: stats?.totalEmailInvoices || 0, warn: false },
                { label: 'Activity (24h)', val: stats?.recentActivity || 0, warn: false },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 13, color: '#475569' }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: row.warn ? '#d97706' : '#0f172a' }}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Org breakdown */}
          {orgs.length > 0 && (
            <div className="adm-card">
              <div className="adm-section-title">Organisations · Service Usage</div>
              {orgs.map((org) => (
                <div key={org.id} className="adm-org-row">
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={14} color="#2563eb" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{org.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{org.user_count} user{org.user_count !== 1 ? 's' : ''} · {org.invoice_count} invoices</div>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: confColor(org.avg_confidence) }}>
                      {org.avg_confidence ? `${Math.round(org.avg_confidence * 100)}%` : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>OCR</div>
                  </div>
                  {org.avg_confidence === null ? (
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 }} />
                  ) : org.avg_confidence >= 0.85 ? (
                    <CheckCircle size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={16} color={org.avg_confidence >= 0.65 ? '#d97706' : '#e11d48'} style={{ flexShrink: 0 }} />
                  )}
                </div>
              ))}
            </div>
          )}


          {/* Platform Costs */}
          <div className="adm-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="adm-section-title" style={{ margin: 0 }}>Platform Costs · This Month</div>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>est.</span>
            </div>
            {(() => {
              const scanCount = filteredOrg ? filteredOrg.invoice_count : (stats?.totalInvoices || 0);
              const claudeCost = scanCount * 0.02;
              const supabaseCost = 25;
              const vercelCost = 20;
              const totalCost = claudeCost + supabaseCost + vercelCost;
              const costPerDoc = scanCount > 0 ? totalCost / scanCount : 0;
              const items = [
                { label: 'Claude OCR', detail: `${scanCount} scans × $0.02`, cost: claudeCost, color: '#7c3aed' },
                { label: 'Supabase Pro', detail: 'fixed monthly', cost: supabaseCost, color: '#3b82f6' },
                { label: 'Vercel Pro', detail: 'fixed monthly', cost: vercelCost, color: '#0f172a' },
              ];
              return (
                <>
                  {items.map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.detail}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: item.color }}>${item.cost.toFixed(2)}</div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, marginTop: 2 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Total</div>
                      {costPerDoc > 0 && <div style={{ fontSize: 11, color: '#94a3b8' }}>${costPerDoc.toFixed(3)} per document</div>}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#0f172a' }}>${totalCost.toFixed(2)}</div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Quick links */}
          <div className="adm-grid-3">
            {[
              { href: '/admin/users', icon: <Users size={18} color="#2563eb" />, bg: '#eff6ff', title: 'User Management', desc: 'Manage users, roles, organisations' },
              { href: '/admin/orgs', icon: <Shield size={18} color="#9333ea" />, bg: '#faf5ff', title: 'Organisations', desc: 'Org codes, member assignment' },
              { href: '/admin/analytics', icon: <TrendingUp size={18} color="#16a34a" />, bg: '#f0fdf4', title: 'OCR Analytics', desc: 'Field accuracy and correction patterns' },
              { href: '/invoices/list', icon: <FileText size={18} color="#7c3aed" />, bg: '#f5f3ff', title: 'All Invoices', desc: 'Browse and export all invoices' },
            ].map((q) => (
              <Link key={q.href} href={q.href} className="adm-quick-card">
                <div className="adm-quick-icon" style={{ background: q.bg }}>{q.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{q.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{q.desc}</div>
                </div>
                <ArrowRight size={16} color="#cbd5e1" />
              </Link>
            ))}
          </div>

        </main>
      </div>
    </>
  );
}
