import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LocationPoint, Driver } from '../types';

interface InteractiveMapProps {
  pickup?: LocationPoint | null;
  dropoff?: LocationPoint | null;
  driverLocation?: { lat: number; lng: number } | null;
  allDrivers?: Driver[];
  routeCoordinates?: [number, number][];
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  zoom?: number;
  center?: [number, number];
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
                                                                pickup,
                                                                dropoff,
                                                                driverLocation,
                                                                allDrivers = [],
                                                                routeCoordinates = [],
                                                                onMapClick,
                                                                className = 'h-full w-full',
                                                                zoom = 13,
                                                                center = [12.9716, 77.5946]
                                                              }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{
    pickup?: L.Marker;
    dropoff?: L.Marker;
    driver?: L.Marker;
    allDrivers: L.Marker[];
    routePolyline?: L.Polyline;
  }>({
    allDrivers: []
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: false,
        attributionControl: false
      });

      // ---------------- CHANGED: basemap tiles ----------------
      // CARTO now stamps "API KEY REQUIRED" on keyless tiles. Use a CARTO key from
      // VITE_CARTO_API_KEY if you have one, otherwise use keyless Esri dark-gray tiles.
      const cartoKey = import.meta.env.VITE_CARTO_API_KEY as string | undefined;
      if (cartoKey) {
        L.tileLayer(`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`, {
          maxZoom: 19,
          subdomains: 'abcd'
        }).addTo(map);
      } else {
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          maxNativeZoom: 16
        }).addTo(map);
      }
      // --------------------------------------------------------

      // Re-position zoom control to top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      if (onMapClick) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Custom icon factories
  const createPinIcon = (color: string, label: string) => {
    return L.divIcon({
      className: 'custom-pin-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="background: ${color}; color: black; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); white-space: nowrap; border: 1.5px solid white;">
            ${label}
          </div>
          <div style="width: 14px; height: 14px; background: ${color}; transform: rotate(45deg); margin-top: -7px; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4);"></div>
        </div>
      `,
      iconSize: [30, 42],
      iconAnchor: [15, 42]
    });
  };

  const createCarIcon = (isCurrentRide = false) => {
    const bg = isCurrentRide ? '#f59e0b' : '#38bdf8';
    return L.divIcon({
      className: 'custom-car-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          ${isCurrentRide ? '<div style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background: rgba(245, 158, 11, 0.35);" class="sos-pulse"></div>' : ''}
          <div style="width: 34px; height: 34px; background: #0f172a; border: 2px solid ${bg}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(0,0,0,0.6); z-index: 10;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${bg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <path d="M9 17h6"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  };

  // Sync Markers & Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Pickup marker
    if (pickup) {
      if (markersRef.current.pickup) {
        markersRef.current.pickup.setLatLng([pickup.lat, pickup.lng]);
      } else {
        markersRef.current.pickup = L.marker([pickup.lat, pickup.lng], {
          icon: createPinIcon('#10b981', 'Pickup')
        }).addTo(map);
      }
    } else if (markersRef.current.pickup) {
      markersRef.current.pickup.remove();
      delete markersRef.current.pickup;
    }

    // Dropoff marker
    if (dropoff) {
      if (markersRef.current.dropoff) {
        markersRef.current.dropoff.setLatLng([dropoff.lat, dropoff.lng]);
      } else {
        markersRef.current.dropoff = L.marker([dropoff.lat, dropoff.lng], {
          icon: createPinIcon('#ef4444', 'Drop-off')
        }).addTo(map);
      }
    } else if (markersRef.current.dropoff) {
      markersRef.current.dropoff.remove();
      delete markersRef.current.dropoff;
    }

    // Route Polyline
    if (routeCoordinates && routeCoordinates.length > 1) {
      if (markersRef.current.routePolyline) {
        markersRef.current.routePolyline.setLatLngs(routeCoordinates);
      } else {
        markersRef.current.routePolyline = L.polyline(routeCoordinates, {
          color: '#f59e0b',
          weight: 5,
          opacity: 0.9,
          dashArray: '8, 6',
          lineCap: 'round'
        }).addTo(map);
      }

      // Auto-fit bounds to route
      const bounds = L.latLngBounds(routeCoordinates);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    } else if (markersRef.current.routePolyline) {
      markersRef.current.routePolyline.remove();
      delete markersRef.current.routePolyline;
    }

    // Current Assigned Driver Marker
    if (driverLocation) {
      if (markersRef.current.driver) {
        markersRef.current.driver.setLatLng([driverLocation.lat, driverLocation.lng]);
      } else {
        markersRef.current.driver = L.marker([driverLocation.lat, driverLocation.lng], {
          icon: createCarIcon(true),
          zIndexOffset: 1000
        }).addTo(map);
      }
    } else if (markersRef.current.driver) {
      markersRef.current.driver.remove();
      delete markersRef.current.driver;
    }

    // Fleet Drivers markers (for Admin & Nearby preview)
    markersRef.current.allDrivers.forEach(m => m.remove());
    markersRef.current.allDrivers = [];

    if (allDrivers && allDrivers.length > 0 && !driverLocation) {
      allDrivers.forEach(drv => {
        if (!drv.isOnline) return;
        const m = L.marker([drv.currentLat, drv.currentLng], {
          icon: createCarIcon(false)
        }).addTo(map);
        m.bindPopup(`
          <div style="color: #0f172a; padding: 4px; font-size: 12px; font-family: sans-serif;">
            <strong>${drv.fullName}</strong><br/>
            ${drv.vehicleModel} (${drv.vehicleType})<br/>
            ⭐ ${drv.rating} (${drv.totalTrips} rides)
          </div>
        `);
        markersRef.current.allDrivers.push(m);
      });
    }
  }, [pickup, dropoff, driverLocation, allDrivers, routeCoordinates]);

  return (
      <div className={`relative overflow-hidden rounded-2xl border border-slate-800 shadow-2xl ${className}`}>
        <div ref={mapContainerRef} className="h-full w-full z-0" />

        {/* Map status overlay badge */}
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-xl bg-slate-900/90 backdrop-blur-md px-3 py-1.5 border border-slate-700/60 shadow-lg text-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
          <span className="font-medium text-slate-300">Live GPS & WebSocket Stream</span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-400 font-mono text-[11px]">Spring STOMP</span>
        </div>
      </div>
  );
};