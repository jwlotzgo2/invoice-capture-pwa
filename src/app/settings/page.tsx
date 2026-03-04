'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, Building2, Phone, Mail, LogOut, Shield, ChevronRight, Loader2, Check } from 'lucide-react';

interface Profile {
  full_name: string;
  email: string;
  phone: string | null;
  organisation_name: string | null;
  role: string;
  created_at: string;
}

const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 };
const value: React.CSSProperties = { fontSize: 15, fontWeight: 500, color: '#0f172a' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 10, fontSize: 14, fontWeight: 500, color: '#0f172a',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff',
};
const card: React.CSSProperties = { background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 16 };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #f1f5f9' };
const rowLast: React.CSSProperties = { ...row, borderBottom: 'none' };

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', organisation_name: '' });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }
      const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile({ ...data, email: user.email || '' });
        setForm({ full_name: data.full_name || '', phone: data.phone || '', organisation_name: data.organisation_name || '' });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_profiles').update({
      full_name: form.full_name,
      phone: form.phone || null,
      organisation_name: form.organisation_name || null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    setProfile((p) => p ? { ...p, ...form } : p);
    setSaving(false);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={28} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const initials = profile?.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 16px' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Settings</div>
      </header>

      <main style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0 20px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 12,
          }}>{initials}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{profile?.full_name || 'No name'}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{profile?.email}</div>
          {profile?.role === 'admin' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, background: '#f5f3ff', padding: '3px 10px', borderRadius: 6 }}>
              <Shield size={12} color="#7c3aed" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Admin</span>
            </div>
          )}
        </div>

        {/* Profile Details */}
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Profile</span>
            {!editing ? (
              <button onClick={() => setEditing(true)} style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditing(false)} style={{ fontSize: 13, fontWeight: 600, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Full Name', key: 'full_name', placeholder: 'Jan Willem Lotz' },
                { label: 'Organisation', key: 'organisation_name', placeholder: 'Go 2 Analytics' },
                { label: 'Phone', key: 'phone', placeholder: '+27 82 123 4567' },
              ].map(({ label: l, key, placeholder }) => (
                <div key={key}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 5 }}>{l}</div>
                  <input
                    value={form[key as keyof typeof form] || ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div style={row}>
                <User size={18} color="#94a3b8" />
                <div style={{ flex: 1 }}>
                  <div style={label}>Full Name</div>
                  <div style={value}>{profile?.full_name || '—'}</div>
                </div>
              </div>
              <div style={row}>
                <Building2 size={18} color="#94a3b8" />
                <div style={{ flex: 1 }}>
                  <div style={label}>Organisation</div>
                  <div style={value}>{profile?.organisation_name || '—'}</div>
                </div>
              </div>
              <div style={row}>
                <Mail size={18} color="#94a3b8" />
                <div style={{ flex: 1 }}>
                  <div style={label}>Email</div>
                  <div style={value}>{profile?.email}</div>
                </div>
              </div>
              <div style={rowLast}>
                <Phone size={18} color="#94a3b8" />
                <div style={{ flex: 1 }}>
                  <div style={label}>Phone</div>
                  <div style={value}>{profile?.phone || '—'}</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Admin link if admin */}
        {profile?.role === 'admin' && (
          <div style={card}>
            <button onClick={() => router.push('/admin')} style={{ ...rowLast, width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              <Shield size={18} color="#7c3aed" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Admin Console</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Manage users, orgs and analytics</div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </button>
          </div>
        )}

        {/* Account info */}
        <div style={card}>
          <div style={rowLast}>
            <div style={{ flex: 1 }}>
              <div style={label}>Member since</div>
              <div style={value}>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</div>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut} style={{
          width: '100%', padding: '14px', borderRadius: 12,
          border: '1.5px solid #fecdd3', background: '#fff1f2',
          color: '#e11d48', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <LogOut size={18} />Sign Out
        </button>

        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, color: '#16a34a', fontSize: 13, fontWeight: 600 }}>
            <Check size={16} />Profile saved
          </div>
        )}
      </main>
    </div>
  );
}
