import React, { useState } from 'react';
import { KeyRound, Loader2, Mail, X } from 'lucide-react';
import { backend, SessionUser } from '../services/backend';

interface AccountSettingsProps {
  user: SessionUser;
  onClose: () => void;
  onEmailChanged: (user: SessionUser) => void;
  onPasswordChanged: () => void;
}

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none';

type Notice = { kind: 'ok' | 'error'; text: string } | null;

const NoticeBox: React.FC<{ notice: Notice }> = ({ notice }) =>
  notice ? (
    <div
      className={`rounded-xl border px-3.5 py-2.5 text-xs ${
        notice.kind === 'ok'
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      }`}
    >
      {notice.text}
    </div>
  ) : null;

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  user, onClose, onEmailChanged, onPasswordChanged,
}) => {
  // ---- email form ----
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailNotice, setEmailNotice] = useState<Notice>(null);

  // ---- password form ----
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwNotice, setPwNotice] = useState<Notice>(null);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailNotice(null);
    setEmailBusy(true);
    try {
      const updated = await backend.changeEmail(newEmail.trim(), emailPassword);
      setNewEmail('');
      setEmailPassword('');
      setEmailNotice({ kind: 'ok', text: `Email changed to ${updated.email}` });
      onEmailChanged(updated);
    } catch (err: any) {
      setEmailNotice({ kind: 'error', text: err?.message || 'Could not change the email' });
    } finally {
      setEmailBusy(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwNotice(null);
    if (newPassword !== confirmPassword) {
      setPwNotice({ kind: 'error', text: 'The new passwords do not match' });
      return;
    }
    setPwBusy(true);
    try {
      await backend.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwNotice({ kind: 'ok', text: 'Password changed. Use it the next time you log in.' });
      onPasswordChanged();
    } catch (err: any) {
      setPwNotice({ kind: 'error', text: err?.message || 'Could not change the password' });
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Account settings</h2>
            <p className="text-xs text-slate-400">Signed in as {user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Change email */}
        <form onSubmit={submitEmail} className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Mail className="h-4 w-4 text-amber-400" /> Change email
          </h3>
          <input
            className={inputClass} type="email" placeholder="New email address" autoComplete="email"
            value={newEmail} onChange={e => setNewEmail(e.target.value)} required
          />
          <input
            className={inputClass} type="password" placeholder="Current password (to confirm)" autoComplete="current-password"
            value={emailPassword} onChange={e => setEmailPassword(e.target.value)} required
          />
          <NoticeBox notice={emailNotice} />
          <button
            type="submit" disabled={emailBusy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-60 cursor-pointer"
          >
            {emailBusy && <Loader2 className="h-4 w-4 animate-spin" />} Update email
          </button>
        </form>

        <hr className="border-slate-800" />

        {/* Change password */}
        <form onSubmit={submitPassword} className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <KeyRound className="h-4 w-4 text-amber-400" /> Change password
          </h3>
          <input
            className={inputClass} type="password" placeholder="Current password" autoComplete="current-password"
            value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
          />
          <input
            className={inputClass} type="password" placeholder="New password (8+ characters)" autoComplete="new-password"
            value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} maxLength={72}
          />
          <input
            className={inputClass} type="password" placeholder="Repeat new password" autoComplete="new-password"
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} maxLength={72}
          />
          <NoticeBox notice={pwNotice} />
          <button
            type="submit" disabled={pwBusy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-60 cursor-pointer"
          >
            {pwBusy && <Loader2 className="h-4 w-4 animate-spin" />} Update password
          </button>
        </form>
      </div>
    </div>
  );
};
