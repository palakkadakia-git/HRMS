'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useSites } from '@/hooks/useSites';
import { useSetupKiosk, KIOSK_TOKEN_KEY } from '@/hooks/useKiosk';
import { usePermissions } from '@/hooks/usePermissions';

type GeoState = 'idle' | 'fetching' | 'ok' | 'error';

export default function KioskSetupPage() {
  const router = useRouter();
  const { data: sites = [] } = useSites();
  const setupMutation = useSetupKiosk();
  const { can } = usePermissions();

  const [siteId, setSiteId] = useState('');
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [geoError, setGeoError] = useState('');
  const [saved, setSaved] = useState(false);

  // Read localStorage only on the client (avoids SSR hydration mismatch)
  const [existingToken, setExistingToken] = useState<string | null>(null);
  useEffect(() => {
    setExistingToken(localStorage.getItem(KIOSK_TOKEN_KEY));
  }, []);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by this browser/device.');
      setGeoState('error');
      return;
    }
    setGeoState('fetching');
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState('ok');
      },
      (err) => {
        setGeoError(err.message);
        setGeoState('error');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const activate = async () => {
    if (!siteId || !geo) return;
    try {
      const result = await setupMutation.mutateAsync({ siteId, lat: geo.lat, lng: geo.lng });
      localStorage.setItem(KIOSK_TOKEN_KEY, result.kioskToken);
      setSaved(true);
    } catch {
      // error shown via mutation state
    }
  };

  return (
    <>
      <Header
        title="Kiosk Setup"
        subtitle="Configure this device as an attendance kiosk for a site"
      />

      <main className="flex-1 p-6 max-w-xl mx-auto space-y-5">

        {existingToken && !saved && (
          <div className="card p-4 bg-blue-50 border border-blue-200 text-blue-800 text-sm flex items-start gap-3">
            <span className="text-lg shrink-0">ℹ️</span>
            <div>
              <p className="font-semibold">This device already has a kiosk token.</p>
              <p className="text-xs mt-0.5">Re-activating will overwrite it with a new token for the selected site.</p>
            </div>
          </div>
        )}

        {/* Step 1 — Select Site */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-700 mb-3">① Select Work Site</h2>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="input w-full"
          >
            <option value="">— choose a site —</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.city ? ` (${s.city})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Step 2 — Verify location */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-700 mb-1">② Verify Device Location</h2>
          <p className="text-xs text-slate-400 mb-3">
            The system will capture this device's GPS coordinates.
            If the site already has a registered location, the device must be within its geofence radius.
          </p>

          {geoState === 'idle' && (
            <button onClick={getLocation} className="btn btn-outline btn-sm">
              📍 Get My Location
            </button>
          )}
          {geoState === 'fetching' && (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-slate-200 border-t-primary rounded-full animate-spin inline-block" />
              Fetching location…
            </p>
          )}
          {geoState === 'ok' && geo && (
            <div className="flex items-center gap-3">
              <span className="text-green-600 font-medium text-sm">
                ✓ {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
              </span>
              <button onClick={getLocation} className="text-xs text-slate-400 underline">Refresh</button>
            </div>
          )}
          {geoState === 'error' && (
            <div>
              <p className="text-red-600 text-sm mb-2">✗ {geoError}</p>
              <button onClick={getLocation} className="btn btn-outline btn-sm">Retry</button>
            </div>
          )}
        </div>

        {/* Step 3 — Activate */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-700 mb-3">③ Activate Kiosk</h2>

          {setupMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-3">
              {(setupMutation.error as any)?.response?.data?.message ?? 'Activation failed. Check location and try again.'}
            </div>
          )}

          {saved ? (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                ✓ Kiosk activated! This device is registered for attendance.
              </div>
              <button
                onClick={() => router.push('/kiosk')}
                className="btn btn-primary w-full"
              >
                🚀 Launch Kiosk
              </button>
            </div>
          ) : can('kiosk', 'create') ? (
            <button
              onClick={activate}
              disabled={!siteId || geoState !== 'ok' || setupMutation.isPending}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {setupMutation.isPending ? 'Activating…' : '⚡ Activate This Device as Kiosk'}
            </button>
          ) : (
            <p className="text-sm text-slate-500">You don't have permission to activate a kiosk.</p>
          )}
        </div>

        {/* Enrolled employees info */}
        <div className="card p-5 bg-slate-50">
          <h3 className="font-semibold text-slate-600 text-sm mb-1">Before going live — ensure:</h3>
          <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
            <li>
              Each employee's <strong>Work Site</strong> is set to this site
              <span className="text-slate-400"> (Employee → Edit → Employment tab → Work Site)</span>
            </li>
            <li>All employees at this site have their <strong>face biometric enrolled</strong> (Employee → Enrol Biometric button)</li>
            <li>The kiosk phone/tablet is charged and placed at the entrance</li>
            <li>The camera is unobstructed and the area is well-lit</li>
          </ul>
        </div>

      </main>
    </>
  );
}
