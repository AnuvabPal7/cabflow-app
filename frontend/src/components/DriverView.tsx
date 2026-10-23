import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  Power, 
  Wallet, 
  TrendingUp, 
  Star, 
  MapPin, 
  Navigation, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Award,
  ChevronRight,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { Driver, Ride } from '../types';
import { backend } from '../services/backend';
import { CITY_LOCATIONS } from '../data/predefinedLocations';
import { InteractiveMap } from './InteractiveMap';

interface DriverViewProps {
  activeRide: Ride | null;
  onRefreshRide: () => void;
}

export const DriverView: React.FC<DriverViewProps> = ({
  activeRide,
  onRefreshRide
}) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [requests, setRequests] = useState<Ride[]>([]);
  const [history, setHistory] = useState<Ride[]>([]);
  const [pos, setPos] = useState({ lat: CITY_LOCATIONS[1].lat, lng: CITY_LOCATIONS[1].lng });
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [error, setError] = useState('');

  const posRef = useRef(pos);
  posRef.current = pos;

  const online = !!driver?.isOnline;
  const hasRide = !!activeRide;
  const rideStatus = activeRide?.status;
  const rideId = activeRide?.id;

  const loadDriver = useCallback(async () => {
    try { setDriver(await backend.getDriver()); }
    catch (e: any) { setError(e?.message || 'Could not load your driver profile'); }
  }, []);

  const loadHistory = useCallback(async () => {
    try { setHistory(await backend.history(20)); } catch { /* ledger stays as it was */ }
  }, []);

  useEffect(() => { void loadDriver(); void loadHistory(); }, [loadDriver, loadHistory, rideStatus, rideId]);

  // Open ride requests near this driver (the WebSocket also nudges the page; this poll is the safety net)
  useEffect(() => {
    if (!online || hasRide) { setRequests([]); return; }
    let cancelled = false;
    const load = () => backend.availableRides()
      .then(list => { if (!cancelled) setRequests(list); })
      .catch(() => { /* try again on the next tick */ });
    load();
    const t = window.setInterval(load, 4000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, [online, hasRide]);

  // GPS heartbeat. While on a trip the position moves towards the pickup / drop-off so the rider sees live tracking.
  useEffect(() => {
    if (!online) return;
    const target = rideStatus === 'ACCEPTED' ? activeRide?.pickupLocation
      : rideStatus === 'IN_PROGRESS' ? activeRide?.dropoffLocation : null;
    const tick = () => {
      let { lat, lng } = posRef.current;
      if (target) {
        lat += (target.lat - lat) * 0.15;
        lng += (target.lng - lng) * 0.15;
      }
      setPos({ lat, lng });
      backend.sendLocation(lat, lng).catch(() => { /* next tick retries */ });
    };
    tick();
    const t = window.setInterval(tick, 2000);
    return () => window.clearInterval(t);
  }, [online, rideStatus, rideId]);

  const refreshAll = async () => {
    await onRefreshRide();
    await loadDriver();
    await loadHistory();
  };

  const handleLocationChange = (index: number) => {
    const loc = CITY_LOCATIONS[index];
    const p = { lat: loc.lat, lng: loc.lng };
    posRef.current = p;
    setPos(p);
    if (online) backend.sendLocation(p.lat, p.lng).catch(() => {});
  };

  const handleToggleOnline = async () => {
    if (!driver) return;
    setError('');
    try {
      if (driver.isOnline) {
        await backend.setDriverStatus('OFFLINE');
      } else {
        await backend.sendLocation(posRef.current.lat, posRef.current.lng, true);
        await backend.setDriverStatus('AVAILABLE');
      }
      await loadDriver();
    } catch (e: any) {
      setError(e?.message || 'Could not change your status');
    }
  };

  const handleAccept = async (id: string) => {
    setError('');
    try { await backend.acceptRide(id); await refreshAll(); }
    catch (e: any) { setError(e?.message || 'Could not accept this ride'); await refreshAll(); }
  };

  const handleDecline = async (id: string) => {
    try { await backend.declineRide(id); setRequests(list => list.filter(r => r.id !== id)); }
    catch (e: any) { setError(e?.message || 'Could not decline this ride'); }
  };

  const handleArrived = async () => {
    if (!activeRide) return;
    try { await backend.markArrived(activeRide.id); await refreshAll(); }
    catch (e: any) { setError(e?.message || 'Could not update the ride'); }
  };

  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRide) return;
    setOtpError('');
    try {
      await backend.startRide(activeRide.id, otpInput.trim());
      setOtpInput('');
      await refreshAll();
    } catch (err: any) {
      setOtpError(err?.message || 'Could not start the trip');
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeRide) return;
    try { await backend.completeRide(activeRide.id); await refreshAll(); }
    catch (e: any) { setError(e?.message || 'Could not complete the trip'); }
  };

  const handleRequestPayout = () => {
    setPayoutSuccess(true);
    setTimeout(() => {
      setPayoutSuccess(false);
    }, 3500);
  };

  const recentRides = history.filter(r => r.status === 'COMPLETED').slice(0, 4);

  if (!driver) {
    return <div className="text-sm text-slate-400">{error || 'Loading your driver profile…'}</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Driver Controls & Earnings */}
      <div className="lg:col-span-5 space-y-5">
        {/* Profile & Status Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={driver.avatarUrl}
                alt={driver.fullName}
                className="h-12 w-12 rounded-full object-cover border-2 border-amber-400"
              />
              <div>
                <h3 className="font-bold text-white text-base">{driver.fullName}</h3>
                <p className="text-xs text-slate-400">{driver.vehicleModel}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-500/10 px-1.5 rounded border border-amber-500/20">
                    {driver.vehicleNumber}
                  </span>
                  <div className="flex items-center text-xs text-amber-400">
                    <Star className="h-3 w-3 fill-amber-400" />
                    <span className="ml-0.5 font-bold">{driver.rating}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Online / Offline switch */}
            <button
              onClick={handleToggleOnline}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-lg cursor-pointer ${
                driver.isOnline
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 hover:bg-emerald-400'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Power className="h-4 w-4" />
              <span>{driver.isOnline ? 'ONLINE' : 'GO ONLINE'}</span>
            </button>
          </div>

          {/* Earnings Quick Summary */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">Total Earned</span>
              <span className="text-base font-black text-emerald-400">₹{driver.todayEarnings}</span>
            </div>
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">Rating</span>
              <span className="text-base font-black text-white">{driver.rating ? `${driver.rating} ★` : '—'}</span>
            </div>
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">Trips</span>
              <span className="text-base font-black text-amber-400">{driver.totalTrips}</span>
            </div>
          </div>

          {/* Wallet Balance & Instant Payout */}
          <div className="rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 p-4 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400">Available Wallet</span>
                <div className="text-lg font-black text-white">₹{driver.walletBalance}</div>
              </div>
            </div>
            <button
              onClick={handleRequestPayout}
              className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-md cursor-pointer"
            >
              Instant Payout
            </button>
          </div>

          {payoutSuccess && (
            <div className="rounded-xl bg-emerald-950/60 p-3 text-xs text-emerald-300 border border-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Payouts are not implemented in this demo. Your earnings balance is ₹{driver.walletBalance}.</span>
            </div>
          )}
        </div>

        {/* Incoming / Active Ride Console */}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">{error}</div>
        )}

        {/* Simulated GPS start point */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-xl space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Your location (simulated GPS)
          </label>
          <select
            defaultValue={1}
            disabled={hasRide}
            onChange={e => handleLocationChange(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
          >
            {CITY_LOCATIONS.map((l, i) => (
              <option key={l.name} value={i}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* Open ride requests */}
        {!hasRide && driver.isOnline && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Ride Requests Nearby</h4>
              <span className="text-[11px] text-slate-400 font-mono">{requests.length} open</span>
            </div>
            {requests.length === 0 ? (
              <p className="text-xs text-slate-400">No open requests within 5 km. New ones appear here instantly.</p>
            ) : (
              requests.map(r => (
                <div key={r.id} className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{r.rideCode} • {r.vehicleType}</span>
                    <span className="font-black text-emerald-400">₹{Math.round(r.totalFare * 0.8)}</span>
                  </div>
                  <p className="text-slate-300 truncate">{r.pickupLocation.name} → {r.dropoffLocation.name}</p>
                  <p className="text-slate-500">{r.distanceKm} km • ~{r.durationMins} min • {r.riderName}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(r.id)}
                      className="flex-1 rounded-lg bg-emerald-500 py-2 font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(r.id)}
                      className="rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeRide ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-amber-400" />
                <h4 className="font-bold text-white text-sm">Trip Mission: {activeRide.rideCode}</h4>
              </div>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30">
                {activeRide.status}
              </span>
            </div>

            {/* Rider Details */}
            <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Passenger:</span>
                <span className="font-bold text-white text-sm">{activeRide.riderName}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-slate-400">Estimated Net Payout (80%):</span>
                <span className="font-black text-emerald-400 text-sm">₹{Math.round(activeRide.totalFare * 0.8)}</span>
              </div>
            </div>

            {/* Trajectory */}
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Pickup</span>
                  <p className="font-medium text-slate-200">{activeRide.pickupLocation.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-1 border-t border-slate-800/80">
                <div className="mt-1 h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Drop-off</span>
                  <p className="font-medium text-slate-200">{activeRide.dropoffLocation.name}</p>
                </div>
              </div>
            </div>

            {/* Phase Actions */}
            {activeRide.status === 'ACCEPTED' && (
              <button
                onClick={handleArrived}
                className="w-full rounded-xl bg-amber-500 py-3 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg cursor-pointer"
              >
                I Have Arrived at Pickup
              </button>
            )}

            {activeRide.status === 'ARRIVED' && (
              <form onSubmit={handleStartTrip} className="space-y-3">
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <KeyRound className="h-4 w-4 text-amber-400" />
                    <span>Enter Rider's 4-Digit Security OTP to Start Trip</span>
                  </label>
                  <input
                    type="text"
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value)}
                    maxLength={4}
                    placeholder="Rider's 4-digit OTP"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-center text-lg font-bold tracking-widest text-white placeholder-slate-600 focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 text-center">
                    Ask the rider for the 4-digit OTP shown on their screen.
                  </p>
                </div>

                {otpError && (
                  <p className="text-xs text-rose-400 text-center">{otpError}</p>
                )}

                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg cursor-pointer"
                >
                  Verify OTP & Start Trip
                </button>
              </form>
            )}

            {activeRide.status === 'IN_PROGRESS' && (
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Trip Status:</span>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                    En Route to Destination
                  </span>
                </div>
                <button
                  onClick={handleCompleteTrip}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-xs font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-300 transition-colors shadow-lg cursor-pointer"
                >
                  Complete Trip & Collect Payment
                </button>
              </div>
            )}

            {activeRide.status === 'COMPLETED' && (
              <div className="rounded-xl bg-emerald-950/60 p-4 border border-emerald-800 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                <h5 className="font-bold text-white text-sm">Trip Successfully Completed!</h5>
                <p className="text-xs text-slate-300">
                  ₹{Math.round(activeRide.totalFare * 0.8)} credited to your driver wallet.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl backdrop-blur-md text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
              <Clock className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-white text-sm">Awaiting Next Ride Request</h4>
            <p className="text-xs text-slate-400">
              {driver.isOnline
                ? 'Your GPS beacon is active on the Spring WebSocket server. Keep your connection open.'
                : 'You are currently offline. Switch your status to Online to start receiving passenger bookings.'}
            </p>
          </div>
        )}

        {/* Recent Trip History */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-xl backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Completed Trip Ledger</h4>
            <span className="text-[11px] text-slate-400 font-mono">20% platform commission</span>
          </div>

          <div className="space-y-2">
            {recentRides.map(ride => (
              <div key={ride.id} className="rounded-xl bg-slate-950 p-3 border border-slate-800/80 text-xs flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span>{ride.rideCode}</span>
                    <span className="text-[10px] text-slate-500 font-normal">• {ride.distanceKm} km</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5">
                    {ride.dropoffLocation.name}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-400 text-sm">
                    +₹{Math.round(ride.totalFare * 0.8)}
                  </span>
                  <span className="block text-[10px] text-slate-500">Gross: ₹{ride.totalFare}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Driver Route Navigation Map */}
      <div className="lg:col-span-7 h-[640px]">
        <InteractiveMap
          pickup={activeRide?.pickupLocation}
          dropoff={activeRide?.dropoffLocation}
          driverLocation={online ? { lat: pos.lat, lng: pos.lng } : null}
          routeCoordinates={activeRide?.routeCoordinates || []}
        />
      </div>
    </div>
  );
};
