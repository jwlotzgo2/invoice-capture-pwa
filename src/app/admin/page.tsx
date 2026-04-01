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

const T = {
  bg: '#0f0f0f', surface: '#1c1c1c', surfaceHigh: '#242424', border: '#2a2a2a',
  borderHigh: '#383838', text: '#f0f0f0', textDim: '#a3a3a3', textMuted: '#6b6b6b',
  accent: '#38bdf8', accentGlow: 'rgba(56,189,248,0.1)',
  success: '#86efac', successBg: 'rgba(134,239,172,0.08)',
  warning: '#fdba74', warningBg: 'rgba(253,186,116,0.08)',
  error: '#fca5a5', errorBg: 'rgba(252,165,165,0.08)',
  purple: '#c084fc', purpleBg: 'rgba(192,132,252,0.08)',
};

const css = `
  @keyframes spin { to { transform: rotate(360deg); } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .adm { font-family: Inter, system-ui, sans-serif; min-height: 100svh; background: ${T.bg}; color: ${T.text}; }
  .adm-header { background: ${T.surface}; border-bottom: 1px solid ${T.border}; padding: 14px 16px; position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .adm-logo { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
  .adm-logo-dot { width: 10px; height: 10px; border-radius: 3px; background: ${T.accent}; flex-shrink: 0; }
  .adm-logo-text { font-size: 17px; font-weight: 800; color: ${T.text}; letter-spacing: -0.3px; }
  .adm-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: ${T.accentGlow}; color: ${T.accent}; border: 1px solid rgba(56,189,248,0.3); letter-spacing: 0.3px; text-transform: uppercase; }
  .adm-back { font-size: 13px; font-weight: 600; color: ${T.textDim}; text-decoration: none; padding: 8px 12px; border: 1px solid ${T.border}; border-radius: 8px; transition: border-color 0.15s, color 0.15s; flex-shrink: 0; }
  .adm-back:hover { border-color: ${T.borderHigh}; color: ${T.text}; }
  .adm-org-select { padding: 8px 12px; border: 1px solid ${T.border}; border-radius: 8px; font-size: 13px; font-family: inherit; color: ${T.text}; outline: none; background: ${T.bg}; transition: border-color 0.15s; min-width: 160px; max-width: 260px; }
  .adm-org-select:focus { border-color: ${T.accent}; }
  .adm-main { max-width: 1280px; margin: 0 auto; padding: 20px 16px 80px; display: flex; flex-direction: column; gap: 20px; }
  .adm-grid-4 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  @media(min-width: 640px) { .adm-grid-4 { grid-template-columns: repeat(4, 1fr); } }
  .adm-grid-2 { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media(min-width: 768px) { .adm-grid-2 { grid-template-columns: 1fr 1fr; } }
  .adm-grid-3 { display: grid; grid-template-columns: 1fr; gap: 12px; }
  @media(min-width: 640px) { .adm-grid-3 { grid-template-columns: repeat(2, 1fr); } }
  @media(min-width: 960px) { .adm-grid-3 { grid-template-columns: repeat(3, 1fr); } }
  .adm-card { background: ${T.surface}; border-radius: 12px; border: 1px solid ${T.border}; padding: 18px; }
  .adm-kpi-icon { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
  .adm-kpi-val { font-size: 26px; font-weight: 800; color: ${T.text}; letter-spacing: -0.8px; line-height: 1.1; font-variant-numeric: tabular-nums; }
  .adm-kpi-label { font-size: 11px; font-weight: 700; color: ${T.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 5px; }
  .adm-kpi-sub { font-size: 11px; color: ${T.textMuted}; margin-top: 3px; }
  .adm-section-title { font-size: 13px; font-weight: 700; color: ${T.textDim}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
  .adm-bar-row { margin-bottom: 14px; }
  .adm-bar-top { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
  .adm-bar-label { color: ${T.textDim}; font-weight: 500; display: flex; align-items: center; gap: 6px; }
  .adm-bar-val { color: ${T.text}; font-weight: 700; font-variant-numeric: tabular-nums; }
  .adm-bar-track { height: 6px; background: ${T.bg}; border-radius: 99px; overflow: hidden; }
  .adm-bar-fill { height: 100%; border-radius: 99px; transition: width 0.5s; }
  .adm-stat-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-top: 1px solid ${T.border}; }
  .adm-quick-card { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 12px; padding: 18px; text-decoration: none; display: flex; align-items: center; gap: 14px; transition: border-color 0.15s, background 0.15s; }
  .adm-quick-card:hover { border-color: ${T.borderHigh}; background: ${T.surfaceHigh}; }
  .adm-quick-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid ${T.border}; }
  .adm-org-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid ${T.border}; }
  .adm-org-row:last-child { border-bottom: none; padding-bottom: 0; }
  .adm-divider { height: 1px; background: ${T.border}; }
`;

function confColor(c: number | null) {
  if (!c) return T.textMuted;
  if (c >= 0.85) return T.success;
  if (c >= 0.65) return T.warning;
  return T.error;
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
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
      <Loader2 size={28} color={T.accent} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif', background: T.bg }}>
      <AlertTriangle size={40} color={T.error} />
      <p style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: '16px 0 8px' }}>{error}</p>
      <button onClick={() => router.push('/')} style={{ color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>← Back to app</button>
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
          <div className="adm-logo">
            <div className="adm-logo-dot" />
            <div className="adm-logo-text">Admin Console</div>
            <div className="adm-badge">Go Capture</div>
          </div>
          {orgs.length > 0 && (
            <select className="adm-org-select" value={orgFilter} onChange={e => setOrgFilter(e.target.value)}>
              <option value="all">All Organisations</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          <Link href="/" className="adm-back">← App</Link>
        </header>

        <main className="adm-main">

          {/* KPI row */}
          <div className="adm-grid-4">
            {[
              {
                icon: <FileText size={17} color={T.accent} />, bg: T.accentGlow,
                val: docsProcessed.toLocaleString(),
                label: 'Docs Processed',
                sub: filteredOrg ? filteredOrg.name : `+${stats?.invoicesThisWeek || 0} this week`,
              },
              {
                icon: <Activity size={17} color={T.purple} />, bg: T.purpleBg,
                val: confPct !== null ? `${confPct}%` : '—',
                label: 'Avg OCR Confidence',
                sub: confLabel(avgConf),
                valColor: confColor(avgConf),
              },
              {
                icon: <AlertTriangle size={17} color={T.warning} />, bg: T.warningBg,
                val: (stats?.lowConfidenceCount || 0).toString(),
                label: 'Low Confidence',
                sub: 'scans below 70%',
              },
              {
                icon: <Users size={17} color={T.success} />, bg: T.successBg,
                val: usersCount.toLocaleString(),
                label: 'Users',
                sub: filteredOrg ? `in ${filteredOrg.name}` : `${stats?.activeUsers || 0} active`,
              },
            ].map((k) => (
              <div key={k.label} className="adm-card">
                <div className="adm-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                <div className="adm-kpi-val" style={{ color: (k as any).valColor || T.text }}>{k.val}</div>
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
                { icon: <Camera size={13} color={T.accent} />, label: 'Camera', val: stats?.invoicesBySource.camera || 0, color: T.accent },
                { icon: <Upload size={13} color={T.success} />, label: 'Upload', val: stats?.invoicesBySource.upload || 0, color: T.success },
                { icon: <Mail size={13} color={T.purple} />, label: 'Email', val: stats?.invoicesBySource.email || 0, color: T.purple },
              ].map((b) => (
                <div key={b.label} className="adm-bar-row">
                  <div className="adm-bar-top">
                    <span className="adm-bar-label">{b.icon}{b.label}</span>
                    <span className="adm-bar-val">{b.val} <span style={{ color: T.textMuted, fontWeight: 400 }}>({Math.round((b.val / srcTotal) * 100)}%)</span></span>
                  </div>
                  <div className="adm-bar-track">
                    <div className="adm-bar-fill" style={{ width: `${(b.val / srcTotal) * 100}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="adm-card">
              <div className="adm-section-title">OCR Health</div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: T.textDim, fontWeight: 500 }}>Average Confidence</span>
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
                <div key={row.label} className="adm-stat-row">
                  <span style={{ fontSize: 13, color: T.textDim }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: row.warn ? T.warning : T.text }}>{row.val}</span>
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
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: T.accentGlow, border: `1px solid rgba(56,189,248,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={15} color={T.accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{org.user_count} user{org.user_count !== 1 ? 's' : ''} · {org.invoice_count} invoices</div>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: 10, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: confColor(org.avg_confidence) }}>
                      {org.avg_confidence ? `${Math.round(org.avg_confidence * 100)}%` : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: T.textMuted }}>OCR</div>
                  </div>
                  {org.avg_confidence === null ? (
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: T.border, flexShrink: 0 }} />
                  ) : org.avg_confidence >= 0.85 ? (
                    <CheckCircle size={15} color={T.success} style={{ flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={15} color={org.avg_confidence >= 0.65 ? T.warning : T.error} style={{ flexShrink: 0 }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Platform Costs */}
          <div className="adm-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="adm-section-title" style={{ margin: 0 }}>Platform Costs · This Month</div>
              <span style={{ fontSize: 11, color: T.textMuted }}>est.</span>
            </div>
            {(() => {
              const scanCount = filteredOrg ? filteredOrg.invoice_count : (stats?.totalInvoices || 0);
              const claudeCost = scanCount * 0.02;
              const supabaseCost = 25;
              const vercelCost = 20;
              const totalCost = claudeCost + supabaseCost + vercelCost;
              const costPerDoc = scanCount > 0 ? totalCost / scanCount : 0;
              const items = [
                { label: 'Claude OCR', detail: `${scanCount} scans × $0.02`, cost: claudeCost, color: T.purple },
                { label: 'Supabase Pro', detail: 'fixed monthly', cost: supabaseCost, color: T.accent },
                { label: 'Vercel Pro', detail: 'fixed monthly', cost: vercelCost, color: T.textDim },
              ];
              return (
                <>
                  {items.map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{item.detail}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: item.color }}>${item.cost.toFixed(2)}</div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Total</div>
                      {costPerDoc > 0 && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>${costPerDoc.toFixed(3)} per document</div>}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, color: T.text }}>${totalCost.toFixed(2)}</div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Quick links */}
          <div>
            <div className="adm-section-title" style={{ marginBottom: 12 }}>Quick Links</div>
            <div className="adm-grid-3">
              {[
                { href: '/admin/users', icon: <Users size={17} color={T.accent} />, bg: T.accentGlow, border: 'rgba(56,189,248,0.2)', title: 'User Management', desc: 'Manage users, roles, organisations' },
                { href: '/admin/orgs', icon: <Shield size={17} color={T.purple} />, bg: T.purpleBg, border: 'rgba(192,132,252,0.2)', title: 'Organisations', desc: 'Org codes, member assignment' },
                { href: '/admin/analytics', icon: <TrendingUp size={17} color={T.success} />, bg: T.successBg, border: 'rgba(134,239,172,0.2)', title: 'OCR Analytics', desc: 'Field accuracy and correction patterns' },
                { href: '/invoices/list', icon: <FileText size={17} color={T.warning} />, bg: T.warningBg, border: 'rgba(253,186,116,0.2)', title: 'All Invoices', desc: 'Browse and export all invoices' },
                { href: '/admin/journal', icon: <Activity size={17} color={T.accent} />, bg: T.accentGlow, border: 'rgba(56,189,248,0.2)', title: 'Activity Journal', desc: 'Live feed of all user events' },
                { href: '/admin/activity-report', icon: <Zap size={17} color={T.warning} />, bg: T.warningBg, border: 'rgba(253,186,116,0.2)', title: 'Activity Report', desc: 'Usage stats, heatmaps, leaderboard' },
              ].map((q) => (
                <Link key={q.href} href={q.href} className="adm-quick-card">
                  <div className="adm-quick-icon" style={{ background: q.bg, borderColor: q.border }}>{q.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{q.title}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>{q.desc}</div>
                  </div>
                  <ArrowRight size={15} color={T.textMuted} style={{ flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          </div>

        </main>
      </div>
    </>
  );
}
