import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  Tag, 
  ShieldAlert, 
  Star, 
  Receipt, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { LocationPoint, VehicleType, Ride, Driver } from '../types';
import { CITY_LOCATIONS, VEHICLE_OPTIONS } from '../data/predefinedLocations';
import { backend, EMPTY_QUOTE, FareQuote } from '../services/backend';
import { InteractiveMap } from './InteractiveMap';
import { StripeModal } from './StripeModal';
import { InvoiceModal } from './InvoiceModal';

interface RiderViewProps {
  activeRide: Ride | null;
  onRefreshRide: () => void;
  onClearRide: () => void;
}

export const RiderView: React.FC<RiderViewProps> = ({
  activeRide,
  onRefreshRide,
  onClearRide
}) => {
  const [pickup, setPickup] = useState<LocationPoint>(CITY_LOCATIONS[1]); // Indiranagar
  const [dropoff, setDropoff] = useState<LocationPoint>(CITY_LOCATIONS[0]); // Airport
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('SEDAN');
  const [promoCodeInput, setPromoCodeInput] = useState('WELCOME50');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string } | null>(null);
  const [actionError, setActionError] = useState('');
  const [booking, setBooking] = useState(false);
  const [nearby, setNearby] = useState<Driver[]>([]);
  const [promoError, setPromoError] = useState('');
  
  // Modals
  const [isStripeOpen, setIsStripeOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Ratings
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('Super smooth and comfortable ride! Driver arrived on time.');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Fare estimation
  // Prices for every cab tier come from the server (distance, vehicle rates, promo and GST are all computed there).
  const [vehicleFares, setVehicleFares] = useState<Partial<Record<VehicleType, FareQuote>>>({});
  const [fareError, setFareError] = useState('');
  const promoForQuote = appliedPromo?.code;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const quotes = await Promise.all(
          VEHICLE_OPTIONS.map(opt => backend.estimate(pickup, dropoff, opt.type, promoForQuote))
        );
        if (cancelled) return;
        const next: Partial<Record<VehicleType, FareQuote>> = {};
        VEHICLE_OPTIONS.forEach((opt, i) => { next[opt.type] = quotes[i]; });
        setVehicleFares(next);
        setFareError('');
      } catch (e: any) {
        if (!cancelled) {
          setVehicleFares({});
          setFareError(e?.message || 'Could not calculate the fare');
        }
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [pickup, dropoff, promoForQuote]);

  const fareEstimate: FareQuote = vehicleFares[selectedVehicle] ?? EMPTY_QUOTE;

  // Cabs near the pickup point (shown on the map before booking)
  useEffect(() => {
    if (activeRide) return;
    let cancelled = false;
    const load = () => backend.nearbyDrivers(pickup.lat, pickup.lng)
      .then(list => { if (!cancelled) setNearby(list); })
      .catch(() => { /* map just shows no cabs */ });
    load();
    const t = window.setInterval(load, 8000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, [pickup, activeRide]);

  const handleApplyPromo = async () => {
    setPromoError('');
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    try {
      await backend.estimate(pickup, dropoff, selectedVehicle, code);   // the server rejects unknown/expired codes
      setAppliedPromo({ code });
    } catch (e: any) {
      setPromoError(e?.message || 'Invalid or expired coupon code');
      setAppliedPromo(null);
    }
  };

  const handleBookRide = async () => {
    setActionError('');
    setBooking(true);
    try {
      await backend.bookRide(pickup, dropoff, selectedVehicle, appliedPromo?.code);
      await onRefreshRide();
    } catch (e: any) {
      setActionError(e?.message || 'Could not book the ride');
    } finally {
      setBooking(false);
    }
  };

  const handleTriggerSos = async () => {
    if (!activeRide) return;
    await backend.triggerSos(activeRide.id, 'Rider requested urgent assistance');
    alert('🚨 SOS sent: the operations team has been alerted.');
  };

  const handleSubmitRating = async () => {
    if (!activeRide) return;
    try {
      await backend.submitRating(activeRide.id, userRating, userComment);
      setRatingSubmitted(true);
    } catch (e: any) {
      setActionError(e?.message || 'Could not submit the rating');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Booking Controls or Live Status */}
      <div className="lg:col-span-5 space-y-5">
        {!activeRide ? (
          /* Booking Panel */
          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl backdrop-blur-md space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Book a Ride</h2>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                  Instant Dispatch
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Calculate fare with Spring Boot algorithm & track live drivers
              </p>
            </div>

            {/* Pickup & Dropoff Selectors */}
            <div className="space-y-3 rounded-xl bg-slate-950 p-4 border border-slate-800/80">
              {/* Pickup */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Pickup Location</span>
                </label>
                <select
                  value={pickup.name}
                  onChange={e => {
                    const loc = CITY_LOCATIONS.find(l => l.name === e.target.value);
                    if (loc) setPickup(loc);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-white focus:border-amber-400 focus:outline-none"
                >
                  {CITY_LOCATIONS.map(loc => (
                    <option key={loc.name} value={loc.name}>
                      📍 {loc.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{pickup.address}</p>
              </div>

              {/* Dropoff */}
              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
                  <div className="h-2 w-2 rounded-full bg-rose-400" />
                  <span>Drop-off Destination</span>
                </label>
                <select
                  value={dropoff.name}
                  onChange={e => {
                    const loc = CITY_LOCATIONS.find(l => l.name === e.target.value);
                    if (loc) setDropoff(loc);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-white focus:border-amber-400 focus:outline-none"
                >
                  {CITY_LOCATIONS.map(loc => (
                    <option key={loc.name} value={loc.name}>
                      🎯 {loc.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{dropoff.address}</p>
              </div>
            </div>

            {/* Vehicle Options */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2.5">
                Choose Cab Tier
              </label>
              <div className="space-y-2">
                {VEHICLE_OPTIONS.map(opt => {
                  const est = vehicleFares[opt.type] ?? EMPTY_QUOTE;
                  const isSelected = selectedVehicle === opt.type;
                  return (
                    <div
                      key={opt.type}
                      onClick={() => setSelectedVehicle(opt.type)}
                      className={`flex items-center justify-between rounded-xl p-3 border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/10 shadow-md'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={opt.image}
                          alt={opt.name}
                          className="h-12 w-14 rounded-lg object-cover border border-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{opt.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">👥 {opt.capacity}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate max-w-[190px]">{opt.description}</p>
                          <span className="text-[10px] text-amber-400 font-medium">ETA {opt.etaMins} mins away</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-white">₹{est.totalFare}</span>
                        {est.discountAmount > 0 && (
                          <span className="block text-[10px] text-emerald-400 line-through">
                            ₹{est.totalFare + est.discountAmount}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Promo Code section */}
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Promo Code (e.g. WELCOME50)"
                  value={promoCodeInput}
                  onChange={e => setPromoCodeInput(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white uppercase placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
                <button
                  onClick={handleApplyPromo}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {appliedPromo && (
                <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Promo {appliedPromo.code} applied! Saved ₹{fareEstimate.discountAmount}</span>
                </p>
              )}
              {promoError && (
                <p className="text-[11px] text-rose-400 mt-1.5">{promoError}</p>
              )}
            </div>

            {/* Route Stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Distance</span>
                <span className="font-bold text-white">{fareEstimate.distanceKm} km</span>
              </div>
              <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Trip Time</span>
                <span className="font-bold text-white">{fareEstimate.durationMins} mins</span>
              </div>
              <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Peak Surge</span>
                <span className={`font-bold ${fareEstimate.surgeMultiplier > 1 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {fareEstimate.surgeMultiplier}x
                </span>
              </div>
            </div>

            {/* Book Button */}
            <button
              onClick={handleBookRide}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-amber-500/20 hover:from-amber-400 hover:to-amber-300 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Book {selectedVehicle} • ₹{fareEstimate.totalFare}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* Live Ride Status Card */
          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl backdrop-blur-md space-y-5">
            {/* Header Status */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-amber-400 font-bold">{activeRide.rideCode}</span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {activeRide.status === 'SEARCHING' && 'Connecting with Nearby Drivers...'}
                  {activeRide.status === 'ACCEPTED' && 'Driver Confirmed & Approaching'}
                  {activeRide.status === 'ARRIVED' && 'Driver Arrived at Pickup!'}
                  {activeRide.status === 'IN_PROGRESS' && 'Trip In Progress'}
                  {activeRide.status === 'COMPLETED' && 'Ride Completed!'}
                  {activeRide.status === 'CANCELLED' && 'Ride Cancelled'}
                </h3>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  activeRide.status === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : activeRide.status === 'IN_PROGRESS'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                }`}
              >
                {activeRide.status}
              </span>
            </div>

            {/* Driver Info Card */}
            {activeRide.driverName ? (
              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={activeRide.driverAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'}
                      alt={activeRide.driverName}
                      className="h-12 w-12 rounded-full object-cover border-2 border-amber-400 shadow-md"
                    />
                    <div>
                      <h4 className="font-bold text-white text-sm">{activeRide.driverName}</h4>
                      <p className="text-xs text-slate-400">{activeRide.vehicleModel}</p>
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-0.5">
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
                        <span className="font-semibold">{activeRide.driverRating || 4.9}</span>
                        <span className="text-slate-500">• Verified Partner</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block rounded bg-amber-500 px-2 py-1 font-mono text-xs font-black text-slate-950 shadow">
                      {activeRide.vehicleNumber}
                    </span>
                    <div className="mt-2 text-xs text-slate-400">
                      OTP: <span className="text-white font-mono font-bold text-sm tracking-widest">{activeRide.otp}</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="rounded-xl bg-slate-950 p-6 border border-slate-800 text-center space-y-3">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-amber-400 border-t-transparent" />
                <p className="text-xs text-slate-300">
                  Broadcasting dispatch request to 5 nearby drivers within 3 km radius...
                </p>
                <span className="font-mono text-[11px] text-slate-500">
                  Spring WebSocket: @SendTo('/topic/drivers/nearby')
                </span>
              </div>
            )}

            {/* Trip Details */}
            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 text-xs space-y-2.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>Pickup:</span>
                <span className="font-medium text-white truncate max-w-[200px]">{activeRide.pickupLocation.name}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Destination:</span>
                <span className="font-medium text-white truncate max-w-[200px]">{activeRide.dropoffLocation.name}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-800">
                <span>Total Fare:</span>
                <span className="font-bold text-amber-400 text-sm">₹{activeRide.totalFare}</span>
              </div>
            </div>

            {/* Post-Completion Actions: Payment & Invoice & Rating */}
            {activeRide.status === 'COMPLETED' && (
              <div className="space-y-3 rounded-xl bg-slate-950 p-4 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Payment Status</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      activeRide.paymentStatus === 'PAID'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {activeRide.paymentStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {activeRide.paymentStatus !== 'PAID' ? (
                    <button
                      onClick={() => setIsStripeOpen(true)}
                      className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-xs font-bold text-white shadow-lg hover:from-indigo-500 hover:to-violet-500 transition-all cursor-pointer"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Pay ₹{activeRide.totalFare} with Stripe</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsInvoiceOpen(true)}
                      className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-white border border-slate-700 hover:bg-slate-700 transition-all cursor-pointer"
                    >
                      <Receipt className="h-4 w-4 text-amber-400" />
                      <span>Download Tax Invoice (iText PDF)</span>
                    </button>
                  )}
                </div>

                {/* Rating Form */}
                {!ratingSubmitted && !activeRide.ratingScore ? (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <label className="text-xs font-medium text-slate-300 block">Rate Driver Experience</label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setUserRating(star)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              star <= userRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-600'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-xs font-bold text-amber-400">{userRating} / 5</span>
                    </div>
                    <input
                      type="text"
                      value={userComment}
                      onChange={e => setUserComment(e.target.value)}
                      placeholder="Write feedback for driver..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                    <button
                      onClick={handleSubmitRating}
                      className="w-full rounded-lg bg-slate-800 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                    >
                      Submit Rating
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 text-center text-xs text-emerald-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Feedback Recorded (Rating: ⭐ {userRating}/5)</span>
                  </div>
                )}

                <button
                  onClick={() => {
                    setRatingSubmitted(false);
                    onClearRide();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer mt-2"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Book Another Ride</span>
                </button>
              </div>
            )}

            {/* Emergency SOS & Cancel Buttons */}
            {activeRide.status !== 'COMPLETED' && activeRide.status !== 'CANCELLED' && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleTriggerSos}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600/90 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition-colors cursor-pointer"
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>EMERGENCY SOS</span>
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to cancel this ride?')) {
                      try {
                        await backend.cancelRide(activeRide.id);
                      } catch (e: any) {
                        setActionError(e?.message || 'Could not cancel the ride');
                      }
                      await onRefreshRide();
                    }
                  }}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Cancel Ride
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Live Map */}
      <div className="lg:col-span-7 h-[640px]">
        <InteractiveMap
          pickup={activeRide ? activeRide.pickupLocation : pickup}
          dropoff={activeRide ? activeRide.dropoffLocation : dropoff}
          driverLocation={
            activeRide?.currentDriverLat && activeRide?.currentDriverLng
              ? { lat: activeRide.currentDriverLat, lng: activeRide.currentDriverLng }
              : null
          }
          allDrivers={!activeRide ? nearby : []}
          routeCoordinates={activeRide?.routeCoordinates || fareEstimate ? fareEstimate ? [
            [pickup.lat, pickup.lng],
            [dropoff.lat, dropoff.lng]
          ] : [] : []}
        />
      </div>

      {/* Modals */}
      {activeRide && (
        <>
          <StripeModal
            isOpen={isStripeOpen}
            ride={activeRide}
            onClose={() => setIsStripeOpen(false)}
            onPaymentSuccess={() => {
              setIsStripeOpen(false);
              onRefreshRide();
            }}
          />
          <InvoiceModal
            isOpen={isInvoiceOpen}
            ride={activeRide}
            onClose={() => setIsInvoiceOpen(false)}
          />
        </>
      )}
    </div>
  );
};
