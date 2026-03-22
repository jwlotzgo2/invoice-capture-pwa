'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, Upload } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose?: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [streamReady, setStreamReady] = useState(false);

  const startStream = useCallback(async (facing: 'user' | 'environment') => {
    // Stop existing tracks before starting new ones
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      trackRef.current = null;
    }
    setStreamReady(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 4096 },
          height: { ideal: 3072 },
        },
        audio: false,
      });

      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      const settings = track.getSettings();
      console.log('[Camera] stream resolution:', settings.width, 'x', settings.height);

      // Apply continuous autofocus if supported
      const caps = track.getCapabilities?.() as any;
      if (caps?.focusMode?.includes('continuous')) {
        await track.applyConstraints?.({ advanced: [{ focusMode: 'continuous' }] } as any).catch(() => {});
      }

      // FIX: always attach stream to video element, whether first load or retake
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setHasPermission(true);
      setError(null);
      setStreamReady(true);
    } catch (err: any) {
      console.error('[Camera] stream error:', err);
      setHasPermission(false);
      setError(err?.message || 'Camera access denied');
    }
  }, []);

  // Start stream on mount and when facingMode changes
  useEffect(() => {
    startStream(facingMode);
    // Only stop stream on full unmount, not on every render
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      trackRef.current = null;
    };
  }, [facingMode]);

  // FIX: when returning from preview (retake), reattach stream to video element
  // The video element unmounts when capturedImage is set, so srcObject is lost
  useEffect(() => {
    if (!capturedImage && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [capturedImage]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    // Stream is still alive — the useEffect above will reattach it
  }, []);

  const capture = useCallback(async () => {
    if (!trackRef.current || capturing || !streamReady) return;
    setCapturing(true);

    try {
      if (typeof (window as any).ImageCapture !== 'undefined') {
        const imageCapture = new (window as any).ImageCapture(trackRef.current);
        const bitmap: ImageBitmap = await imageCapture.grabFrame();
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
        bitmap.close();
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        console.log('[Camera] ImageCapture resolution:', bitmap.width, 'x', bitmap.height);
        setCapturedImage(dataUrl);
      } else {
        // Fallback: canvas from video frame
        const video = videoRef.current;
        if (!video) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        console.log('[Camera] canvas fallback resolution:', canvas.width, 'x', canvas.height);
        setCapturedImage(dataUrl);
      }
    } catch (err) {
      console.error('[Camera] capture error:', err);
      const video = videoRef.current;
      if (video) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')!.drawImage(video, 0, 0);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.95));
      }
    } finally {
      setCapturing(false);
    }
  }, [capturing, streamReady]);

  const switchCamera = () => setFacingMode(prev => prev === 'user' ? 'environment' : 'user');

  const handleTapToFocus = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    if (!clientX || !clientY) return;

    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    const normX = relX / rect.width;
    const normY = relY / rect.height;

    setFocusPoint({ x: relX, y: relY });
    setTimeout(() => setFocusPoint(null), 1200);

    const track = trackRef.current;
    if (!track) return;

    track.applyConstraints?.({
      advanced: [{ focusMode: 'manual', pointsOfInterest: [{ x: normX, y: normY }] }] as any,
    }).catch(() => {
      track.applyConstraints?.({ advanced: [{ focusMode: 'continuous' }] } as any).catch(() => {});
    });

    setTimeout(() => {
      track.applyConstraints?.({ advanced: [{ focusMode: 'continuous' }] } as any).catch(() => {});
    }, 1500);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCapturedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ── Preview ────────────────────────────────────────────────────────────────
  if (capturedImage) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <img src={capturedImage} alt="Captured invoice" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12 }} />
        </div>
        <div style={{ padding: '20px 24px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center', gap: 16, background: 'rgba(0,0,0,0.85)' }}>
          <button
            onClick={handleRetake}
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
        @keyframes focusRing { 0%{transform:scale(1.5);opacity:1} 100%{transform:scale(1);opacity:0.5} }
        @keyframes shutterFlash { 0%{opacity:0} 50%{opacity:0.35} 100%{opacity:0} }
      `}</style>

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '16px', paddingTop: 'max(16px, env(safe-area-inset-top))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
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

      {/* Video — tap to focus */}
      <div
        style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}
        onClick={handleTapToFocus}
        onTouchEnd={handleTapToFocus}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {capturing && (
          <div style={{ position: 'absolute', inset: 0, background: '#fff', animation: 'shutterFlash 0.3s ease-out', pointerEvents: 'none' }} />
        )}

        {focusPoint && (
          <div style={{
            position: 'absolute',
            left: focusPoint.x - 30, top: focusPoint.y - 30,
            width: 60, height: 60, borderRadius: '50%',
            border: '2px solid #fff', pointerEvents: 'none',
            animation: 'focusRing 1.2s ease-out forwards',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
          }} />
        )}

        {/* Frame corners */}
        <div style={{ position: 'absolute', inset: 48, border: '2px solid rgba(255,255,255,0.2)', borderRadius: 12, pointerEvents: 'none' }}>
          {([['top','left','borderTop','borderLeft','borderTopLeftRadius'],['top','right','borderTop','borderRight','borderTopRightRadius'],['bottom','left','borderBottom','borderLeft','borderBottomLeftRadius'],['bottom','right','borderBottom','borderRight','borderBottomRightRadius']] as const).map(([v,h,b1,b2,r],i)=>(
            <div key={i} style={{ position:'absolute',[v]:-2,[h]:-2,width:28,height:28,[b1]:'3px solid #fff',[b2]:'3px solid #fff',[r]:6 }}/>
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Sans, sans-serif' }}>Tap to focus</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ height: 140, paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, flexShrink: 0 }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
        >
          <Upload size={22} />
        </button>

        <button
          onClick={capture}
          disabled={capturing || !streamReady}
          style={{ width: 72, height: 72, borderRadius: '50%', background: capturing ? '#555' : '#fff', border: '4px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: capturing ? 'default' : 'pointer', boxShadow: '0 0 0 6px rgba(255,255,255,0.2)', transition: 'background 0.15s' }}
        >
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: capturing ? '#888' : '#fff', border: '3px solid #1a1a1a' }} />
        </button>

        <div style={{ width: 48 }} />
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
    </div>
  );
}
