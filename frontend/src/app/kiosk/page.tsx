'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useKioskEmployees, useKioskSite, useKioskPunch, KIOSK_TOKEN_KEY } from '@/hooks/useKiosk';
import {
  loadFaceModels,
  detectFacesInFrame,
  buildFaceMatcher,
  matchFace,
  type LabeledEmployee,
  type MatchResult,
} from '@/lib/faceRecognition';
import type { KioskEmployee } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// How many consecutive positive detections before auto-punching (each ~400ms apart)
const CONFIRM_TICKS = 3; // ~1.2 seconds
// After a successful punch, ignore that employee for this many ms to prevent double-punch
const COOLDOWN_MS = 8000;

// ── UI status (for display only — the detection loop uses refs, not this state) ──
type UIStatus =
  | 'booting'        // loading models / starting camera
  | 'no_token'       // kiosk not configured
  | 'scanning'       // camera running, no face
  | 'detecting'      // face found, not yet confirmed
  | 'punching'       // sending to server
  | 'success'        // punch recorded
  | 'no_match'       // face found but not in DB
  | 'error';

interface UIState {
  status: UIStatus;
  message?: string;
  match?: MatchResult;
  action?: 'PUNCH_IN' | 'PUNCH_OUT';
  punchTime?: Date;
  confirmPct?: number; // 0-100 progress toward auto-punch
}

export default function KioskPage() {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const loopActive = useRef(false);          // controls the detection loop lifetime
  const matcherRef = useRef<ReturnType<typeof buildFaceMatcher>>(null);
  const empRef     = useRef<LabeledEmployee[]>([]);
  const cooldownRef = useRef<Map<string, number>>(new Map()); // employeeId → expiry timestamp

  // Consecutive-tick counters keyed by employeeId
  const tickRef = useRef<{ id: string; count: number } | null>(null);

  const [ui, setUi]       = useState<UIState>({ status: 'booting', message: 'Starting…' });
  const [clock, setClock] = useState<Date | null>(null);
  const [hasToken, setHasToken] = useState(false);

  const { data: site }      = useKioskSite(hasToken);
  const { data: employees, refetch: refetchEmployees } = useKioskEmployees(hasToken);
  const punchMutation = useKioskPunch();

  // Keep latest async functions in refs so runLoop (useCallback []) never changes
  const punchRef   = useRef(punchMutation.mutateAsync);
  const refetchRef = useRef(refetchEmployees);
  useEffect(() => { punchRef.current   = punchMutation.mutateAsync; }, [punchMutation.mutateAsync]);
  useEffect(() => { refetchRef.current = refetchEmployees;          }, [refetchEmployees]);

  // ── Clock ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setClock(new Date());
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Check token ────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(KIOSK_TOKEN_KEY);
    if (!token) setUi({ status: 'no_token' });
    else setHasToken(true);
  }, []);

  // ── Rebuild face matcher whenever employee list updates ───────────────────
  // Also keep a ref with total employee count so the loop can show a smart diagnostic
  const totalEmployeesRef = useRef(0);

  useEffect(() => {
    if (!employees) return;

    // Debug: show exactly what the API returned
    console.log('[Kiosk] Employees at this site:', employees.map((e) => ({
      name: `${e.firstName} ${e.lastName}`,
      id: e.id,
      hasFaceDescriptor: !!e.faceDescriptor,
    })));

    totalEmployeesRef.current = employees.length;

    const labeled: LabeledEmployee[] = employees
      .filter((e) => e.faceDescriptor)
      .map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        descriptor: JSON.parse(e.faceDescriptor!),
      }));
    empRef.current     = labeled;
    matcherRef.current = buildFaceMatcher(labeled);
    console.log(`[Kiosk] Matcher built with ${labeled.length} / ${employees.length} employee(s) enrolled`);
  }, [employees]);

  // ── Detection loop — runs once, never recreated (empty dep array via refs) ─
  const runLoop = useCallback(async () => {
    while (loopActive.current) {
      if (!videoRef.current || !videoRef.current.readyState || videoRef.current.readyState < 2) {
        await delay(200);
        continue;
      }

      // No matcher yet — show a diagnostic message explaining why
      if (!matcherRef.current) {
        const total = totalEmployeesRef.current;
        const msg = total === 0
          ? 'No employees are assigned to this site. Open an employee → Edit → Employment tab → set Work Site to this kiosk\'s site.'
          : `${total} employee${total > 1 ? 's' : ''} at this site but none have a face biometric enrolled. Go to Employee → Enrol Biometric.`;
        setUi({ status: 'scanning', message: msg });
        await delay(1000);
        continue;
      }

      let faces: Awaited<ReturnType<typeof detectFacesInFrame>>;
      try {
        faces = await detectFacesInFrame(videoRef.current);
      } catch {
        await delay(500);
        continue;
      }

      if (faces.length === 0) {
        tickRef.current = null;
        setUi({ status: 'scanning' });
        await delay(400);
        continue;
      }

      // Try to match the largest/first face
      const match = matchFace(faces[0].descriptor, matcherRef.current, empRef.current);

      if (!match) {
        tickRef.current = null;
        setUi({ status: 'no_match' });
        await delay(500);
        continue;
      }

      // Check cooldown
      const cooldownExpiry = cooldownRef.current.get(match.employeeId) ?? 0;
      if (Date.now() < cooldownExpiry) {
        setUi({ status: 'scanning' });
        await delay(400);
        continue;
      }

      // Accumulate ticks for the same person
      if (tickRef.current?.id === match.employeeId) {
        tickRef.current.count += 1;
      } else {
        tickRef.current = { id: match.employeeId, count: 1 };
      }

      const ticks = tickRef.current.count;
      const confirmPct = Math.min(100, Math.round((ticks / CONFIRM_TICKS) * 100));
      setUi({ status: 'detecting', match, confirmPct });

      if (ticks >= CONFIRM_TICKS) {
        // Confirmed — punch
        tickRef.current = null;
        setUi({ status: 'punching', match });

        try {
          console.log(`[Kiosk] Punching ${match.employeeName} (${match.employeeId})`);

          // GPS is intentionally skipped on the kiosk — the device is fixed on-site.
          // Sending GPS would require a permission prompt on mobile which blocks the UI.
          const result = await punchRef.current({ employeeId: match.employeeId });

          console.log('[Kiosk] Punch success:', result);
          cooldownRef.current.set(match.employeeId, Date.now() + COOLDOWN_MS);

          setUi({
            status: 'success',
            match,
            action: result.action,
            punchTime: new Date(result.time),
          });

          refetchRef.current();
          await delay(3500);
        } catch (err: any) {
          // Surface the full error so it can be diagnosed
          const httpStatus = err?.response?.status ?? '—';
          const serverMsg  = err?.response?.data?.message ?? err?.message ?? 'Network error';
          console.error('[Kiosk] Punch FAILED', httpStatus, serverMsg, err);

          // Set cooldown even on failure to prevent rapid retries
          cooldownRef.current.set(match.employeeId, Date.now() + 5000);

          setUi({
            status: 'error',
            message: `[${httpStatus}] ${serverMsg}`,
          });
          await delay(8000); // keep error visible for 8 s so it can be read
        }

        setUi({ status: 'scanning' });
      }

      await delay(400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable — uses punchRef/refetchRef instead of the mutation objects

  // ── Boot: load models then start camera then start loop ──────────────────
  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;

    (async () => {
      try {
        setUi({ status: 'booting', message: 'Loading face recognition models…' });
        await loadFaceModels();
        if (cancelled) return;

        // Employee data may have arrived from React Query cache BEFORE faceapi
        // was ready, causing buildFaceMatcher to return null. Now that the models
        // are loaded, rebuild the matcher from whatever employees are already cached.
        if (empRef.current.length > 0 && !matcherRef.current) {
          matcherRef.current = buildFaceMatcher(empRef.current);
          console.log('[Kiosk] Matcher rebuilt after model load:', matcherRef.current ? `${empRef.current.length} employee(s)` : 'null');
        }

        setUi({ status: 'booting', message: 'Starting camera…' });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setUi({ status: 'scanning' });
        loopActive.current = true;
        runLoop(); // fire-and-forget; stops when loopActive becomes false
      } catch (e: any) {
        if (!cancelled) setUi({ status: 'error', message: e?.message ?? 'Startup failed' });
      }
    })();

    return () => {
      cancelled = true;
      loopActive.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [hasToken, runLoop]);

  // ── No-token screen ───────────────────────────────────────────────────────
  if (ui.status === 'no_token') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-6xl">📱</div>
        <h1 className="text-2xl font-bold">Kiosk Not Configured</h1>
        <p className="text-gray-400 max-w-sm">Ask an HR administrator to activate this device as a kiosk.</p>
        <a href="/kiosk/setup" className="mt-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-500">
          Go to Kiosk Setup
        </a>
      </div>
    );
  }

  const enrolledCount = employees?.filter((e) => e.faceDescriptor).length ?? 0;
  const totalCount    = employees?.length ?? 0;
  const presentCount  = employees?.filter((e) => e.todayLog?.punchIn && !e.todayLog?.punchOut).length ?? 0;
  const doneCount     = employees?.filter((e) => e.todayLog?.punchOut).length ?? 0;
  const absentCount   = employees?.filter((e) => !e.todayLog?.punchIn).length ?? 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 shrink-0">
        <div>
          <h1 className="text-white font-bold text-base leading-tight">
            🏢 {site?.name ?? '…'}{site?.city ? ` — ${site.city}` : ''}
          </h1>
          <p suppressHydrationWarning className="text-white/40 text-xs">
            {clock ? formatDate(clock) : ''}
          </p>
        </div>
        <div suppressHydrationWarning className="text-white font-mono text-2xl font-light tracking-widest">
          {clock ? formatTime(clock) : '--:--:--'}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">

        {/* Camera */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          <video ref={videoRef} muted playsInline className="w-full h-full object-cover" style={{ maxHeight: '75vh' }} />

          {/* Oval guide */}
          {(ui.status === 'scanning' || ui.status === 'no_match') && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-full border-4 border-white/25" style={{ width: '44%', paddingBottom: '54%', borderStyle: 'dashed' }} />
            </div>
          )}

          {/* Booting overlay */}
          {ui.status === 'booting' && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-white rounded-full animate-spin" />
              <p className="text-white font-medium">{ui.message}</p>
              <p className="text-white/40 text-xs">First load downloads ~6 MB of models</p>
            </div>
          )}

          {/* Detecting — progress ring */}
          {ui.status === 'detecting' && ui.match && (
            <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
              <div className="bg-indigo-600/90 backdrop-blur px-6 py-3 rounded-2xl text-center">
                <p className="text-white font-bold text-lg">{ui.match.employeeName}</p>
                <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden w-40">
                  <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${ui.confirmPct}%` }} />
                </div>
                <p className="text-indigo-200 text-xs mt-1">Hold still…</p>
              </div>
            </div>
          )}

          {/* Punching */}
          {ui.status === 'punching' && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white font-semibold">Recording attendance…</p>
              </div>
            </div>
          )}

          {/* Error — fullscreen, stays until auto-cleared */}
          {ui.status === 'error' && (
            <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center p-6 text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-white font-bold text-xl mb-2">Punch Failed</p>
              <p className="text-red-200 text-sm font-mono bg-black/30 px-4 py-2 rounded-lg max-w-sm">
                {ui.message}
              </p>
              <p className="text-red-300 text-xs mt-4">Check browser console (F12) for full details</p>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:w-80 flex flex-col items-center justify-center p-6 gap-5 shrink-0">

          {/* Success */}
          {ui.status === 'success' && ui.match && ui.action && (
            <div className={`w-full rounded-2xl p-6 text-center border ${
              ui.action === 'PUNCH_IN'
                ? 'bg-green-500/15 border-green-500/40'
                : 'bg-orange-500/15 border-orange-500/40'
            }`}>
              <div className="text-5xl mb-3">{ui.action === 'PUNCH_IN' ? '✅' : '👋'}</div>
              <h2 className="font-bold text-white text-xl">{ui.match.employeeName}</h2>
              <p className={`text-lg font-semibold mt-1 ${ui.action === 'PUNCH_IN' ? 'text-green-400' : 'text-orange-400'}`}>
                {ui.action === 'PUNCH_IN' ? 'Punched In' : 'Punched Out'}
              </p>
              {ui.punchTime && (
                <p suppressHydrationWarning className="text-white/50 text-sm mt-1">{formatTime(ui.punchTime)}</p>
              )}
            </div>
          )}

          {/* Prompt */}
          {(ui.status === 'scanning' || ui.status === 'no_match') && (
            <div className="text-center">
              <div className="text-6xl mb-3">👁️</div>
              <p className="text-white font-semibold text-lg">Face the camera</p>
              <p className="text-white/40 text-sm mt-1">Stand still — you'll be recognised automatically</p>
              {ui.status === 'no_match' && (
                <p className="text-amber-400 text-xs mt-3">Face not recognised — reposition or check enrolment</p>
              )}
              {ui.message && ui.status === 'scanning' && (
                <p className="text-amber-400 text-xs mt-3">{ui.message}</p>
              )}
            </div>
          )}

          {/* Booting */}
          {ui.status === 'booting' && (
            <div className="text-center text-white/40">
              <p className="text-sm">Starting up…</p>
            </div>
          )}

          {/* Manual refresh — tap to pull fresh employee + biometric data */}
          {ui.status !== 'booting' && (
            <button
              onClick={() => refetchRef.current()}
              className="text-white/30 text-xs hover:text-white/60 transition-colors underline underline-offset-2"
            >
              ↻ Refresh employee data
            </button>
          )}

          {/* Today's counts */}
          <div className="w-full pt-4 border-t border-white/10 text-center">
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">Today at this site</p>

            {/* Configuration warnings — shown when data is loaded but misconfigured */}
            {employees !== undefined && totalCount === 0 && (
              <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 mb-3 text-left">
                <p className="text-red-300 text-xs font-semibold mb-1">⚠ No employees assigned to this site</p>
                <p className="text-red-400 text-[11px] leading-relaxed">
                  Go to <strong className="text-red-300">Employee → Edit → Employment → Work Site</strong> and select this kiosk's site.
                </p>
              </div>
            )}

            {employees !== undefined && totalCount > 0 && enrolledCount === 0 && (
              <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-3 mb-3 text-left">
                <p className="text-amber-300 text-xs font-semibold mb-1">⚠ {totalCount} employee{totalCount > 1 ? 's' : ''} at this site — none enrolled</p>
                <p className="text-amber-400 text-[11px] leading-relaxed">
                  Go to <strong className="text-amber-300">Employee → Enrol Biometric</strong> for each employee.
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'In',     value: presentCount, color: 'text-green-400' },
                { label: 'Out',    value: doneCount,    color: 'text-orange-400' },
                { label: 'Absent', value: absentCount,  color: 'text-slate-400' },
              ].map((s) => (
                <div key={s.label} className="bg-white/5 rounded-xl py-3">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-white/30 text-[10px] uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {enrolledCount > 0 && enrolledCount < totalCount && (
              <p className="text-amber-400 text-xs mt-3">
                ⚠ {totalCount - enrolledCount} of {totalCount} employees not enrolled
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
