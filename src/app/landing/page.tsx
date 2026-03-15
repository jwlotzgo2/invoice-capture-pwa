import Link from 'next/link';
import { Camera, Zap, FileText, ArrowRight, Check } from 'lucide-react';

export default function LandingPage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: Inter, system-ui, sans-serif; background: #0f0f0f; color: #f0f0f0; -webkit-font-smoothing: antialiased; }

        /* NAV */
        .nav { position: sticky; top: 0; z-index: 50; background: rgba(15,15,15,0.88);
          backdrop-filter: blur(14px); border-bottom: 1px solid #1e1e1e;
          padding: 0 24px; height: 58px; display: flex; align-items: center; justify-content: space-between; }
        .nav-logo { font-size: 16px; font-weight: 800; color: #f0f0f0; letter-spacing: -0.3px;
          display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .nav-logo-dot { width: 8px; height: 8px; border-radius: 2px; background: #38bdf8; }
        .nav-cta { padding: 8px 18px; background: #f0f0f0; color: #0f0f0f; border-radius: 8px;
          font-size: 13px; font-weight: 700; text-decoration: none; transition: opacity 0.15s; }
        .nav-cta:hover { opacity: 0.85; }

        /* HERO */
        .hero { padding: 80px 24px 64px; max-width: 680px; margin: 0 auto; }
        .hero-badge { display: inline-flex; align-items: center; gap: 6px; background: #1a1a1a;
          border: 1px solid #2a2a2a; border-radius: 99px; padding: 5px 13px;
          font-size: 12px; font-weight: 700; color: #a3a3a3; margin-bottom: 28px; }
        .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #38bdf8; }
        .hero-h1 { font-size: clamp(38px, 9vw, 68px); font-weight: 900; line-height: 1.0;
          letter-spacing: -2.5px; color: #f0f0f0; margin-bottom: 22px; }
        .hero-h1 em { font-style: normal; color: #38bdf8; }
        .hero-sub { font-size: 17px; color: #6b6b6b; line-height: 1.65; max-width: 480px; margin-bottom: 36px; }
        .hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 56px; }
        .btn-primary { padding: 14px 26px; background: #f0f0f0; color: #0f0f0f; border-radius: 10px;
          font-size: 15px; font-weight: 700; text-decoration: none; display: inline-flex;
          align-items: center; gap: 8px; transition: opacity 0.15s; }
        .btn-primary:hover { opacity: 0.88; }
        .btn-ghost { padding: 14px 26px; background: transparent; color: #6b6b6b; border-radius: 10px;
          font-size: 15px; font-weight: 600; text-decoration: none; border: 1px solid #2a2a2a;
          transition: border-color 0.15s, color 0.15s; }
        .btn-ghost:hover { border-color: #444; color: #a3a3a3; }
        .hero-proof { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #444; }
        .hero-proof-check { color: #86efac; }

        /* PHONE MOCKUP */
        .phone-wrap { display: flex; justify-content: center; margin-bottom: 80px; }
        .phone { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 36px;
          padding: 12px; width: 260px; box-shadow: 0 0 0 1px #111, 0 60px 100px rgba(0,0,0,0.6); }
        .phone-screen { background: #111; border-radius: 26px; overflow: hidden; }
        .phone-notch { width: 70px; height: 20px; background: #1a1a1a; border-radius: 0 0 12px 12px; margin: 0 auto; }
        .phone-content { padding: 14px 12px 20px; }
        .ph-header { font-size: 13px; font-weight: 700; color: #f0f0f0; margin-bottom: 12px; }
        .ph-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
        .ph-kpi { background: #1a1a1a; border: 1px solid #222; border-radius: 10px; padding: 10px; }
        .ph-kpi-val { font-size: 17px; font-weight: 800; }
        .ph-kpi-label { font-size: 9px; color: #444; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
        .ph-card { background: #1a1a1a; border: 1px solid #1e1e1e; border-radius: 8px;
          padding: 8px 10px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
        .ph-dot { width: 7px; height: 7px; border-radius: 2px; flex-shrink: 0; }
        .ph-lines { flex: 1; }
        .ph-line { height: 5px; background: #222; border-radius: 2px; margin-bottom: 3px; }

        /* PAIN SECTION */
        .pain { padding: 0 24px 80px; max-width: 680px; margin: 0 auto; }
        .pain-h2 { font-size: clamp(24px,5vw,36px); font-weight: 800; color: #f0f0f0;
          letter-spacing: -1px; margin-bottom: 10px; }
        .pain-sub { font-size: 15px; color: #6b6b6b; line-height: 1.6; margin-bottom: 32px; }
        .pain-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .pain-card { background: #141414; border: 1px solid #1e1e1e; border-radius: 12px; padding: 18px; }
        .pain-before { font-size: 12px; color: #fca5a5; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.5px; margin-bottom: 6px; }
        .pain-after { font-size: 12px; color: #86efac; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.5px; margin-bottom: 6px; }
        .pain-text { font-size: 13px; color: #6b6b6b; line-height: 1.5; }

        /* FEATURES */
        .features { border-top: 1px solid #1a1a1a; padding: 80px 24px; }
        .features-inner { max-width: 680px; margin: 0 auto; }
        .section-eyebrow { font-size: 12px; font-weight: 700; color: #38bdf8; text-transform: uppercase;
          letter-spacing: 1px; margin-bottom: 12px; }
        .section-h2 { font-size: clamp(26px,5vw,40px); font-weight: 800; color: #f0f0f0;
          letter-spacing: -1px; margin-bottom: 40px; line-height: 1.1; }
        .feat-list { display: flex; flex-direction: column; gap: 0; }
        .feat-item { display: flex; gap: 18px; padding: 24px 0; border-bottom: 1px solid #1a1a1a; }
        .feat-item:last-child { border-bottom: none; }
        .feat-icon-wrap { width: 44px; height: 44px; border-radius: 12px; display: flex;
          align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
        .feat-title { font-size: 16px; font-weight: 700; color: #f0f0f0; margin-bottom: 5px; }
        .feat-desc { font-size: 14px; color: #6b6b6b; line-height: 1.6; }
        .feat-tag { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 7px;
          border-radius: 4px; margin-top: 8px; }

        /* HOW */
        .how { border-top: 1px solid #1a1a1a; padding: 80px 24px; }
        .how-inner { max-width: 680px; margin: 0 auto; }
        .steps { display: flex; flex-direction: column; gap: 0; margin-top: 40px; }
        .step { display: grid; grid-template-columns: 40px 1fr; gap: 16px; }
        .step-left { display: flex; flex-direction: column; align-items: center; }
        .step-num { width: 34px; height: 34px; border-radius: 10px; background: #1a1a1a;
          border: 1px solid #2a2a2a; color: #f0f0f0; display: flex; align-items: center;
          justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; }
        .step-line { width: 1px; flex: 1; background: #1e1e1e; margin: 5px 0; min-height: 28px; }
        .step-body { padding-bottom: 32px; }
        .step-title { font-size: 15px; font-weight: 700; color: #f0f0f0; margin-bottom: 4px; }
        .step-desc { font-size: 14px; color: #6b6b6b; line-height: 1.6; }

        /* CTA BOTTOM */
        .cta-section { border-top: 1px solid #1a1a1a; padding: 80px 24px; text-align: center; }
        .cta-inner { max-width: 520px; margin: 0 auto; }
        .cta-h2 { font-size: clamp(28px,6vw,46px); font-weight: 900; color: #f0f0f0;
          letter-spacing: -1.5px; margin-bottom: 16px; line-height: 1.05; }
        .cta-sub { font-size: 15px; color: #6b6b6b; margin-bottom: 32px; line-height: 1.6; }
        .cta-fine { font-size: 12px; color: #333; margin-top: 14px; }

        /* FOOTER */
        .footer { border-top: 1px solid #1a1a1a; padding: 24px; display: flex;
          align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        .footer-text { font-size: 12px; color: #333; }
        .footer-link { font-size: 12px; color: #444; text-decoration: none; }
        .footer-link:hover { color: #888; }

        @media(max-width: 520px) {
          .pain-grid { grid-template-columns: 1fr; }
          .hero-ctas { flex-direction: column; }
          .btn-primary, .btn-ghost { text-align: center; justify-content: center; }
        }
      `}</style>

      <nav className="nav">
        <a href="#" className="nav-logo">
          <div className="nav-logo-dot"/>
          Go Capture
        </a>
        <Link href="/auth/signin" className="nav-cta">Sign in →</Link>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-badge">
          <div className="hero-badge-dot"/>
          Built for small business owners
        </div>
        <h1 className="hero-h1">
          Stop losing<br/>
          <em>paper invoices.</em>
        </h1>
        <p className="hero-sub">
          Snap a photo. Go Capture reads the supplier, amount, VAT and line items — automatically. No typing. No shoebox. No stress at month end.
        </p>
        <div className="hero-ctas">
          <Link href="/onboarding" className="btn-primary">
            Try it free <ArrowRight size={16}/>
          </Link>
          <a href="#how" className="btn-ghost">See how it works</a>
        </div>
        <div className="hero-proof">
          <Check size={13} className="hero-proof-check" color="#86efac"/>
          <span>Free to start · Works on any phone · No training needed</span>
        </div>
      </section>

      {/* ── PHONE MOCKUP ── */}
      <div className="phone-wrap">
        <div className="phone">
          <div className="phone-screen">
            <div className="phone-notch"/>
            <div className="phone-content">
              <div className="ph-header">Dashboard</div>
              <div className="ph-kpis">
                <div className="ph-kpi">
                  <div className="ph-kpi-val" style={{ color: '#fca5a5' }}>R 8,240</div>
                  <div className="ph-kpi-label">Outstanding</div>
                </div>
                <div className="ph-kpi">
                  <div className="ph-kpi-val" style={{ color: '#f0f0f0' }}>17</div>
                  <div className="ph-kpi-label">Invoices</div>
                </div>
              </div>
              {[
                { color: '#86efac', w1: '70%', w2: '45%', amt: 'R 4,850' },
                { color: '#fdba74', w1: '55%', w2: '38%', amt: 'R 2,100' },
                { color: '#fca5a5', w1: '80%', w2: '52%', amt: 'R 1,290' },
              ].map((c, i) => (
                <div key={i} className="ph-card">
                  <div className="ph-dot" style={{ background: c.color }}/>
                  <div className="ph-lines">
                    <div className="ph-line" style={{ width: c.w1 }}/>
                    <div className="ph-line" style={{ width: c.w2 }}/>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.color, flexShrink: 0 }}>{c.amt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BEFORE / AFTER ── */}
      <section className="pain">
        <h2 className="pain-h2">Sound familiar?</h2>
        <p className="pain-sub">Most small business owners are drowning in paper. We fix that.</p>
        <div className="pain-grid">
          {[
            { before: 'Typing every invoice by hand', after: 'Snap a photo, done in 4 seconds' },
            { before: 'Finding invoices in WhatsApp or email', after: 'Everything in one place, searchable' },
            { before: "Month-end panic — where are all the invoices?", after: 'Real-time — always up to date' },
            { before: 'Not knowing what you owe this week', after: 'Open invoices with aging at a glance' },
          ].map((p, i) => (
            <div key={i} className="pain-card">
              <div className="pain-before">Before</div>
              <div className="pain-text" style={{ marginBottom: 12, color: '#555' }}>{p.before}</div>
              <div className="pain-after">After</div>
              <div className="pain-text" style={{ color: '#a3a3a3' }}>{p.after}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features">
        <div className="features-inner">
          <div className="section-eyebrow">What you get</div>
          <h2 className="section-h2">Everything in<br/>your pocket.</h2>
          <div className="feat-list">
            {[
              {
                icon: Camera, bg: 'rgba(56,189,248,0.1)', color: '#38bdf8',
                title: 'Capture from anywhere',
                desc: 'Camera, gallery, PDF upload, or forwarded email. Any invoice format — printed, handwritten, digital.',
                tag: 'Core feature', tagBg: 'rgba(56,189,248,0.1)', tagColor: '#38bdf8',
              },
              {
                icon: Zap, bg: 'rgba(167,139,250,0.1)', color: '#a78bfa',
                title: 'AI reads every field',
                desc: 'Supplier name, invoice date, amount, VAT, reference number and line items — all extracted automatically with a confidence score.',
                tag: 'AI-powered', tagBg: 'rgba(167,139,250,0.1)', tagColor: '#a78bfa',
              },
              {
                icon: FileText, bg: 'rgba(134,239,172,0.1)', color: '#86efac',
                title: 'Duplicate and mismatch detection',
                desc: 'Flags duplicate invoices and catches when line item totals don\'t match the invoice total — before you save.',
                tag: 'Saves mistakes', tagBg: 'rgba(134,239,172,0.1)', tagColor: '#86efac',
              },
            ].map(f => (
              <div key={f.title} className="feat-item">
                <div className="feat-icon-wrap" style={{ background: f.bg }}>
                  <f.icon size={20} color={f.color} strokeWidth={1.8}/>
                </div>
                <div>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                  <span className="feat-tag" style={{ background: f.tagBg, color: f.tagColor }}>{f.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how" id="how">
        <div className="how-inner">
          <div className="section-eyebrow">How it works</div>
          <h2 className="section-h2">Three taps.<br/>Invoice captured.</h2>
          <div className="steps">
            {[
              { n: '1', title: 'Open the app and tap Capture', desc: 'Use your camera, pick from your gallery, or upload a PDF. Works offline too — syncs when you\'re back online.' },
              { n: '2', title: 'Watch the AI do the work', desc: 'Every field is extracted in seconds. Amounts verified, duplicates checked, VAT calculated.' },
              { n: '3', title: 'Confirm and save', desc: 'Fix anything flagged, assign a category or project, and save. Your records are always accurate.' },
            ].map((s, i, arr) => (
              <div key={s.n} className="step">
                <div className="step-left">
                  <div className="step-num">{s.n}</div>
                  {i < arr.length - 1 && <div className="step-line"/>}
                </div>
                <div className="step-body">
                  <div className="step-title">{s.title}</div>
                  <p className="step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-h2">Ready to ditch<br/>the shoebox?</h2>
          <p className="cta-sub">Join small business owners who scan instead of type. Free to start — takes 60 seconds to set up.</p>
          <Link href="/onboarding" className="btn-primary" style={{ display: 'inline-flex' }}>
            Get started free <ArrowRight size={16}/>
          </Link>
          <p className="cta-fine">No credit card · No setup · Works on Android and iPhone</p>
        </div>
      </section>

      <footer className="footer">
        <span className="footer-text">© {new Date().getFullYear()} Go Capture · Go 2 Analytics (Pty) Ltd</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/auth/signin" className="footer-link">Sign in</Link>
          <Link href="/onboarding" className="footer-link">Get started</Link>
        </div>
      </footer>
    </>
  );
}
