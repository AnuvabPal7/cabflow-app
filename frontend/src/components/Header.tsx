import React from 'react';
import { Car, LogOut, Radio, Settings, ShieldCheck, UserCheck } from 'lucide-react';
import { Ride } from '../types';
import { SessionUser } from '../services/backend';

interface HeaderProps {
  user: SessionUser;
  activeRide: Ride | null;
  realtimeOnline: boolean;
  onLogout: () => void;
  onOpenAccount: () => void;
}

const ROLE_LABEL = { RIDER: 'Rider', DRIVER: 'Driver Console', ADMIN: 'Admin Desk' } as const;

export const Header: React.FC<HeaderProps> = ({ user, activeRide, realtimeOnline, onLogout, onOpenAccount }) => {
  const RoleIcon = user.role === 'RIDER' ? Car : user.role === 'DRIVER' ? UserCheck : ShieldCheck;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-lg shadow-amber-500/20 font-black">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white">CabFlow</span>
            <p className="text-[11px] text-slate-400 hidden sm:block">Ride-hailing • Spring Boot + React</p>
          </div>
        </div>

        {/* Session */}
        <div className="flex items-center gap-3 text-xs">
          <span
            title={realtimeOnline ? 'Live updates connected' : 'Live updates offline (falling back to polling)'}
            className={`hidden sm:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${
              realtimeOnline
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-700 bg-slate-900 text-slate-400'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>{realtimeOnline ? 'Live' : 'Offline'}</span>
          </span>

          <span className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 font-bold text-slate-950 shadow">
            <RoleIcon className="h-4 w-4" />
            <span>{ROLE_LABEL[user.role]}</span>
            {activeRide && <span className="h-2 w-2 rounded-full bg-emerald-700 animate-pulse" />}
          </span>

          <div className="hidden md:block text-right leading-tight">
            <div className="font-semibold text-white">{user.fullName}</div>
            <div className="text-[11px] text-slate-400">{user.email}</div>
          </div>

          <button
            onClick={onOpenAccount}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
