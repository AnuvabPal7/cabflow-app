import {
  Driver, LocationPoint, PaymentStatus, PromoCode, Ride, RideStatus, SupportTicket, SystemMetrics,
  UserRole, VehicleType,
} from '../types';
import { ApiError, downloadBlob, http, tokenStore } from './http';
import { publish } from './realtime';

/* ------------------------------------------------------------------ */
/* Shapes returned by the Spring Boot API (see Dtos.java)              */
/* ------------------------------------------------------------------ */
interface UserDto { id: number; name: string; email: string; role: UserRole }
interface AuthResponse { token: string; user: UserDto }
interface PointDto { lat: number; lng: number; address?: string | null }
interface RideDto {
  id: number; status: string; riderId: number; riderName: string;
  driverId: number | null; driverName: string | null; vehicleModel: string | null; vehiclePlate: string | null;
  driverLat: number | null; driverLng: number | null;
  pickup: PointDto; drop: PointDto;
  vehicleType: VehicleType; distanceKm: number; estimatedMinutes: number;
  baseFare: number; distanceFare: number; taxAmount: number; fare: number; discount: number;
  promoCode: string | null; startOtp: string | null; requestedAt: string; completedAt: string | null;
}
interface FareEstimateDto {
  vehicleType: VehicleType; distanceKm: number; estimatedMinutes: number; baseFare: number; distanceFare: number;
  subtotal: number; discount: number; taxAmount: number; total: number; currency: string;
}
interface DriverDto {
  id: number; userId: number; name: string; vehicleModel: string; vehiclePlate: string;
  status: 'OFFLINE' | 'AVAILABLE' | 'ON_RIDE'; lat: number | null; lng: number | null;
  ratingAverage: number; ratingCount: number; totalEarnings: number;
}
interface NearbyDriverDto { id: number; name: string; vehicleModel: string; lat: number; lng: number; distanceKm: number; ratingAverage: number }
interface PaymentIntentDto { rideId: number; paymentIntentId: string; clientSecret: string | null; amount: number; currency: string; status: string; mock: boolean }
interface Page<T> { content: T[] }
interface AdminStatsDto {
  totalUsers: number; totalDrivers: number; availableDrivers: number; activeRides: number;
  completedRides: number; cancelledRides: number; revenue: number;
}
interface TicketDto { id: number; userId: number; userName: string; subject: string; message: string; status: 'OPEN' | 'RESOLVED'; createdAt: string }
interface PromoDto { id: number; code: string; discountPercent: number; active: boolean }

/* ------------------------------------------------------------------ */
/* What the UI works with                                              */
/* ------------------------------------------------------------------ */
export interface SessionUser { id: string; fullName: string; email: string; role: UserRole }

export interface FareQuote {
  vehicleType: VehicleType; distanceKm: number; durationMins: number;
  baseFare: number; distanceFare: number; surgeMultiplier: number;
  discountAmount: number; taxAmount: number; totalFare: number;
}

export const EMPTY_QUOTE: FareQuote = {
  vehicleType: 'SEDAN', distanceKm: 0, durationMins: 0, baseFare: 0, distanceFare: 0,
  surgeMultiplier: 1, discountAmount: 0, taxAmount: 0, totalFare: 0,
};

export interface PaymentIntentInfo { paymentIntentId: string; clientSecret: string | null; mock: boolean; amount: number }

export interface RegisterInput {
  fullName: string; email: string; password: string; role: 'RIDER' | 'DRIVER';
  vehicleModel?: string; vehicleNumber?: string;
}

/* ------------------------------------------------------------------ */
/* Mapping helpers                                                     */
/* ------------------------------------------------------------------ */
function avatar(name: string): string {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w.replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase()).join('') || '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#1e293b"/>` +
    `<text x="50%" y="54%" font-family="Arial" font-size="38" font-weight="700" fill="#fbbf24" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function toLocation(p: PointDto): LocationPoint {
  const label = p.address && p.address.trim() ? p.address : 'Pinned location';
  return { name: label, address: label, lat: p.lat, lng: p.lng };
}

const STATUS_MAP: Record<string, RideStatus> = {
  REQUESTED: 'SEARCHING', ACCEPTED: 'ACCEPTED', ARRIVED: 'ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED',
};

function toRide(d: RideDto, paymentStatus: PaymentStatus = 'PENDING'): Ride {
  return {
    id: String(d.id),
    rideCode: `CF-${String(d.id).padStart(5, '0')}`,
    riderId: String(d.riderId),
    riderName: d.riderName,
    riderPhone: '',
    driverId: d.driverId != null ? String(d.driverId) : undefined,
    driverName: d.driverName ?? undefined,
    driverAvatar: d.driverName ? avatar(d.driverName) : undefined,
    vehicleModel: d.vehicleModel ?? undefined,
    vehicleNumber: d.vehiclePlate ?? undefined,
    vehicleType: d.vehicleType,
    pickupLocation: toLocation(d.pickup),
    dropoffLocation: toLocation(d.drop),
    distanceKm: d.distanceKm,
    durationMins: d.estimatedMinutes,
    baseFare: d.baseFare,
    distanceFare: d.distanceFare,
    surgeMultiplier: 1,
    discountAmount: d.discount,
    taxAmount: d.taxAmount,
    totalFare: d.fare,
    status: STATUS_MAP[d.status] ?? 'SEARCHING',
    otp: d.startOtp ?? '',
    paymentStatus,
    paymentMethod: 'STRIPE',
    currentDriverLat: d.driverLat ?? undefined,
    currentDriverLng: d.driverLng ?? undefined,
    routeCoordinates: [[d.pickup.lat, d.pickup.lng], [d.drop.lat, d.drop.lng]],
    createdAt: d.requestedAt,
    completedAt: d.completedAt ?? undefined,
    appliedPromo: d.promoCode ?? undefined,
  };
}

function toDriver(d: DriverDto, extra?: { totalTrips?: number }): Driver {
  return {
    id: String(d.id),
    userId: String(d.userId),
    fullName: d.name,
    phone: '',
    avatarUrl: avatar(d.name),
    vehicleModel: d.vehicleModel,
    vehicleNumber: d.vehiclePlate,
    vehicleType: 'SEDAN',
    licenseNumber: '',
    isOnline: d.status !== 'OFFLINE',
    isAvailable: d.status === 'AVAILABLE',
    currentLat: d.lat ?? 0,
    currentLng: d.lng ?? 0,
    rating: Math.round(d.ratingAverage * 10) / 10,
    totalTrips: extra?.totalTrips ?? d.ratingCount,
    todayEarnings: d.totalEarnings,
    weeklyEarnings: d.totalEarnings,
    walletBalance: d.totalEarnings,
    verified: true,
  };
}

function toSessionUser(u: UserDto): SessionUser {
  return { id: String(u.id), fullName: u.name, email: u.email, role: u.role };
}

const point = (l: LocationPoint) => ({ lat: l.lat, lng: l.lng, address: l.name });

/* ------------------------------------------------------------------ */
/* The API                                                             */
/* ------------------------------------------------------------------ */
let currentRole: UserRole | null = null;

export const backend = {
  /* ---------- auth ---------- */
  async login(email: string, password: string): Promise<SessionUser> {
    const res = await http.post<AuthResponse>('/api/auth/login', { email, password });
    tokenStore.set(res.token);
    currentRole = res.user.role;
    return toSessionUser(res.user);
  },

  async register(input: RegisterInput): Promise<SessionUser> {
    const res = await http.post<AuthResponse>('/api/auth/register', {
      name: input.fullName, email: input.email, password: input.password, role: input.role,
      vehicleModel: input.vehicleModel, vehiclePlate: input.vehicleNumber,
    });
    tokenStore.set(res.token);
    currentRole = res.user.role;
    return toSessionUser(res.user);
  },

  /** Change the password of the logged-in user (the server checks the current one). */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await http.put('/api/users/me/password', { currentPassword, newPassword });
  },

  /** Change the login email. The server issues a new token because the old one was tied to the old email. */
  async changeEmail(newEmail: string, currentPassword: string): Promise<SessionUser> {
    const res = await http.put<AuthResponse>('/api/users/me/email', { newEmail, currentPassword });
    tokenStore.set(res.token);
    currentRole = res.user.role;
    return toSessionUser(res.user);
  },

  async restoreSession(): Promise<SessionUser | null> {
    if (!tokenStore.get()) return null;
    try {
      const u = await http.get<UserDto>('/api/users/me');
      currentRole = u.role;
      return toSessionUser(u);
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) throw e;   // backend down: keep the token, show the error
      tokenStore.clear();
      return null;
    }
  },

  logout() {
    tokenStore.clear();
    currentRole = null;
  },

  /* ---------- rider ---------- */
  async estimate(pickup: LocationPoint, dropoff: LocationPoint, vehicle: VehicleType, promoCode?: string): Promise<FareQuote> {
    const e = await http.post<FareEstimateDto>('/api/rides/estimate', {
      pickup: point(pickup), drop: point(dropoff), vehicleType: vehicle, promoCode: promoCode || undefined,
    });
    return {
      vehicleType: e.vehicleType, distanceKm: e.distanceKm, durationMins: e.estimatedMinutes,
      baseFare: e.baseFare, distanceFare: e.distanceFare, surgeMultiplier: 1,
      discountAmount: e.discount, taxAmount: e.taxAmount, totalFare: e.total,
    };
  },

  async bookRide(pickup: LocationPoint, dropoff: LocationPoint, vehicle: VehicleType, promoCode?: string): Promise<Ride> {
    const d = await http.post<RideDto>('/api/rides', {
      pickup: point(pickup), drop: point(dropoff), vehicleType: vehicle, promoCode: promoCode || undefined,
    });
    return toRide(d);
  },

  async cancelRide(rideId: string): Promise<void> {
    await http.post(`/api/rides/${rideId}/cancel`);
  },

  async submitRating(rideId: string, stars: number, comment: string): Promise<void> {
    await http.post('/api/ratings', { rideId: Number(rideId), stars, comment });
  },

  async nearbyDrivers(lat: number, lng: number): Promise<Driver[]> {
    const list = await http.get<NearbyDriverDto[]>(`/api/drivers/nearby?lat=${lat}&lng=${lng}`);
    return list.map(n => toDriver({
      id: n.id, userId: n.id, name: n.name, vehicleModel: n.vehicleModel, vehiclePlate: '',
      status: 'AVAILABLE', lat: n.lat, lng: n.lng, ratingAverage: n.ratingAverage, ratingCount: 0, totalEarnings: 0,
    }));
  },

  /* ---------- rides (shared) ---------- */
  async getCurrentRide(): Promise<Ride | null> {
    const d = await http.get<RideDto | undefined>('/api/rides/active');
    return d ? toRide(d) : null;
  },

  async getRide(rideId: string): Promise<Ride> {
    const d = await http.get<RideDto>(`/api/rides/${rideId}`);
    let payment: PaymentStatus = 'PENDING';
    if (d.status === 'COMPLETED' && currentRole === 'RIDER') payment = await backend.getPaymentStatus(rideId);
    return toRide(d, payment);
  },

  /** After a page reload: a finished ride that still has to be paid. */
  async getUnpaidCompletedRide(): Promise<Ride | null> {
    const page = await http.get<Page<RideDto>>('/api/rides/history?size=1');
    const latest = page.content[0];
    if (!latest || latest.status !== 'COMPLETED') return null;
    const ride = await backend.getRide(String(latest.id));
    return ride.paymentStatus === 'PAID' ? null : ride;
  },

  async history(size = 20): Promise<Ride[]> {
    const page = await http.get<Page<RideDto>>(`/api/rides/history?size=${size}`);
    return page.content.map(d => toRide(d));
  },

  /* ---------- payments ---------- */
  async createPaymentIntent(rideId: string): Promise<PaymentIntentInfo> {
    const p = await http.post<PaymentIntentDto>(`/api/payments/rides/${rideId}/intent`);
    return { paymentIntentId: p.paymentIntentId, clientSecret: p.clientSecret, mock: p.mock, amount: p.amount };
  },

  async confirmMockPayment(rideId: string): Promise<void> {
    await http.post(`/api/payments/rides/${rideId}/mock-confirm`);
  },

  async getPaymentStatus(rideId: string): Promise<PaymentStatus> {
    try {
      const p = await http.get<PaymentIntentDto>(`/api/payments/rides/${rideId}`);
      return p.status === 'SUCCEEDED' ? 'PAID' : p.status === 'FAILED' ? 'FAILED' : 'PENDING';
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return 'PENDING';
      throw e;
    }
  },

  async downloadReceipt(rideId: string): Promise<void> {
    const blob = await downloadBlob(`/api/rides/${rideId}/receipt`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${rideId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  /* ---------- SOS / support ---------- */
  async triggerSos(rideId: string | null, message: string): Promise<void> {
    publish('/app/sos', { rideId: rideId ? Number(rideId) : null, message });   // live alert to admins
    await http.post('/api/support/tickets', {                                    // durable record
      subject: `SOS - ${rideId ? `ride ${rideId}` : 'no active ride'}`, message,
    }).catch(() => { /* the live alert is the important part */ });
  },

  /* ---------- driver ---------- */
  async getDriver(): Promise<Driver> {
    const [d, history] = await Promise.all([
      http.get<DriverDto>('/api/drivers/me'),
      http.get<Page<RideDto>>('/api/rides/history?size=100'),
    ]);
    return toDriver(d, { totalTrips: history.content.filter(r => r.status === 'COMPLETED').length });
  },

  async setDriverStatus(status: 'AVAILABLE' | 'OFFLINE'): Promise<void> {
    await http.put('/api/drivers/me/status', { status });
  },

  /** Live position update (WebSocket when connected, REST otherwise). forceRest waits for the server's answer. */
  async sendLocation(lat: number, lng: number, forceRest = false): Promise<void> {
    if (forceRest || !publish('/app/driver.location', { lat, lng })) {
      await http.put('/api/drivers/me/location', { lat, lng });
    }
  },

  async availableRides(): Promise<Ride[]> {
    const list = await http.get<RideDto[]>('/api/rides/available');
    return list.map(d => toRide(d));
  },

  async acceptRide(rideId: string): Promise<void> { await http.post(`/api/rides/${rideId}/accept`); },
  async declineRide(rideId: string): Promise<void> { await http.post(`/api/rides/${rideId}/decline`); },
  async markArrived(rideId: string): Promise<void> { await http.post(`/api/rides/${rideId}/arrived`); },
  async startRide(rideId: string, otp: string): Promise<void> { await http.post(`/api/rides/${rideId}/start`, { otp }); },
  async completeRide(rideId: string): Promise<void> { await http.post(`/api/rides/${rideId}/complete`); },

  /* ---------- admin ---------- */
  async getMetrics(): Promise<SystemMetrics> {
    const [s, top] = await Promise.all([
      http.get<AdminStatsDto>('/api/admin/stats'),
      http.get<DriverDto[]>('/api/drivers/top?limit=50'),
    ]);
    const finished = s.completedRides + s.cancelledRides;
    const avg = top.length ? top.reduce((sum, d) => sum + d.ratingAverage, 0) / top.length : 0;
    return {
      totalRidesToday: s.completedRides + s.cancelledRides + s.activeRides,
      activeTrips: s.activeRides,
      onlineDrivers: s.availableDrivers,
      totalRevenue: Math.round(s.revenue),
      platformCommission: Math.round(s.revenue * 0.2),
      completionRate: finished ? Math.round((s.completedRides / finished) * 100) : 100,
      avgRating: Math.round(avg * 10) / 10,
    };
  },

  async adminDrivers(): Promise<Driver[]> {
    const page = await http.get<Page<DriverDto>>('/api/admin/drivers?size=100');
    return page.content.map(d => toDriver(d));
  },

  async adminTickets(): Promise<SupportTicket[]> {
    const page = await http.get<Page<TicketDto>>('/api/admin/tickets?size=100');
    return page.content.map(t => {
      const sos = t.subject.toUpperCase().startsWith('SOS');
      return {
        id: String(t.id), userId: String(t.userId), userName: t.userName, userRole: 'RIDER' as UserRole,
        subject: t.subject, message: t.message, priority: sos ? 'URGENT' as const : 'MEDIUM' as const,
        status: t.status, createdAt: t.createdAt, isSosAlert: sos,
      };
    });
  },

  async resolveTicket(ticketId: string): Promise<void> { await http.patch(`/api/admin/tickets/${ticketId}/resolve`); },

  async adminPromos(): Promise<PromoCode[]> {
    const list = await http.get<PromoDto[]>('/api/admin/promos');
    return list.map(p => ({
      code: p.code, discountPercent: p.discountPercent, maxDiscount: 0, minRideAmount: 0,
      description: `${p.discountPercent}% off the fare`, isActive: p.active,
    }));
  },

  async createPromo(code: string, discountPercent: number): Promise<void> {
    await http.post('/api/admin/promos', { code, discountPercent });
  },
};
