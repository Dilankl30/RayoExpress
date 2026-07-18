import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { CartItem } from '../../../shared/types';
import { useAuth } from '../../auth/context/AuthContext';

const STORAGE_KEY = 'rayoexpress-cart';

function getStorageKey(userId: string | null): string {
  return userId ? `${STORAGE_KEY}:${userId}` : `${STORAGE_KEY}:guest`;
}

function loadCart(storageKey: string): CartItem[] {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCart(storageKey: string, cart: CartItem[]) {
  try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch { /* noop */ }
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  cartStore: string | null;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = getStorageKey(user?.id ?? null);
  const [cart, setCart] = useState<CartItem[]>(() => loadCart(storageKey));

  useEffect(() => { setCart(loadCart(storageKey)); }, [storageKey]);
  useEffect(() => { saveCart(storageKey, cart); }, [storageKey, cart]);

  useEffect(() => {
    const handleClear = () => setCart([]);
    window.addEventListener('cart:clear', handleClear);
    return () => window.removeEventListener('cart:clear', handleClear);
  }, []);

  const cartCount = cart.reduce((a, b) => a + b.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartStore = cart.length > 0 ? (cart[0].storeId || null) : null;

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const normalizedItem = { ...item, quantity: item.quantity || 1 };
      const currentStoreId = prev[0]?.storeId;
      if (currentStoreId && normalizedItem.storeId && currentStoreId !== normalizedItem.storeId) {
        return [normalizedItem];
      }

      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, normalizedItem];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return (
    <CartContext.Provider value={{ cart, cartCount, cartTotal, cartStore, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
