'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Invoice, InvoiceFilters, UserProfile } from '@/types/invoice';
import InvoiceCard from '@/components/InvoiceCard';
import {
  Camera,
  Search,
  Filter,
  LogOut,
  Shield,
  TrendingUp,
  FileText,
  Receipt,
  Building2,
  ChevronRight,
  X,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

// ─── KPI helpers ────────────────────────────────────────────────────────────

function formatZAR(amount: number | null) {
  if (amount === null) return 'R 0.00';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
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

function SupplierRow({
  name,
  count,
  total,
  rank,
}: {
  name: string;
  count: number;
  total: number;
  rank: number;
}) {
  return (
    <div className="supplier-row">
      <span className="supplier-rank">{rank}</span>
      <div className="supplier-info">
        <span className="supplier-name">{name}</span>
        <span className="supplier-count">{count} invoice{count !== 1 ? 's' : ''}</span>
      </div>
      <span className="supplier-total">{formatZAR(total)}</span>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  const [filters, setFilters] = useState<InvoiceFilters>({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setIsAdmin(profile?.role === 'admin');
      }
    };
    checkAdmin();
  }, [supabase]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });

      if (filters.search) {
        query = query.or(
          `supplier.ilike.%${filters.search}%,description.ilike.%${filters.search}%,business_name.ilike.%${filters.search}%`
        );
      }
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const clearFilters = () => {
    setFilters({ search: '', status: '', dateFrom: '', dateTo: '', sortBy: 'created_at', sortOrder: 'desc' });
  };

  // ── KPI calculations ──────────────────────────────────────────────────────
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const totalDocs = invoices.length;
  const totalAmount = invoices.reduce((s, i) => s + (i.amount ?? 0), 0);
  const totalVAT = invoices.reduce((s, i) => s + (i.vat_amount ?? 0), 0);

  const monthlyInvoices = invoices.filter((i) => {
    if (!i.invoice_date) return false;
    const d = new Date(i.invoice_date);
    return d >= monthStart && d <= monthEnd;
  });
  const monthlyAmount = monthlyInvoices.reduce((s, i) => s + (i.amount ?? 0), 0);

  // Top suppliers
  const supplierMap: Record<string, { count: number; total: number }> = {};
  invoices.forEach((inv) => {
    const key = inv.supplier || 'Unknown';
    if (!supplierMap[key]) supplierMap[key] = { count: 0, total: 0 };
    supplierMap[key].count++;
    supplierMap[key].total += inv.amount ?? 0;
  });
  const topSuppliers = Object.entries(supplierMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  const hasActiveFilters = filters.status || filters.dateFrom || filters.dateTo;

  return (
    <>
      <style>{`
        :root {
          --blue: #2563eb;
          --blue-light: #eff6ff;
          --blue-mid: #bfdbfe;
          --ink: #0f172a;
          --ink-2: #334155;
          --ink-3: #64748b;
          --surface: #f8fafc;
          --card: #ffffff;
          --border: #e2e8f0;
          --green: #16a34a;
          --green-light: #f0fdf4;
          --amber: #d97706;
          --amber-light: #fffbeb;
          --rose: #e11d48;
          --rose-light: #fff1f2;
        }

        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');

        body { font-family: 'DM Sans', sans-serif; background: var(--surface); color: var(--ink); }

        .page { min-height: 100svh; display: flex; flex-direction: column; }

        /* ── Header ── */
        .header {
          position: sticky; top: 0; z-index: 40;
          background: var(--card);
          border-bottom: 1px solid var(--border);
          padding: 0 16px;
        }
        .header-top {
          display: flex; align-items: center; justify-content: space-between;
          height: 56px;
        }
        .header-logo {
          display: flex; align-items: center; gap: 10px;
        }
        .header-logo-mark {
          width: 32px; height: 32px; background: var(--blue);
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
        }
        .header-title { font-size: 17px; font-weight: 700; color: var(--ink); letter-spacing: -0.3px; }
        .header-actions { display: flex; gap: 4px; }
        .icon-btn {
          width: 36px; height: 36px; border-radius: 8px; border: none; background: transparent;
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-3); cursor: pointer; transition: background 0.15s, color 0.15s;
        }
        .icon-btn:hover { background: var(--surface); color: var(--ink); }
        .icon-btn.admin { color: #7c3aed; }
        .icon-btn.admin:hover { background: #f5f3ff; }

        /* ── Tabs ── */
        .tabs {
          display: flex; gap: 0; border-top: 1px solid var(--border);
        }
        .tab-btn {
          flex: 1; padding: 10px 0; font-size: 13px; font-weight: 600;
          border: none; background: transparent; cursor: pointer;
          color: var(--ink-3); border-bottom: 2px solid transparent;
          transition: all 0.15s; letter-spacing: 0.2px;
        }
        .tab-btn.active { color: var(--blue); border-bottom-color: var(--blue); }

        /* ── Capture Hero ── */
        .capture-hero {
          margin: 16px; border-radius: 16px;
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%);
          padding: 20px;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 4px 24px rgba(37,99,235,0.25);
          position: relative; overflow: hidden;
        }
        .capture-hero::before {
          content: ''; position: absolute; right: -20px; top: -20px;
          width: 120px; height: 120px; border-radius: 50%;
          background: rgba(255,255,255,0.08);
        }
        .capture-hero::after {
          content: ''; position: absolute; right: 30px; bottom: -30px;
          width: 80px; height: 80px; border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .capture-hero-text h2 { font-size: 18px; font-weight: 700; color: #fff; margin: 0 0 4px; }
        .capture-hero-text p { font-size: 13px; color: rgba(255,255,255,0.75); margin: 0; }
        .capture-btn {
          display: flex; align-items: center; gap-8px;
          background: #fff; color: var(--blue);
          border: none; border-radius: 10px; padding: 10px 16px;
          font-size: 14px; font-weight: 700; cursor: pointer;
          white-space: nowrap; z-index: 1; gap: 6px;
          transition: transform 0.15s, box-shadow 0.15s;
          text-decoration: none;
        }
        .capture-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

        /* ── KPI Grid ── */
        .kpi-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; margin: 0 16px 16px;
        }
        .kpi-card {
          background: var(--card); border-radius: 14px;
          padding: 14px; display: flex; gap: 12px; align-items: flex-start;
          border: 1px solid var(--border);
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .kpi-card.blue .kpi-icon { background: var(--blue-light); color: var(--blue); }
        .kpi-card.green .kpi-icon { background: var(--green-light); color: var(--green); }
        .kpi-card.amber .kpi-icon { background: var(--amber-light); color: var(--amber); }
        .kpi-card.rose .kpi-icon { background: var(--rose-light); color: var(--rose); }
        .kpi-icon {
          width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .kpi-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .kpi-value { font-size: 16px; font-weight: 700; color: var(--ink); line-height: 1.2; font-family: 'DM Mono', monospace; }
        .kpi-label { font-size: 11px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-sub { font-size: 11px; color: var(--ink-3); }

        /* ── Section Header ── */
        .section-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 16px; margin-bottom: 10px;
        }
        .section-title { font-size: 14px; font-weight: 700; color: var(--ink); letter-spacing: -0.2px; }
        .section-link { font-size: 12px; font-weight: 600; color: var(--blue); text-decoration: none; display: flex; align-items: center; gap: 2px; }

        /* ── Suppliers ── */
        .suppliers-card {
          margin: 0 16px 16px; background: var(--card); border-radius: 14px;
          border: 1px solid var(--border); overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .supplier-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; border-bottom: 1px solid var(--border);
        }
        .supplier-row:last-child { border-bottom: none; }
        .supplier-rank {
          width: 22px; height: 22px; border-radius: 6px; background: var(--surface);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: var(--ink-3); flex-shrink: 0;
        }
        .supplier-info { flex: 1; min-width: 0; }
        .supplier-name { display: block; font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .supplier-count { display: block; font-size: 11px; color: var(--ink-3); }
        .supplier-total { font-size: 13px; font-weight: 700; color: var(--ink); font-family: 'DM Mono', monospace; white-space: nowrap; }

        /* ── Search bar ── */
        .search-wrap { padding: 12px 16px; display: flex; gap: 8px; }
        .search-input-wrap { flex: 1; position: relative; }
        .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--ink-3); pointer-events: none; }
        .search-input {
          width: 100%; padding: 9px 12px 9px 36px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; font-size: 14px; color: var(--ink); outline: none;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .search-input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .filter-btn {
          width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--border);
          background: var(--card); color: var(--ink-3); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; flex-shrink: 0;
        }
        .filter-btn.active { background: var(--blue-light); border-color: var(--blue-mid); color: var(--blue); }

        /* ── Filter Panel ── */
        .filter-panel {
          margin: 0 16px 12px; padding: 14px; background: var(--surface);
          border: 1px solid var(--border); border-radius: 12px;
        }
        .filter-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .filter-panel-title { font-size: 13px; font-weight: 700; color: var(--ink); }
        .filter-clear { font-size: 12px; font-weight: 600; color: var(--blue); background: none; border: none; cursor: pointer; }
        .filter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .filter-label { display: block; font-size: 11px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
        .filter-select, .filter-date {
          width: 100%; padding: 8px 10px; background: var(--card);
          border: 1px solid var(--border); border-radius: 8px;
          font-size: 13px; color: var(--ink); outline: none;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Invoice List ── */
        .list-wrap { padding: 0 16px 100px; display: flex; flex-direction: column; gap: 10px; }

        /* ── Empty State ── */
        .empty-state { text-align: center; padding: 48px 24px; }
        .empty-icon { width: 64px; height: 64px; background: var(--blue-light); border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .empty-title { font-size: 17px; font-weight: 700; color: var(--ink); margin: 0 0 6px; }
        .empty-sub { font-size: 14px; color: var(--ink-3); margin: 0 0 20px; }
        .empty-cta {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 24px; background: var(--blue); color: #fff;
          border-radius: 12px; font-size: 15px; font-weight: 700; text-decoration: none;
          transition: background 0.15s;
        }
        .empty-cta:hover { background: #1d4ed8; }

        /* ── Skeleton ── */
        .skeleton { animation: pulse 1.5s ease-in-out infinite; }
        .skel-card { background: var(--card); border-radius: 14px; padding: 16px; display: flex; gap: 12px; border: 1px solid var(--border); }
        .skel-img { width: 60px; height: 60px; background: var(--border); border-radius: 10px; flex-shrink: 0; }
        .skel-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .skel-line { background: var(--border); border-radius: 4px; height: 12px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

        /* ── FAB ── */
        .fab {
          position: fixed; bottom: 24px; right: 20px;
          width: 56px; height: 56px; border-radius: 16px;
          background: var(--blue); color: #fff; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(37,99,235,0.4);
          z-index: 50; text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .fab:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(37,99,235,0.5); }

        /* ── Status badges ── */
        .badge { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
        .badge-pending { background: #fef9c3; color: #854d0e; }
        .badge-reviewed { background: var(--blue-light); color: #1d4ed8; }
        .badge-approved { background: var(--green-light); color: #15803d; }
        .badge-rejected { background: var(--rose-light); color: #be123c; }

        /* ── Recent invoices in dashboard ── */
        .recent-list { margin: 0 16px 100px; display: flex; flex-direction: column; gap: 8px; }
      `}</style>

      <div className="page">
        {/* ── Header ── */}
        <header className="header">
          <div className="header-top">
            <div className="header-logo">
              <div className="header-logo-mark">
                <Receipt size={16} color="#fff" />
              </div>
              <span className="header-title">Invoice Capture</span>
            </div>
            <div className="header-actions">
              {isAdmin && (
                <Link href="/admin" className="icon-btn admin" title="Admin">
                  <Shield size={18} />
                </Link>
              )}
              <button onClick={handleSignOut} className="icon-btn" title="Sign out">
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              All Invoices ({totalDocs})
            </button>
          </div>
        </header>

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && (
          <main>
            {/* Capture Hero */}
            <div className="capture-hero">
              <div className="capture-hero-text">
                <h2>Capture Invoice</h2>
                <p>Use your camera or upload an image</p>
              </div>
              <Link href="/capture" className="capture-btn">
                <Camera size={16} />
                Capture
              </Link>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
              <KPICard
                label="Total Documents"
                value={totalDocs.toString()}
                sub="all time"
                icon={<FileText size={18} />}
                accent="blue"
              />
              <KPICard
                label="Monthly Spend"
                value={formatZAR(monthlyAmount)}
                sub={format(now, 'MMM yyyy')}
                icon={<TrendingUp size={18} />}
                accent="green"
              />
              <KPICard
                label="Total Excl. VAT"
                value={formatZAR(totalAmount - totalVAT)}
                sub="all invoices"
                icon={<Receipt size={18} />}
                accent="amber"
              />
              <KPICard
                label="Total VAT"
                value={formatZAR(totalVAT)}
                sub="all invoices"
                icon={<Building2 size={18} />}
                accent="rose"
              />
            </div>

            {/* Top Suppliers */}
            {topSuppliers.length > 0 && (
              <>
                <div className="section-header">
                  <span className="section-title">Top Suppliers</span>
                  <button
                    className="section-link"
                    onClick={() => setActiveTab('list')}
                  >
                    View all <ChevronRight size={14} />
                  </button>
                </div>
                <div className="suppliers-card">
                  {topSuppliers.map(([name, stats], i) => (
                    <SupplierRow
                      key={name}
                      name={name}
                      count={stats.count}
                      total={stats.total}
                      rank={i + 1}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Recent Invoices */}
            {invoices.length > 0 && (
              <>
                <div className="section-header">
                  <span className="section-title">Recent Invoices</span>
                  <button
                    className="section-link"
                    onClick={() => setActiveTab('list')}
                  >
                    View all <ChevronRight size={14} />
                  </button>
                </div>
                <div className="recent-list">
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="skel-card skeleton">
                        <div className="skel-img" />
                        <div className="skel-body">
                          <div className="skel-line" style={{ width: '70%' }} />
                          <div className="skel-line" style={{ width: '45%' }} />
                          <div className="skel-line" style={{ width: '30%' }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    invoices.slice(0, 5).map((inv) => (
                      <InvoiceCard key={inv.id} invoice={inv} />
                    ))
                  )}
                </div>
              </>
            )}

            {/* Empty state */}
            {!loading && invoices.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">
                  <Camera size={28} color="#2563eb" />
                </div>
                <h2 className="empty-title">No invoices yet</h2>
                <p className="empty-sub">Capture your first invoice to get started</p>
                <Link href="/capture" className="empty-cta">
                  <Camera size={18} />
                  Capture Invoice
                </Link>
              </div>
            )}
          </main>
        )}

        {/* ── LIST TAB ── */}
        {activeTab === 'list' && (
          <main>
            {/* Search */}
            <div className="search-wrap">
              <div className="search-input-wrap">
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search supplier, description…"
                  className="search-input"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`filter-btn ${hasActiveFilters ? 'active' : ''}`}
              >
                {showFilters ? <X size={16} /> : <Filter size={16} />}
              </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="filter-panel">
                <div className="filter-panel-header">
                  <span className="filter-panel-title">Filters</span>
                  {hasActiveFilters && (
                    <button className="filter-clear" onClick={clearFilters}>Clear all</button>
                  )}
                </div>
                <div className="filter-grid">
                  <div>
                    <label className="filter-label">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="filter-select"
                    >
                      <option value="">All</option>
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="filter-label">Sort</label>
                    <select
                      value={`${filters.sortBy}-${filters.sortOrder}`}
                      onChange={(e) => {
                        const [sortBy, sortOrder] = e.target.value.split('-') as [
                          InvoiceFilters['sortBy'],
                          'asc' | 'desc'
                        ];
                        setFilters({ ...filters, sortBy, sortOrder });
                      }}
                      className="filter-select"
                    >
                      <option value="created_at-desc">Newest First</option>
                      <option value="created_at-asc">Oldest First</option>
                      <option value="invoice_date-desc">Date ↓</option>
                      <option value="invoice_date-asc">Date ↑</option>
                      <option value="amount-desc">Amount ↓</option>
                      <option value="amount-asc">Amount ↑</option>
                    </select>
                  </div>
                  <div>
                    <label className="filter-label">From</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="filter-date"
                    />
                  </div>
                  <div>
                    <label className="filter-label">To</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="filter-date"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* List */}
            {loading ? (
              <div className="list-wrap">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skel-card skeleton">
                    <div className="skel-img" />
                    <div className="skel-body">
                      <div className="skel-line" style={{ width: '70%' }} />
                      <div className="skel-line" style={{ width: '45%' }} />
                      <div className="skel-line" style={{ width: '30%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Camera size={28} color="#2563eb" />
                </div>
                <h2 className="empty-title">No invoices found</h2>
                <p className="empty-sub">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="list-wrap">
                {invoices.map((inv) => (
                  <InvoiceCard key={inv.id} invoice={inv} />
                ))}
              </div>
            )}
          </main>
        )}

        {/* FAB */}
        <Link href="/capture" className="fab" title="Capture invoice">
          <Camera size={24} />
        </Link>
      </div>
    </>
  );
}
