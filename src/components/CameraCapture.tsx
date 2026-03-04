'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, Upload, ZoomIn, ZoomOut, Focus, Sun } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose?: () => void;
}

interface CameraCapabilities {
  focusMode?: string[];
  focusDistance?: { min: number; max: number; step: number };
  zoom?: { min: number; max: number; step: number };
  torch?: boolean;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<CameraCapabilities>({});
  const [currentZoom, setCurrentZoom] = useState(1);
  const [torchOn, setTorchOn] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [showFocusIndicator, setShowFocusIndicator] = useState(false);

  // Get optimal video constraints for document scanning
  const getVideoConstraints = useCallback(() => {
    return {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 },
        aspectRatio: { ideal: 16 / 9 },
        // Advanced constraints for document scanning
        focusMode: { ideal: 'continuous' },
        exposureMode: { ideal: 'continuous' },
        whiteBalanceMode: { ideal: 'continuous' },
      },
      audio: false,
    };
  }, [facingMode]);

  // Initialize camera with optimal settings
  const initCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = getVideoConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().then(() => resolve()).catch(() => resolve());
            };
          }
        });

        // Get camera capabilities
        const track = stream.getVideoTracks()[0];
        if (track) {
          const trackCapabilities = track.getCapabilities?.() as MediaTrackCapabilities & {
            focusMode?: string[];
            focusDistance?: { min: number; max: number; step: number };
            zoom?: { min: number; max: number; step: number };
            torch?: boolean;
          };
          
          if (trackCapabilities) {
            setCapabilities({
              focusMode: trackCapabilities.focusMode,
              focusDistance: trackCapabilities.focusDistance,
              zoom: trackCapabilities.zoom,
              torch: trackCapabilities.torch,
            });

            // Apply optimal settings for document scanning
            const advancedConstraints: MediaTrackConstraintSet & {
              focusMode?: string;
              focusDistance?: number;
              zoom?: number;
            } = {};

            // Set continuous autofocus if available
            if (trackCapabilities.focusMode?.includes('continuous')) {
              advancedConstraints.focusMode = 'continuous';
            }

            // Set minimum focus distance for close-up documents
            if (trackCapabilities.focusDistance) {
              // Set focus closer for document scanning (around 20-30cm)
              const optimalFocus = Math.max(
                trackCapabilities.focusDistance.min,
                Math.min(0.3, trackCapabilities.focusDistance.max)
              );
              advancedConstraints.focusDistance = optimalFocus;
            }

            // Apply initial zoom if available
            if (trackCapabilities.zoom) {
              setCurrentZoom(trackCapabilities.zoom.min);
            }

            if (Object.keys(advancedConstraints).length > 0) {
              try {
                await track.applyConstraints({ advanced: [advancedConstraints] } as MediaTrackConstraints);
              } catch (e) {
                console.log('Some advanced constraints not supported:', e);
              }
            }
          }
        }
      }

      setHasPermission(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Camera error:', err);
      setHasPermission(false);
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to access camera');
    }
  }, [facingMode, getVideoConstraints]);

  // Initialize camera on mount and when facing mode changes
  useEffect(() => {
    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [initCamera]);

  // Handle tap to focus
  const handleTapToFocus = useCallback(async (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!videoRef.current || !containerRef.current || !streamRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    // Show focus indicator
    setFocusPoint({ x: clientX - rect.left, y: clientY - rect.top });
    setShowFocusIndicator(true);
    setTimeout(() => setShowFocusIndicator(false), 1000);

    // Try to set focus point on camera
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      const trackCapabilities = track.getCapabilities?.() as MediaTrackCapabilities & {
        focusMode?: string[];
        pointsOfInterest?: boolean;
      };
      
      if (trackCapabilities?.focusMode?.includes('manual') || trackCapabilities?.pointsOfInterest) {
        try {
          await track.applyConstraints({
            advanced: [{
              // @ts-expect-error - pointsOfInterest is not in the type definitions
              pointsOfInterest: [{ x, y }],
              focusMode: 'manual',
            }]
          } as MediaTrackConstraints);

          // Reset to continuous after a moment
          setTimeout(async () => {
            if (trackCapabilities.focusMode?.includes('continuous')) {
              try {
                await track.applyConstraints({
                  advanced: [{ focusMode: 'continuous' }]
                } as unknown as MediaTrackConstraints);
              } catch (e) {
                console.log('Could not reset to continuous focus:', e);
              }
            }
          }, 2000);
        } catch (e) {
          console.log('Tap to focus not supported:', e);
        }
      }
    }
  }, []);

  // Handle zoom
  const handleZoom = useCallback(async (direction: 'in' | 'out') => {
    if (!streamRef.current || !capabilities.zoom) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    const step = capabilities.zoom.step || 0.1;
    const newZoom = direction === 'in' 
      ? Math.min(currentZoom + step, capabilities.zoom.max)
      : Math.max(currentZoom - step, capabilities.zoom.min);

    try {
      await track.applyConstraints({
        advanced: [{ zoom: newZoom }]
      } as unknown as MediaTrackConstraints);
      setCurrentZoom(newZoom);
    } catch (e) {
      console.log('Zoom not supported:', e);
    }
  }, [currentZoom, capabilities.zoom]);

  // Toggle torch/flashlight
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !capabilities.torch) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn }]
      } as unknown as MediaTrackConstraints);
      setTorchOn(!torchOn);
    } catch (e) {
      console.log('Torch not supported:', e);
    }
  }, [torchOn, capabilities.torch]);

  // Capture image from video
  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas to video's actual resolution for high quality
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedImage(imageData);
    }
  }, []);

  const retake = () => {
    setCapturedImage(null);
  };

  const confirm = () => {
    if (capturedImage) {
      // Stop camera when confirming
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      onCapture(capturedImage);
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCapturedImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Show captured image preview
  if (capturedImage) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <img
            src={capturedImage}
            alt="Captured invoice"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
        <div className="p-4 pb-safe flex justify-center gap-4 bg-black/80">
          <button
            onClick={retake}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-500 active:bg-gray-700 transition-colors"
          >
            <RotateCcw size={20} />
            Retake
          </button>
          <button
            onClick={confirm}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-500 active:bg-green-700 transition-colors"
          >
            <Check size={20} />
            Use Photo
          </button>
        </div>
      </div>
    );
  }

  // Show error or no permission state
  if (hasPermission === false) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
        <div className="text-center text-white max-w-md">
          <Camera size={64} className="mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">Camera Access Required</h2>
          <p className="text-gray-400 mb-6">
            {error || 'Please grant camera access to capture invoices.'}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors"
            >
              <Upload size={20} />
              Upload from Gallery
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    );
  }

  // Show camera view
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col touch-none">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-safe flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 active:bg-white/30 rounded-full transition-colors"
            aria-label="Close camera"
          >
            <X size={24} />
          </button>
        )}
        <div className="flex items-center gap-2">
          {capabilities.torch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-full transition-colors ${
                torchOn ? 'bg-yellow-500 text-black' : 'text-white hover:bg-white/20'
              }`}
              aria-label="Toggle flashlight"
            >
              <Sun size={24} />
            </button>
          )}
          <button
            onClick={switchCamera}
            className="p-2 text-white hover:bg-white/20 active:bg-white/30 rounded-full transition-colors"
            aria-label="Switch camera"
          >
            <RotateCcw size={24} />
          </button>
        </div>
      </div>

      {/* Camera View Container */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onClick={handleTapToFocus}
        onTouchStart={handleTapToFocus}
      >
        {/* Video element with proper sizing */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            // Ensure video fills container on all devices
            minWidth: '100%',
            minHeight: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-white text-sm">Starting camera...</span>
            </div>
          </div>
        )}

        {/* Focus indicator */}
        {showFocusIndicator && focusPoint && (
          <div
            className="absolute w-20 h-20 pointer-events-none z-10"
            style={{
              left: focusPoint.x - 40,
              top: focusPoint.y - 40,
            }}
          >
            <div className="w-full h-full border-2 border-yellow-400 rounded-lg animate-pulse">
              <Focus className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-400" size={24} />
            </div>
          </div>
        )}

        {/* Document guide overlay */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Semi-transparent overlay outside the guide area */}
          <div className="absolute inset-0 bg-black/20" />
          
          {/* Document frame guide - centered with aspect ratio for A4/Letter documents */}
          <div className="absolute inset-6 sm:inset-8 md:inset-12 flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-[3/4] border-2 border-white/50 rounded-lg bg-transparent">
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-lg" />
              
              {/* Helper text */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-white/80 text-sm font-medium bg-black/50 px-2 py-1 rounded">
                  Position invoice within frame
                </span>
              </div>

              {/* Tap to focus hint */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-white/60 text-xs bg-black/50 px-2 py-1 rounded">
                  Tap to focus
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Zoom controls (if available) */}
        {capabilities.zoom && capabilities.zoom.max > capabilities.zoom.min && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
            <button
              onClick={() => handleZoom('in')}
              disabled={currentZoom >= capabilities.zoom!.max}
              className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 disabled:opacity-50 transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn size={20} />
            </button>
            <div className="text-white text-xs text-center bg-black/50 px-2 py-1 rounded">
              {currentZoom.toFixed(1)}x
            </div>
            <button
              onClick={() => handleZoom('out')}
              disabled={currentZoom <= capabilities.zoom!.min}
              className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 disabled:opacity-50 transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 pb-safe flex justify-center items-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 text-white hover:bg-white/20 active:bg-white/30 rounded-full transition-colors"
          aria-label="Upload from gallery"
        >
          <Upload size={24} />
        </button>
        
        {/* Main capture button */}
        <button
          onClick={capture}
          disabled={isLoading}
          className="w-18 h-18 relative flex items-center justify-center disabled:opacity-50 transition-transform active:scale-95"
          aria-label="Capture photo"
        >
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
            <div className="w-14 h-14 bg-white border-4 border-gray-800 rounded-full hover:bg-gray-100 transition-colors" />
          </div>
        </button>
        
        <div className="w-12" /> {/* Spacer for balance */}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Add CSS for safe areas on iOS */}
      <style jsx global>{`
        .pt-safe {
          padding-top: max(1rem, env(safe-area-inset-top));
        }
        .pb-safe {
          padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
        }
        
        @supports (-webkit-touch-callout: none) {
          /* iOS specific fixes */
          video {
            -webkit-transform: translateZ(0);
            transform: translateZ(0);
          }
        }
        
        /* Prevent pull-to-refresh on mobile */
        .touch-none {
          touch-action: none;
          overscroll-behavior: none;
        }
      `}</style>
    </div>
  );
}
