'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { loadFaceModels, captureFaceDescriptor } from '@/lib/faceRecognition';

interface Props {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
  onSaved: () => void;
}

type Step = 'loading' | 'ready' | 'detecting' | 'captured' | 'saving' | 'done' | 'error';

export default function FaceCaptureModal({ employeeId, employeeName, onClose, onSaved }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>('loading');
  const [message, setMessage] = useState('Loading face detection models…');
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [capturedImg, setCapturedImg] = useState<string | null>(null);

  // ── Load models + start camera ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setMessage('Loading face detection models…');
        await loadFaceModels();
        if (cancelled) return;

        setMessage('Starting camera…');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStep('ready');
        setMessage('Position your face in the frame and click Capture.');
      } catch (e: any) {
        setStep('error');
        setMessage(e?.message ?? 'Failed to start camera.');
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Capture button ─────────────────────────────────────────────────────────
  const capture = useCallback(async () => {
    if (!videoRef.current) return;
    setStep('detecting');
    setMessage('Detecting face…');

    try {
      const desc = await captureFaceDescriptor(videoRef.current);
      if (!desc) {
        setStep('ready');
        setMessage('No face detected. Please face the camera directly and try again.');
        return;
      }
      // Snapshot
      const canvas = document.createElement('canvas');
      canvas.width  = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);
      setCapturedImg(canvas.toDataURL('image/jpeg', 0.8));
      setDescriptor(desc);
      setStep('captured');
      setMessage('Face captured! Review the image and click Save Biometric.');
    } catch (e: any) {
      setStep('error');
      setMessage(e?.message ?? 'Detection failed.');
    }
  }, []);

  // ── Save to backend ────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!descriptor) throw new Error('No descriptor');
      await api.patch(`/employees/${employeeId}/face-descriptor`, {
        descriptor: JSON.stringify(descriptor),
      });
    },
    onSuccess: () => {
      setStep('done');
      setMessage('Biometric saved successfully!');
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setTimeout(() => { onSaved(); onClose(); }, 1500);
    },
    onError: (e: any) => {
      setStep('error');
      setMessage(e?.response?.data?.message ?? 'Failed to save. Please retry.');
    },
  });

  const retry = () => {
    setStep('ready');
    setCapturedImg(null);
    setDescriptor(null);
    setMessage('Position your face and click Capture again.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Capture Face Biometric</h2>
            <p className="text-xs text-gray-400 mt-0.5">{employeeName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Camera / Preview */}
        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
          {/* Live feed */}
          <video
            ref={videoRef}
            muted
            playsInline
            className={`w-full h-full object-cover ${capturedImg ? 'hidden' : 'block'}`}
          />
          {/* Captured snapshot */}
          {capturedImg && (
            <img src={capturedImg} alt="Captured" className="w-full h-full object-cover" />
          )}
          {/* Face guide oval */}
          {(step === 'ready' || step === 'detecting') && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-4 border-white/60 rounded-full"
                style={{ width: '55%', height: '75%', borderStyle: 'dashed' }} />
            </div>
          )}
          {/* Status badge */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <span className={`px-3 py-1 rounded-full text-xs font-medium shadow
              ${step === 'captured' ? 'bg-green-500 text-white'
              : step === 'detecting' ? 'bg-yellow-400 text-black'
              : step === 'error' ? 'bg-red-500 text-white'
              : 'bg-black/50 text-white'}`}>
              {step === 'loading'   && '⏳ Loading…'}
              {step === 'ready'     && '📷 Camera ready'}
              {step === 'detecting' && '🔍 Detecting…'}
              {step === 'captured'  && '✓ Face captured'}
              {step === 'saving'    && '💾 Saving…'}
              {step === 'done'      && '✓ Saved!'}
              {step === 'error'     && '✗ Error'}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="px-5 pt-3 pb-1">
          <p className="text-sm text-gray-500 text-center">{message}</p>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 flex gap-3 justify-center">
          {step === 'ready' && (
            <button
              onClick={capture}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              📷 Capture Face
            </button>
          )}

          {step === 'detecting' && (
            <button disabled className="px-6 py-2.5 bg-gray-200 text-gray-500 rounded-lg text-sm cursor-not-allowed">
              Detecting…
            </button>
          )}

          {step === 'captured' && (
            <>
              <button
                onClick={retry}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                Retake
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60"
              >
                {saveMutation.isPending ? 'Saving…' : '💾 Save Biometric'}
              </button>
            </>
          )}

          {step === 'error' && (
            <button
              onClick={retry}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
