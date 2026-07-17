import type { Address, FavoriteItem, Promotion, Role, UserProfile, Database } from '../types';

export const isMockMode = import.meta.env.VITE_MOCK_MODE === 'true';

export const mockCredentials: Record<string, { password: string; role: Role; name: string }> = {
  'customer@rayo.com': { password: 'customer123', role: 'customer', name: 'Cliente Demo' },
  'driver@rayo.com': { password: 'driver123', role: 'driver', name: 'Repartidor Demo' },
  'store@rayo.com': { password: 'store123', role: 'store', name: 'Tienda Demo' },
  'admin@rayo.com': { password: 'admin123', role: 'admin', name: 'Admin Rayo' },
};

export const mockUser = (email: string) => {
  const credential = mockCredentials[email];
  if (!credential) return null;

  return {
    id: `mock-${credential.role}`,
    email,
    full_name: credential.name,
    role: credential.role,
    phone: null,
    avatar_url: null,
    is_suspended: false,
  } satisfies UserProfile & { email: string };
};

export const mockStores = [
  {
    id: 'store-1',
    owner_id: 'mock-store',
    name: 'Rayo Demo Market',
    emoji: '🏬',
    cover_color: '#4514D8',
    is_open: true,
    min_order: 3.99,
    delivery_fee: 0,
    description: 'Tienda de ejemplo para desarrollo local.',
    coverage_area: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  },
];

export const mockCategories = [
  {
    id: 'cat-1',
    name: 'Ejemplo',
    emoji: '✨',
    bg_color: '#F4F0FF',
    created_at: '2026-01-01',
  },
];

type MockProduct = Database['public']['Tables']['products']['Row'];
type MockOrderStatus = 'pending' | 'accepted' | 'preparing' | 'picked_up' | 'on_the_way' | 'arrived' | 'delivered' | 'cancelled' | 'refunded';
type MockOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};
type MockOrder = {
  id: string;
  customer_id: string;
  store_id: string;
  driver_id: string | null;
  status: MockOrderStatus;
  payment_method: 'cash' | 'transfer' | 'card';
  subtotal: number;
  delivery_fee: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  delivery_address: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items: MockOrderItem[];
  store: { name: string; emoji: string };
  customer: { full_name: string | null };
};
type CreateMockOrderParams = {
  storeId: string;
  productIds: string[];
  quantities: number[];
  paymentMethod: 'cash' | 'transfer' | 'card';
  deliveryAddress: string;
  couponCode?: string;
  tip?: number;
  notes?: string;
};

export const mockProducts: Record<string, MockProduct[]> = {
  'store-1': [
    {
      id: 'prod-1',
      store_id: 'store-1',
      category_id: 'cat-1',
      name: 'Producto demo',
      description: 'Producto de fallback para pruebas locales.',
      price: 2.15,
      emoji: 'P',
      image_url: null,
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ],
};

export function getMockProductsByStore(storeId: string) {
  return mockProducts[storeId] || [];
}

export function getMockProductsByCategory(categoryId: string) {
  return Object.values(mockProducts).flat().filter((product) => product.category_id === categoryId);
}

export const mockOrders: Record<string, MockOrder[]> = {};

export function createMockOrder(params: CreateMockOrderParams, userId: string) {
  const allProducts = Object.values(mockProducts).flat();
  const subtotal = params.productIds.reduce((sum: number, productId: string, index: number) => {
    const product = allProducts.find((item) => item.id === productId);
    return sum + (product ? product.price * (params.quantities[index] || 1) : 0);
  }, 0);
  const deliveryFee = 0;
  const discount = params.couponCode === 'RAYO15' ? Math.min(subtotal * 0.15, 5) : 0;
  const tax = (subtotal - discount) * 0.12;
  const tip = params.tip || 0;
  const total = subtotal + deliveryFee - discount + tax + tip;
  const orderId = `order-${Date.now()}`;

  const order: MockOrder = {
    id: orderId,
    customer_id: userId,
    store_id: params.storeId,
    driver_id: null,
    status: 'pending',
    payment_method: params.paymentMethod,
    subtotal: Math.round(subtotal * 100) / 100,
    delivery_fee: deliveryFee,
    discount: Math.round(discount * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    tip,
    total: Math.round(total * 100) / 100,
    delivery_address: params.deliveryAddress,
    notes: params.notes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    order_items: params.productIds.map((productId: string, index: number) => {
      const product = allProducts.find((item) => item.id === productId);
      return {
        id: `item-${Date.now()}-${index}`,
        order_id: orderId,
        product_id: productId,
        product_name: product?.name || 'Producto',
        quantity: params.quantities[index] || 1,
        unit_price: product?.price || 0,
      };
    }),
    store: { name: 'Rayo Demo Market', emoji: '🏬' },
    customer: { full_name: 'Cliente Demo' },
  };

  if (!mockOrders[userId]) mockOrders[userId] = [];
  mockOrders[userId].unshift(order);
  return order;
}

export function getMockOrders(userId: string) {
  return mockOrders[userId] || [];
}

export function getAllMockOrders() {
  return Object.values(mockOrders).flat();
}

export function getMockOrdersByStore(storeId: string) {
  return getAllMockOrders().filter((order) => order.store_id === storeId);
}

export function getMockOrdersByDriver(driverId: string) {
  return getAllMockOrders().filter((order) => order.driver_id === driverId);
}

export function assignDriverToMockOrder(orderId: string, driverId: string) {
  for (const userId of Object.keys(mockOrders)) {
    mockOrders[userId] = mockOrders[userId].map((order) =>
      order.id === orderId ? { ...order, driver_id: driverId } : order,
    );
  }
}

export const mockPromotions: Promotion[] = [
  {
    id: 'promo-1',
    title: 'Promo demo',
    description: 'Promocion de fallback para desarrollo local.',
    type: 'coupon',
    discount: '10% OFF',
    code: 'RAYO10',
    store_id: 'store-1',
    store_name: 'Rayo Demo Market',
    store_emoji: '🏬',
    bg_color: '#4514D8',
    text_color: '#FFFFFF',
    emoji: '%',
    expires_at: '2026-12-31',
    is_active: true,
    created_at: '2026-01-01',
  },
];

export function getMockPromotions() {
  return mockPromotions;
}

export function getMockPromotionsByType(type: string) {
  if (type === 'all') return mockPromotions;
  return mockPromotions.filter((promotion) => promotion.type === type);
}

export const mockAddresses: Record<string, Address[]> = {
  'mock-customer': [
    {
      id: 'addr-1',
      title: 'Direccion demo',
      line1: 'Av. Amazonas, Quito',
      details: 'Referencia de ejemplo',
      is_default: true,
    },
  ],
};

export function getMockAddresses(userId: string) {
  return mockAddresses[userId] || [];
}

export function addMockAddress(userId: string, address: Omit<Address, 'id'>) {
  if (!mockAddresses[userId]) mockAddresses[userId] = [];
  if (address.is_default) {
    mockAddresses[userId] = mockAddresses[userId].map((item) => ({ ...item, is_default: false }));
  }
  mockAddresses[userId].push({ id: `addr-${Date.now()}`, ...address });
  return mockAddresses[userId];
}

export function updateMockAddress(userId: string, addressId: string, updates: Partial<Address>) {
  if (!mockAddresses[userId]) return [];
  mockAddresses[userId] = mockAddresses[userId].map((address) =>
    address.id === addressId ? { ...address, ...updates } : address,
  );
  return mockAddresses[userId];
}

export function deleteMockAddress(userId: string, addressId: string) {
  if (!mockAddresses[userId]) return [];
  mockAddresses[userId] = mockAddresses[userId].filter((address) => address.id !== addressId);
  return mockAddresses[userId];
}

export function setDefaultMockAddress(userId: string, addressId: string) {
  if (!mockAddresses[userId]) return [];
  mockAddresses[userId] = mockAddresses[userId].map((address) => ({
    ...address,
    is_default: address.id === addressId,
  }));
  return mockAddresses[userId];
}

export const mockFavorites: Record<string, FavoriteItem[]> = {
  'mock-customer': [
    {
      id: 'store-1',
      kind: 'store',
      name: 'Rayo Demo Market',
      subtitle: 'Tienda de ejemplo',
      emoji: '🏬',
    },
  ],
};

export function getMockFavorites(userId: string) {
  return mockFavorites[userId] || [];
}

export function toggleMockFavorite(userId: string, item: FavoriteItem) {
  if (!mockFavorites[userId]) mockFavorites[userId] = [];
  const exists = mockFavorites[userId].some((favorite) => favorite.id === item.id && favorite.kind === item.kind);
  if (exists) {
    mockFavorites[userId] = mockFavorites[userId].filter(
      (favorite) => !(favorite.id === item.id && favorite.kind === item.kind),
    );
  } else {
    mockFavorites[userId].push(item);
  }
  return mockFavorites[userId];
}

export function isMockFavorite(userId: string, id: string, kind: string) {
  return (mockFavorites[userId] || []).some((favorite) => favorite.id === id && favorite.kind === kind);
}

export type MockNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  data?: Record<string, unknown> | null;
};

export const mockNotifications: Record<string, MockNotification[]> = {
  'mock-customer': [
    {
      id: 'notif-1',
      user_id: 'mock-customer',
      title: 'Notificación demo',
      body: 'Este es el único ejemplo local.',
      read_at: null,
      created_at: new Date().toISOString(),
    },
  ],
  'mock-driver': [],
  'mock-store': [],
  'mock-admin': [],
};
