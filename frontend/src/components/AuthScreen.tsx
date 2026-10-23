import React, { useState } from 'react';
import { Car, Loader2, LogIn, UserPlus } from 'lucide-react';
import { backend, SessionUser } from '../services/backend';

interface AuthScreenProps {
  onAuthenticated: (user: SessionUser) => void;
  initialError?: string;
}

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, initialError }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'RIDER' | 'DRIVER'>('RIDER');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? '');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = mode === 'login'
        ? await backend.login(email.trim(), password)
        : await backend.register({
            fullName: fullName.trim(), email: email.trim(), password, role,
            vehicleModel: role === 'DRIVER' ? vehicleModel.trim() : undefined,
            vehicleNumber: role === 'DRIVER' ? vehicleNumber.trim() : undefined,
          });
      onAuthenticated(user);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md py-10">
      <div className="mb-6 flex items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-lg shadow-amber-500/20">
          <Car className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">CabFlow</h1>
          <p className="text-xs text-slate-400">Sign in to book or drive</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl space-y-5">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1 text-sm font-semibold">
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(''); }}
              className={`rounded-lg py-2 cursor-pointer transition-colors ${
                mode === m ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {m === 'login' ? 'Log in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                {(['RIDER', 'DRIVER'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-xl border py-2.5 cursor-pointer transition-colors ${
                      role === r
                        ? 'border-amber-400 bg-amber-500/10 text-amber-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {r === 'RIDER' ? 'I want to ride' : 'I want to drive'}
                  </button>
                ))}
              </div>
              <input className={inputClass} placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </>
          )}

          <input className={inputClass} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <input
            className={inputClass} type="password" placeholder={mode === 'register' ? 'Password (8+ characters)' : 'Password'}
            value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'register' ? 8 : 1}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {mode === 'register' && role === 'DRIVER' && (
            <>
              <input className={inputClass} placeholder="Vehicle model (e.g. Swift Dzire)" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} required />
              <input className={inputClass} placeholder="Vehicle number (e.g. WB01AB1234)" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} required />
            </>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">{error}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-60 cursor-pointer transition-colors"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            <span>{mode === 'login' ? 'Log in' : 'Create account'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
