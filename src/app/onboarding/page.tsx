'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ArrowRight, Camera, Zap, BarChart2, Check } from 'lucide-react';

const BUSINESS_TYPES = [
  { id: 'construction', label: 'Construction', emoji: '🏗️' },
  { id: 'retail', label: 'Retail / Shop', emoji: '🛒' },
  { id: 'services', label: 'Services', emoji: '🔧' },
  { id: 'food', label: 'Food & Catering', emoji: '🍽️' },
  { id: 'transport', label: 'Transport', emoji: '🚛' },
  { id: 'other', label: 'Other', emoji: '💼' },
];

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: #0f0f0f; }
  .ob { font-family: Inter, system-ui, sans-serif; min-height: 100svh; background: #0f0f0f;
    color: #f0f0f0; display: flex; flex-direction: column; }
  .ob-top { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; }
  .ob-dots { display: flex; gap: 5px; }
  .ob-dot { height: 4px; border-radius: 99px; background: #2a2a2a; transition: all 0.3s; }
  .ob-dot.active { background: #e5e5e5; }
  .ob-skip { font-size: 13px; color: #444; background: none; border: none; cursor: pointer; font-family: inherit; padding: 4px 8px; }
  .ob-body { flex: 1; display: flex; flex-direction: column; padding: 0 24px; justify-content: center; gap: 32px; }
  .ob-headline { font-size: 34px; font-weight: 800; color: #f0f0f0; line-height: 1.1; letter-spacing: -1px; }
  .ob-sub { font-size: 15px; color: #6b6b6b; line-height: 1.65; }
  .ob-footer { padding: 24px 24px 44px; }
  .ob-cta { width: 100%; padding: 17px; border-radius: 14px; border: none; background: #f0f0f0;
    color: #0f0f0f; font-size: 16px; font-weight: 700; cursor: pointer; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity 0.15s; }
  .ob-cta:active { opacity: 0.85; }
  .ob-cta.dark { background: #1c1c1c; color: #f0f0f0; border: 1px solid #383838; }
  .biz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .biz-btn { background: #1a1a1a; border: 1.5px solid #2a2a2a; border-radius: 12px;
    padding: 14px 12px; display: flex; align-items: center; gap: 10px; cursor: pointer;
    font-family: inherit; color: #a3a3a3; font-size: 14px; font-weight: 600; transition: all 0.15s; }
  .biz-btn.selected { border-color: #f0f0f0; color: #f0f0f0; background: #222; }
  .biz-emoji { font-size: 20px; }
  .feat-list { display: flex; flex-direction: column; gap: 16px; }
  .feat-row { display: flex; align-items: flex-start; gap: 14px; }
  .feat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0; }
  .feat-title { font-size: 15px; font-weight: 700; color: #f0f0f0; margin-bottom: 2px; }
  .feat-desc { font-size: 13px; color: #6b6b6b; line-height: 1.5; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .fade-up { animation: fadeUp 0.35s ease forwards; }
`;

// Demo scan illustration
function DemoScan() {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 16, position: 'relative', overflow: 'hidden' }}>
      {/* Scan brackets */}
      {[
        { top: 0, left: 0, borderTop: '2px solid #38bdf8', borderLeft: '2px solid #38bdf8', borderRadius: '8px 0 0 0' },
        { top: 0, right: 0, borderTop: '2px solid #38bdf8', borderRight: '2px solid #38bdf8', borderRadius: '0 8px 0 0' },
        { bottom: 0, left: 0, borderBottom: '2px solid #38bdf8', borderLeft: '2px solid #38bdf8', borderRadius: '0 0 0 8px' },
        { bottom: 0, right: 0, borderBottom: '2px solid #38bdf8', borderRight: '2px solid #38bdf8', borderRadius: '0 0 8px 0' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: 22, height: 22, ...s as any }}/>
      ))}

      {/* Invoice content being scanned */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 3 }}>SUPPLIER</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0' }}>Acme Supplies</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 3 }}>DATE</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0' }}>12 Mar 2025</div>
        </div>
      </div>

      {/* Line items */}
      {[
        { desc: 'Cement × 20 bags', amt: 'R 1,800' },
        { desc: 'Steel rebar 12mm', amt: 'R 2,400' },
        { desc: 'Delivery charge', amt: 'R 350' },
      ].map((item, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #222' }}>
          <span style={{ fontSize: 12, color: '#8a8a8a' }}>{item.desc}</span>
          <span style={{ fontSize: 12, color: '#e5e5e5', fontWeight: 600 }}>{item.amt}</span>
        </div>
      ))}

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        <span style={{ fontSize: 12, color: '#555' }}>VAT (15%)</span>
        <span style={{ fontSize: 12, color: '#a3a3a3' }}>R 682.50</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0' }}>Total</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#e5e5e5' }}>R 5,232.50</span>
      </div>

      {/* AI badge */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8, padding: '6px 10px' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }}/>
        <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700 }}>AI extracted · 4 fields · 97% confidence</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Check size={12} color="#86efac"/>
          <span style={{ fontSize: 11, color: '#86efac', fontWeight: 700 }}>Lines matched</span>
        </div>
      </div>

      {/* Scan beam overlay */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '38%', height: 2, background: '#38bdf8', opacity: 0.6 }}/>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(38% - 6px)', height: 14, background: 'linear-gradient(transparent, rgba(56,189,248,0.08), transparent)' }}/>
    </div>
  );
}

type Step = 'demo' | 'biztype' | 'features';

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('demo');
  const [bizType, setBizType] = useState('');
  const router = useRouter();

  const finish = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('user_profiles').update({
          onboarded_at: new Date().toISOString(),
          ...(bizType ? { biz_type: bizType } : {}),
        }).eq('id', session.user.id);
      }
    } catch (e) {
      // non-blocking
    }
    router.replace('/');
  };

  const STEP_ORDER: Step[] = ['demo', 'biztype', 'features'];
  const stepIdx = STEP_ORDER.indexOf(step);

  return (
    <div className="ob">
      <style>{css}</style>

      <div className="ob-top">
        {/* Progress dots */}
        <div className="ob-dots">
          {STEP_ORDER.map((s, i) => (
            <div key={s} className={`ob-dot${i <= stepIdx ? ' active' : ''}`}
              style={{ width: i === stepIdx ? 24 : 16 }}/>
          ))}
        </div>
        <button className="ob-skip" onClick={finish}>Skip</button>
      </div>

      {/* ── STEP 1: Demo scan ── */}
      {step === 'demo' && (
        <div className="ob-body fade-up">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>See it in action</div>
            <h1 className="ob-headline">Your invoice,<br/>read in seconds.</h1>
            <p className="ob-sub" style={{ marginTop: 12 }}>No more typing supplier names and amounts by hand. Snap a photo — Go Capture does the rest.</p>
          </div>
          <DemoScan/>
          <p style={{ fontSize: 12, color: '#383838', textAlign: 'center' }}>This is a real extraction — every field pulled automatically</p>
        </div>
      )}

      {/* ── STEP 2: Business type ── */}
      {step === 'biztype' && (
        <div className="ob-body fade-up">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Quick question</div>
            <h1 className="ob-headline">What kind of<br/>business?</h1>
            <p className="ob-sub" style={{ marginTop: 12 }}>We'll set up the right categories for you from the start.</p>
          </div>
          <div className="biz-grid">
            {BUSINESS_TYPES.map(b => (
              <button key={b.id} className={`biz-btn${bizType === b.id ? ' selected' : ''}`}
                onClick={() => setBizType(b.id)}>
                <span className="biz-emoji">{b.emoji}</span>
                {b.label}
                {bizType === b.id && <Check size={14} color="#f0f0f0" style={{ marginLeft: 'auto' }}/>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 3: Features ── */}
      {step === 'features' && (
        <div className="ob-body fade-up">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#86efac', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>You're set</div>
            <h1 className="ob-headline">Three things<br/>to know.</h1>
          </div>
          <div className="feat-list">
            {[
              { icon: Camera, bg: 'rgba(56,189,248,0.12)', color: '#38bdf8', title: 'Capture from anywhere', desc: 'Camera, photo library, PDF, or email. If it\'s an invoice, Go Capture can read it.' },
              { icon: Zap, bg: 'rgba(167,139,250,0.12)', color: '#a78bfa', title: 'AI catches mistakes', desc: 'Mismatched totals, duplicate invoices, and missing VAT are flagged automatically before you save.' },
              { icon: BarChart2, bg: 'rgba(134,239,172,0.12)', color: '#86efac', title: 'Always know what you owe', desc: 'Open invoices, aging summary, and supplier breakdown — updated every time you scan.' },
            ].map(f => (
              <div key={f.title} className="feat-row">
                <div className="feat-icon" style={{ background: f.bg }}>
                  <f.icon size={20} color={f.color} strokeWidth={1.8}/>
                </div>
                <div>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ob-footer">
        {step === 'demo' && (
          <button className="ob-cta" onClick={() => setStep('biztype')}>
            Next <ArrowRight size={17}/>
          </button>
        )}
        {step === 'biztype' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="ob-cta" onClick={() => setStep('features')} disabled={!bizType}
              style={{ opacity: bizType ? 1 : 0.4 }}>
              Next <ArrowRight size={17}/>
            </button>
            <button className="ob-cta dark" onClick={() => setStep('features')}>
              Skip this
            </button>
          </div>
        )}
        {step === 'features' && (
          <button className="ob-cta" onClick={finish}>
            Start capturing
          </button>
        )}
      </div>
    </div>
  );
}
