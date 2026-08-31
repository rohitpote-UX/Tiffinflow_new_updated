/**
 * RealtimeService — Real-time event pub/sub bus for BiteBuddy 2.0
 * 
 * Supports:
 * 1. Server-Sent Events (SSE) real-time synchronization
 * 2. Multi-tenant office event isolation
 * 3. Typed event payload contract
 * 4. Reliable event delivery after database commit
 */

export type RealtimeEventType =
  | 'PRICE_UPDATED'
  | 'CUTOFF_UPDATED'
  | 'HOLIDAY_UPDATED'
  | 'WORKING_DAYS_UPDATED'
  | 'ORDER_FINALIZED'
  | 'MEAL_CANCELLED'
  | 'MEAL_UPDATED'
  | 'MEMBER_ROLE_CHANGED'
  | 'ANNOUNCEMENT';

export interface RealtimeEvent<T = any> {
  type: RealtimeEventType;
  officeId: string;
  payload: T;
  timestamp: string;
}

type EventListener = (event: RealtimeEvent) => void;

class RealtimeEventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();

  /**
   * Subscribe an active client stream to an office's events
   */
  public subscribe(officeId: string, listener: EventListener): () => void {
    if (!this.listeners.has(officeId)) {
      this.listeners.set(officeId, new Set());
    }
    this.listeners.get(officeId)!.add(listener);

    return () => {
      const officeListeners = this.listeners.get(officeId);
      if (officeListeners) {
        officeListeners.delete(listener);
        if (officeListeners.size === 0) {
          this.listeners.delete(officeId);
        }
      }
    };
  }

  /**
   * Broadcast a typed event to all connected office clients
   */
  public broadcast<T = any>(officeId: string, type: RealtimeEventType, payload: T): void {
    const event: RealtimeEvent<T> = {
      type,
      officeId,
      payload,
      timestamp: new Date().toISOString(),
    };

    const officeListeners = this.listeners.get(officeId);
    if (officeListeners && officeListeners.size > 0) {
      for (const listener of officeListeners) {
        try {
          listener(event);
        } catch (e) {
          console.warn('Realtime event listener error:', e);
        }
      }
    }
  }

  /**
   * Get active connection count for an office
   */
  public getActiveClientCount(officeId: string): number {
    return this.listeners.get(officeId)?.size || 0;
  }
}

// Global singleton instance across Next.js API route invocations
const globalRealtimeKey = Symbol.for('bitebuddy.realtime');
const globalObject = global as unknown as Record<symbol, RealtimeEventBus>;

if (!globalObject[globalRealtimeKey]) {
  globalObject[globalRealtimeKey] = new RealtimeEventBus();
}

export const realtimeBus: RealtimeEventBus = globalObject[globalRealtimeKey];
