import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, recordAttempt, resetAttempts } from '../rate-limiter';

describe('rate-limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAttempts('test-key');
    resetAttempts('other-key');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for first attempt', () => {
    expect(checkRateLimit('test-key', 5, 60000)).toBe(true);
  });

  it('blocks after max attempts', () => {
    for (let i = 0; i < 5; i++) {
      recordAttempt('test-key');
    }
    expect(checkRateLimit('test-key', 5, 60000)).toBe(false);
  });

  it('resetAttempts clears the counter', () => {
    for (let i = 0; i < 5; i++) {
      recordAttempt('test-key');
    }
    expect(checkRateLimit('test-key', 5, 60000)).toBe(false);

    resetAttempts('test-key');
    expect(checkRateLimit('test-key', 5, 60000)).toBe(true);
  });

  it('window expires after the time period', async () => {
    for (let i = 0; i < 5; i++) {
      recordAttempt('test-key');
    }
    expect(checkRateLimit('test-key', 5, 60000)).toBe(false);

    await vi.advanceTimersByTimeAsync(60001);

    expect(checkRateLimit('test-key', 5, 60000)).toBe(true);
  });
});
