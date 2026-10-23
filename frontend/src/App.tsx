/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { AccountSettings } from './components/AccountSettings';
import { RiderView } from './components/RiderView';
import { DriverView } from './components/DriverView';
import { AdminView } from './components/AdminView';
import { backend, SessionUser } from './services/backend';
import { setUnauthorizedHandler } from './services/http';
import { connectRealtime, LocationMessage, RideEventMessage } from './services/realtime';
import { Ride } from './types';

const TOASTS: Record<string, string> = {
  RIDE_REQUESTED: '🔔 New ride request nearby',
  RIDE_ACCEPTED: '✅ A driver accepted your ride',
  DRIVER_ARRIVED: '🚕 Your driver has arrived. Share your 4-digit OTP.',
  RIDE_STARTED: '🚀 Trip started',
  RIDE_COMPLETED: '🏁 Trip completed',
  RIDE_CANCELLED: '❌ The ride was cancelled',
  RIDE_EXPIRED: '⌛ No driver accepted in time. Please try again.',
  PAYMENT_SUCCEEDED: '💳 Payment received',
};

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState('');
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [realtimeOnline, setRealtimeOnline] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAccount, setShowAccount] = useState(false);

  const rideRef = useRef<Ride | null>(null);
  rideRef.current = activeRide;

  const showToast = useCallback((text: string) => {
    setToastMessage(text);
    window.setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const logout = useCallback(() => {
    backend.logout();
    setUser(null);
    setActiveRide(null);
    setShowAccount(false);
  }, []);

  /* ---- restore session on page load ---- */
  useEffect(() => {
    setUnauthorizedHandler(() => { setUser(null); setActiveRide(null); });
    backend.restoreSession()
      .then(u => setUser(u))
      .catch(e => setBootError(e?.message || 'Cannot reach the server'))
      .finally(() => setBooting(false));
    return () => setUnauthorizedHandler(null);
  }, []);

  /* ---- keep the current ride in sync with the server ---- */
  const refreshRide = useCallback(async () => {
    if (!user || user.role === 'ADMIN') return;
    try {
      const current = await backend.getCurrentRide();
      const prev = rideRef.current;
      let next = current;
      if (!next && prev) {
        // The server's "active" list drops a ride once it is completed/cancelled; look it up directly
        // so the rider can still pay and rate it.
        if (prev.status === 'CANCELLED') next = null;
        else if (prev.status === 'COMPLETED' && user.role === 'DRIVER') next = prev;
        else {
          try { next = await backend.getRide(prev.id); } catch { next = null; }
          if (next && next.status === 'CANCELLED') next = null;
        }
      }
      if (next && prev && next.id === prev.id && next.currentDriverLat == null) {
        next = { ...next, currentDriverLat: prev.currentDriverLat, currentDriverLng: prev.currentDriverLng };
      }
      setActiveRide(next);
    } catch { /* transient network error: keep the last known state */ }
  }, [user]);

  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;
    let cancelled = false;
    (async () => {
      await refreshRide();
      if (cancelled || user.role !== 'RIDER' || rideRef.current) return;
      try {
        const unpaid = await backend.getUnpaidCompletedRide();
        if (!cancelled && unpaid && !rideRef.current) setActiveRide(unpaid);
      } catch { /* ignore */ }
    })();
    const poll = window.setInterval(refreshRide, 5000);   // safety net if the WebSocket drops
    return () => { cancelled = true; window.clearInterval(poll); };
  }, [user, refreshRide]);

  /* ---- live updates over STOMP/WebSocket ---- */
  useEffect(() => {
    if (!user) return;
    const stop = connectRealtime({
      onConnectionChange: setRealtimeOnline,
      onRideEvent: (e: RideEventMessage) => {
        showToast(TOASTS[e.type] ?? 'Ride updated');
        void refreshRide();
      },
      onLocation: (l: LocationMessage) => {
        setActiveRide(prev =>
          prev && prev.id === String(l.rideId) ? { ...prev, currentDriverLat: l.lat, currentDriverLng: l.lng } : prev);
      },
      onSos: () => showToast('🚨 SOS alert received. Check the support queue.'),
    }, user.role === 'ADMIN');
    return stop;
  }, [user, refreshRide, showToast]);

  /* ---- drivers: hide the finished-trip card after a few seconds ---- */
  useEffect(() => {
    if (user?.role === 'DRIVER' && activeRide?.status === 'COMPLETED') {
      const t = window.setTimeout(() => setActiveRide(null), 8000);
      return () => window.clearTimeout(t);
    }
  }, [user, activeRide?.id, activeRide?.status]);

  if (booting) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {user && <Header user={user} activeRide={activeRide} realtimeOnline={realtimeOnline} onLogout={logout} onOpenAccount={() => setShowAccount(true)} />}

      {user && showAccount && (
        <AccountSettings
          user={user}
          onClose={() => setShowAccount(false)}
          onEmailChanged={updated => { setUser(updated); showToast('✅ Email updated'); }}
          onPasswordChanged={() => showToast('✅ Password updated')}
        />
      )}

      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white border border-amber-500/40 shadow-2xl">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {!user && <AuthScreen onAuthenticated={setUser} initialError={bootError} />}
        {user?.role === 'RIDER' && (
          <RiderView activeRide={activeRide} onRefreshRide={refreshRide} onClearRide={() => setActiveRide(null)} />
        )}
        {user?.role === 'DRIVER' && <DriverView activeRide={activeRide} onRefreshRide={refreshRide} />}
        {user?.role === 'ADMIN' && <AdminView />}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          CabFlow • Java 17, Spring Boot, PostgreSQL, WebSocket (STOMP), Stripe
        </div>
      </footer>
    </div>
  );
}
