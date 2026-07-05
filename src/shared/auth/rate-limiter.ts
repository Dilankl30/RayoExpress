const store = new Map<string, { attempts: number; timestamp: number; windowMs: number }>();

const CLEANUP_INTERVAL = 60_000;

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { attempts: 0, timestamp: now, windowMs });
    return true;
  }

  if (now - entry.timestamp >= windowMs) {
    store.set(key, { attempts: 0, timestamp: now, windowMs });
    return true;
  }

  return entry.attempts < maxAttempts;
}

export function recordAttempt(key: string): void {
  const entry = store.get(key);
  if (entry) {
    entry.attempts++;
  } else {
    store.set(key, { attempts: 1, timestamp: Date.now(), windowMs: 900000 });
  }
}

export function resetAttempts(key: string): void {
  store.delete(key);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.timestamp >= entry.windowMs) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL);
