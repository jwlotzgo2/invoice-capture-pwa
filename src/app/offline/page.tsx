'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WifiOff, Camera, Clock } from 'lucide-react';
import { getPendingCount } from '@/lib/offlineQueue';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  text: '#f0f0f0', textDim: '#a3a3a3', textMuted: '#6b6b6b',
  warning: '#fdba74', success: '#86efac',
};

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: ${T.bg}; }
  .off { font-family: Inter, system-ui, sans-serif; min-height: 100svh; background: ${T.bg};
    color: ${T.text}; display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 32px 24px; text-align: center; gap: 0; }
  .off-icon { width: 72px; height: 72px; border-radius: 20px; background: rgba(253,186,116,0.1);
    border: 1px solid rgba(253,186,116,0.2); display: flex; align-items: center;
    justify-content: center; margin-bottom: 24px; }
  .off-title { font-size: 26px; font-weight: 800; color: ${T.text}; letter-spacing: -0.5px;
    margin-bottom: 10px; }
  .off-sub { font-size: 15px; color: ${T.textMuted}; line-height: 1.6; max-width: 280px;
    margin-bottom: 32px; }
  .off-queue { display: flex; align-items: center; gap: 8px; background: ${T.surface};
    border: 1px solid ${T.border}; border-radius: 10px; padding: 12px 16px;
    margin-bottom: 32px; font-size: 13px; color: ${T.textDim}; }
  .off-queue-badge { background: rgba(253,186,116,0.15); color: ${T.warning};
    border: 1px solid rgba(253,186,116,0.3); border-radius: 6px; padding: 2px 8px;
    font-size: 12px; font-weight: 700; }
  .off-btn { width: 100%; max-width: 320px; padding: 16px; background: ${T.text};
    color: ${T.bg}; border: none; border-radius: 12px; font-size: 16px; font-weight: 700;
    cursor: pointer; font-family: inherit; display: flex; align-items: center;
    justify-content: center; gap: 10px; transition: opacity 0.15s; }
  .off-btn:active { opacity: 0.85; }
  .off-note { margin-top: 20px; font-size: 12px; color: ${T.textMuted}; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  .pulse { animation: pulse 2s ease-in-out infinite; }
`;

export default function OfflinePage() {
  const [pendingCount, setPendingCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    getPendingCount().then(setPendingCount);

    // Redirect home when back online
    const handleOnline = () => router.replace('/');
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <div className="off">
      <style>{css}</style>

      <div className="off-icon pulse">
        <WifiOff size={32} color={T.warning} strokeWidth={1.5}/>
      </div>

      <h1 className="off-title">You're offline</h1>
      <p className="off-sub">
        No internet connection. You can still capture documents — they'll upload automatically when you reconnect.
      </p>

      {pendingCount > 0 && (
        <div className="off-queue">
          <Clock size={14} color={T.warning}/>
          <span>
            <span className="off-queue-badge">{pendingCount}</span>
            {' '}document{pendingCount !== 1 ? 's' : ''} queued — waiting to upload
          </span>
        </div>
      )}

      <button className="off-btn" onClick={() => router.push('/capture')}>
        <Camera size={18}/>
        Capture a document
      </button>

      <p className="off-note">You'll be taken back to the app automatically when reconnected</p>
    </div>
  );
}
