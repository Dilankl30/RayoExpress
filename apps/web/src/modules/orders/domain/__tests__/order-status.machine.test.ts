import { describe, it, expect } from 'vitest';
import { canTransition, getAvailableTransitions, getStepIndex, ORDER_FLOW, STATUS_LABELS } from '../order-status.machine';

describe('order-status.machine', () => {
  describe('canTransition', () => {
    it('allows customer to mark arrived as delivered', () => {
      expect(canTransition('arrived', 'delivered', 'customer')).toBe(true);
    });

    it('allows store to accept pending order', () => {
      expect(canTransition('pending', 'accepted', 'store')).toBe(true);
    });

    it('allows driver to mark on_the_way as arrived', () => {
      expect(canTransition('on_the_way', 'arrived', 'driver')).toBe(true);
    });

    it('rejects driver accepting pending order', () => {
      expect(canTransition('pending', 'accepted', 'driver')).toBe(false);
    });

    it('rejects customer cancelling preparing order', () => {
      expect(canTransition('preparing', 'cancelled', 'customer')).toBe(false);
    });

    it('allows admin any valid transition', () => {
      expect(canTransition('pending', 'cancelled', 'admin')).toBe(true);
      expect(canTransition('delivered', 'refunded', 'admin')).toBe(true);
      expect(canTransition('cancelled', 'refunded', 'admin')).toBe(true);
    });

    it('allows store to prepare accepted order', () => {
      expect(canTransition('accepted', 'preparing', 'store')).toBe(true);
    });

    it('rejects refunded transitions', () => {
      expect(canTransition('refunded', 'pending', 'admin')).toBe(false);
    });
  });

  describe('getAvailableTransitions', () => {
    it('returns available transitions for store on pending', () => {
      const transitions = getAvailableTransitions('pending', 'store');
      expect(transitions).toEqual(['accepted', 'cancelled']);
    });

    it('returns empty for refunded status', () => {
      const transitions = getAvailableTransitions('refunded', 'admin');
      expect(transitions).toEqual([]);
    });

    it('returns arrived transitions for customer (delivered)', () => {
      const transitions = getAvailableTransitions('arrived', 'customer');
      expect(transitions).toEqual(['delivered']);
    });

    it('returns refunded transitions for admin on delivered', () => {
      const transitions = getAvailableTransitions('delivered', 'admin');
      expect(transitions).toEqual(['refunded']);
    });
  });

  describe('getStepIndex', () => {
    it('returns 0 for pending', () => {
      expect(getStepIndex('pending')).toBe(0);
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

    it('returns -1 for refunded', () => {
      expect(getStepIndex('refunded')).toBe(-1);
    });
  });

  describe('ORDER_FLOW', () => {
    it('has correct length', () => {
      expect(ORDER_FLOW).toHaveLength(7);
    });

    it('starts with pending and ends with delivered', () => {
      expect(ORDER_FLOW[0]).toBe('pending');
      expect(ORDER_FLOW[ORDER_FLOW.length - 1]).toBe('delivered');
    });
  });

  describe('STATUS_LABELS', () => {
    it('has labels for all statuses', () => {
      const allStatuses = ['pending', 'accepted', 'preparing', 'picked_up', 'on_the_way', 'arrived', 'delivered', 'cancelled', 'refunded'];
      for (const s of allStatuses) {
        expect(STATUS_LABELS[s as keyof typeof STATUS_LABELS]).toBeDefined();
      }
    });
  });
});
