import { LocationPoint, VehicleOption } from '../types';

// Pre-defined city locations with realistic coordinates (Bengaluru tech hub center)
export const CITY_LOCATIONS: LocationPoint[] = [
  {
    name: 'Kempegowda International Airport (BLR)',
    address: 'KIAL Road, Devanahalli, Bengaluru',
    lat: 13.1986,
    lng: 77.7066,
    category: 'airport'
  },
  {
    name: 'Indiranagar 100ft Road',
    address: '100 Feet Rd, HAL 2nd Stage, Indiranagar',
    lat: 12.9719,
    lng: 77.6412,
    category: 'mall'
  },
  {
    name: 'Koramangala Sony World Signal',
    address: '80 Feet Rd, 4th Block, Koramangala',
    lat: 12.9352,
    lng: 77.6245,
    category: 'tech'
  },
  {
    name: 'MG Road Metro Station',
    address: 'Mahatma Gandhi Rd, Ashok Nagar',
    lat: 12.9754,
    lng: 77.6066,
    category: 'station'
  },
  {
    name: 'Whitefield ITPL Tech Park',
    address: 'International Tech Park, Pattandur Agrahara',
    lat: 12.9859,
    lng: 77.7319,
    category: 'tech'
  },
  {
    name: 'Electronic City Phase 1',
    address: 'Hosur Rd, Electronic City Phase I',
    lat: 12.8452,
    lng: 77.6602,
    category: 'tech'
  },
  {
    name: 'UB City & Lavelle Road',
    address: '24 Vittal Mallya Rd, KG Halli',
    lat: 12.9716,
    lng: 77.5961,
    category: 'mall'
  },
  {
    name: 'HSR Layout Sector 1',
    address: '27th Main Rd, Sector 1, HSR Layout',
    lat: 12.9121,
    lng: 77.6446,
    category: 'residential'
  },
  {
    name: 'Krantivira Sangolli Rayanna Railway Station',
    address: 'Majestic, Sevashrama, Bengaluru',
    lat: 12.9781,
    lng: 77.5694,
    category: 'station'
  },
  {
    name: 'Hebbal Flyover & Esteem Mall',
    address: 'Bellary Rd, Chiranjeevi Layout, Hebbal',
    lat: 13.0358,
    lng: 77.5970,
    category: 'residential'
  }
];

export const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    type: 'MINI',
    name: 'Go Mini',
    description: 'Affordable, compact rides for everyday solo or couple commute',
    capacity: 4,
    baseRate: 45,
    perKmRate: 14,
    icon: 'Car',
    etaMins: 3,
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80'
  },
  {
    type: 'SEDAN',
    name: 'Premier Sedan',
    description: 'Comfortable sedans with top-rated drivers & extra legroom',
    capacity: 4,
    baseRate: 75,
    perKmRate: 18,
    icon: 'CarFront',
    etaMins: 4,
    image: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=400&q=80'
  },
  {
    type: 'SUV',
    name: 'XL Prime SUV',
    description: 'Spacious 6-seater SUVs for family outings & luggage',
    capacity: 6,
    baseRate: 110,
    perKmRate: 24,
    icon: 'Truck',
    etaMins: 6,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80'
  },
  {
    type: 'PREMIER',
    name: 'Executive Black',
    description: 'Luxury vehicles with bottled water & quiet ride option',
    capacity: 4,
    baseRate: 180,
    perKmRate: 36,
    icon: 'Crown',
    etaMins: 8,
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80'
  },
  {
    type: 'AUTO',
    name: 'City Auto 3-Wheeler',
    description: 'Quick & economical door-to-door auto rides',
    capacity: 3,
    baseRate: 30,
    perKmRate: 11,
    icon: 'Zap',
    etaMins: 2,
    image: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&w=400&q=80'
  }
];

// Helper to compute haversine distance in km
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Number(d.toFixed(1));
}

// Generate realistic polyline points between 2 coordinates with realistic bends
export function generateRoutePoints(
  start: [number, number],
  end: [number, number],
  steps: number = 24
): [number, number][] {
  const points: [number, number][] = [];
  const [lat1, lon1] = start;
  const [lat2, lon2] = end;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Introduce gentle curve simulation
    const curvature = Math.sin(t * Math.PI) * 0.0035 * (i % 2 === 0 ? 1 : -0.8);
    const lat = lat1 + (lat2 - lat1) * t + curvature;
    const lon = lon1 + (lon2 - lon1) * t - curvature * 0.5;
    points.push([lat, lon]);
  }

  return points;
}
