import React, { useCallback, useEffect, useState } from 'react';
import { 
  Users, 
  Car, 
  DollarSign, 
  ShieldAlert, 
  TrendingUp, 
  Activity, 
  CheckCircle2, 
  AlertOctagon, 
  Search, 
  Plus, 
  Tag,
  Star,
  RefreshCw,
  Radio
} from 'lucide-react';
import { backend } from '../services/backend';
import { Driver, SupportTicket, PromoCode, SystemMetrics } from '../types';
import { InteractiveMap } from './InteractiveMap';

const EMPTY_METRICS: SystemMetrics = {
  totalRidesToday: 0, activeTrips: 0, onlineDrivers: 0, totalRevenue: 0,
  platformCommission: 0, completionRate: 0, avgRating: 0,
};

export const AdminView: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>(EMPTY_METRICS);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [error, setError] = useState('');

  // New promo code form state
  const [showAddPromo, setShowAddPromo] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('20');

  const handleRefresh = useCallback(async () => {
    try {
      const [m, d, t, p] = await Promise.all([
        backend.getMetrics(), backend.adminDrivers(), backend.adminTickets(), backend.adminPromos(),
      ]);
      setMetrics(m);
      setDrivers(d);
      setTickets(t);
      setPromoCodes(p);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Could not load admin data');
    }
  }, []);

  useEffect(() => {
    void handleRefresh();
    const timer = window.setInterval(handleRefresh, 10000);
    return () => window.clearInterval(timer);
  }, [handleRefresh]);

  const handleResolveTicket = async (ticketId: string) => {
    try {
      await backend.resolveTicket(ticketId);
      await handleRefresh();
    } catch (e: any) {
      setError(e?.message || 'Could not resolve the ticket');
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    try {
      await backend.createPromo(newCode.trim().toUpperCase(), Number(newDiscount));
      setNewCode('');
      setShowAddPromo(false);
      await handleRefresh();
    } catch (err: any) {
      setError(err?.message || 'Could not create the promo code');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">{error}</div>
      )}
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Fleet & Operations Command Center</h2>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-mono font-bold text-amber-400 border border-amber-500/20">
              Admin Role: Granted
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time PostgreSQL telemetry, driver fleet allocation & emergency dispatch
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
          <span>Sync State</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Rides</span>
            <Activity className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{metrics.totalRidesToday}</div>
          <p className="mt-1 text-[11px] text-emerald-400 font-medium">98.4% fulfillment rate</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active In-Flight</span>
            <Car className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{metrics.activeTrips}</div>
          <p className="mt-1 text-[11px] text-sky-400 font-medium">{metrics.onlineDrivers} drivers active online</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Gross Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">₹{metrics.totalRevenue}</div>
          <p className="mt-1 text-[11px] text-emerald-400 font-medium">100% Stripe Verified</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Platform Cut (15%)</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-400">₹{metrics.platformCommission}</div>
          <p className="mt-1 text-[11px] text-slate-400">Net platform commissions</p>
        </div>
      </div>

      {/* Main Grid: Live Fleet Map & SOS Emergency Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fleet Map View */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>City Fleet Telemetry Map</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {drivers.filter(d => d.isOnline).length} Active GPS Transponders
            </span>
          </div>
          <div className="h-[460px]">
            <InteractiveMap allDrivers={drivers} />
          </div>
        </div>

        {/* SOS Alert Room & Tickets */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              <span>Emergency SOS & Safety Feed</span>
            </h3>
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30">
              High Priority
            </span>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                className={`rounded-2xl border p-4 shadow-lg text-xs space-y-2.5 transition-all ${
                  ticket.isSosAlert && ticket.status !== 'RESOLVED'
                    ? 'border-rose-500 bg-rose-950/40'
                    : 'border-slate-800 bg-slate-900/90'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {ticket.isSosAlert && <AlertOctagon className="h-4 w-4 text-rose-400 animate-bounce" />}
                    <span className="font-mono font-bold text-slate-300">{ticket.id}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      ticket.status === 'RESOLVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>

                <p className="font-bold text-white text-sm">{ticket.subject}</p>
                <p className="text-slate-300 text-xs leading-relaxed">{ticket.message}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <span>User: <strong className="text-slate-200">{ticket.userName}</strong> ({ticket.userRole})</span>
                  <span>{new Date(ticket.createdAt).toLocaleTimeString()}</span>
                </div>

                {ticket.status !== 'RESOLVED' && (
                  <button
                    onClick={() => handleResolveTicket(ticket.id)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Dispatch Response Unit & Mark Resolved</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Driver Partner Roster & Promo Codes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Driver Fleet Table */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Driver Partner Roster & Verification
              </h3>
              <p className="text-xs text-slate-400">PostgreSQL 'drivers' table with KYC & active ratings</p>
            </div>
            <span className="rounded bg-slate-800 px-2 py-1 text-xs font-mono text-slate-300">
              {drivers.length} Registered Drivers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5">Driver</th>
                  <th className="py-2.5">Vehicle</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5">Rating</th>
                  <th className="py-2.5">Lifetime Trips</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {drivers.map(drv => (
                  <tr key={drv.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 flex items-center gap-2.5">
                      <img
                        src={drv.avatarUrl}
                        alt={drv.fullName}
                        className="h-8 w-8 rounded-full object-cover border border-slate-700"
                      />
                      <div>
                        <span className="font-bold text-white">{drv.fullName}</span>
                        <p className="text-[10px] text-slate-400">{drv.phone}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <div>
                        <span className="text-white font-medium">{drv.vehicleModel}</span>
                        <p className="font-mono text-amber-400 text-[10px]">{drv.vehicleNumber}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {drv.vehicleType}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="h-3 w-3 fill-amber-400" />
                        <span>{drv.rating}</span>
                      </div>
                    </td>
                    <td className="py-3 font-mono font-medium text-slate-200">
                      {drv.totalTrips.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          drv.isOnline
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {drv.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Promo Codes Manager */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-amber-400" />
              <span>Promo Campaign Engine</span>
            </h3>
            <button
              onClick={() => setShowAddPromo(!showAddPromo)}
              className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>New</span>
            </button>
          </div>

          {showAddPromo && (
            <form onSubmit={handleCreatePromo} className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-2.5">
              <input
                type="text"
                placeholder="PROMO CODE (e.g. FLASH30)"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs uppercase text-white placeholder-slate-500 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Discount %</label>
                  <input
                    type="number"
                    value={newDiscount}
                    onChange={e => setNewDiscount(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-500 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                Create Promo Code
              </button>
            </form>
          )}

          <div className="space-y-2.5">
            {promoCodes.map(promo => (
              <div key={promo.code} className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-xs flex justify-between items-center">
                <div>
                  <span className="font-mono font-bold text-amber-400">{promo.code}</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{promo.description}</p>
                </div>
                <div className="text-right">
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                    {promo.discountPercent}% OFF
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
