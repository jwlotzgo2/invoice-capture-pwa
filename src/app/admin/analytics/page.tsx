'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Target, BarChart3, AlertTriangle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1117; }
  .oa { font-family: 'Inter', system-ui, sans-serif; min-height: 100svh; background: #0f1117; color: #f0f0f0; }
  .oa-header { background: #1c1c1c; border-bottom: 1px solid #2a2a2a; padding: 14px 16px; position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: 12px; }
  .oa-back { width: 34px; height: 34px; border: 1px solid #383838; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: none; color: #a3a3a3; flex-shrink: 0; }
  .oa-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
  .oa-subtitle { font-size: 11px; color: #6b6b6b; margin-top: 1px; }
  .oa-toolbar { background: #1c1c1c; border-bottom: 1px solid #2a2a2a; padding: 10px 16px; display: flex; gap: 8px; align-items: center; }
  .oa-select { background: #282828; border: 1px solid #383838; border-radius: 8px; color: #f0f0f0; font-size: 12px; padding: 8px 10px; outline: none; cursor: pointer; }
  .oa-main { max-width: 900px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
  .oa-grid-4 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  @media(min-width: 600px) { .oa-grid-4 { grid-template-columns: repeat(4, 1fr); } }
  .oa-grid-2 { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media(min-width: 600px) { .oa-grid-2 { grid-template-columns: 1fr 1fr; } }
  .oa-kpi { background: #1c1c1c; border: 1px solid #252525; border-radius: 12px; padding: 14px; }
  .oa-kpi-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
  .oa-kpi-val { font-size: 24px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
  .oa-kpi-label { font-size: 11px; color: #6b6b6b; margin-top: 5px; }
  .oa-section { background: #1c1c1c; border: 1px solid #252525; border-radius: 14px; padding: 16px; }
  .oa-section-title { font-size: 12px; font-weight: 700; color: #6b6b6b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }
  .oa-field-row { margin-bottom: 14px; }
  .oa-field-top { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; }
  .oa-field-name { color: #a3a3a3; font-weight: 500; }
  .oa-field-right { display: flex; gap: 10px; align-items: center; }
  .oa-corrections { font-size: 11px; color: #6b6b6b; }
  .oa-pct { font-weight: 700; }
  .oa-track { height: 6px; background: #282828; border-radius: 99px; overflow: hidden; }
  .oa-fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
  .oa-rank-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #282828; border-radius: 8px; margin-bottom: 6px; }
  .oa-rank-num { width: 22px; height: 22px; border-radius: 6px; background: #323232; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #6b6b6b; flex-shrink: 0; }
  .oa-rank-name { flex: 1; font-size: 13px; color: #e5e5e5; font-weight: 500; }
  .oa-rank-count { font-size: 12px; font-weight: 700; color: #fdba74; }
  .oa-table { width: 100%; border-collapse: collapse; }
  .oa-table th { font-size: 10px; font-weight: 700; color: #6b6b6b; text-transform: uppercase; letter-spacing: 0.6px; padding: 0 0 10px; text-align: left; }
  .oa-table td { font-size: 12px; color: #e5e5e5; padding: 8px 0; border-top: 1px solid #252525; }
  .oa-empty { text-align: center; padding: 32px 20px; color: #6b6b6b; font-size: 13px; }
  .oa-bar-chart { display: flex; align-items: flex-end; gap: 3px; height: 80px; }
  .spin { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
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
  if (pct >= 90) return '#86efac';
  if (pct >= 70) return '#fde68a';
  return '#fca5a5';
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

  return (
    <div className="oa">
      <style>{css}</style>

      <header className="oa-header">
        <button className="oa-back" onClick={() => router.push('/admin')}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div className="oa-title">OCR Analytics</div>
          <div className="oa-subtitle">Field accuracy & correction patterns</div>
        </div>
        <button className="oa-back" onClick={fetchAnalytics} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
        </button>
      </header>

      <div className="oa-toolbar">
        <span style={{ fontSize: 12, color: '#6b6b6b', marginRight: 4 }}>Period:</span>
        <select className="oa-select" value={days} onChange={e => setDays(parseInt(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b6b6b' }}>
          <RefreshCw size={20} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
          Loading...
        </div>
      ) : data ? (
        <div className="oa-main">

          {/* Overview KPIs */}
          <div className="oa-grid-4">
            {[
              {
                icon: <Target size={15} color="#38bdf8" />, bg: 'rgba(56,189,248,0.12)',
                val: `${data.overview.overallAccuracy.toFixed(1)}%`,
                label: 'Overall Accuracy',
                color: accuracyColor(data.overview.overallAccuracy),
              },
              {
                icon: <BarChart3 size={15} color="#a78bfa" />, bg: 'rgba(167,139,250,0.12)',
                val: data.overview.totalInvoices.toLocaleString(),
                label: 'Invoices in Period',
                color: '#f0f0f0',
              },
              {
                icon: <AlertTriangle size={15} color="#fdba74" />, bg: 'rgba(253,186,116,0.12)',
                val: data.overview.totalCorrections.toLocaleString(),
                label: 'Total Corrections',
                color: '#fdba74',
              },
              {
                icon: data.overview.overallAccuracy >= 85
                  ? <TrendingUp size={15} color="#86efac" />
                  : <TrendingDown size={15} color="#fca5a5" />,
                bg: data.overview.overallAccuracy >= 85 ? 'rgba(134,239,172,0.12)' : 'rgba(252,165,165,0.12)',
                val: data.overview.overallAccuracy >= 85 ? 'Good' : 'Needs Work',
                label: 'Performance',
                color: data.overview.overallAccuracy >= 85 ? '#86efac' : '#fca5a5',
              },
            ].map(({ icon, bg, val, label, color }) => (
              <div key={label} className="oa-kpi">
                <div className="oa-kpi-icon" style={{ background: bg }}>{icon}</div>
                <div className="oa-kpi-val" style={{ color }}>{val}</div>
                <div className="oa-kpi-label">{label}</div>
              </div>
            ))}
          </div>

          {/* Field Accuracy */}
          <div className="oa-section">
            <div className="oa-section-title">Accuracy by Field</div>
            {data.fieldAccuracy.map(f => (
              <div key={f.field_name} className="oa-field-row">
                <div className="oa-field-top">
                  <span className="oa-field-name">{formatField(f.field_name)}</span>
                  <span className="oa-field-right">
                    <span className="oa-corrections">{f.corrections} corrections</span>
                    <span className="oa-pct" style={{ color: accuracyColor(f.accuracy_percentage) }}>
                      {f.accuracy_percentage.toFixed(1)}%
                    </span>
                  </span>
                </div>
                <div className="oa-track">
                  <div className="oa-fill" style={{ width: `${f.accuracy_percentage}%`, background: accuracyColor(f.accuracy_percentage) }} />
                </div>
              </div>
            ))}
            {data.fieldAccuracy.length === 0 && <div className="oa-empty">No data for this period</div>}
          </div>

          <div className="oa-grid-2">
            {/* Most Corrected */}
            <div className="oa-section">
              <div className="oa-section-title">Most Corrected Fields</div>
              {data.mostCorrectedFields.length === 0 ? (
                <div className="oa-empty">
                  <CheckCircle size={24} color="#86efac" style={{ margin: '0 auto 8px', display: 'block' }} />
                  No corrections recorded
                </div>
              ) : (
                data.mostCorrectedFields.slice(0, 5).map((item, i) => (
                  <div key={item.field} className="oa-rank-row">
                    <div className="oa-rank-num">{i + 1}</div>
                    <div className="oa-rank-name">{formatField(item.field)}</div>
                    <div className="oa-rank-count">{item.corrections}</div>
                  </div>
                ))
              )}
            </div>

            {/* Correction Trends */}
            <div className="oa-section">
              <div className="oa-section-title">Correction Trend (Last {Math.min(days, 14)} days)</div>
              {data.trends.length === 0 ? (
                <div className="oa-empty">No data</div>
              ) : (
                <>
                  <div className="oa-bar-chart">
                    {data.trends.slice(-14).map(day => (
                      <div
                        key={day.date}
                        title={`${day.date}: ${day.corrections} corrections`}
                        style={{
                          flex: 1,
                          background: day.corrections > 0 ? '#3b82f6' : '#282828',
                          opacity: day.corrections > 0 ? 0.3 + 0.7 * (day.corrections / maxTrend) : 1,
                          borderRadius: '3px 3px 0 0',
                          height: `${Math.max(4, (day.corrections / maxTrend) * 80)}px`,
                          minWidth: 3,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: '#6b6b6b' }}>{data.trends.slice(-14)[0]?.date}</span>
                    <span style={{ fontSize: 10, color: '#6b6b6b' }}>{data.trends[data.trends.length - 1]?.date}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent Corrections */}
          <div className="oa-section">
            <div className="oa-section-title">Recent Corrections</div>
            {data.recentEdits.length === 0 ? (
              <div className="oa-empty">
                <CheckCircle size={24} color="#86efac" style={{ margin: '0 auto 8px', display: 'block' }} />
                No recent corrections
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="oa-table">
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
                        <td style={{ color: '#fca5a5', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {edit.original_value || '—'}
                        </td>
                        <td style={{ color: '#86efac', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {edit.edited_value || '—'}
                        </td>
                        <td style={{ color: '#6b6b6b', whiteSpace: 'nowrap' }}>
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
      ) : (
        <div className="oa-empty" style={{ padding: '60px 20px' }}>Failed to load analytics</div>
      )}
    </div>
  );
}
