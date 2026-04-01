'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, FileText, TrendingUp, ArrowRight, Loader2, Shield, Camera, Upload, Mail, Zap, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import AdminShell from '@/components/AdminShell';

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

const C = {
  bg:           '#0f0f0f',
  surface:      '#1c1c1c',
  surfaceHi:    '#282828',
  border:       '#2a2a2a',
  borderHi:     '#383838',
  accent:       '#38bdf8',
  accentBright: '#7dd3fc',
  accentGlow:   'rgba(56,189,248,0.1)',
  green:        '#86efac',
  greenGlow:    'rgba(134,239,172,0.1)',
  amber:        '#fdba74',
  amberGlow:    'rgba(253,186,116,0.1)',
  red:          '#fca5a5',
  redGlow:      'rgba(252,165,165,0.1)',
  purple:       '#c084fc',
  purpleGlow:   'rgba(192,132,252,0.1)',
  text:         '#f0f0f0',
  dim:          '#a3a3a3',
  muted:        '#6b6b6b',
};

const pageCss = `
  .adm-page { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
  @media (max-width: 768px) { .adm-page { padding: 16px; } }

  .adm-grid-4 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  @media (min-width: 640px) { .adm-grid-4 { grid-template-columns: repeat(4, 1fr); } }

  .adm-row2 { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media (min-width: 900px) { .adm-row2 { grid-template-columns: 60fr 40fr; } }

  .adm-row3 { display: grid; grid-template-columns: 1fr; gap: 16px; }

  .adm-quick-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  @media (min-width: 640px) { .adm-quick-grid { grid-template-columns: repeat(3, 1fr); } }

  .adm-card {
    background: ${C.surface};
    border-radius: 10px;
    border: 1px solid ${C.border};
    border-top: 2px solid ${C.border};
    padding: 18px;
  }
  .adm-card-accent { border-top-color: ${C.accent}; }
  .adm-card-green  { border-top-color: ${C.green}; }
  .adm-card-amber  { border-top-color: ${C.amber}; }
  .adm-card-purple { border-top-color: ${C.purple}; }

  .adm-kpi-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
  .adm-kpi-val { font-family: ui-monospace, monospace; font-size: 26px; font-weight: 700; color: ${C.text}; line-height: 1.1; font-variant-numeric: tabular-nums; }
  .adm-kpi-label { font-size: 10px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px; }
  .adm-kpi-sub { font-size: 11px; color: ${C.dim}; margin-top: 3px; }

  .adm-section-label { font-size: 10px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }

  .adm-bar-row { margin-bottom: 14px; }
  .adm-bar-top { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
  .adm-bar-label { color: ${C.dim}; font-weight: 500; display: flex; align-items: center; gap: 6px; }
  .adm-bar-val { color: ${C.text}; font-family: ui-monospace, monospace; font-weight: 700; font-variant-numeric: tabular-nums; }
  .adm-bar-track { height: 5px; background: ${C.bg}; border-radius: 99px; overflow: hidden; }
  .adm-bar-fill { height: 100%; border-radius: 99px; transition: width 0.5s; }

  .adm-stat-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-top: 1px solid ${C.border}; }
  .adm-stat-row:first-child { border-top: none; }

  .adm-org-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid ${C.border}; }
  .adm-org-row:last-child { border-bottom: none; padding-bottom: 0; }

  .adm-quick-card {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 10px;
    padding: 20px;
    text-decoration: none;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    min-height: 80px;
    transition: border-color 0.15s, background 0.15s;
  }
  .adm-quick-card:hover { border-color: ${C.borderHi}; background: ${C.surfaceHi}; }
  .adm-quick-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

  .adm-select {
    padding: 7px 10px; border: 1px solid ${C.border}; border-radius: 7px; font-size: 12px;
    font-family: Inter, system-ui, sans-serif; color: ${C.text}; outline: none;
    background: ${C.bg}; transition: border-color 0.15s; min-width: 150px;
  }
  .adm-select:focus { border-color: ${C.accent}; }
`;

function confColor(c: number | null) {
  if (!c) return C.muted;
  if (c >= 0.85) return C.green;
  if (c >= 0.65) return C.amber;
  return C.red;
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
      if (res.status === 403) { router.push('/'); return; }
      if (!res.ok) throw new Error('Failed to fetch stats');
      setStats(await res.json());
    }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <AdminShell title="Dashboard">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <Loader2 size={28} color={C.accent} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    </AdminShell>
  );

  if (error) return (
    <AdminShell title="Dashboard">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
        <AlertTriangle size={40} color={C.red} />
        <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '16px 0 8px' }}>{error}</p>
        <button onClick={() => router.push('/')} style={{ color: C.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>← Back to app</button>
      </div>
    </AdminShell>
  );

  const orgs = stats?.orgs || [];
  const filteredOrg = orgFilter !== 'all' ? orgs.find(o => o.id === orgFilter) : null;

  const avgConf = filteredOrg ? filteredOrg.avg_confidence : (stats?.avgConfidence ?? null);
  const confPct = avgConf ? Math.round(avgConf * 100) : null;
  const docsProcessed = filteredOrg ? filteredOrg.invoice_count : (stats?.totalInvoices || 0);
  const usersCount = filteredOrg ? filteredOrg.user_count : (stats?.totalUsers || 0);

  const srcTotal = (stats?.invoicesBySource.camera || 0) + (stats?.invoicesBySource.upload || 0) + (stats?.invoicesBySource.email || 0) || 1;

  const orgFilterSelect = orgs.length > 0 ? (
    <select
      className="adm-select"
      value={orgFilter}
      onChange={e => setOrgFilter(e.target.value)}
    >
      <option value="all">All Organisations</option>
      {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  ) : null;

  return (
    <>
      <style>{pageCss}</style>
      <AdminShell title="Dashboard" actions={orgFilterSelect}>
        <div className="adm-page">

          {/* Row 1: 4 KPI tiles */}
          <div className="adm-grid-4">
            {[
              {
                icon: <FileText size={17} color={C.accent} />, bg: C.accentGlow, topColor: 'adm-card-accent',
                val: docsProcessed.toLocaleString(),
                label: 'Docs Processed',
                sub: filteredOrg ? filteredOrg.name : `+${stats?.invoicesThisWeek || 0} this week`,
              },
              {
                icon: <Activity size={17} color={C.purple} />, bg: C.purpleGlow, topColor: 'adm-card-purple',
                val: confPct !== null ? `${confPct}%` : '—',
                label: 'Avg OCR Confidence',
                sub: confLabel(avgConf),
                valColor: confColor(avgConf),
              },
              {
                icon: <AlertTriangle size={17} color={C.amber} />, bg: C.amberGlow, topColor: 'adm-card-amber',
                val: (stats?.lowConfidenceCount || 0).toString(),
                label: 'Low Confidence',
                sub: 'scans below 70%',
              },
              {
                icon: <Users size={17} color={C.green} />, bg: C.greenGlow, topColor: 'adm-card-green',
                val: usersCount.toLocaleString(),
                label: 'Users',
                sub: filteredOrg ? `in ${filteredOrg.name}` : `${stats?.activeUsers || 0} active`,
              },
            ].map((k) => (
              <div key={k.label} className={`adm-card ${k.topColor}`}>
                <div className="adm-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                <div className="adm-kpi-val" style={{ color: (k as any).valColor || C.text }}>{k.val}</div>
                <div className="adm-kpi-label">{k.label}</div>
                <div className="adm-kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Row 2: Left 60% (Source + OCR Health), Right 40% (Org list) */}
          <div className="adm-row2">
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Capture Source */}
              <div className="adm-card adm-card-accent">
                <div className="adm-section-label">Capture Source</div>
                {[
                  { icon: <Camera size={13} color={C.accent} />, label: 'Camera', val: stats?.invoicesBySource.camera || 0, color: C.accent },
                  { icon: <Upload size={13} color={C.green} />, label: 'Upload', val: stats?.invoicesBySource.upload || 0, color: C.green },
                  { icon: <Mail size={13} color={C.purple} />, label: 'Email', val: stats?.invoicesBySource.email || 0, color: C.purple },
                ].map((b) => (
                  <div key={b.label} className="adm-bar-row">
                    <div className="adm-bar-top">
                      <span className="adm-bar-label">{b.icon}{b.label}</span>
                      <span className="adm-bar-val">{b.val} <span style={{ color: C.muted, fontWeight: 400 }}>({Math.round((b.val / srcTotal) * 100)}%)</span></span>
                    </div>
                    <div className="adm-bar-track">
                      <div className="adm-bar-fill" style={{ width: `${(b.val / srcTotal) * 100}%`, background: b.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* OCR Health */}
              <div className="adm-card adm-card-purple">
                <div className="adm-section-label">OCR Health</div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: C.dim, fontWeight: 500 }}>Average Confidence</span>
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: confColor(avgConf), fontVariantNumeric: 'tabular-nums' }}>{confPct !== null ? `${confPct}%` : '—'}</span>
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
                  <div key={row.label} className="adm-stat-row">
                    <span style={{ fontSize: 13, color: C.dim }}>{row.label}</span>
                    <span style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: row.warn ? C.amber : C.text }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: Org list */}
            {orgs.length > 0 && (
              <div className="adm-card" style={{ borderTopColor: C.accentBright }}>
                <div className="adm-section-label">Organisations · Usage</div>
                {orgs.map((org) => (
                  <div key={org.id} className="adm-org-row">
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: C.accentGlow, border: `1px solid rgba(0,150,199,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Zap size={14} color={C.accent} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{org.user_count} user{org.user_count !== 1 ? 's' : ''} · {org.invoice_count} invoices</div>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: 8, flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: confColor(org.avg_confidence) }}>
                        {org.avg_confidence ? `${Math.round(org.avg_confidence * 100)}%` : '—'}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted }}>OCR</div>
                    </div>
                    {org.avg_confidence === null ? (
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: C.border, flexShrink: 0 }} />
                    ) : org.avg_confidence >= 0.85 ? (
                      <CheckCircle size={14} color={C.green} style={{ flexShrink: 0 }} />
                    ) : (
                      <AlertTriangle size={14} color={org.avg_confidence >= 0.65 ? C.amber : C.red} style={{ flexShrink: 0 }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Row 3: Platform Costs (full width) */}
          <div className="adm-card" style={{ borderTopColor: C.dim }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="adm-section-label" style={{ margin: 0 }}>Platform Costs · This Month</div>
              <span style={{ fontSize: 11, color: C.muted }}>est.</span>
            </div>
            {(() => {
              const scanCount = filteredOrg ? filteredOrg.invoice_count : (stats?.totalInvoices || 0);
              const claudeCost = scanCount * 0.02;
              const supabaseCost = 25;
              const vercelCost = 20;
              const totalCost = claudeCost + supabaseCost + vercelCost;
              const costPerDoc = scanCount > 0 ? totalCost / scanCount : 0;
              const items = [
                { label: 'Claude OCR', detail: `${scanCount} scans × $0.02`, cost: claudeCost, color: C.purple },
                { label: 'Supabase Pro', detail: 'fixed monthly', cost: supabaseCost, color: C.accent },
                { label: 'Vercel Pro', detail: 'fixed monthly', cost: vercelCost, color: C.dim },
              ];
              return (
                <>
                  {items.map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{item.detail}</div>
                      </div>
                      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: item.color }}>${item.cost.toFixed(2)}</div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Total</div>
                      {costPerDoc > 0 && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>${costPerDoc.toFixed(3)} per document</div>}
                    </div>
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 18, fontWeight: 700, letterSpacing: -0.5, color: C.text }}>${totalCost.toFixed(2)}</div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Row 4: Quick Links — 3x2 grid */}
          <div>
            <div className="adm-section-label" style={{ marginBottom: 12 }}>Quick Links</div>
            <div className="adm-quick-grid">
              {[
                { href: '/admin/users', icon: <Users size={20} color={C.accent} />, bg: C.accentGlow, title: 'User Management', desc: 'Manage users, roles, organisations' },
                { href: '/admin/orgs', icon: <Shield size={20} color={C.purple} />, bg: C.purpleGlow, title: 'Organisations', desc: 'Org codes, member assignment' },
                { href: '/admin/analytics', icon: <TrendingUp size={20} color={C.green} />, bg: C.greenGlow, title: 'OCR Analytics', desc: 'Field accuracy and correction patterns' },
                { href: '/invoices/list', icon: <FileText size={20} color={C.amber} />, bg: C.amberGlow, title: 'All Invoices', desc: 'Browse and export all invoices' },
                { href: '/admin/journal', icon: <Activity size={20} color={C.accent} />, bg: C.accentGlow, title: 'Activity Journal', desc: 'Live feed of all user events' },
                { href: '/admin/activity-report', icon: <Zap size={20} color={C.amber} />, bg: C.amberGlow, title: 'Activity Report', desc: 'Usage stats, heatmaps, leaderboard' },
              ].map((q) => (
                <Link key={q.href} href={q.href} className="adm-quick-card">
                  <div className="adm-quick-icon" style={{ background: q.bg }}>{q.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{q.title}</div>
                    <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{q.desc}</div>
                  </div>
                  <ArrowRight size={14} color={C.muted} style={{ flexShrink: 0, marginTop: 2 }} />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </AdminShell>
    </>
  );
}
