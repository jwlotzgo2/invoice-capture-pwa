export default function OfflinePage() {
  const T = { bg: '#1c1c1c', surface: '#282828', border: '#383838', text: '#f0f0f0', textDim: '#8a8a8a', yellow: '#e5e5e5' };
  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Go Capture — Offline</title>
      </head>
      <body style={{ margin: 0, background: T.bg, color: T.text, fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100svh', flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>📡</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: T.yellow }}>You're offline</div>
        <div style={{ fontSize: 14, color: T.textDim, maxWidth: 280, lineHeight: 1.6 }}>
          No connection detected. Pages you've visited recently are still available — try navigating back.
        </div>
        <button onClick={() => window.location.reload()} style={{ marginTop: 8, padding: '10px 24px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontSize: 14, cursor: 'pointer' }}>
          Try again
        </button>
      </body>
    </html>
  );
}
