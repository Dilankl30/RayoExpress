import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../CartContext';
import type { CartItem } from '../../../../shared/types';

const item1: CartItem = { id: 'p1', name: 'Whopper', price: 5.99, quantity: 1, emoji: '🍔', storeId: 's1', storeName: 'BK' };
const item2: CartItem = { id: 'p2', name: 'Papas', price: 2.99, quantity: 2, emoji: '🍟', storeId: 's1', storeName: 'BK' };

function renderCart() {
  return renderHook(() => useCart(), { wrapper: CartProvider });
}

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  });
});

describe('addToCart', () => {
  it('adds a new item', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(item1));
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].name).toBe('Whopper');
  });

  it('increments quantity when adding existing item', () => {
    const { result } = renderCart();
    act(() => { result.current.addToCart(item1); });
    act(() => { result.current.addToCart({ ...item1, quantity: 2 }); });
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(3);
  });
});

describe('removeFromCart', () => {
  it('removes item by id', () => {
    const { result } = renderCart();
    act(() => { result.current.addToCart(item1); result.current.addToCart(item2); });
    act(() => result.current.removeFromCart('p1'));
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].id).toBe('p2');
  });
});

describe('updateQuantity', () => {
  it('updates quantity for existing item', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(item1));
    act(() => result.current.updateQuantity('p1', 5));
    expect(result.current.cart[0].quantity).toBe(5);
  });

  it('removes item when quantity is 0', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(item1));
    act(() => result.current.updateQuantity('p1', 0));
    expect(result.current.cart).toHaveLength(0);
  });
});

describe('clearCart', () => {
  it('removes all items', () => {
    const { result } = renderCart();
    act(() => { result.current.addToCart(item1); result.current.addToCart(item2); });
    act(() => result.current.clearCart());
    expect(result.current.cart).toHaveLength(0);
    expect(result.current.cartCount).toBe(0);
    expect(result.current.cartTotal).toBe(0);
  });
});

describe('cartTotal', () => {
  it('calculates total for single item', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(item1));
    expect(result.current.cartTotal).toBe(5.99);
  });

  it('calculates total for multiple items', () => {
    const { result } = renderCart();
    act(() => { result.current.addToCart(item1); result.current.addToCart(item2); });
    expect(result.current.cartTotal).toBeCloseTo(11.97);
  });

  it('returns 0 for empty cart', () => {
    const { result } = renderCart();
    expect(result.current.cartTotal).toBe(0);
  });
});

describe('cartCount', () => {
  it('returns sum of quantities', () => {
    const { result } = renderCart();
    act(() => { result.current.addToCart(item1); result.current.addToCart(item2); });
    expect(result.current.cartCount).toBe(3);
  });

  it('returns 0 for empty cart', () => {
    const { result } = renderCart();
    expect(result.current.cartCount).toBe(0);
  });
});

describe('cartStore', () => {
  it('returns storeId from cart items', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(item1));
    expect(result.current.cartStore).toBe('s1');
  });

  it('returns null for empty cart', () => {
    const { result } = renderCart();
    expect(result.current.cartStore).toBeNull();
  });
});

describe('localStorage persistence', () => {
  it('saves cart to localStorage on change', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(item1));
    const saved = JSON.parse(localStorage.getItem('rayoexpress-cart')!);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe('p1');
  });
});

describe('useCart without provider', () => {
  it('throws outside CartProvider', () => {
    expect(() => renderHook(() => useCart())).toThrow('useCart must be used within CartProvider');
  });
});
