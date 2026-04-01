'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Search, RefreshCw, LogIn, LogOut,
  Camera, WifiOff, Upload, Mail, Eye, Edit2, Trash2,
  Download, Bell, CheckCircle, User
} from 'lucide-react';
import AdminShell from '@/components/AdminShell';

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
  amber:        '#fdba74',
  red:          '#fca5a5',
  purple:       '#c084fc',
  text:         '#f0f0f0',
  dim:          '#a3a3a3',
  muted:        '#6b6b6b',
};

const pageCss = `
  .jn-page { padding: 0; }

  .jn-feed-wrap { padding: 16px 24px 40px; }
  @media (max-width: 768px) { .jn-feed-wrap { padding: 12px 16px 40px; } }

  .jn-day-header {
    font-size: 10px; font-weight: 700; color: ${C.muted};
    text-transform: uppercase; letter-spacing: 1px;
    padding: 16px 0 8px;
    display: flex; align-items: center; gap: 12px;
  }
  .jn-day-header::after {
    content: ''; flex: 1; height: 1px; background: ${C.border};
  }

  .jn-event {
    display: flex; align-items: center; gap: 14px; padding: 10px 14px;
    background: ${C.surface}; border-radius: 8px; margin-bottom: 3px;
    border: 1px solid ${C.border}; transition: border-color 0.15s;
  }
  .jn-event:hover { border-color: ${C.borderHi}; }

  .jn-icon { width: 30px; height: 30px; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

  .jn-action { font-size: 13px; font-weight: 600; color: ${C.text}; }
  .jn-user-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: ${C.dim}; background: ${C.surfaceHi}; padding: 2px 8px; border-radius: 99px; flex-shrink: 0; }
  .jn-detail-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 99px; flex-shrink: 0; }
  .jn-time { font-family: ui-monospace, monospace; font-size: 11px; color: ${C.muted}; white-space: nowrap; flex-shrink: 0; font-variant-numeric: tabular-nums; margin-left: auto; }

  .jn-empty { text-align: center; padding: 60px 20px; color: ${C.muted}; font-size: 14px; }
  .jn-load-more {
    width: 100%; padding: 11px; background: ${C.surfaceHi}; border: 1px solid ${C.border};
    border-radius: 8px; color: ${C.dim}; font-size: 13px; cursor: pointer; margin-top: 8px;
    font-family: Inter, system-ui, sans-serif; transition: background 0.12s, border-color 0.12s;
  }
  .jn-load-more:hover { background: ${C.surface}; border-color: ${C.borderHi}; }
  .jn-count { font-size: 11px; color: ${C.muted}; text-align: center; padding: 8px 0 4px; }

  .jn-search {
    display: flex; align-items: center; gap: 6px;
    background: ${C.bg}; border: 1px solid ${C.border}; border-radius: 7px;
    padding: 0 10px; transition: border-color 0.15s;
  }
  .jn-search:focus-within { border-color: ${C.accent}; }
  .jn-search input {
    background: none; border: none; outline: none; color: ${C.text};
    font-size: 13px; padding: 7px 0; width: 180px;
    font-family: Inter, system-ui, sans-serif;
  }
  .jn-search input::placeholder { color: ${C.muted}; }

  .jn-select {
    padding: 7px 10px; border: 1px solid ${C.border}; border-radius: 7px; font-size: 12px;
    font-family: Inter, system-ui, sans-serif; color: ${C.text}; outline: none;
    background: ${C.bg}; transition: border-color 0.15s;
  }
  .jn-select:focus { border-color: ${C.accent}; }

  .jn-refresh-btn {
    width: 32px; height: 32px; border: 1px solid ${C.border}; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; background: none; color: ${C.dim};
  }
  .jn-refresh-btn:hover { border-color: ${C.borderHi}; color: ${C.text}; }

  .spin { animation: spin 0.8s linear infinite; }
`;

const ACTION_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  login:            { label: 'Logged in',        color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: LogIn },
  logout:           { label: 'Logged out',        color: '#6890b0', bg: 'rgba(104,144,176,0.1)', icon: LogOut },
  capture_ocr:      { label: 'OCR Scan',          color: '#a855f7', bg: 'rgba(168,85,247,0.12)', icon: Camera },
  capture_offline:  { label: 'Offline Capture',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: WifiOff },
  sync_upload:      { label: 'Synced Upload',     color: '#0096c7', bg: 'rgba(0,150,199,0.12)',  icon: Upload },
  email_received:   { label: 'Email Received',    color: '#f9a8d4', bg: 'rgba(249,168,212,0.12)',icon: Mail },
  document_viewed:  { label: 'Viewed',            color: '#6890b0', bg: 'rgba(104,144,176,0.08)',icon: Eye },
  document_edited:  { label: 'Edited',            color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Edit2 },
  document_deleted: { label: 'Deleted',           color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  icon: Trash2 },
  export_csv:       { label: 'CSV Export',        color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: Download },
  push_subscribed:  { label: 'Push Enabled',      color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: Bell },
  review_approved:  { label: 'Approved',          color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle },
  page_view:        { label: 'Page View',         color: '#2d4a65', bg: 'rgba(45,74,101,0.08)',  icon: Eye },
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
      const items = (data || []) as unknown as ActivityRow[];
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

  const journalActions = (
    <>
      <div className="jn-search">
        <Search size={13} color={C.muted} />
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
      <button className="jn-refresh-btn" onClick={() => fetchActivity(true)} disabled={refreshing}>
        <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
      </button>
    </>
  );

  return (
    <>
      <style>{pageCss}</style>
      <AdminShell
        title="Activity Journal"
        subtitle={`${total.toLocaleString()} events`}
        actions={journalActions}
      >
        <div className="jn-page">
          {loading ? (
            <div className="jn-empty">
              <RefreshCw size={20} className="spin" style={{ margin: '0 auto 10px', display: 'block', color: C.accent }} />
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="jn-empty">No activity found</div>
          ) : (
            <div className="jn-feed-wrap">
              {filtered.map(({ day, items }) => (
                <div key={day}>
                  <div className="jn-day-header">{day}</div>
                  {items.map(row => {
                    const meta = ACTION_META[row.action] || { label: row.action, color: C.dim, bg: `rgba(104,144,176,0.1)`, icon: Eye };
                    const Icon = meta.icon;
                    const userName = (row.user_profiles as any)?.full_name || (row.user_profiles as any)?.email || 'Unknown';
                    const detailLabel = getMetadataLabel(row.action, row.metadata);
                    return (
                      <div key={row.id} className="jn-event">
                        <div className="jn-icon" style={{ background: meta.bg }}>
                          <Icon size={14} color={meta.color} />
                        </div>
                        <span className="jn-action">{meta.label}</span>
                        {detailLabel && (
                          <span className="jn-detail-chip" style={{ background: meta.bg, color: meta.color }}>{detailLabel}</span>
                        )}
                        <span className="jn-user-pill"><User size={10} />{userName}</span>
                        <span className="jn-time">{formatTime(row.created_at)}</span>
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
      </AdminShell>
    </>
  );
}
