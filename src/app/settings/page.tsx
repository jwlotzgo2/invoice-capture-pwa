'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, Building2, Phone, Mail, LogOut, Shield, ChevronRight, Loader2, Check } from 'lucide-react';

interface Profile {
  full_name: string; email: string; phone: string | null;
  organisation_name: string | null; role: string; created_at: string;
}

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  yellow: '#e5e5e5', yellowGlow: 'rgba(229,229,229,0.1)',
  blue: '#8a8a8a', blueGlow: 'rgba(138,138,138,0.15)',
  text: '#f0f0f0', textDim: '#8a8a8a', textMuted: '#6b6b6b',
  error: '#fca5a5', success: '#86efac',
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap');
  * { box-sizing:border-box; }
  body { background:${T.bg};margin:0; }
  .settings-page { min-height:100svh;background:${T.bg};font-family:'Share Tech Mono',Inter, system-ui, sans-serif;color:${T.text}; }
  .scanline { position:fixed;top:0;left:0;right:0;bottom:0;
    background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);
    pointer-events:none;z-index:1000; }
  .settings-header { background:${T.surface};border-bottom:1px solid ${T.border};padding:14px 16px;
    position:sticky;top:0;z-index:40;box-shadow:0 0 20px rgba(138,138,138,0.08); }
  .settings-title { font-family:Inter, system-ui, sans-serif;font-size:22px;letter-spacing:0.3px;
    color:${T.yellow};text-shadow:0 0 10px rgba(229,229,229,0.12); }
  .t-card { background:${T.surface};border:1px solid ${T.border};border-radius:8px;
    margin-bottom:12px;overflow:hidden;position:relative; }
  .t-card::before { content:'';position:absolute;top:0;left:0;right:0;height:1px;
    background:linear-gradient(90deg,transparent,${T.blue},transparent);opacity:0.4; }
  .t-card-header { display:flex;align-items:center;justify-content:space-between;
    padding:12px 16px;border-bottom:1px solid ${T.border}; }
  .t-card-title { font-family:Inter, system-ui, sans-serif;font-size:16px;letter-spacing:0.3px;color:${T.yellow}; }
  .t-row { display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid ${T.border}; }
  .t-row.last { border-bottom:none; }
  .t-row-label { font-size:10px;letter-spacing:0.3px;color:${T.text};text-transform:none;margin-bottom:3px; }
  .t-row-value { font-size:14px;color:${T.text};font-family:Inter, system-ui, sans-serif; }
  .t-input { width:100%;padding:9px 12px;background:${T.bg};border:1px solid ${T.border};
    border-radius:4px;color:${T.text};font-family:Inter, system-ui, sans-serif;font-size:14px;
    outline:none;transition:border-color 0.2s,box-shadow 0.2s;box-sizing:border-box; }
  .t-input:focus { border-color:${T.blue};box-shadow:0 0 0 2px ${T.blueGlow}; }
  .t-input::placeholder { color:${T.textMuted}; }
  .t-label { font-size:10px;letter-spacing:0.3px;color:${T.text};text-transform:none;margin-bottom:5px;display:block; }
  @keyframes tspin { to{transform:rotate(360deg)} }
  .t-cursor { animation:tblink 1s step-end infinite;color:${T.yellow}; }
  @keyframes tblink { 0%,100%{opacity:1} 50%{opacity:0} }
`;

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
        setForm({ full_name: data.full_name||'', phone: data.phone||'', organisation_name: data.organisation_name||'' });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_profiles').update({ full_name: form.full_name, phone: form.phone||null, organisation_name: form.organisation_name||null, updated_at: new Date().toISOString() }).eq('id', user.id);
    setProfile(p => p ? { ...p, ...form } : p);
    setSaving(false); setEditing(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut(); router.push('/auth/login');
  };

  if (loading) return (
    <>
      <style>{css}</style>
      <div className="settings-page" style={{ display:'flex',alignItems:'center',justifyContent:'center' }}>
        <Loader2 size={32} color={T.blue} style={{ animation:'tspin 1s linear infinite' }} />
      </div>
    </>
  );

  const initials = profile?.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || '?';

  return (
    <>
      <style>{css}</style>
      <div className="settings-page">
        <div className="scanline" />

        <header className="settings-header">
          <div className="settings-title">SETTINGS<span className="t-cursor">_</span></div>
        </header>

        <main style={{ padding:16, maxWidth:480, margin:'0 auto', paddingBottom:100 }}>

          {/* Avatar */}
          <div style={{ display:'flex',flexDirection:'column',alignItems:'center',padding:'24px 0 20px' }}>
            <div style={{ width:72,height:72,borderRadius:6,background:T.yellow,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'VT323,monospace',fontSize:30,color:T.bg,marginBottom:12,boxShadow:'0 0 20px rgba(250,204,21,0.25)' }}>
              {initials}
            </div>
            <div style={{ fontFamily:'VT323,monospace',fontSize:22,letterSpacing:0.5,color:T.text }}>{profile?.full_name || 'NO NAME'}</div>
            <div style={{ fontSize:12,color:T.textDim,marginTop:2,letterSpacing:0.5 }}>{profile?.email}</div>
            {profile?.role === 'admin' && (
              <div style={{ display:'flex',alignItems:'center',gap:4,marginTop:8,background:T.blueGlow,padding:'3px 10px',borderRadius:4,border:`1px solid ${T.blue}` }}>
                <Shield size={12} color={T.blue} />
                <span style={{ fontSize:10,color:T.blue,textTransform:'none',letterSpacing:0.5,fontFamily:'Share Tech Mono,monospace' }}>Admin</span>
              </div>
            )}
          </div>

          {/* Profile card */}
          <div className="t-card">
            <div className="t-card-header">
              <span className="t-card-title">PROFILE</span>
              {!editing ? (
                <button onClick={() => setEditing(true)} style={{ fontSize:12,color:T.blue,background:'none',border:'none',cursor:'pointer',fontFamily:'Share Tech Mono,monospace',letterSpacing:1,textTransform:'none' }}>Edit</button>
              ) : (
                <div style={{ display:'flex',gap:12 }}>
                  <button onClick={() => setEditing(false)} style={{ fontSize:12,color:T.textDim,background:'none',border:'none',cursor:'pointer',fontFamily:'Share Tech Mono,monospace' }}>Cancel</button>
                  <button onClick={handleSave} disabled={saving} style={{ fontSize:12,color:T.yellow,background:'none',border:'none',cursor:'pointer',fontFamily:'Share Tech Mono,monospace' }}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div style={{ padding:16,display:'flex',flexDirection:'column',gap:14 }}>
                {[
                  { label:'Full Name', key:'full_name', placeholder:'Jan Willem Lotz' },
                  { label:'Organisation', key:'organisation_name', placeholder:'Go 2 Analytics' },
                  { label:'Phone', key:'phone', placeholder:'+27 82 123 4567' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="t-label">{label}</label>
                    <input className="t-input" value={form[key as keyof typeof form]||''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {[
                  { icon: <User size={16} color={T.textMuted} />, label:'Full Name', value:profile?.full_name },
                  { icon: <Building2 size={16} color={T.textMuted} />, label:'Organisation', value:profile?.organisation_name },
                  { icon: <Mail size={16} color={T.textMuted} />, label:'Email', value:profile?.email },
                  { icon: <Phone size={16} color={T.textMuted} />, label:'Phone', value:profile?.phone },
                ].map(({ icon, label, value }, i, arr) => (
                  <div key={label} className={`t-row${i===arr.length-1?' last':''}`}>
                    {icon}
                    <div style={{ flex:1 }}>
                      <div className="t-row-label">{label}</div>
                      <div className="t-row-value" style={{ color: value ? T.text : T.textMuted }}>{value || '—'}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Admin link */}
          {profile?.role === 'admin' && (
            <div className="t-card">
              <button onClick={() => router.push('/admin')} style={{ width:'100%',border:'none',background:'transparent',cursor:'pointer',textAlign:'left',fontFamily:'inherit' }}>
                <div className="t-row last" style={{ border:'none' }}>
                  <Shield size={16} color={T.blue} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,color:T.text,fontFamily:'Share Tech Mono,monospace' }}>Admin Console</div>
                    <div style={{ fontSize:11,color:T.textMuted,marginTop:2 }}>Manage users, orgs and analytics</div>
                  </div>
                  <ChevronRight size={14} color={T.textMuted} />
                </div>
              </button>
            </div>
          )}

          {/* Member since */}
          <div className="t-card">
            <div className="t-row last">
              <div style={{ flex:1 }}>
                <div className="t-row-label">Member Since</div>
                <div className="t-row-value">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}) : '—'}</div>
              </div>
            </div>
          </div>

          {/* Sign out */}
          <button onClick={handleSignOut} style={{
            width:'100%',padding:14,borderRadius:6,
            border:`1px solid rgba(248,113,113,0.3)`,background:'rgba(252,165,165,0.1)',
            color:T.error,fontFamily:'VT323,monospace',fontSize:18,letterSpacing:0.5,
            cursor:'pointer',textTransform:'none',
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
            transition:'box-shadow 0.2s',
          }}>
            <LogOut size={16} />Sign Out
          </button>

          {saved && (
            <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:12,color:T.success,fontSize:12,letterSpacing:1,fontFamily:'Share Tech Mono,monospace' }}>
              <Check size={14} />PROFILE SAVED
            </div>
          )}
        </main>
      </div>
    </>
  );
}
