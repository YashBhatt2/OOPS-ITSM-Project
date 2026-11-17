import { Priority } from '@/lib/constants';

export interface DevNotificationPayload {
  id: string;
  incidentId?: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  emailDelivered?: boolean;
  priority?: Priority;
  slaStatus?: string;
}

export type IslandDevAction =
  | {
      type: 'FIRE_NOTIFICATION';
      notification: DevNotificationPayload;
    }
  | {
      type: 'FIRE_BURST';
      notifications: DevNotificationPayload[];
    }
  | {
      type: 'SET_EMPTY';
    }
  | {
      type: 'SET_ERROR';
      error: string | null;
    }
  | {
      type: 'RESET';
    };

const EVENT_NAME = 'oops-island-dev-action';

export function emitIslandDevAction(action: IslandDevAction) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: action }));
  }
}

export function subscribeIslandDevAction(callback: (action: IslandDevAction) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<IslandDevAction>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
