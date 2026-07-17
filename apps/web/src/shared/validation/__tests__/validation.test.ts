import { describe, it, expect } from 'vitest';
import { isSecurePassword, isValidEmail, isValidPhone, isPositiveNumber, validateOrderItem } from '../index';
import { validateOrderStatus, validatePaymentMethod, validateFile, validateOrderInput, validateProfileUpdate } from '../service-validators';

describe('validation/index', () => {
  describe('isSecurePassword', () => {
    it('accepts valid password', () => {
      expect(isSecurePassword('Abcd1!ef')).toBe(true);
    });

    it('requires 8+ chars', () => {
      expect(isSecurePassword('Ab1!abcd')).toBe(true);
      expect(isSecurePassword('Ab1!abc')).toBe(false);
    });

    it('requires uppercase', () => {
      expect(isSecurePassword('abcdef1!g')).toBe(false);
    });

    it('requires lowercase', () => {
      expect(isSecurePassword('ABCDEF1!G')).toBe(false);
    });

    it('requires digit', () => {
      expect(isSecurePassword('Abcdefg!h')).toBe(false);
    });

    it('requires special char', () => {
      expect(isSecurePassword('Abcdefg1h')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('accepts valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test@test.co')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('accepts valid phone numbers', () => {
      expect(isValidPhone('+593987654321')).toBe(true);
      expect(isValidPhone('0998765432')).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      expect(isValidPhone('abc')).toBe(false);
      expect(isValidPhone('12')).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    it('accepts positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true);
      expect(isPositiveNumber(0.01)).toBe(true);
    });

    it('rejects zero and negative', () => {
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-1)).toBe(false);
    });
  });

  describe('validateOrderItem', () => {
    it('returns null for valid input', () => {
      expect(validateOrderItem(5.99, 2)).toBeNull();
    });

    it('rejects invalid price', () => {
      expect(validateOrderItem(0, 1)).toBe('Precio inválido');
    });

    it('rejects excessive quantity', () => {
      expect(validateOrderItem(5, 101)).toBe('Cantidad máxima excedida');
    });
  });
});

describe('validation/service-validators', () => {
  describe('validateOrderStatus', () => {
    it('accepts valid statuses', () => {
      expect(validateOrderStatus('pending')).toBe(true);
      expect(validateOrderStatus('delivered')).toBe(true);
      expect(validateOrderStatus('cancelled')).toBe(true);
    });

    it('rejects invalid status', () => {
      expect(validateOrderStatus('invalid')).toBe(false);
      expect(validateOrderStatus('')).toBe(false);
    });
  });

  describe('validatePaymentMethod', () => {
    it('accepts valid methods', () => {
      expect(validatePaymentMethod('cash')).toBe(true);
      expect(validatePaymentMethod('transfer')).toBe(true);
      expect(validatePaymentMethod('card')).toBe(false);
    });

    it('rejects invalid method', () => {
      expect(validatePaymentMethod('bitcoin')).toBe(false);
    });
  });

  describe('validateFile', () => {
    it('accepts valid file', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });
      expect(validateFile(file)).toBeNull();
    });

    it('rejects oversized file', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
      expect(validateFile(file)).toContain('5MB');
    });

    it('rejects invalid type', () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      Object.defineProperty(file, 'size', { value: 1000 });
      expect(validateFile(file)).toBe('Formato no permitido. Usa JPG, PNG, WebP o PDF');
    });
  });

  describe('validateOrderInput', () => {
    it('returns null for valid input', () => {
      expect(validateOrderInput({
        storeId: 'store-1',
        deliveryAddress: 'Calle 123',
        paymentMethod: 'cash',
        productIds: ['prod-1'],
        quantities: [2],
      })).toBeNull();
    });

    it('rejects missing storeId', () => {
      expect(validateOrderInput({
        storeId: '',
        deliveryAddress: 'Calle 123',
        paymentMethod: 'cash',
        productIds: ['prod-1'],
        quantities: [1],
      })).toBe('ID de tienda requerido');
    });

    it('rejects empty product list', () => {
      expect(validateOrderInput({
        storeId: 'store-1',
        deliveryAddress: 'Calle 123',
        paymentMethod: 'cash',
        productIds: [],
        quantities: [],
      })).toBe('Debe incluir al menos un producto');
    });
  });

  describe('validateProfileUpdate', () => {
    it('returns null for valid data', () => {
      expect(validateProfileUpdate({ full_name: 'Juan Pérez', phone: '+593987654321' })).toBeNull();
    });

    it('rejects short name', () => {
      expect(validateProfileUpdate({ full_name: 'A' })).toBe('Nombre debe tener al menos 2 caracteres');
    });
  });
});
