import { Client } from '@stomp/stompjs';
import { API_BASE, tokenStore } from './http';

/** Shapes pushed by the Spring WebSocket server (see NotificationService / LiveController). */
export interface RideEventMessage { type: string; ride: any }
export interface LocationMessage { rideId: number; lat: number; lng: number; at: string }
export interface SosMessage { rideId: number | null; userId: number; userEmail: string; message: string | null; at: string }

export interface RealtimeHandlers {
  onRideEvent?: (e: RideEventMessage) => void;
  onLocation?: (l: LocationMessage) => void;
  onSos?: (s: SosMessage) => void;
  onConnectionChange?: (connected: boolean) => void;
}

let client: Client | null = null;

/** Opens the STOMP connection with the JWT in the CONNECT headers. Returns a function that closes it. */
export function connectRealtime(handlers: RealtimeHandlers, isAdmin: boolean): () => void {
  const token = tokenStore.get();
  if (!token) return () => {};

  const c = new Client({
    brokerURL: API_BASE.replace(/^http/, 'ws') + '/ws',
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 4000,
    onConnect: () => {
      handlers.onConnectionChange?.(true);
      c.subscribe('/user/queue/rides', m => handlers.onRideEvent?.(JSON.parse(m.body)));
      c.subscribe('/user/queue/location', m => handlers.onLocation?.(JSON.parse(m.body)));
      if (isAdmin) c.subscribe('/topic/admin.sos', m => handlers.onSos?.(JSON.parse(m.body)));
    },
    onWebSocketClose: () => handlers.onConnectionChange?.(false),
  });
  c.activate();
  client = c;

  return () => {
    handlers.onConnectionChange?.(false);
    void c.deactivate();
    if (client === c) client = null;
  };
}

export function realtimeConnected(): boolean {
  return !!client && client.connected;
}

export function publish(destination: string, body: unknown): boolean {
  if (client && client.connected) {
    client.publish({ destination, body: JSON.stringify(body) });
    return true;
  }
  return false;
}
