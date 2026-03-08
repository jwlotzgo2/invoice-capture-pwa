'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Invoice, InvoiceFilters } from '@/types/invoice';
import { Camera, Shield, TrendingUp, FileText, Receipt, Building2, ChevronRight, Upload } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';

type Period = 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'all';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  yellow: '#e5e5e5', yellowGlow: 'rgba(229,229,229,0.1)',
  blue: '#8a8a8a', blueGlow: 'rgba(138,138,138,0.15)',
  text: '#f0f0f0', textDim: '#8a8a8a', textMuted: '#6b6b6b',
  error: '#fca5a5', success: '#86efac', warning: '#fdba74',
};

const PERIODS: { key: Period; label: string }[] = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_year', label: 'This Year' },
  { key: 'last_year', label: 'Last Year' },
  { key: 'all', label: 'All Time' },
];

function getPeriodRange(period: Period) {
  const now = new Date();
  switch (period) {
    case 'this_month': return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last_month': { const lm = subMonths(now, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; }
    case 'this_year': return { from: startOfYear(now), to: endOfYear(now) };
    case 'last_year': { const ly = new Date(now.getFullYear() - 1, 0, 1); return { from: startOfYear(ly), to: endOfYear(ly) }; }
    default: return { from: null, to: null };
  }
}

function fmtZAR(n: number | null) {
  if (!n) return 'R 0';
  return `R ${Math.round(n).toLocaleString('en-ZA')}`;
}

const CAT_COLORS: Record<string, string> = {
  'Travel & Transport': '#3b82f6', 'Utilities': '#f59e0b',
  'Materials & Supplies': '#8b5cf6', 'Subscriptions & Software': '#06b6d4',
  'Professional Services': '#10b981', 'Food & Entertainment': '#e5e5e5',
  'Equipment': '#8a8a8a', 'Marketing': '#ec4899',
  'Other': '#8a8a8a', 'Uncategorised': '#6b6b6b',
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap');
  * { box-sizing: border-box; }
  body { background: ${T.bg}; margin: 0; }
  .dash { min-height: 100svh; background: ${T.bg}; font-family: 'Share Tech Mono',Inter, system-ui, sans-serif; color: ${T.text};
    background-image: radial-gradient(ellipse at 20% 20%,rgba(99,102,241,0.06) 0%,transparent 50%),
      radial-gradient(ellipse at 80% 80%,rgba(250,204,21,0.04) 0%,transparent 50%); }
  .scanline { position:fixed;top:0;left:0;right:0;bottom:0;
    background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);
    pointer-events:none;z-index:1000; }
  .dash-header { background:${T.surface};border-bottom:1px solid ${T.border};padding:14px 16px;
    display:flex;align-items:center;justify-content:space-between;
    position:sticky;top:0;z-index:40;box-shadow:0 0 20px rgba(138,138,138,0.08); }
  .dash-logo { display:flex;align-items:center;gap:10px; }
  .dash-logo-mark { width:32px;height:32px;background:${T.yellow};border-radius:4px;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 10px rgba(229,229,229,0.12); }
  .dash-title { font-family:Inter, system-ui, sans-serif;font-size:22px;letter-spacing:0.3px;color:${T.yellow};
    text-shadow:0 0 10px rgba(229,229,229,0.12); }
  .icon-btn { width:36px;height:36px;border-radius:6px;border:1px solid ${T.border};
    background:transparent;display:flex;align-items:center;justify-content:center;
    color:${T.textDim};cursor:pointer;text-decoration:none; }
  .period-strip { display:flex;gap:6px;padding:14px 16px 2px;overflow-x:auto;scrollbar-width:none; }
  .period-strip::-webkit-scrollbar { display:none; }
  .period-btn { flex-shrink:0;padding:6px 14px;border-radius:4px;font-size:11px;letter-spacing:0.2px;
    border:1px solid ${T.border};background:transparent;color:${T.textDim};cursor:pointer;
    font-family:Inter, system-ui, sans-serif;white-space:nowrap;text-transform:none;transition:all 0.15s; }
  .period-btn.active { background:${T.yellowGlow};border-color:${T.yellow};color:${T.yellow};
    box-shadow:0 0 8px rgba(229,229,229,0.1); }
  .capture-hero { margin:14px 16px;border-radius:8px;
    background:linear-gradient(135deg,#282828 0%,#1a1a2e 60%,#16213e 100%);
    border:1px solid ${T.blue};
    padding:18px 20px;display:flex;align-items:center;justify-content:space-between;
    box-shadow:0 0 24px rgba(138,138,138,0.12);position:relative;overflow:hidden; }
  .capture-hero::before { content:'>';position:absolute;right:16px;top:50%;transform:translateY(-50%);
    font-family:Inter, system-ui, sans-serif;font-size:80px;color:rgba(138,138,138,0.08);line-height:1; }
  .capture-hero-text h2 { font-family:Inter, system-ui, sans-serif;font-size:22px;letter-spacing:0.3px;
    color:${T.yellow};margin:0 0 3px;text-shadow:0 0 8px rgba(229,229,229,0.12); }
  .capture-hero-text p { font-size:12px;color:${T.textDim};margin:0;letter-spacing:0.5px; }
  .capture-hero-actions { display:flex;gap:8px;z-index:1; }
  .capture-btn { display:flex;align-items:center;gap:6px;background:${T.yellow};color:${T.bg};
    border:none;border-radius:4px;padding:9px 14px;font-size:13px;letter-spacing:0.2px;
    cursor:pointer;white-space:nowrap;text-decoration:none;
    font-family:Inter, system-ui, sans-serif;text-transform:none;
    box-shadow:0 0 12px rgba(229,229,229,0.12); }
  .capture-btn-sec { background:transparent;color:${T.blue};border:1px solid ${T.blue};box-shadow:none; }
  .kpi-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 16px; }
  .kpi-card { background:${T.surface};border-radius:8px;padding:14px;
    border:1px solid ${T.border};position:relative;overflow:hidden; }
  .kpi-card::before { content:'';position:absolute;top:0;left:0;right:0;height:2px; }
  .kpi-card.yellow::before { background:${T.yellow};box-shadow:0 0 8px rgba(229,229,229,0.18); }
  .kpi-card.blue::before { background:${T.blue};box-shadow:0 0 8px rgba(99,102,241,0.4); }
  .kpi-card.green::before { background:${T.success};box-shadow:0 0 8px rgba(74,222,128,0.4); }
  .kpi-card.red::before { background:${T.error};box-shadow:0 0 8px rgba(248,113,113,0.4); }
  .kpi-label { font-size:10px;letter-spacing:0.3px;color:${T.textDim};text-transform:none;margin-bottom:6px; }
  .kpi-value { font-family:Inter, system-ui, sans-serif;font-size:26px;color:${T.text};line-height:1;display:block; }
  .kpi-sub { font-size:10px;color:${T.textMuted};letter-spacing:0.2px;margin-top:4px;display:block; }
  .section-hdr { display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin:14px 0 8px; }
  .section-title { font-family:Inter, system-ui, sans-serif;font-size:18px;letter-spacing:0.3px;color:${T.yellow}; }
  .section-link { font-size:11px;color:${T.blue};background:none;border:none;cursor:pointer;
    font-family:Inter, system-ui, sans-serif;letter-spacing:0.2px;display:flex;align-items:center;gap:4px;text-decoration:none; }
  .t-card { background:${T.surface};border:1px solid ${T.border};border-radius:8px;
    padding:16px;margin:0 16px 12px;position:relative;overflow:hidden; }
  .t-card::before { content:'';position:absolute;top:0;left:0;right:0;height:1px;
    background:linear-gradient(90deg,transparent,${T.blue},transparent);opacity:0.4; }
  .supplier-row { display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid ${T.border}; }
  .supplier-row:last-child { border-bottom:none; }
  .supplier-rank { width:22px;height:22px;border-radius:4px;background:${T.surfaceHigh};
    display:flex;align-items:center;justify-content:center;font-size:11px;
    color:${T.textDim};flex-shrink:0;font-family:Inter, system-ui, sans-serif;font-size:16px; }
  .supplier-name { font-size:13px;color:${T.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .supplier-total { font-family:Inter, system-ui, sans-serif;font-size:13px;color:${T.yellow};white-space:nowrap;flex-shrink:0; }
  .cat-bar-row { margin-bottom:10px; }
  .cat-bar-top { display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px; }
  .cat-bar-track { height:4px;background:${T.border};border-radius:2px;overflow:hidden; }
  .cat-bar-fill { height:100%;border-radius:2px; }
  .recent-row { display:flex;align-items:center;justify-content:space-between;
    padding:10px 0;border-bottom:1px solid ${T.border};cursor:pointer;transition:opacity 0.15s; }
  .recent-row:hover { opacity:0.75; }
  .recent-row:last-child { border-bottom:none; }
  .empty-state { text-align:center;padding:48px 24px; }
  .skel { background:${T.surfaceHigh};border-radius:4px;animation:pulse 1.5s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .t-cursor { animation:tblink 1s step-end infinite;color:${T.yellow}; }
  @keyframes tblink { 0%,100%{opacity:1} 50%{opacity:0} }
`;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [period, setPeriod] = useState<Period>('this_month');
  const [filters] = useState<InvoiceFilters>({ search: '', status: '', dateFrom: '', dateTo: '', sortBy: 'created_at', sortOrder: 'desc' });
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { sessionStorage.setItem('uploadedInvoice', reader.result as string); router.push('/capture?source=upload'); };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
        setIsAdmin(profile?.role === 'admin');
      }
    };
    checkAdmin();
  }, []);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('invoices').select('*').eq('user_id', user?.id || '').order('created_at', { ascending: false });
      setInvoices(data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const { from: periodFrom, to: periodTo } = getPeriodRange(period);
  const periodInvoices = periodFrom && periodTo
    ? invoices.filter(i => { const d = i.invoice_date ? new Date(i.invoice_date) : new Date(i.created_at); return d >= periodFrom! && d <= periodTo!; })
    : invoices;

  const totalDocs = periodInvoices.length;
  const totalAmount = periodInvoices.reduce((s, i) => s + (i.amount ?? 0), 0);
  const totalVAT = periodInvoices.reduce((s, i) => s + (i.vat_amount ?? 0), 0);
  const totalExclVAT = totalAmount - totalVAT;
  const periodLabel = period === 'all' ? 'All time' : PERIODS.find(p => p.key === period)?.label || '';

  const supplierMap: Record<string, { count: number; total: number }> = {};
  periodInvoices.forEach(inv => {
    const key = inv.supplier || 'Unknown';
    if (!supplierMap[key]) supplierMap[key] = { count: 0, total: 0 };
    supplierMap[key].count++; supplierMap[key].total += inv.amount ?? 0;
  });
  const topSuppliers = Object.entries(supplierMap).sort((a, b) => b[1].total - a[1].total).slice(0, 5);

  const categoryMap: Record<string, { total: number }> = {};
  periodInvoices.forEach(inv => {
    const cat = inv.category || 'Uncategorised';
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0 };
    categoryMap[cat].total += inv.amount ?? 0;
  });
  const topCategories = Object.entries(categoryMap).sort((a, b) => b[1].total - a[1].total).slice(0, 6);
  const catTotal = topCategories.reduce((s, [, v]) => s + v.total, 0) || 1;

  return (
    <>
      <style>{css}</style>
      <div className="dash">
        <div className="scanline" />

        <header className="dash-header">
          <div className="dash-logo">
            <div className="dash-logo-mark"><Receipt size={16} color="#1c1c1c" /></div>
            <span className="dash-title">CAPTURE<span className="t-cursor">_</span></span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {isAdmin && (
              <Link href="/admin" className="icon-btn" title="Admin"><Shield size={16} color="#8a8a8a" /></Link>
            )}
          </div>
        </header>

        <main>
          {/* Capture hero */}
          <div className="capture-hero">
            <div className="capture-hero-text">
              <h2>ADD DOCUMENT</h2>
              <p>Camera · Upload · Gallery</p>
            </div>
            <div className="capture-hero-actions">
              <Link href="/capture" className="capture-btn"><Camera size={15} />Camera</Link>
              <button className="capture-btn capture-btn-sec" onClick={() => fileInputRef.current?.click()}><Upload size={15} />Upload</button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />

          {/* Period filter */}
          <div className="period-strip">
            {PERIODS.map(({ key, label }) => (
              <button key={key} className={`period-btn${period === key ? ' active' : ''}`} onClick={() => setPeriod(key)}>{label}</button>
            ))}
          </div>

          {/* KPI grid */}
          <div className="kpi-grid">
            {[
              { label: 'Documents', value: totalDocs.toString(), accent: 'blue', icon: <FileText size={14} color={T.blue} /> },
              { label: 'Total Spend', value: fmtZAR(totalAmount), accent: 'yellow', icon: <TrendingUp size={14} color={T.yellow} /> },
              { label: 'Excl. VAT', value: fmtZAR(totalExclVAT), accent: 'green', icon: <Receipt size={14} color={T.success} /> },
              { label: 'VAT', value: fmtZAR(totalVAT), accent: 'red', icon: <Building2 size={14} color={T.error} /> },
            ].map(({ label, value, accent, icon }) => (
              <div key={label} className={`kpi-card ${accent}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="kpi-label">{label}</span>
                  {icon}
                </div>
                <span className="kpi-value">{value}</span>
                <span className="kpi-sub">{periodLabel}</span>
              </div>
            ))}
          </div>

          {/* Top suppliers */}
          {topSuppliers.length > 0 && (
            <>
              <div className="section-hdr">
                <span className="section-title">TOP SUPPLIERS</span>
                <button className="section-link" onClick={() => router.push('/invoices/list')}>View all <ChevronRight size={12} /></button>
              </div>
              <div className="t-card">
                {topSuppliers.map(([name, stats], i) => (
                  <div key={name} className="supplier-row">
                    <span className="supplier-rank">{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="supplier-name">{name}</div>
                    </div>
                    <span className="supplier-total">{fmtZAR(stats.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Categories */}
          {topCategories.length > 0 && (
            <>
              <div className="section-hdr">
                <span className="section-title">BY CATEGORY</span>
              </div>
              <div className="t-card">
                {topCategories.map(([cat, stats]) => (
                  <div key={cat} className="cat-bar-row">
                    <div className="cat-bar-top">
                      <span style={{ color: T.textDim, fontSize: 12 }}>{cat}</span>
                      <span style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: 12, color: T.yellow }}>{fmtZAR(stats.total)}</span>
                    </div>
                    <div className="cat-bar-track">
                      <div className="cat-bar-fill" style={{ width: `${(stats.total / catTotal) * 100}%`, background: CAT_COLORS[cat] || T.textDim }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Recent invoices */}
          {invoices.length > 0 && (
            <>
              <div className="section-hdr">
                <span className="section-title">RECENT</span>
                <button className="section-link" onClick={() => router.push('/invoices/list')}>View all <ChevronRight size={12} /></button>
              </div>
              <div className="t-card">
                {loading
                  ? [...Array(3)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                      <div className="skel" style={{ width: '50%', height: 14 }} />
                      <div className="skel" style={{ width: '20%', height: 14 }} />
                    </div>
                  ))
                  : invoices.slice(0, 5).map(inv => (
                    <div key={inv.id} className="recent-row" onClick={() => router.push(`/invoices/${inv.id}`)}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.supplier || 'Unknown'}</div>
                        {inv.document_number && <div style={{ fontSize: 11, color: T.textMuted, fontFamily: 'Share Tech Mono,monospace' }}>#{inv.document_number}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                        <div style={{ fontSize: 13, color: T.yellow, fontFamily: 'Share Tech Mono,monospace' }}>{inv.amount ? fmtZAR(inv.amount) : '—'}</div>
                        {inv.invoice_date && <div style={{ fontSize: 11, color: T.textMuted }}>{new Date(inv.invoice_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</div>}
                      </div>
                    </div>
                  ))
                }
              </div>
            </>
          )}

          {!loading && invoices.length === 0 && (
            <div className="empty-state">
              <div style={{ fontFamily: 'VT323,monospace', fontSize: 20, letterSpacing: 3, color: T.textMuted, marginBottom: 16 }}>[ NO DOCUMENTS YET ]</div>
              <Link href="/capture" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: T.yellow, color: T.bg, borderRadius: 4, fontSize: 13, fontFamily: 'Share Tech Mono,monospace', letterSpacing: 1, textDecoration: 'none', textTransform: 'uppercase' }}>
                <Camera size={16} />Capture First Invoice
              </Link>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
