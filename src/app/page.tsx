'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Invoice, InvoiceFilters } from '@/types/invoice';
import { Camera, Shield, TrendingUp, FileText, Receipt, Building2, ChevronRight, Upload, Bell, HelpCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { getPendingCount } from '@/lib/offlineQueue';
import { usePermissions } from '@/context/PermissionsContext';

type Period = 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_year', label: 'This Year' },
  { key: 'last_year', label: 'Last Year' },
  { key: 'all', label: 'All Time' },
];

function getPeriodRange(period: Period): { from: Date | null; to: Date | null } {
  const now = new Date();
  switch (period) {
    case 'this_month': return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last_month': { const lm = subMonths(now, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; }
    case 'this_year': return { from: startOfYear(now), to: endOfYear(now) };
    case 'last_year': { const ly = new Date(now.getFullYear() - 1, 0, 1); return { from: startOfYear(ly), to: endOfYear(ly) }; }
    default: return { from: null, to: null };
  }
}

function formatZAR(amount: number | null) {
  if (!amount) return 'R 0.00';
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount).replace('ZAR', 'R');
}

function KPICard({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className={`kpi-card ${accent}`}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-body">
        <span className="kpi-value">{value}</span>
        <span className="kpi-label">{label}</span>
        {sub && <span className="kpi-sub">{sub}</span>}
      </div>
    </div>
  );
}

function SupplierRow({ name, count, total, rank }: { name: string; count: number; total: number; rank: number }) {
  return (
    <div className="supplier-row">
      <span className="supplier-rank">{rank}</span>
      <div className="supplier-info">
        <span className="supplier-name">{name}</span>
      </div>
      <span className="supplier-total">{formatZAR(total)}</span>
    </div>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [period, setPeriod] = useState<Period>('this_month');
  const [filters] = useState<InvoiceFilters>({ search: '', status: '', dateFrom: '', dateTo: '', sortBy: 'created_at', sortOrder: 'desc' });
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canCapture } = usePermissions();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { sessionStorage.setItem('uploadedInvoice', reader.result as string); router.push('/capture?source=upload'); };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const checkOnboarding = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarded_at, org_id')
        .eq('id', session.user.id)
        .single();
      if (!profile?.onboarded_at) {
        router.replace('/onboarding');
        return;
      }

      // Auto-join org from invite code if present in URL or sessionStorage
      if (!profile.org_id) {
        const urlParams = new URLSearchParams(window.location.search);
        const inviteCode = urlParams.get('invite') || sessionStorage.getItem('pendingInvite');
        if (inviteCode) {
          sessionStorage.removeItem('pendingInvite');
          await supabase.rpc('join_org_by_code', { p_code: inviteCode.toUpperCase() });
          // Clean URL and let PermissionsContext refresh
          window.history.replaceState({}, '', '/');
        }
      } else {
        // Already in an org — clear any stale invite from storage
        sessionStorage.removeItem('pendingInvite');
      }
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
        setIsAdmin(profile?.role === 'admin');
        const { count } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('source', 'email')
          .eq('status', 'pending_review');
        const offlineCount = await getPendingCount().catch(() => 0);
        setPendingCount((count || 0) + offlineCount);
      }
    };
    checkAdmin();
  }, [supabase]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fetchUser = session?.user;
      let query = supabase.from('invoices').select('*').eq('user_id', fetchUser?.id || '').order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });
      if (filters.search) query = query.or(`supplier.ilike.%${filters.search}%,description.ilike.%${filters.search}%,business_name.ilike.%${filters.search}%`);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.dateFrom) query = query.gte('invoice_date', filters.dateFrom);
      if (filters.dateTo) query = query.lte('invoice_date', filters.dateTo);
      const { data, error } = await query;
      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, filters]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // ── KPI calculations filtered by period ──────────────────────────────────
  const { from: periodFrom, to: periodTo } = getPeriodRange(period);

  const periodInvoices = periodFrom && periodTo
    ? invoices.filter((i) => {
        const d = i.invoice_date ? new Date(i.invoice_date) : new Date(i.created_at);
        return d >= periodFrom && d <= periodTo;
      })
    : invoices;

  const totalDocs = periodInvoices.length;
  const totalAmount = periodInvoices.reduce((s, i) => s + (i.amount ?? 0), 0);
  const totalVAT = periodInvoices.reduce((s, i) => s + (i.vat_amount ?? 0), 0);

  // FIX: Open invoices — ignores period filter, always shows full outstanding balance
  const openInvoicesTotal = invoices
    .filter(i => i.doc_status === 'open' && !i.is_paid)
    .reduce((s, i) => s + (i.amount ?? 0), 0);
  const openInvoicesCount = invoices.filter(i => i.doc_status === 'open' && !i.is_paid).length;

  const periodLabel = period === 'all' ? 'All time' : PERIODS.find(p => p.key === period)?.label || '';

  // Top suppliers for period
  const supplierMap: Record<string, { count: number; total: number }> = {};
  periodInvoices.forEach((inv) => {
    const key = inv.supplier || 'Unknown';
    if (!supplierMap[key]) supplierMap[key] = { count: 0, total: 0 };
    supplierMap[key].count++;
    supplierMap[key].total += inv.amount ?? 0;
  });
  const topSuppliers = Object.entries(supplierMap).sort((a, b) => b[1].total - a[1].total).slice(0, 5);

  // Category breakdown for period
  const categoryMap: Record<string, { count: number; total: number }> = {};
  periodInvoices.forEach((inv) => {
    const cat = inv.category || 'Uncategorised';
    if (!categoryMap[cat]) categoryMap[cat] = { count: 0, total: 0 };
    categoryMap[cat].count++;
    categoryMap[cat].total += inv.amount ?? 0;
  });
  const topCategories = Object.entries(categoryMap).sort((a, b) => b[1].total - a[1].total).slice(0, 6);
  const catTotal = topCategories.reduce((s, [, v]) => s + v.total, 0) || 1;
  const CAT_COLORS: Record<string, string> = {
    'Travel & Transport': '#3b82f6', 'Utilities': '#f59e0b',
    'Materials & Supplies': '#8b5cf6', 'Subscriptions & Software': '#06b6d4',
    'Professional Services': '#10b981', 'Food & Entertainment': '#f97316',
    'Equipment': '#6366f1', 'Marketing': '#ec4899',
    'Other': '#94a3b8', 'Uncategorised': '#cbd5e1',
  };

  return (
    <>
      <style>{`
        :root {
          --blue:#a3a3a3; --blue-light:rgba(163,163,163,0.1); --blue-mid:rgba(163,163,163,0.2);
          --ink:#f0f0f0; --ink-2:#d4d4d4; --ink-3:#8a8a8a;
          --surface:#1c1c1c; --card:#282828; --border:#383838;
          --green:#86efac; --green-light:rgba(134,239,172,0.12);
          --amber:#fdba74; --amber-light:rgba(253,186,116,0.12);
          --rose:#fca5a5; --rose-light:rgba(252,165,165,0.12);
        }
        body { font-family: Inter, system-ui, sans-serif; background: var(--surface); color: var(--ink); }
        .page { min-height: 100svh; display: flex; flex-direction: column; }

        .header { position: sticky; top: 0; z-index: 40; background: var(--card); border-bottom: 1px solid var(--border); padding: 0 16px; }
        .header-top { display: flex; align-items: center; justify-content: space-between; height: 56px; }
        .header-logo { display: flex; align-items: center; gap: 10px; }
        .header-logo-mark { width: 32px; height: 32px; background: #e5e5e5; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .header-title { font-size: 17px; font-weight: 700; color: var(--ink); letter-spacing: -0.3px; }
        .header-actions { display: flex; gap: 4px; }
        .icon-btn { width: 36px; height: 36px; border-radius: 8px; border: none; background: transparent; display: flex; align-items: center; justify-content: center; color: var(--ink-3); cursor: pointer; }
        .icon-btn.admin { color: #7c3aed; }
        .bell-wrap { position: relative; display: inline-flex; }
        .bell-badge { position: absolute; top: -4px; right: -4px; min-width: 16px; height: 16px; border-radius: 8px; background: var(--rose); color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; padding: 0 4px; pointer-events: none; border: 2px solid var(--card); line-height: 1; }

        .period-strip { display: flex; gap: 6px; padding: 12px 16px 0; overflow-x: auto; scrollbar-width: none; }
        .period-strip::-webkit-scrollbar { display: none; }
        .period-btn { flex-shrink: 0; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1.5px solid var(--border); background: var(--card); color: var(--ink-3); cursor: pointer; font-family: inherit; white-space: nowrap; transition: all 0.15s; }
        .period-btn.active { background: var(--blue); border-color: var(--ink); color: #fff; box-shadow: 0 2px 8px rgba(37,99,235,0.25); }

        .capture-hero { margin: 14px 16px; border-radius: 16px; background: linear-gradient(135deg,#1d4ed8 0%,#2563eb 50%,#3b82f6 100%); padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 24px rgba(37,99,235,0.25); position: relative; overflow: hidden; }
        .capture-hero::before { content:''; position:absolute; right:-20px; top:-20px; width:120px; height:120px; border-radius:50%; background:rgba(255,255,255,0.08); }
        .capture-hero-text h2 { font-size: 17px; font-weight: 700; color: #fff; margin: 0 0 3px; }
        .capture-hero-text p { font-size: 12px; color: rgba(255,255,255,0.75); margin: 0; }
        .capture-hero-actions { display: flex; gap: 8px; z-index: 1; }
        .capture-btn { display: flex; align-items: center; gap: 6px; background: #323232; color: var(--ink); border: none; border-radius: 10px; padding: 9px 14px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; text-decoration: none; font-family: inherit; }
        .capture-btn-sec { background: rgba(255,255,255,0.18); color: #fff; border: 1.5px solid rgba(255,255,255,0.4); }

        .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 16px; }
        .kpi-card { background: var(--card); border-radius: 14px; padding: 14px; display: flex; gap: 12px; align-items: flex-start; border: 1px solid var(--border); box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
        .kpi-card.blue .kpi-icon { background: var(--blue-light); color: var(--ink); }
        .kpi-card.green .kpi-icon { background: var(--green-light); color: var(--green); }
        .kpi-card.amber .kpi-icon { background: var(--amber-light); color: var(--amber); }
        .kpi-card.rose .kpi-icon { background: var(--rose-light); color: var(--rose); }
        .kpi-icon { width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .kpi-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .kpi-value { font-size: 15px; font-weight: 700; color: var(--ink); line-height: 1.2; font-family: Inter, system-ui, sans-serif; }
        .kpi-label { font-size: 11px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-sub { font-size: 11px; color: var(--ink-3); }

        .section-header { display: flex; align-items: center; justify-content: space-between; padding: 0 16px; margin-bottom: 10px; }
        .section-title { font-size: 14px; font-weight: 700; color: var(--ink); }
        .section-link { font-size: 12px; font-weight: 600; color: var(--ink); text-decoration: none; display: flex; align-items: center; gap: 2px; background: none; border: none; cursor: pointer; font-family: inherit; }

        .suppliers-card { margin: 0 16px 16px; background: var(--card); border-radius: 14px; border: 1px solid var(--border); overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
        .supplier-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border); }
        .supplier-row:last-child { border-bottom: none; }
        .supplier-rank { width: 22px; height: 22px; border-radius: 6px; background: var(--surface); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--ink-3); flex-shrink: 0; }
        .supplier-info { flex: 1; min-width: 0; }
        .supplier-name { display: block; font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .supplier-count { display: block; font-size: 11px; color: var(--ink-3); }
        .supplier-total { font-size: 13px; font-weight: 700; color: var(--ink); font-family: Inter, system-ui, sans-serif; white-space: nowrap; }

        .search-wrap { padding: 12px 16px; display: flex; gap: 8px; }
        .search-input-wrap { flex: 1; position: relative; }
        .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--ink-3); pointer-events: none; }
        .search-input { width: 100%; padding: 9px 12px 9px 36px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; font-size: 14px; color: var(--ink); outline: none; font-family: inherit; box-sizing: border-box; }
        .search-input:focus { border-color: var(--ink); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .filter-btn { width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--border); background: var(--card); color: var(--ink-3); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .filter-btn.active { background: var(--blue-light); border-color: var(--blue-mid); color: var(--ink); }

        .filter-panel { margin: 0 16px 12px; padding: 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
        .filter-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .filter-panel-title { font-size: 13px; font-weight: 700; color: var(--ink); }
        .filter-clear { font-size: 12px; font-weight: 600; color: var(--ink); background: none; border: none; cursor: pointer; font-family: inherit; }
        .filter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .filter-label { display: block; font-size: 11px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
        .filter-select, .filter-date, .filter-input { width: 100%; padding: 8px 10px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; font-size: 13px; color: var(--ink); outline: none; font-family: inherit; box-sizing: border-box; }

        .list-wrap { padding: 0 16px 100px; display: flex; flex-direction: column; gap: 10px; }
        .recent-list { margin: 0 16px 100px; display: flex; flex-direction: column; gap: 8px; }
        .cat-card { margin: 0 16px 16px; background: var(--card); border-radius: 14px; border: 1px solid var(--border); padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
        .cat-bar-row { margin-bottom: 10px; }
        .cat-bar-top { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
        .cat-bar-track { height: 6px; background: var(--surface); border-radius: 99px; overflow: hidden; }
        .cat-bar-fill { height: 100%; border-radius: 99px; }

        .empty-state { text-align: center; padding: 48px 24px; }
        .empty-icon { width: 64px; height: 64px; background: var(--blue-light); border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .empty-title { font-size: 17px; font-weight: 700; color: var(--ink); margin: 0 0 6px; }
        .empty-sub { font-size: 14px; color: var(--ink-3); margin: 0 0 20px; }
        .empty-cta { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: var(--blue); color: #fff; border-radius: 12px; font-size: 15px; font-weight: 700; text-decoration: none; }

        .skel-card { background: var(--card); border-radius: 14px; padding: 16px; display: flex; gap: 12px; border: 1px solid var(--border); }
        .skel-img { width: 60px; height: 60px; background: var(--border); border-radius: 10px; flex-shrink: 0; }
        .skel-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .skel-line { background: var(--border); border-radius: 4px; height: 12px; }
        .skeleton { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      <div className="page">
        {/* Header */}
        <header className="header">
          <div className="header-top">
            <div className="header-logo">
              <div className="header-logo-mark"><Receipt size={16} color="#fff" /></div>
              <span className="header-title">Go Capture</span>
            </div>
            <div className="header-actions">
              <button
                className="icon-btn bell-wrap"
                onClick={() => router.push(navigator.onLine ? '/review' : '/offline')}
                title="Pending review"
                style={{ position: 'relative' }}
              >
                <Bell size={18} />
                {pendingCount > 0 && (
                  <span className="bell-badge">{pendingCount > 99 ? '99+' : pendingCount}</span>
                )}
              </button>
              {isAdmin && (
                <Link href="/admin" className="icon-btn admin" title="Admin"><Shield size={18} /></Link>
              )}
              <Link href="/help" className="icon-btn" title="Help"><HelpCircle size={18} /></Link>
            </div>
          </div>
        </header>

        <main>
          {/* Capture Hero — hidden for bookkeepers / non-capture org members */}
          {canCapture && (
            <>
              <div className="capture-hero">
                <div className="capture-hero-text">
                  <h2>Add Invoice</h2>
                  <p>Choose how to capture</p>
                </div>
                <div className="capture-hero-actions">
                  <Link href="/capture" className="capture-btn"><Camera size={15} />Camera</Link>
                  <button className="capture-btn capture-btn-sec" onClick={() => fileInputRef.current?.click()}><Upload size={15} />Upload</button>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </>
          )}

          {/* Period Filter Strip */}
          <div className="period-strip">
            {PERIODS.map(({ key, label }) => (
              <button key={key} className={`period-btn ${period === key ? 'active' : ''}`} onClick={() => setPeriod(key)}>
                {label}
              </button>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="kpi-grid">
            <KPICard label="Documents" value={totalDocs.toString()} sub={periodLabel} icon={<FileText size={18} />} accent="blue" />
            <KPICard label="Total Spend" value={formatZAR(totalAmount)} sub={periodLabel} icon={<TrendingUp size={18} />} accent="green" />
            {/* FIX: replaced Excl. VAT with Open Invoices — always shows full outstanding, ignores period filter */}
            <KPICard label="Open Invoices" value={formatZAR(openInvoicesTotal)} sub={`${openInvoicesCount} unpaid`} icon={<Receipt size={18} />} accent="amber" />
            <KPICard label="VAT" value={formatZAR(totalVAT)} sub={periodLabel} icon={<Building2 size={18} />} accent="rose" />
          </div>

          {/* Top Suppliers */}
          {topSuppliers.length > 0 && (
            <>
              <div className="section-header">
                <span className="section-title">Top Suppliers · {periodLabel}</span>
                <button className="section-link" onClick={() => router.push('/invoices/list')}>View all <ChevronRight size={14} /></button>
              </div>
              <div className="suppliers-card">
                {topSuppliers.map(([name, stats], i) => (
                  <SupplierRow key={name} name={name} count={stats.count} total={stats.total} rank={i + 1} />
                ))}
              </div>
            </>
          )}

          {/* Category Breakdown */}
          {topCategories.length > 0 && (
            <>
              <div className="section-header">
                <span className="section-title">By Category · {periodLabel}</span>
              </div>
              <div className="cat-card">
                {topCategories.map(([cat, stats]) => (
                  <div key={cat} className="cat-bar-row">
                    <div className="cat-bar-top">
                      <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{cat}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--ink)' }}>{formatZAR(stats.total)}</span>
                    </div>
                    <div className="cat-bar-track">
                      <div className="cat-bar-fill" style={{ width: `${(stats.total / catTotal) * 100}%`, background: CAT_COLORS[cat] || '#94a3b8' }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Recent Invoices */}
          {invoices.length > 0 && (
            <>
              <div className="section-header">
                <span className="section-title">Recent Invoices</span>
                <button className="section-link" onClick={() => router.push('/invoices/list')}>View all <ChevronRight size={14} /></button>
              </div>
              <div className="recent-list">
                {loading
                  ? [...Array(3)].map((_, i) => (
                      <div key={i} className="skel-card skeleton">
                        <div className="skel-img" />
                        <div className="skel-body">
                          <div className="skel-line" style={{ width: '70%' }} />
                          <div className="skel-line" style={{ width: '45%' }} />
                        </div>
                      </div>
                    ))
                  : invoices.slice(0, 5).map((inv) => (
                      <div key={inv.id} onClick={() => router.push(`/invoices/${inv.id}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.supplier || 'Unknown'}</div>
                          {inv.document_number && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'DM Mono, monospace' }}>#{inv.document_number}</div>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: 'var(--ink)' }}>{inv.amount ? formatZAR(inv.amount) : '—'}</div>
                          {inv.invoice_date && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{new Date(inv.invoice_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</div>}
                        </div>
                      </div>
                    ))
                }
              </div>
            </>
          )}

          {!loading && invoices.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><Camera size={28} color="#2563eb" /></div>
              <h2 className="empty-title">No invoices yet</h2>
              <p className="empty-sub">Capture your first invoice to get started</p>
              <Link href="/capture" className="empty-cta"><Camera size={18} />Capture Invoice</Link>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
