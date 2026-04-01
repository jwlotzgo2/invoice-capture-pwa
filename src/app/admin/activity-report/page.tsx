'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  RefreshCw, Camera, WifiOff, Upload, Mail,
  LogIn, Users, TrendingUp, Activity,
} from 'lucide-react';
import AdminShell from '@/components/AdminShell';

const C = {
  bg:           '#070e1a',
  surface:      '#0c1628',
  surfaceHi:    '#0f1e35',
  border:       '#142a45',
  borderHi:     '#1d3f63',
  accent:       '#0096c7',
  accentBright: '#22d3ee',
  accentGlow:   'rgba(0,150,199,0.1)',
  green:        '#10b981',
  greenGlow:    'rgba(16,185,129,0.1)',
  amber:        '#f59e0b',
  amberGlow:    'rgba(245,158,11,0.1)',
  red:          '#ef4444',
  redGlow:      'rgba(239,68,68,0.1)',
  purple:       '#a855f7',
  purpleGlow:   'rgba(168,85,247,0.1)',
  text:         '#d4e5f5',
  dim:          '#6890b0',
  muted:        '#2d4a65',
};

const pageCss = `
  .ar-page { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
  @media (max-width: 768px) { .ar-page { padding: 16px; } }

  .ar-grid-6 { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }
  @media (min-width: 640px) { .ar-grid-6 { grid-template-columns: repeat(3,1fr); } }
  @media (min-width: 1100px) { .ar-grid-6 { grid-template-columns: repeat(6,1fr); } }

  .ar-row2 { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media (min-width: 900px) { .ar-row2 { grid-template-columns: 1fr 1fr; } }

  .ar-card {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-top: 2px solid ${C.border};
    border-radius: 10px;
    padding: 18px;
  }
  .ar-card-accent  { border-top-color: ${C.accent}; }
  .ar-card-green   { border-top-color: ${C.green}; }
  .ar-card-purple  { border-top-color: ${C.purple}; }
  .ar-card-amber   { border-top-color: ${C.amber}; }

  .ar-kpi-icon { width: 30px; height: 30px; border-radius: 7px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
  .ar-kpi-val { font-family: 'IBM Plex Mono', monospace; font-size: 22px; font-weight: 700; color: ${C.text}; line-height: 1; font-variant-numeric: tabular-nums; }
  .ar-kpi-label { font-size: 10px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }

  .ar-section-label { font-size: 10px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }

  .ar-bar-row { margin-bottom: 12px; }
  .ar-bar-top { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; color: ${C.dim}; }
  .ar-bar-val { font-family: 'IBM Plex Mono', monospace; font-weight: 700; color: ${C.text}; font-variant-numeric: tabular-nums; }
  .ar-bar-track { height: 5px; background: ${C.bg}; border-radius: 99px; overflow: hidden; }
  .ar-bar-fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }

  .ar-table { width: 100%; border-collapse: collapse; }
  .ar-table th { font-size: 10px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 1px; padding: 0 0 10px; text-align: left; white-space: nowrap; }
  .ar-table td { font-size: 12px; color: ${C.text}; padding: 8px 0; border-top: 1px solid ${C.border}; vertical-align: middle; }
  .ar-table tr:hover td { background: ${C.surfaceHi}; }

  .ar-avatar { width: 26px; height: 26px; border-radius: 6px; background: ${C.surfaceHi}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: ${C.dim}; flex-shrink: 0; }

  .ar-heatmap { display: grid; grid-template-columns: repeat(24, 1fr); gap: 3px; }
  .ar-heatmap-cell { aspect-ratio: 1; border-radius: 3px; }
  .ar-heatmap-labels { display: flex; justify-content: space-between; margin-top: 4px; }
  .ar-heatmap-label { font-size: 10px; color: ${C.muted}; }

  .ar-select {
    padding: 7px 10px; border: 1px solid ${C.border}; border-radius: 7px; font-size: 12px;
    font-family: 'IBM Plex Sans', system-ui, sans-serif; color: ${C.text}; outline: none;
    background: ${C.bg}; transition: border-color 0.15s;
  }
  .ar-select:focus { border-color: ${C.accent}; }

  .ar-refresh-btn {
    width: 32px; height: 32px; border: 1px solid ${C.border}; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; background: none; color: ${C.dim};
  }
  .ar-refresh-btn:hover { border-color: ${C.borderHi}; color: ${C.text}; }

  .spin { animation: spin 0.8s linear infinite; }
`;

interface Stats {
  totalEvents: number;
  totalSessions: number;
  uniqueUsers: number;
  totalScans: number;
  offlineCaptures: number;
  syncUploads: number;
  emailsReceived: number;
  csvExports: number;
  approvals: number;
  deletions: number;
  actionBreakdown: { action: string; count: number }[];
  userLeaderboard: { user_id: string; full_name: string; email: string; count: number; scans: number; logins: number }[];
  hourlyDistribution: number[];
  dailyTrend: { date: string; count: number }[];
}

function initStats(): Stats {
  return {
    totalEvents: 0, totalSessions: 0, uniqueUsers: 0, totalScans: 0,
    offlineCaptures: 0, syncUploads: 0, emailsReceived: 0, csvExports: 0,
    approvals: 0, deletions: 0, actionBreakdown: [], userLeaderboard: [],
    hourlyDistribution: Array(24).fill(0), dailyTrend: [],
  };
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Logins', logout: 'Logouts', capture_ocr: 'OCR Scans',
  capture_offline: 'Offline Captures', sync_upload: 'Sync Uploads',
  email_received: 'Emails Received', document_viewed: 'Views',
  document_edited: 'Edits', document_deleted: 'Deletions',
  export_csv: 'CSV Exports', push_subscribed: 'Push Subscriptions',
  review_approved: 'Approvals', page_view: 'Page Views',
};

const ACTION_COLORS: Record<string, string> = {
  login: '#10b981', capture_ocr: '#a855f7', capture_offline: '#f59e0b',
  sync_upload: '#0096c7', email_received: '#f9a8d4', export_csv: '#10b981',
  review_approved: '#10b981', document_deleted: '#ef4444',
  document_edited: '#f59e0b', document_viewed: '#6890b0',
};

function heatColor(val: number, max: number) {
  if (val === 0) return C.surfaceHi;
  const intensity = val / max;
  if (intensity < 0.25) return '#0a2540';
  if (intensity < 0.5) return '#0c4a80';
  if (intensity < 0.75) return '#0070a8';
  return C.accent;
}

export default function AdminActivityReport() {
  const [stats, setStats] = useState<Stats>(initStats());
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState('30');
  const router = useRouter();
  const supabase = createClient();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - parseInt(filterDays));

    const { data, error } = await supabase
      .from('user_activity')
      .select('user_id, action, created_at, user_profiles(full_name, email)')
      .gte('created_at', since.toISOString());

    if (error || !data) { setLoading(false); return; }

    const s = initStats();
    s.totalEvents = data.length;

    const userMap: Record<string, { full_name: string; email: string; count: number; scans: number; logins: number }> = {};
    const actionMap: Record<string, number> = {};
    const hourMap: number[] = Array(24).fill(0);
    const dayMap: Record<string, number> = {};

    data.forEach(row => {
      // Action breakdown
      actionMap[row.action] = (actionMap[row.action] || 0) + 1;

      // User leaderboard
      if (!userMap[row.user_id]) {
        const up = row.user_profiles as any;
        userMap[row.user_id] = { full_name: up?.full_name || 'Unknown', email: up?.email || '', count: 0, scans: 0, logins: 0 };
      }
      userMap[row.user_id].count++;
      if (row.action === 'capture_ocr') userMap[row.user_id].scans++;
      if (row.action === 'login') userMap[row.user_id].logins++;

      // Hourly
      const h = new Date(row.created_at).getHours();
      hourMap[h]++;

      // Daily
      const day = new Date(row.created_at).toISOString().slice(0, 10);
      dayMap[day] = (dayMap[day] || 0) + 1;

      // Specific counters
      if (row.action === 'login') s.totalSessions++;
      if (row.action === 'capture_ocr') s.totalScans++;
      if (row.action === 'capture_offline') s.offlineCaptures++;
      if (row.action === 'sync_upload') s.syncUploads++;
      if (row.action === 'email_received') s.emailsReceived++;
      if (row.action === 'export_csv') s.csvExports++;
      if (row.action === 'review_approved') s.approvals++;
      if (row.action === 'document_deleted') s.deletions++;
    });

    s.uniqueUsers = Object.keys(userMap).length;
    s.actionBreakdown = Object.entries(actionMap).map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count);
    s.userLeaderboard = Object.entries(userMap)
      .map(([user_id, v]) => ({ user_id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    s.hourlyDistribution = hourMap;
    s.dailyTrend = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-parseInt(filterDays))
      .map(([date, count]) => ({ date, count }));

    setStats(s);
    setLoading(false);
  }, [supabase, filterDays]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return; }
      supabase.from('user_profiles').select('role').eq('id', session.user.id).single().then(({ data }) => {
        if (data?.role !== 'admin') router.push('/');
      });
    });
  }, []);

  useEffect(() => { fetchStats(); }, [filterDays]);

  const maxAction = Math.max(...stats.actionBreakdown.map(a => a.count), 1);
  const maxHour = Math.max(...stats.hourlyDistribution, 1);
  const maxDay = Math.max(...stats.dailyTrend.map(d => d.count), 1);
  const maxUserCount = Math.max(...stats.userLeaderboard.map(u => u.count), 1);

  const kpis = [
    { label: 'Total Events', val: stats.totalEvents, icon: Activity, color: C.purple, bg: C.purpleGlow },
    { label: 'Login Sessions', val: stats.totalSessions, icon: LogIn, color: C.green, bg: C.greenGlow },
    { label: 'Active Users', val: stats.uniqueUsers, icon: Users, color: C.accent, bg: C.accentGlow },
    { label: 'OCR Scans', val: stats.totalScans, icon: Camera, color: C.purple, bg: C.purpleGlow },
    { label: 'Offline Captures', val: stats.offlineCaptures, icon: WifiOff, color: C.amber, bg: C.amberGlow },
    { label: 'Emails In', val: stats.emailsReceived, icon: Mail, color: '#f9a8d4', bg: 'rgba(249,168,212,0.12)' },
  ];

  const periodActions = (
    <>
      <span style={{ fontSize: 12, color: C.muted }}>Period:</span>
      <select className="ar-select" value={filterDays} onChange={e => setFilterDays(e.target.value)}>
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
        <option value="365">Last year</option>
      </select>
      <button className="ar-refresh-btn" onClick={fetchStats} disabled={loading}>
        <RefreshCw size={14} className={loading ? 'spin' : ''} />
      </button>
    </>
  );

  return (
    <>
      <style>{pageCss}</style>
      <AdminShell title="Activity Report" subtitle="Usage stats across all users" actions={periodActions}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
            <RefreshCw size={20} className="spin" style={{ margin: '0 auto 10px', display: 'block', color: C.accent }} />
            Computing stats...
          </div>
        ) : (
          <div className="ar-page">

            {/* Row 1: 6 KPI tiles */}
            <div className="ar-grid-6">
              {kpis.map(({ label, val, icon: Icon, color, bg }) => (
                <div key={label} className="ar-card" style={{ borderTopColor: color }}>
                  <div className="ar-kpi-icon" style={{ background: bg }}>
                    <Icon size={14} color={color} />
                  </div>
                  <div className="ar-kpi-val">{val.toLocaleString()}</div>
                  <div className="ar-kpi-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Row 2: Action Breakdown bars + User Leaderboard table */}
            <div className="ar-row2">
              {/* Action breakdown */}
              <div className="ar-card ar-card-accent">
                <div className="ar-section-label">Actions Breakdown</div>
                {stats.actionBreakdown.map(({ action, count }) => (
                  <div key={action} className="ar-bar-row">
                    <div className="ar-bar-top">
                      <span>{ACTION_LABELS[action] || action}</span>
                      <span className="ar-bar-val">{count.toLocaleString()}</span>
                    </div>
                    <div className="ar-bar-track">
                      <div className="ar-bar-fill" style={{ width: `${(count / maxAction) * 100}%`, background: ACTION_COLORS[action] || C.dim }} />
                    </div>
                  </div>
                ))}
                {stats.actionBreakdown.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No data</div>}
              </div>

              {/* User leaderboard table */}
              <div className="ar-card ar-card-purple">
                <div className="ar-section-label">Top Users by Activity</div>
                <table className="ar-table">
                  <thead>
                    <tr>
                      <th style={{ width: 26 }}>#</th>
                      <th>User</th>
                      <th style={{ textAlign: 'right' }}>Events</th>
                      <th style={{ textAlign: 'right' }}>Scans</th>
                      <th style={{ textAlign: 'right' }}>Logins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.userLeaderboard.map((u, i) => (
                      <tr key={u.user_id}>
                        <td style={{ color: C.muted, fontSize: 11, fontFamily: 'IBM Plex Mono', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="ar-avatar">{(u.full_name || u.email || '?')[0].toUpperCase()}</div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{u.full_name || '—'}</div>
                              <div style={{ fontSize: 10, color: C.muted }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{u.count}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono', color: C.purple, fontVariantNumeric: 'tabular-nums' }}>{u.scans}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono', color: C.green, fontVariantNumeric: 'tabular-nums' }}>{u.logins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {stats.userLeaderboard.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No data</div>}
              </div>
            </div>

            {/* Row 3: Daily Trend bar chart (full width) */}
            <div className="ar-card ar-card-accent">
              <div className="ar-section-label">Daily Activity Trend</div>
              {stats.dailyTrend.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13 }}>No data</div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
                    {stats.dailyTrend.map(({ date, count }) => (
                      <div key={date} title={`${date}: ${count}`} style={{ flex: 1, background: C.accent, opacity: 0.3 + 0.7 * (count / maxDay), borderRadius: '3px 3px 0 0', height: `${Math.max(4, (count / maxDay) * 80)}px`, minWidth: 3 }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: C.muted }}>{stats.dailyTrend[0]?.date}</span>
                    <span style={{ fontSize: 10, color: C.muted }}>{stats.dailyTrend[stats.dailyTrend.length - 1]?.date}</span>
                  </div>
                </>
              )}
            </div>

            {/* Row 4: Hourly Heatmap (full width, 24 cells) */}
            <div className="ar-card">
              <div className="ar-section-label">Activity by Hour of Day</div>
              <div className="ar-heatmap">
                {stats.hourlyDistribution.map((val, h) => (
                  <div key={h} className="ar-heatmap-cell" title={`${h}:00 — ${val} events`} style={{ background: heatColor(val, maxHour) }} />
                ))}
              </div>
              <div className="ar-heatmap-labels">
                <span className="ar-heatmap-label">12am</span>
                <span className="ar-heatmap-label">6am</span>
                <span className="ar-heatmap-label">12pm</span>
                <span className="ar-heatmap-label">6pm</span>
                <span className="ar-heatmap-label">11pm</span>
              </div>
            </div>

          </div>
        )}
      </AdminShell>
    </>
  );
}
