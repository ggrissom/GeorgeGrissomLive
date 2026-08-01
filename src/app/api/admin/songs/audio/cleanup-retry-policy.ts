const LEASE_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const MAX_BACKOFF_MS = 24 * 60 * 60 * 1000;

export function cleanupLeaseUntil(now: Date): Date {
  return new Date(now.getTime() + LEASE_MS);
}

export function cleanupRetryState(
  attempts: number,
  now: Date,
): { nextAttemptAt: Date; terminalAt: Date | null } {
  if (attempts >= MAX_ATTEMPTS) {
    return { nextAttemptAt: now, terminalAt: now };
  }
  const delay = Math.min(
    60_000 * 2 ** Math.max(0, attempts - 1),
    MAX_BACKOFF_MS,
  );
  return {
    nextAttemptAt: new Date(now.getTime() + delay),
    terminalAt: null,
  };
}
