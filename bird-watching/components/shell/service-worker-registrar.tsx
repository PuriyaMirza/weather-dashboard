'use client';

import { useEffect } from 'react';

/**
 * Registers public/sw.js so the guide and log open offline. Production only: in dev, a worker
 * serving cached chunks would fight hot reload.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    // updateViaCache 'none': always revalidate sw.js itself, so a fixed worker reaches phones on
    // their next visit instead of after the HTTP cache expires.
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
      // Not fatal: the app works online without a worker.
    });
  }, []);
  return null;
}
