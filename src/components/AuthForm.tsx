'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, AlertCircle, User, Building2, Phone } from 'lucide-react';

interface AuthFormProps { mode: 'login' | 'register'; }

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 12px 11px 38px', border: '1.5px solid #e2e8f0',
  borderRadius: 10, fontSize: 14, fontWeight: 500, color: '#0f172a',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff',
};
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 6 };

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>{icon}</span>
        {children}
      </div>
    </div>
  );
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const focus = (e: React.FocusEvent<HTMLInputElement>) => e.target.style.borderColor = '#2563eb';
  const blur = (e: React.FocusEvent<HTMLInputElement>) => e.target.style.borderColor = '#e2e8f0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setMessage(null); setLoading(true);
    try {
      if (mode === 'register') {
        if (!fullName.trim()) { setError('Full name is required'); return; }
        if (!organisationName.trim()) { setError('Organisation name is required'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { full_name: fullName.trim(), organisation_name: organisationName.trim(), phone: phone.trim() || null },
          },
        });
        if (error) throw error;
        setMessage('Check your email to confirm your account');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Update last_login_at
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from('user_profiles').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);
        router.push('/invoices');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, color: '#be123c', fontSize: 13 }}>
          <AlertCircle size={16} />{error}
        </div>
      )}
      {message && (
        <div style={{ padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, color: '#15803d', fontSize: 13 }}>{message}</div>
      )}

      {mode === 'register' && (
        <>
          <Field label="Full Name" icon={<User size={16} />}>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Jan Willem Lotz" style={inp} onFocus={focus} onBlur={blur} />
          </Field>
          <Field label="Organisation / Company" icon={<Building2 size={16} />}>
            <input type="text" value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} required placeholder="Go 2 Analytics" style={inp} onFocus={focus} onBlur={blur} />
          </Field>
          <Field label="Phone Number" icon={<Phone size={16} />}>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 82 123 4567" style={inp} onFocus={focus} onBlur={blur} />
          </Field>
        </>
      )}

      <Field label="Email" icon={<Mail size={16} />}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" style={inp} onFocus={focus} onBlur={blur} />
      </Field>
      <Field label="Password" icon={<Lock size={16} />}>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" style={inp} onFocus={focus} onBlur={blur} />
      </Field>
      {mode === 'register' && (
        <Field label="Confirm Password" icon={<Lock size={16} />}>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} placeholder="••••••••" style={inp} onFocus={focus} onBlur={blur} />
        </Field>
      )}

      <button type="submit" disabled={loading} style={{
        width: '100%', padding: 13, borderRadius: 12, border: 'none',
        background: loading ? '#93c5fd' : '#2563eb', color: '#fff',
        fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
      }}>
        {loading && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </button>
    </form>
  );
}
