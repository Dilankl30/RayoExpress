import { describe, it, expect } from 'vitest';
import { canTransition, getAvailableTransitions, getStepIndex, ORDER_FLOW, STATUS_LABELS } from '../order-status.machine';

describe('order-status.machine', () => {
  describe('canTransition', () => {
    it('allows customer to mark arrived as delivered', () => {
      expect(canTransition('arrived', 'delivered', 'customer')).toBe(true);
    });

    it(' allows admin to confirm order', () => {
      expect(canTransition('confirmed', 'preparing', 'admin')).toBe(true);
    });

    it(' allows driver to mark on_the_way as arrived', () => {
      expect(canTransition('on_the_way', 'arrived', 'driver')).toBe(true);
    });

    it('rejects driver confirming pending order', () => {
      expect(canTransition('confirmed', 'preparing', 'driver')).toBe(false);
    });

    it('rejects customer cancelling preparing order', () => {
      expect(canTransition('preparing', 'cancelled', 'customer')).toBe(false);
    });

    it('allows admin any valid transition', () => {
      expect(canTransition('confirmed', 'preparing', 'admin')).toBe(true);
      expect(canTransition('delivered', 'cancelled', 'admin')).toBe(false);
    });

    it('allows store to prepare order', () => {
      expect(canTransition('confirmed', 'preparing', 'store')).toBe(true);
    });
  });

  describe('getAvailableTransitions', () => {
    it('returns available transitions for store on confirmed', () => {
      const transitions = getAvailableTransitions('confirmed', 'store');
      expect(transitions).toEqual(['preparing', 'cancelled']);
    });

    it('returns empty for cancelled status', () => {
      const transitions = getAvailableTransitions('cancelled', 'admin');
      expect(transitions).toEqual([]);
    });

    it('returns arrived transitions for customer', () => {
      const transitions = getAvailableTransitions('arrived', 'customer');
      expect(transitions).toEqual(['delivered']);
    });

    it('returns empty for admin on delivered', () => {
      const transitions = getAvailableTransitions('delivered', 'admin');
      expect(transitions).toEqual([]);
    });
  });

  describe('getStepIndex', () => {
    it('returns 0 for confirmed', () => {
      expect(getStepIndex('confirmed')).toBe(0);
    });

    it('returns 3 for picked_up', () => {
      expect(getStepIndex('picked_up')).toBe(3);
    });

    it('returns 6 for delivered', () => {
      expect(getStepIndex('delivered')).toBe(6);
    });

    it('returns -1 for cancelled', () => {
      expect(getStepIndex('cancelled')).toBe(-1);
    });
  });

  describe('ORDER_FLOW', () => {
    it('has correct length', () => {
      expect(ORDER_FLOW).toHaveLength(7);
    });

    it('starts with confirmed and ends with delivered', () => {
      expect(ORDER_FLOW[0]).toBe('confirmed');
      expect(ORDER_FLOW[ORDER_FLOW.length - 1]).toBe('delivered');
    });
  });

  describe('STATUS_LABELS', () => {
    it('has labels for all statuses', () => {
      const allStatuses = ['confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way', 'arrived', 'delivered', 'cancelled'];
      for (const s of allStatuses) {
        expect(STATUS_LABELS[s as keyof typeof STATUS_LABELS]).toBeDefined();
      }
    });
  });
});
