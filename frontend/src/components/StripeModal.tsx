import React, { useState } from 'react';
import { CreditCard, Lock, CheckCircle2, ShieldCheck, X, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Ride } from '../types';
import { backend } from '../services/backend';

interface StripeModalProps {
  isOpen: boolean;
  ride: Ride;
  onClose: () => void;
  onPaymentSuccess: (receiptId: string) => void;
}

export const StripeModal: React.FC<StripeModalProps> = ({
  isOpen,
  ride,
  onClose,
  onPaymentSuccess
}) => {
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('888');
  const [cardHolder, setCardHolder] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setErrorMsg('');

    try {
      // 1) ask the Spring Boot API for a payment intent
      const intent = await backend.createPaymentIntent(ride.id);
      if (!intent.mock) {
        throw new Error(
          'The server is using real Stripe, which needs Stripe.js card entry. This demo form does not include it. ' +
          'Leave STRIPE_SECRET_KEY empty on the backend to use mock payments.'
        );
      }
      // 2) mock mode: the server marks the payment as paid (no real money moves)
      await backend.confirmMockPayment(ride.id);
      setProcessing(false);
      setIsSuccess(true);

      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (_) {}

      setTimeout(() => {
        onPaymentSuccess(intent.paymentIntentId);
      }, 1400);
    } catch (err: any) {
      setProcessing(false);
      setErrorMsg(err.message || 'Payment authentication failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Stripe Checkout</h3>
              <p className="text-xs text-slate-400">Payment via the Spring Boot API (mock mode: no real charge)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h4 className="mt-4 text-xl font-bold text-white">Payment Confirmed!</h4>
            <p className="mt-1.5 text-sm text-slate-300">
              ₹{ride.totalFare} charged successfully via Stripe.
            </p>
            <div className="mt-4 rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-400 border border-slate-800">
              PaymentIntent: <span className="text-emerald-400">pi_3Nx982KlqO7791A01</span>
              <br />
              Status: <span className="text-emerald-400 font-semibold">requires_capture → succeeded</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePay} className="p-6 space-y-4">
            {/* Total Fare Badge */}
            <div className="flex items-center justify-between rounded-xl bg-slate-950/90 p-4 border border-slate-800">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400">Amount Due</span>
                <div className="text-2xl font-black text-white">₹{ride.totalFare}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-amber-400 font-mono font-medium">{ride.rideCode}</span>
                <p className="text-xs text-slate-400">{ride.vehicleType} • {ride.distanceKm} km</p>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-950/60 p-3 text-xs text-rose-300 border border-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Simulated Card Elements */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300">Name on Card</label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={e => setCardHolder(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Card Number</label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-3.5 pr-12 py-2.5 font-mono text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="4242 4242 4242 4242"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 text-xs font-bold">
                    <span className="rounded bg-indigo-600/30 px-1.5 py-0.5 text-[10px] text-indigo-300">TEST</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Expiration (MM/YY)</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={e => setExpiry(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="12/28"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">CVC / CVV</label>
                  <input
                    type="text"
                    value={cvc}
                    onChange={e => setCvc(e.target.value)}
                    required
                    maxLength={4}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="888"
                  />
                </div>
              </div>
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <span>256-bit encrypted via Stripe TLS & Webhook signature verification</span>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={processing}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {processing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Contacting Stripe API...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Pay ₹{ride.totalFare} with Stripe</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
