'use client';

// Tiny cross-component signal so the sidebar's pending-registration
// badge (AdminLayout/SalesLayout) can refresh the instant something
// actually changes — submitted, marked done, or cancelled — instead of
// only on navigation. A plain DOM CustomEvent is the simplest way to
// reach across the layout/page boundary here without introducing a
// React context just for one counter.
const EVENT_NAME = 'bhuwanta:registrations-changed';

export function notifyRegistrationsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

export function onRegistrationsChanged(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}
