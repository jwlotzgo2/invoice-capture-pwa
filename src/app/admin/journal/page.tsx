'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, Search, Filter, RefreshCw, LogIn, LogOut,
  Camera, WifiOff, Upload, Mail, Eye, Edit2, Trash2,
  Download, Bell, CheckCircle, ChevronDown, User
} from 'lucide-react';

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1117; }
  .jn { font-family: 'Inter', system-ui, sans-serif; min-height: 100svh; background: #0f1117; color: #f0f0f0; }
  .jn-header { background: #1c1c1c; border-bottom: 1px solid #2a2a2a; padding: 14px 16px; position: sticky; top: 0; z-index: 40; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .jn-back { width: 34px; height: 34px; border: 1px solid #383838; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: none; color: #a3a3a3; flex-shrink: 0; }
  .jn-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
  .jn-subtitle { font-size: 11px; color: #6b6b6b; margin-top: 1px; }
  .jn-refresh { width: 34px; height: 34px; border: 1px solid #383838; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: none; color: #a3a3a3; flex-shrink: 0; }
  .jn-toolbar { background: #1c1c1c; border-bottom: 1px solid #2a2a2a; padding: 10px 16px; display: flex; gap: 8px; flex-wrap: wrap; }
  .jn-search { flex: 1; min-width: 160px; display: flex; align-items: center; gap: 8px; background: #282828; border: 1px solid #383838; border-radius: 8px; padding: 0 10px; }
  .jn-search input { background: none; border: none; outline: none; color: #f0f0f0; font-size: 13px; padding: 8px 0; width: 100%; }
  .jn-search input::placeholder { color: #6b6b6b; }
  .jn-select { background: #282828; border: 1px solid #383838; border-radius: 8px; color: #f0f0f0; font-size: 12px; padding: 8px 10px; outline: none; cursor: pointer; }
  .jn-main { max-width: 900px; margin: 0 auto; padding: 16px; }
  .jn-feed { display: flex; flex-direction: column; gap: 1px; }
  .jn-day-header { font-size: 11px; font-weight: 700; color: #6b6b6b; text-transform: uppercase; letter-spacing: 0.8px; padding: 18px 0 8px; }
  .jn-event { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; background: #1c1c1c; border-radius: 10px; margin-bottom: 4px; border: 1px solid #252525; transition: border-color 0.15s; }
  .jn-event:hover { border-color: #383838; }
  .jn-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .jn-body { flex: 1; min-width: 0; }
  .jn-action { font-size: 13px; font-weight: 600; color: #e5e5e5; }
  .jn-meta { font-size: 11px; color: #6b6b6b; margin-top: 2px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .jn-user { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #a3a3a3; }
  .jn-time { font-size: 11px; color: #6b6b6b; white-space: nowrap; flex-shrink: 0; font-variant-numeric: tabular-nums; }
  .jn-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 99px; }
  .jn-empty { text-align: center; padding: 60px 20px; color: #6b6b6b; font-size: 14px; }
  .jn-load-more { width: 100%; padding: 12px; background: #282828; border: 1px solid #383838; border-radius: 10px; color: #a3a3a3; font-size: 13px; cursor: pointer; margin-top: 8px; font-family: inherit; }
  .jn-load-more:hover { background: #323232; }
  .jn-count { font-size: 11px; color: #6b6b6b; text-align: center; padding: 8px 0 4px; }
  .spin { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const ACTION_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  login:            { label: 'Logged in',        color: '#86efac', bg: 'rgba(134,239,172,0.12)', icon: LogIn },
  logout:           { label: 'Logged out',        color: '#a3a3a3', bg: 'rgba(163,163,163,0.1)',  icon: LogOut },
  capture_ocr:      { label: 'OCR Scan',          color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: Camera },
  capture_offline:  { label: 'Offline Capture',   color: '#fdba74', bg: 'rgba(253,186,116,0.12)', icon: WifiOff },
  sync_upload:      { label: 'Synced Upload',     color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  icon: Upload },
  email_received:   { label: 'Email Received',    color: '#f9a8d4', bg: 'rgba(249,168,212,0.12)', icon: Mail },
  document_viewed:  { label: 'Viewed',            color: '#6b6b6b', bg: 'rgba(107,107,107,0.1)',  icon: Eye },
  document_edited:  { label: 'Edited',            color: '#fde68a', bg: 'rgba(253,230,138,0.12)', icon: Edit2 },
  document_deleted: { label: 'Deleted',           color: '#fca5a5', bg: 'rgba(252,165,165,0.12)', icon: Trash2 },
  export_csv:       { label: 'CSV Export',        color: '#86efac', bg: 'rgba(134,239,172,0.1)',  icon: Download },
  push_subscribed:  { label: 'Push Enabled',      color: '#86efac', bg: 'rgba(134,239,172,0.1)',  icon: Bell },
  review_approved:  { label: 'Approved',          color: '#86efac', bg: 'rgba(134,239,172,0.12)', icon: CheckCircle },
  page_view:        { label: 'Page View',         color: '#6b6b6b', bg: 'rgba(107,107,107,0.08)', icon: Eye },
};

interface ActivityRow {
  id: string;
  user_id: string;
  action: string;
  metadata: any;
  created_at: string;
  user_profiles?: { full_name: string; email: string } | null;
}

interface UserProfile { id: string; full_name: string; email: string; }

const PAGE_SIZE = 50;

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function formatDayHeader(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function getMetadataLabel(action: string, metadata: any): string {
  if (!metadata) return '';
  if (action === 'capture_ocr') return metadata.document_type ? `${metadata.document_type}${metadata.confidence ? ` · ${Math.round(metadata.confidence * 100)}% confidence` : ''}` : '';
  if (action === 'page_view') return metadata.page || '';
  if (action === 'export_csv') return metadata.count ? `${metadata.count} records` : '';
  if (action === 'sync_upload') return metadata.count ? `${metadata.count} uploaded` : '';
  if (action === 'email_received') return metadata.from || '';
  return '';
}

export default function AdminJournalPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterDays, setFilterDays] = useState('7');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('user_profiles').select('id, full_name, email').order('full_name');
    setUsers(data || []);
  }, [supabase]);

  const fetchActivity = useCallback(async (reset = true) => {
    const newOffset = reset ? 0 : offset;
    if (reset) setLoading(true); else setRefreshing(true);

    const since = new Date();
    since.setDate(since.getDate() - parseInt(filterDays));

    let q = supabase
      .from('user_activity')
      .select('id, user_id, action, metadata, created_at, user_profiles(full_name, email)', { count: 'exact' })
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .range(newOffset, newOffset + PAGE_SIZE - 1);

    if (filterAction) q = q.eq('action', filterAction);
    if (filterUser) q = q.eq('user_id', filterUser);

    const { data, count, error } = await q;
    if (!error) {
      const items = (data || []) as ActivityRow[];
      if (reset) setRows(items); else setRows(prev => [...prev, ...items]);
      setTotal(count || 0);
      setHasMore((newOffset + PAGE_SIZE) < (count || 0));
      if (!reset) setOffset(newOffset + PAGE_SIZE);
      if (reset) setOffset(PAGE_SIZE);
    }
    setLoading(false);
    setRefreshing(false);
  }, [supabase, filterAction, filterUser, filterDays, offset]);

  useEffect(() => {
    // Check admin
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return; }
      supabase.from('user_profiles').select('role').eq('id', session.user.id).single().then(({ data }) => {
        if (data?.role !== 'admin') router.push('/');
      });
    });
    fetchUsers();
  }, []);

  useEffect(() => { fetchActivity(true); }, [filterAction, filterUser, filterDays]);

  // Group rows by calendar day
  const grouped: { day: string; items: ActivityRow[] }[] = [];
  rows.forEach(row => {
    const day = formatDayHeader(row.created_at);
    const last = grouped[grouped.length - 1];
    if (!last || last.day !== day) grouped.push({ day, items: [row] });
    else last.items.push(row);
  });

  // Filter by search client-side
  const filtered = search.trim()
    ? grouped.map(g => ({
        ...g,
        items: g.items.filter(r => {
          const q = search.toLowerCase();
          const name = (r.user_profiles as any)?.full_name?.toLowerCase() || '';
          const email = (r.user_profiles as any)?.email?.toLowerCase() || '';
          const action = r.action.toLowerCase();
          const meta = JSON.stringify(r.metadata || '').toLowerCase();
          return name.includes(q) || email.includes(q) || action.includes(q) || meta.includes(q);
        })
      })).filter(g => g.items.length > 0)
    : grouped;

  return (
    <div className="jn">
      <style>{css}</style>

      <header className="jn-header">
        <button className="jn-back" onClick={() => router.push('/admin')}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div className="jn-title">Activity Journal</div>
          <div className="jn-subtitle">{total.toLocaleString()} events</div>
        </div>
        <button className="jn-refresh" onClick={() => fetchActivity(true)} disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
        </button>
      </header>

      <div className="jn-toolbar">
        <div className="jn-search">
          <Search size={13} color="#6b6b6b" />
          <input
            placeholder="Search users, actions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="jn-select" value={filterDays} onChange={e => setFilterDays(e.target.value)}>
          <option value="1">Today</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <select className="jn-select" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="">All actions</option>
          {Object.entries(ACTION_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select className="jn-select" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
          <option value="">All users</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </select>
      </div>

      <div className="jn-main">
        {loading ? (
          <div className="jn-empty"><RefreshCw size={20} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="jn-empty">No activity found</div>
        ) : (
          <div className="jn-feed">
            {filtered.map(({ day, items }) => (
              <div key={day}>
                <div className="jn-day-header">{day}</div>
                {items.map(row => {
                  const meta = ACTION_META[row.action] || { label: row.action, color: '#6b6b6b', bg: 'rgba(107,107,107,0.1)', icon: Eye };
                  const Icon = meta.icon;
                  const userName = (row.user_profiles as any)?.full_name || (row.user_profiles as any)?.email || 'Unknown';
                  const detailLabel = getMetadataLabel(row.action, row.metadata);
                  return (
                    <div key={row.id} className="jn-event">
                      <div className="jn-icon" style={{ background: meta.bg }}>
                        <Icon size={15} color={meta.color} />
                      </div>
                      <div className="jn-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span className="jn-action">{meta.label}</span>
                          {detailLabel && (
                            <span className="jn-chip" style={{ background: meta.bg, color: meta.color }}>{detailLabel}</span>
                          )}
                        </div>
                        <div className="jn-meta">
                          <span className="jn-user"><User size={10} />{userName}</span>
                        </div>
                      </div>
                      <div className="jn-time">{formatTime(row.created_at)}</div>
                    </div>
                  );
                })}
              </div>
            ))}
            {hasMore && (
              <button className="jn-load-more" onClick={() => fetchActivity(false)} disabled={refreshing}>
                {refreshing ? 'Loading...' : `Load more (${total - rows.length} remaining)`}
              </button>
            )}
            <div className="jn-count">Showing {rows.length} of {total}</div>
          </div>
        )}
      </div>
    </div>
  );
}
