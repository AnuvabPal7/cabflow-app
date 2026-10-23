export type UserRole = 'RIDER' | 'DRIVER' | 'ADMIN';

export type VehicleType = 'MINI' | 'SEDAN' | 'SUV' | 'PREMIER' | 'AUTO';

export type RideStatus = 
  | 'REQUESTED' 
  | 'SEARCHING' 
  | 'ACCEPTED' 
  | 'ARRIVED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'STRIPE' | 'CASH' | 'WALLET';

export interface LocationPoint {
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: 'airport' | 'station' | 'tech' | 'mall' | 'residential';
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  rating: number;
  avatarUrl: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  avatarUrl: string;
  vehicleModel: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  licenseNumber: string;
  isOnline: boolean;
  isAvailable: boolean;
  currentLat: number;
  currentLng: number;
  rating: number;
  totalTrips: number;
  todayEarnings: number;
  weeklyEarnings: number;
  walletBalance: number;
  verified: boolean;
}

export interface Ride {
  id: string;
  rideCode: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverAvatar?: string;
  driverRating?: number;
  vehicleModel?: string;
  vehicleNumber?: string;
  vehicleType: VehicleType;
  pickupLocation: LocationPoint;
  dropoffLocation: LocationPoint;
  distanceKm: number;
  durationMins: number;
  baseFare: number;
  distanceFare: number;
  surgeMultiplier: number;
  discountAmount: number;
  taxAmount: number;
  totalFare: number;
  status: RideStatus;
  otp: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  stripePaymentIntentId?: string;
  currentDriverLat?: number;
  currentDriverLng?: number;
  routeCoordinates: [number, number][];
  createdAt: string;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  ratingScore?: number;
  ratingFeedback?: string;
  appliedPromo?: string;
}

export interface VehicleOption {
  type: VehicleType;
  name: string;
  description: string;
  capacity: number;
  baseRate: number;
  perKmRate: number;
  icon: string;
  etaMins: number;
  image: string;
}

export interface PromoCode {
  code: string;
  discountPercent: number;
  maxDiscount: number;
  minRideAmount: number;
  description: string;
  isActive: boolean;
}

export interface SupportTicket {
  id: string;
  rideId?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  subject: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  createdAt: string;
  isSosAlert?: boolean;
}

export interface SystemMetrics {
  totalRidesToday: number;
  activeTrips: number;
  onlineDrivers: number;
  totalRevenue: number;
  platformCommission: number;
  completionRate: number;
  avgRating: number;
}

export interface WebSocketMessage {
  event: 'DRIVER_LOCATION' | 'RIDE_REQUESTED' | 'RIDE_ACCEPTED' | 'DRIVER_ARRIVED' | 'RIDE_STARTED' | 'RIDE_COMPLETED' | 'RIDE_CANCELLED' | 'SOS_BROADCAST';
  rideId?: string;
  driverId?: string;
  payload: any;
  timestamp: string;
}
