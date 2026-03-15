'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: #0f0f0f; }
  .lp { font-family: Inter, system-ui, sans-serif; min-height: 100svh; background: #0f0f0f;
    color: #f0f0f0; display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 24px; }
  .lp-card { width: 100%; max-width: 380px; }
  .lp-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 40px; }
  .lp-logo-dot { width: 10px; height: 10px; border-radius: 3px; background: #38bdf8; }
  .lp-logo-text { font-size: 18px; font-weight: 800; color: #f0f0f0; letter-spacing: -0.3px; }
  .lp-heading { font-size: 28px; font-weight: 800; color: #f0f0f0; letter-spacing: -0.8px; margin-bottom: 6px; }
  .lp-sub { font-size: 14px; color: #6b6b6b; margin-bottom: 32px; line-height: 1.5; }
  .lp-field { margin-bottom: 14px; }
  .lp-label { font-size: 12px; font-weight: 700; color: #6b6b6b; text-transform: uppercase;
    letter-spacing: 0.5px; display: block; margin-bottom: 7px; }
  .lp-input-wrap { position: relative; display: flex; align-items: center; }
  .lp-input-icon { position: absolute; left: 13px; color: #444; pointer-events: none; }
  .lp-input { width: 100%; padding: 13px 13px 13px 40px; background: #1a1a1a;
    border: 1.5px solid #2a2a2a; border-radius: 10px; font-size: 15px;
    font-family: inherit; color: #f0f0f0; outline: none; transition: border-color 0.15s; }
  .lp-input:focus { border-color: #38bdf8; }
  .lp-input::placeholder { color: #3a3a3a; }
  .lp-input-icon-right { position: absolute; right: 13px; background: none; border: none;
    cursor: pointer; color: #444; padding: 4px; display: flex; align-items: center; }
  .lp-input-icon-right:hover { color: #888; }
  .lp-error { background: rgba(252,165,165,0.08); border: 1px solid rgba(252,165,165,0.25);
    border-radius: 8px; padding: 10px 13px; font-size: 13px; color: #fca5a5;
    margin-bottom: 16px; line-height: 1.4; }
  .lp-success { background: rgba(134,239,172,0.08); border: 1px solid rgba(134,239,172,0.25);
    border-radius: 8px; padding: 10px 13px; font-size: 13px; color: #86efac;
    margin-bottom: 16px; line-height: 1.4; }
  .lp-btn { width: 100%; padding: 15px; background: #f0f0f0; color: #0f0f0f; border: none;
    border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer;
    font-family: inherit; display: flex; align-items: center; justify-content: center;
    gap: 8px; transition: opacity 0.15s; margin-top: 8px; }
  .lp-btn:hover { opacity: 0.9; }
  .lp-btn:disabled { opacity: 0.5; cursor: default; }
  .lp-divider { display: flex; align-items: center; gap: 12px; margin: 22px 0; }
  .lp-divider-line { flex: 1; height: 1px; background: #1e1e1e; }
  .lp-divider-text { font-size: 12px; color: #444; flex-shrink: 0; }
  .lp-magic-btn { width: 100%; padding: 14px; background: transparent; color: #a3a3a3;
    border: 1.5px solid #2a2a2a; border-radius: 10px; font-size: 14px; font-weight: 600;
    cursor: pointer; font-family: inherit; display: flex; align-items: center;
    justify-content: center; gap: 8px; transition: border-color 0.15s, color 0.15s; }
  .lp-magic-btn:hover { border-color: #444; color: #f0f0f0; }
  .lp-magic-btn:disabled { opacity: 0.5; cursor: default; }
  .lp-footer { margin-top: 32px; text-align: center; font-size: 13px; color: #444; }
  .lp-footer a { color: #38bdf8; text-decoration: none; font-weight: 600; }
  .lp-footer a:hover { text-decoration: underline; }
  .lp-forgot { display: block; text-align: right; font-size: 12px; color: #555;
    text-decoration: none; margin-top: 6px; transition: color 0.15s; }
  .lp-forgot:hover { color: #a3a3a3; }
  .lp-tabs { display: flex; gap: 0; background: #1a1a1a; border-radius: 10px;
    padding: 4px; margin-bottom: 28px; }
  .lp-tab { flex: 1; padding: 9px; border-radius: 8px; border: none; background: transparent;
    font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit;
    color: #555; transition: all 0.15s; }
  .lp-tab.active { background: #282828; color: #f0f0f0; }
`;

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw e;
        router.push('/');
        router.refresh();
      } else {
        const { error: e } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
        });
        if (e) throw e;
        setSuccess('Account created! Check your email to confirm before signing in.');
        setPassword('');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setError(''); setSuccess('');
    if (!email) { setError('Enter your email address first.'); return; }
    setMagicLoading(true);
    try {
      const { error: e } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      });
      if (e) throw e;
      setSuccess('Magic link sent! Check your email and tap the link to sign in.');
    } catch (e: any) {
      setError(e.message || 'Failed to send magic link.');
    } finally {
      setMagicLoading(false);
    }
  };

  return (
    <div className="lp">
      <style>{css}</style>
      <div className="lp-card">

        {/* Logo */}
        <div className="lp-logo">
          <div className="lp-logo-dot"/>
          <span className="lp-logo-text">Go Capture</span>
        </div>

        {/* Heading */}
        <h1 className="lp-heading">
          {mode === 'signin' ? 'Welcome back.' : 'Create account.'}
        </h1>
        <p className="lp-sub">
          {mode === 'signin'
            ? 'Sign in to your Go Capture account.'
            : 'Start capturing invoices in under a minute.'}
        </p>

        {/* Mode toggle */}
        <div className="lp-tabs">
          <button className={`lp-tab${mode === 'signin' ? ' active' : ''}`} onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}>
            Sign in
          </button>
          <button className={`lp-tab${mode === 'signup' ? ' active' : ''}`} onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>
            Sign up
          </button>
        </div>

        {/* Error / success */}
        {error && <div className="lp-error">{error}</div>}
        {success && <div className="lp-success">{success}</div>}

        {/* Email */}
        <div className="lp-field">
          <label className="lp-label">Email</label>
          <div className="lp-input-wrap">
            <Mail size={16} className="lp-input-icon"/>
            <input className="lp-input" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoComplete="email" autoCapitalize="none"/>
          </div>
        </div>

        {/* Password */}
        <div className="lp-field">
          <label className="lp-label">Password</label>
          <div className="lp-input-wrap">
            <Lock size={16} className="lp-input-icon"/>
            <input className="lp-input" type={showPw ? 'text' : 'password'}
              placeholder={mode === 'signup' ? 'Choose a password' : 'Your password'}
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              style={{ paddingRight: 40 }}/>
            <button className="lp-input-icon-right" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
              {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
          {mode === 'signin' && (
            <a href="#" className="lp-forgot" onClick={async e => {
              e.preventDefault();
              if (!email) { setError('Enter your email first.'); return; }
              setLoading(true);
              await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback` });
              setSuccess('Password reset email sent. Check your inbox.');
              setLoading(false);
            }}>Forgot password?</a>
          )}
        </div>

        {/* Submit */}
        <button className="lp-btn" onClick={handleSubmit} disabled={loading || magicLoading}>
          {loading ? <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }}/> : null}
          {mode === 'signin' ? 'Sign in' : 'Create account'}
          {!loading && <ArrowRight size={16}/>}
        </button>

        {/* Magic link divider */}
        <div className="lp-divider">
          <div className="lp-divider-line"/>
          <span className="lp-divider-text">or</span>
          <div className="lp-divider-line"/>
        </div>

        <button className="lp-magic-btn" onClick={handleMagicLink} disabled={loading || magicLoading}>
          {magicLoading ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }}/> : <Mail size={15}/>}
          Send magic link
        </button>

        {/* Footer */}
        <div className="lp-footer">
          {mode === 'signin'
            ? <>No account? <a href="#" onClick={e => { e.preventDefault(); setMode('signup'); setError(''); setSuccess(''); }}>Sign up free</a></>
            : <>Already have an account? <a href="#" onClick={e => { e.preventDefault(); setMode('signin'); setError(''); setSuccess(''); }}>Sign in</a></>
          }
        </div>
      </div>
    </div>
  );
}
