import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatPhone } from '../formatters';

describe('formatCurrency', () => {
  it('formats a positive amount', () => {
    expect(formatCurrency(5.99)).toBe('$5.99');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats a large amount', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });
});

describe('formatDate', () => {
  it('formats a Date object', () => {
    const result = formatDate(new Date('2025-06-15T12:00:00'));
    expect(result).toContain('2025');
  });

  it('formats an ISO string', () => {
    const result = formatDate('2025-06-15T12:00:00', { dateStyle: 'short' });
    expect(result).toMatch(/6\/15\/25|15\/6\/25/);
  });

  it('uses custom options', () => {
    const result = formatDate(new Date('2025-06-15'), { month: 'long', year: 'numeric' });
    expect(result.toLowerCase()).toContain('junio');
    expect(result).toContain('2025');
  });
});

describe('formatPhone', () => {
  it('formats a 10-digit Ecuadorian number', () => {
    expect(formatPhone('0999999999')).toBe('+593 099 999 9999');
  });

  it('formats a number with existing plus prefix', () => {
    expect(formatPhone('+593999999999')).toBe('+593 999 999 999');
  });

  it('formats a number with dashes', () => {
    expect(formatPhone('099-999-9999')).toBe('+593 099 999 9999');
  });

  it('returns original string for short numbers', () => {
    expect(formatPhone('123')).toBe('123');
  });
});
