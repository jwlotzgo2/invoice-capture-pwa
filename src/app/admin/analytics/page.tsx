'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Target, BarChart3, AlertTriangle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
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
  .an-page { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
  @media (max-width: 768px) { .an-page { padding: 16px; } }

  .an-grid-4 { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }
  @media (min-width: 640px) { .an-grid-4 { grid-template-columns: repeat(4,1fr); } }

  .an-row2 { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media (min-width: 900px) { .an-row2 { grid-template-columns: 55fr 45fr; } }

  .an-row2b { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media (min-width: 900px) { .an-row2b { grid-template-columns: 1fr 1fr; } }

  .an-card {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-top: 2px solid ${C.border};
    border-radius: 10px;
    padding: 18px;
  }
  .an-card-accent  { border-top-color: ${C.accent}; }
  .an-card-purple  { border-top-color: ${C.purple}; }
  .an-card-amber   { border-top-color: ${C.amber}; }
  .an-card-green   { border-top-color: ${C.green}; }
  .an-card-red     { border-top-color: ${C.red}; }

  .an-kpi-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
  .an-kpi-val { font-family: 'IBM Plex Mono', monospace; font-size: 24px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
  .an-kpi-label { font-size: 10px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px; }

  .an-section-label { font-size: 10px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }

  .an-field-row { margin-bottom: 14px; }
  .an-field-top { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; }
  .an-field-name { color: ${C.dim}; font-weight: 500; }
  .an-field-right { display: flex; gap: 10px; align-items: center; }
  .an-corrections { font-size: 11px; color: ${C.muted}; }
  .an-pct { font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-variant-numeric: tabular-nums; }
  .an-track { height: 5px; background: ${C.bg}; border-radius: 99px; overflow: hidden; }
  .an-fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }

  .an-rank-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: ${C.surfaceHi}; border-radius: 8px; margin-bottom: 6px; }
  .an-rank-num { width: 22px; height: 22px; border-radius: 6px; background: ${C.border}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: ${C.dim}; flex-shrink: 0; }
  .an-rank-name { flex: 1; font-size: 13px; color: ${C.text}; font-weight: 500; }
  .an-rank-count { font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 700; color: ${C.amber}; }

  .an-table { width: 100%; border-collapse: collapse; }
  .an-table th { font-size: 10px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 1px; padding: 0 0 10px; text-align: left; }
  .an-table td { font-size: 12px; color: ${C.text}; padding: 8px 0; border-top: 1px solid ${C.border}; }

  .an-bar-chart { display: flex; align-items: flex-end; gap: 3px; height: 80px; }
  .an-empty { text-align: center; padding: 32px 20px; color: ${C.muted}; font-size: 13px; }

  .an-select {
    padding: 7px 10px; border: 1px solid ${C.border}; border-radius: 7px; font-size: 12px;
    font-family: 'IBM Plex Sans', system-ui, sans-serif; color: ${C.text}; outline: none;
    background: ${C.bg}; transition: border-color 0.15s;
  }
  .an-select:focus { border-color: ${C.accent}; }

  .an-refresh-btn {
    width: 32px; height: 32px; border: 1px solid ${C.border}; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; background: none; color: ${C.dim};
  }
  .an-refresh-btn:hover { border-color: ${C.borderHi}; color: ${C.text}; }

  .spin { animation: spin 0.8s linear infinite; }
`;

interface FieldAccuracy {
  field_name: string;
  total_invoices: number;
  corrections: number;
  accuracy_percentage: number;
}

interface AnalyticsData {
  period: { days: number; startDate: string };
  overview: { totalInvoices: number; totalCorrections: number; overallAccuracy: number };
  fieldAccuracy: FieldAccuracy[];
  mostCorrectedFields: { field: string; corrections: number }[];
  trends: { date: string; corrections: number }[];
  recentEdits: { id: string; field_name: string; original_value: string | null; edited_value: string | null; created_at: string }[];
}

function accuracyColor(pct: number) {
  if (pct >= 90) return C.green;
  if (pct >= 70) return C.amber;
  return C.red;
}

function formatField(name: string) {
  return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const router = useRouter();

  useEffect(() => { fetchAnalytics(); }, [days]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/analytics?days=${days}`);
    if (res.status === 403) { router.push('/'); return; }
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  const maxTrend = data ? Math.max(...data.trends.map(t => t.corrections), 1) : 1;

  const periodActions = (
    <>
      <span style={{ fontSize: 12, color: C.muted }}>Period:</span>
      <select className="an-select" value={days} onChange={e => setDays(parseInt(e.target.value))}>
        <option value={7}>Last 7 days</option>
        <option value={30}>Last 30 days</option>
        <option value={90}>Last 90 days</option>
        <option value={365}>Last year</option>
      </select>
      <button className="an-refresh-btn" onClick={fetchAnalytics} disabled={loading}>
        <RefreshCw size={14} className={loading ? 'spin' : ''} />
      </button>
    </>
  );

  return (
    <>
      <style>{pageCss}</style>
      <AdminShell title="OCR Analytics" subtitle="Field accuracy & correction patterns" actions={periodActions}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
            <RefreshCw size={20} className="spin" style={{ margin: '0 auto 10px', display: 'block', color: C.accent }} />
            Loading...
          </div>
        ) : data ? (
          <div className="an-page">

            {/* Row 1: 4 KPI tiles */}
            <div className="an-grid-4">
              {[
                {
                  icon: <Target size={15} color={C.accent} />, bg: C.accentGlow, topCls: 'an-card-accent',
                  val: `${data.overview.overallAccuracy.toFixed(1)}%`,
                  label: 'Overall Accuracy',
                  color: accuracyColor(data.overview.overallAccuracy),
                },
                {
                  icon: <BarChart3 size={15} color={C.purple} />, bg: C.purpleGlow, topCls: 'an-card-purple',
                  val: data.overview.totalInvoices.toLocaleString(),
                  label: 'Invoices in Period',
                  color: C.text,
                },
                {
                  icon: <AlertTriangle size={15} color={C.amber} />, bg: C.amberGlow, topCls: 'an-card-amber',
                  val: data.overview.totalCorrections.toLocaleString(),
                  label: 'Total Corrections',
                  color: C.amber,
                },
                {
                  icon: data.overview.overallAccuracy >= 85
                    ? <TrendingUp size={15} color={C.green} />
                    : <TrendingDown size={15} color={C.red} />,
                  bg: data.overview.overallAccuracy >= 85 ? C.greenGlow : C.redGlow,
                  topCls: data.overview.overallAccuracy >= 85 ? 'an-card-green' : 'an-card-red',
                  val: data.overview.overallAccuracy >= 85 ? 'Good' : 'Needs Work',
                  label: 'Performance',
                  color: data.overview.overallAccuracy >= 85 ? C.green : C.red,
                },
              ].map(({ icon, bg, topCls, val, label, color }) => (
                <div key={label} className={`an-card ${topCls}`}>
                  <div className="an-kpi-icon" style={{ background: bg }}>{icon}</div>
                  <div className="an-kpi-val" style={{ color }}>{val}</div>
                  <div className="an-kpi-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Row 2: Left 55% — Field Accuracy, Right 45% — Most Corrected */}
            <div className="an-row2">
              {/* Field Accuracy bars */}
              <div className="an-card an-card-accent">
                <div className="an-section-label">Accuracy by Field</div>
                {data.fieldAccuracy.map(f => (
                  <div key={f.field_name} className="an-field-row">
                    <div className="an-field-top">
                      <span className="an-field-name">{formatField(f.field_name)}</span>
                      <span className="an-field-right">
                        <span className="an-corrections">{f.corrections} corrections</span>
                        <span className="an-pct" style={{ color: accuracyColor(f.accuracy_percentage) }}>
                          {f.accuracy_percentage.toFixed(1)}%
                        </span>
                      </span>
                    </div>
                    <div className="an-track">
                      <div className="an-fill" style={{ width: `${f.accuracy_percentage}%`, background: accuracyColor(f.accuracy_percentage) }} />
                    </div>
                  </div>
                ))}
                {data.fieldAccuracy.length === 0 && <div className="an-empty">No data for this period</div>}
              </div>

              {/* Most Corrected ranked list */}
              <div className="an-card an-card-amber">
                <div className="an-section-label">Most Corrected Fields</div>
                {data.mostCorrectedFields.length === 0 ? (
                  <div className="an-empty">
                    <CheckCircle size={24} color={C.green} style={{ margin: '0 auto 8px', display: 'block' }} />
                    No corrections recorded
                  </div>
                ) : (
                  data.mostCorrectedFields.slice(0, 8).map((item, i) => (
                    <div key={item.field} className="an-rank-row">
                      <div className="an-rank-num">{i + 1}</div>
                      <div className="an-rank-name">{formatField(item.field)}</div>
                      <div className="an-rank-count">{item.corrections}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Row 3: Correction Trend + Recent Corrections table */}
            <div className="an-row2b">
              {/* Correction Trend bar chart */}
              <div className="an-card">
                <div className="an-section-label">Correction Trend (Last {Math.min(days, 14)} days)</div>
                {data.trends.length === 0 ? (
                  <div className="an-empty">No data</div>
                ) : (
                  <>
                    <div className="an-bar-chart">
                      {data.trends.slice(-14).map(day => (
                        <div
                          key={day.date}
                          title={`${day.date}: ${day.corrections} corrections`}
                          style={{
                            flex: 1,
                            background: day.corrections > 0 ? C.accent : C.surfaceHi,
                            opacity: day.corrections > 0 ? 0.3 + 0.7 * (day.corrections / maxTrend) : 1,
                            borderRadius: '3px 3px 0 0',
                            height: `${Math.max(4, (day.corrections / maxTrend) * 80)}px`,
                            minWidth: 3,
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: C.muted }}>{data.trends.slice(-14)[0]?.date}</span>
                      <span style={{ fontSize: 10, color: C.muted }}>{data.trends[data.trends.length - 1]?.date}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Recent Corrections table */}
              <div className="an-card">
                <div className="an-section-label">Recent Corrections</div>
                {data.recentEdits.length === 0 ? (
                  <div className="an-empty">
                    <CheckCircle size={24} color={C.green} style={{ margin: '0 auto 8px', display: 'block' }} />
                    No recent corrections
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="an-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Original</th>
                          <th>Corrected</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentEdits.slice(0, 10).map(edit => (
                          <tr key={edit.id}>
                            <td>{formatField(edit.field_name)}</td>
                            <td style={{ color: C.red, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {edit.original_value || '—'}
                            </td>
                            <td style={{ color: C.green, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {edit.edited_value || '—'}
                            </td>
                            <td style={{ color: C.muted, whiteSpace: 'nowrap', fontFamily: 'IBM Plex Mono', fontSize: 11 }}>
                              {new Date(edit.created_at).toLocaleDateString('en-ZA')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="an-empty" style={{ padding: '60px 20px' }}>Failed to load analytics</div>
        )}
      </AdminShell>
    </>
  );
}
