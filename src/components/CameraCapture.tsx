'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, RotateCcw, Check, Upload, Focus } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose?: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [focusSupported, setFocusSupported] = useState(false);

  // FIX: add focusMode continuous + advanced constraints for Samsung S25+
  const videoConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    facingMode,
    // These advanced constraints enable continuous autofocus on supported browsers
    advanced: [{ focusMode: 'continuous' }] as any,
  };

  // FIX: once stream is active, apply continuous autofocus via ImageCapture API
  const handleUserMedia = useCallback((stream: MediaStream) => {
    setHasPermission(true);
    setError(null);

    const track = stream.getVideoTracks()[0];
    if (!track) return;

    // Check if focus is supported on this device
    const caps = track.getCapabilities?.() as any;
    if (caps?.focusMode) {
      setFocusSupported(true);
      // Apply continuous autofocus immediately
      track.applyConstraints?.({ advanced: [{ focusMode: 'continuous' }] } as any)
        .catch(() => {}); // silently ignore if not supported
    }
  }, []);

  // FIX: tap to focus — converts tap coordinates to focusDistance point
  const handleTapToFocus = useCallback((e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    setFocusPoint({ x: clientX - rect.left, y: clientY - rect.top });
    setTimeout(() => setFocusPoint(null), 1200);

    // Try to apply focus via track constraints
    if (webcamRef.current) {
      const stream = (webcamRef.current as any).stream as MediaStream | undefined;
      const track = stream?.getVideoTracks()[0];
      if (track) {
        // Try manual point-of-interest focus, fall back to continuous
        track.applyConstraints?.({
          advanced: [{ focusMode: 'manual', pointsOfInterest: [{ x, y }] }] as any,
        }).catch(() => {
          // If manual not supported, just force a continuous re-lock
          track.applyConstraints?.({ advanced: [{ focusMode: 'continuous' }] } as any).catch(() => {});
        });
        // Return to continuous after 1.5s so it doesn't stay locked
        setTimeout(() => {
          track.applyConstraints?.({ advanced: [{ focusMode: 'continuous' }] } as any).catch(() => {});
        }, 1500);
      }
    }
  }, []);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) setCapturedImage(imageSrc);
    }
  }, []);

  const switchCamera = () => setFacingMode((prev) => prev === 'user' ? 'environment' : 'user');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCapturedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ── Preview (after capture) ────────────────────────────────────────────────
  if (capturedImage) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <img src={capturedImage} alt="Captured invoice" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12 }} />
        </div>
        <div style={{ padding: '20px 24px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center', gap: 16, background: 'rgba(0,0,0,0.85)' }}>
          <button
            onClick={() => setCapturedImage(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#374151', color: '#fff', border: 'none', borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            <RotateCcw size={18} />Retake
          </button>
          <button
            onClick={() => onCapture(capturedImage)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            <Check size={18} />Use Photo
          </button>
        </div>
      </div>
    );
  }

  // ── No permission ──────────────────────────────────────────────────────────
  if (hasPermission === false) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', color: '#fff', maxWidth: 360 }}>
          <Camera size={64} color="rgba(255,255,255,0.4)" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Camera Access Required</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '0 0 24px' }}>
            {error || 'Please grant camera access to capture invoices.'}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', width: '100%', marginBottom: 12 }}
          >
            <Upload size={18} />Upload from Gallery
          </button>
          {onClose && (
            <button onClick={onClose} style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 8 }}>
              Cancel
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>
    );
  }

  // ── Camera view ────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .go-capture-webcam { position: absolute; inset: 0; width: 100% !important; height: 100% !important; object-fit: cover !important; display: block; }
        @keyframes focusRing { 0% { transform: scale(1.4); opacity: 1; } 100% { transform: scale(1); opacity: 0.6; } }
      `}</style>

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '16px 16px', paddingTop: 'max(16px, env(safe-area-inset-top))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
        {onClose ? (
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        ) : <div style={{ width: 40 }} />}
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>Scan Invoice</span>
        <button onClick={switchCamera} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Webcam — tap to focus enabled */}
      <div
        style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}
        onClick={handleTapToFocus}
        onTouchStart={handleTapToFocus}
      >
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.92}
          videoConstraints={videoConstraints}
          onUserMedia={handleUserMedia}
          onUserMediaError={(err) => { setHasPermission(false); setError(typeof err === 'string' ? err : (err as DOMException).message); }}
          className="go-capture-webcam"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Tap to focus ring — shows where user tapped */}
        {focusPoint && (
          <div style={{
            position: 'absolute',
            left: focusPoint.x - 28,
            top: focusPoint.y - 28,
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: '2px solid #fff',
            pointerEvents: 'none',
            animation: 'focusRing 1.2s ease-out forwards',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
          }} />
        )}

        {/* Frame guide */}
        <div style={{ position: 'absolute', inset: 48, border: '2px solid rgba(255,255,255,0.25)', borderRadius: 12, pointerEvents: 'none' }}>
          {[['top', 'left', 'borderTop', 'borderLeft', 'borderTopLeftRadius'], ['top', 'right', 'borderTop', 'borderRight', 'borderTopRightRadius'], ['bottom', 'left', 'borderBottom', 'borderLeft', 'borderBottomLeftRadius'], ['bottom', 'right', 'borderBottom', 'borderRight', 'borderBottomRightRadius']].map(([v, h, b1, b2, r], i) => (
            <div key={i} style={{ position: 'absolute', [v]: -2, [h]: -2, width: 28, height: 28, [b1]: '3px solid #fff', [b2]: '3px solid #fff', [r]: 6 }} />
          ))}
        </div>

        {/* Tap to focus hint */}
        <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif', letterSpacing: 0.3 }}>
            Tap to focus
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        height: 140,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        flexShrink: 0,
      }}>
        {/* Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
        >
          <Upload size={22} />
        </button>

        {/* Shutter */}
        <button
          onClick={capture}
          style={{ width: 72, height: 72, borderRadius: '50%', background: '#fff', border: '4px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 0 6px rgba(255,255,255,0.2)' }}
        >
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '3px solid #1a1a1a' }} />
        </button>

        {/* Spacer */}
        <div style={{ width: 48 }} />
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
    </div>
  );
}
