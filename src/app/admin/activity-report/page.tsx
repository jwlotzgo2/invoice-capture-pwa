'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, RefreshCw, Camera, WifiOff, Upload, Mail,
  LogIn, Users, TrendingUp, Zap, Download, Bell, Activity,
  CheckCircle, Edit2
} from 'lucide-react';

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1117; }
  .ar { font-family: 'Inter', system-ui, sans-serif; min-height: 100svh; background: #0f1117; color: #f0f0f0; }
  .ar-header { background: #1c1c1c; border-bottom: 1px solid #2a2a2a; padding: 14px 16px; position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: 12px; }
  .ar-back { width: 34px; height: 34px; border: 1px solid #383838; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: none; color: #a3a3a3; flex-shrink: 0; }
  .ar-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
  .ar-subtitle { font-size: 11px; color: #6b6b6b; margin-top: 1px; }
  .ar-toolbar { background: #1c1c1c; border-bottom: 1px solid #2a2a2a; padding: 10px 16px; display: flex; gap: 8px; align-items: center; }
  .ar-select { background: #282828; border: 1px solid #383838; border-radius: 8px; color: #f0f0f0; font-size: 12px; padding: 8px 10px; outline: none; cursor: pointer; }
  .ar-main { max-width: 900px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
  .ar-section { background: #1c1c1c; border: 1px solid #252525; border-radius: 14px; padding: 16px; }
  .ar-section-title { font-size: 12px; font-weight: 700; color: #6b6b6b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }
  .ar-grid-3 { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
  @media(min-width:600px){ .ar-grid-3 { grid-template-columns: repeat(3,1fr); } }
  .ar-grid-2 { display: grid; grid-template-columns: 1fr; gap: 10px; }
  @media(min-width:600px){ .ar-grid-2 { grid-template-columns: 1fr 1fr; } }
  .ar-kpi { background: #282828; border: 1px solid #2a2a2a; border-radius: 12px; padding: 14px; }
  .ar-kpi-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
  .ar-kpi-val { font-size: 26px; font-weight: 700; color: #f0f0f0; line-height: 1; font-variant-numeric: tabular-nums; }
  .ar-kpi-label { font-size: 11px; color: #6b6b6b; margin-top: 5px; }
  .ar-kpi-delta { font-size: 11px; margin-top: 3px; }
  .ar-bar-row { margin-bottom: 12px; }
  .ar-bar-top { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; color: #a3a3a3; }
  .ar-bar-val { font-weight: 700; color: #f0f0f0; }
  .ar-bar-track { height: 6px; background: #282828; border-radius: 99px; overflow: hidden; }
  .ar-bar-fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
  .ar-table { width: 100%; border-collapse: collapse; }
  .ar-table th { font-size: 10px; font-weight: 700; color: #6b6b6b; text-transform: uppercase; letter-spacing: 0.6px; padding: 0 0 10px; text-align: left; }
  .ar-table td { font-size: 12px; color: #e5e5e5; padding: 8px 0; border-top: 1px solid #252525; vertical-align: middle; }
  .ar-table tr:hover td { background: #222; }
  .ar-avatar { width: 26px; height: 26px; border-radius: 7px; background: #323232; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #a3a3a3; flex-shrink: 0; }
  .ar-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 99px; }
  .ar-heatmap { display: grid; grid-template-columns: repeat(24, 1fr); gap: 3px; }
  .ar-heatmap-cell { aspect-ratio: 1; border-radius: 3px; }
  .ar-heatmap-labels { display: flex; justify-content: space-between; margin-top: 4px; }
  .ar-heatmap-label { font-size: 10px; color: #6b6b6b; }
  .spin { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
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
  login: '#86efac', capture_ocr: '#a78bfa', capture_offline: '#fdba74',
  sync_upload: '#60a5fa', email_received: '#f9a8d4', export_csv: '#86efac',
  review_approved: '#86efac', document_deleted: '#fca5a5',
  document_edited: '#fde68a', document_viewed: '#6b6b6b',
};

function heatColor(val: number, max: number) {
  if (val === 0) return '#282828';
  const intensity = val / max;
  if (intensity < 0.25) return '#1e3a5f';
  if (intensity < 0.5) return '#1d4ed8';
  if (intensity < 0.75) return '#3b82f6';
  return '#60a5fa';
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
    { label: 'Total Events', val: stats.totalEvents, icon: Activity, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
    { label: 'Login Sessions', val: stats.totalSessions, icon: LogIn, color: '#86efac', bg: 'rgba(134,239,172,0.12)' },
    { label: 'Active Users', val: stats.uniqueUsers, icon: Users, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
    { label: 'OCR Scans', val: stats.totalScans, icon: Camera, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
    { label: 'Offline Captures', val: stats.offlineCaptures, icon: WifiOff, color: '#fdba74', bg: 'rgba(253,186,116,0.12)' },
    { label: 'Emails In', val: stats.emailsReceived, icon: Mail, color: '#f9a8d4', bg: 'rgba(249,168,212,0.12)' },
  ];

  return (
    <div className="ar">
      <style>{css}</style>

      <header className="ar-header">
        <button className="ar-back" onClick={() => router.push('/admin')}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div className="ar-title">Activity Report</div>
          <div className="ar-subtitle">Usage stats across all users</div>
        </div>
        <button className="ar-back" onClick={fetchStats} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
        </button>
      </header>

      <div className="ar-toolbar">
        <TrendingUp size={13} color="#6b6b6b" />
        <span style={{ fontSize: 12, color: '#6b6b6b', marginRight: 4 }}>Period:</span>
        <select className="ar-select" value={filterDays} onChange={e => setFilterDays(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b6b6b' }}>
          <RefreshCw size={20} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
          Computing stats...
        </div>
      ) : (
        <div className="ar-main">

          {/* KPI grid */}
          <div>
            <div className="ar-section-title" style={{ padding: '0 0 10px', color: '#6b6b6b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Overview</div>
            <div className="ar-grid-3">
              {kpis.map(({ label, val, icon: Icon, color, bg }) => (
                <div key={label} className="ar-kpi">
                  <div className="ar-kpi-icon" style={{ background: bg }}>
                    <Icon size={15} color={color} />
                  </div>
                  <div className="ar-kpi-val">{val.toLocaleString()}</div>
                  <div className="ar-kpi-label">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="ar-grid-2">
            {/* Action breakdown */}
            <div className="ar-section">
              <div className="ar-section-title">Actions Breakdown</div>
              {stats.actionBreakdown.map(({ action, count }) => (
                <div key={action} className="ar-bar-row">
                  <div className="ar-bar-top">
                    <span>{ACTION_LABELS[action] || action}</span>
                    <span className="ar-bar-val">{count.toLocaleString()}</span>
                  </div>
                  <div className="ar-bar-track">
                    <div className="ar-bar-fill" style={{ width: `${(count / maxAction) * 100}%`, background: ACTION_COLORS[action] || '#6b6b6b' }} />
                  </div>
                </div>
              ))}
              {stats.actionBreakdown.length === 0 && <div style={{ color: '#6b6b6b', fontSize: 13 }}>No data</div>}
            </div>

            {/* Daily trend */}
            <div className="ar-section">
              <div className="ar-section-title">Daily Activity</div>
              {stats.dailyTrend.length === 0 ? (
                <div style={{ color: '#6b6b6b', fontSize: 13 }}>No data</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
                  {stats.dailyTrend.map(({ date, count }) => (
                    <div key={date} title={`${date}: ${count}`} style={{ flex: 1, background: '#3b82f6', opacity: 0.3 + 0.7 * (count / maxDay), borderRadius: 3, height: `${Math.max(4, (count / maxDay) * 80)}px`, minWidth: 3 }} />
                  ))}
                </div>
              )}
              {stats.dailyTrend.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: '#6b6b6b' }}>{stats.dailyTrend[0]?.date}</span>
                  <span style={{ fontSize: 10, color: '#6b6b6b' }}>{stats.dailyTrend[stats.dailyTrend.length - 1]?.date}</span>
                </div>
              )}
            </div>
          </div>

          {/* Hourly heatmap */}
          <div className="ar-section">
            <div className="ar-section-title">Activity by Hour of Day</div>
            <div className="ar-heatmap">
              {stats.hourlyDistribution.map((val, h) => (
                <div key={h} className="ar-heatmap-cell" title={`${h}:00 — ${val} events`} style={{ background: heatColor(val, maxHour), borderRadius: 4 }} />
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

          {/* User leaderboard */}
          <div className="ar-section">
            <div className="ar-section-title">Top Users by Activity</div>
            <table className="ar-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>User</th>
                  <th style={{ textAlign: 'right' }}>Events</th>
                  <th style={{ textAlign: 'right' }}>Scans</th>
                  <th style={{ textAlign: 'right' }}>Logins</th>
                  <th style={{ width: '30%' }}></th>
                </tr>
              </thead>
              <tbody>
                {stats.userLeaderboard.map((u, i) => (
                  <tr key={u.user_id}>
                    <td style={{ color: '#6b6b6b', fontSize: 11 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="ar-avatar">{(u.full_name || u.email || '?')[0].toUpperCase()}</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{u.full_name || '—'}</div>
                          <div style={{ fontSize: 10, color: '#6b6b6b' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{u.count}</td>
                    <td style={{ textAlign: 'right', color: '#a78bfa' }}>{u.scans}</td>
                    <td style={{ textAlign: 'right', color: '#86efac' }}>{u.logins}</td>
                    <td>
                      <div style={{ height: 4, background: '#282828', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(u.count / maxUserCount) * 100}%`, background: '#3b82f6', borderRadius: 99 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.userLeaderboard.length === 0 && <div style={{ color: '#6b6b6b', fontSize: 13 }}>No data</div>}
          </div>

          {/* Secondary stats */}
          <div className="ar-grid-3">
            {[
              { label: 'CSV Exports', val: stats.csvExports, color: '#86efac' },
              { label: 'Approvals', val: stats.approvals, color: '#86efac' },
              { label: 'Deletions', val: stats.deletions, color: '#fca5a5' },
            ].map(({ label, val, color }) => (
              <div key={label} className="ar-kpi">
                <div className="ar-kpi-val" style={{ color }}>{val}</div>
                <div className="ar-kpi-label">{label}</div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
