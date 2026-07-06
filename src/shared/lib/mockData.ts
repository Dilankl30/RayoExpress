import type { Role } from '../types';

export const isMockMode = import.meta.env.VITE_MOCK_MODE === 'true';

export const mockCredentials: Record<string, { password: string; role: Role; name: string }> = {
  'customer@rayo.com':  { password: 'customer123', role: 'customer', name: 'María García' },
  'driver@rayo.com':    { password: 'driver123',   role: 'driver',   name: 'Carlos Andrés M.' },
  'store@rayo.com':     { password: 'store123',    role: 'store',    name: 'Burger King' },
  'admin@rayo.com':     { password: 'admin123',    role: 'admin',    name: 'Admin Rayo' },
};

export const mockUser = (email: string) => {
  const c = mockCredentials[email];
  if (!c) return null;
  return {
    id: `mock-${c.role}`,
    email,
    full_name: c.name,
    role: c.role,
    phone: null,
    avatar_url: null,
    is_suspended: false,
  };
};

export const mockStores = [
  { id: 'store-1', owner_id: 'mock-store', name: 'Burger King', emoji: '👑', cover_color: '#FF6B35', is_open: true, min_order: 5, delivery_fee: 0, description: 'Las mejores whoppers de la ciudad', coverage_area: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'store-2', owner_id: 'mock-store', name: 'McDonald\'s', emoji: '🍔', cover_color: '#DA291C', is_open: true, min_order: 4, delivery_fee: 1.5, description: 'Happy Meals y McFlurrys', coverage_area: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'store-3', owner_id: 'mock-store', name: 'KFC', emoji: '🍗', cover_color: '#E4002B', is_open: true, min_order: 5, delivery_fee: 1.0, description: 'El pollo frito más crujiente', coverage_area: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'store-4', owner_id: 'mock-store', name: 'Pizza Hut', emoji: '🍕', cover_color: '#FF8C00', is_open: true, min_order: 6, delivery_fee: 0, description: 'Pizzas familiares con borde de queso', coverage_area: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'store-5', owner_id: 'mock-store', name: 'Subway', emoji: '🥪', cover_color: '#009B3A', is_open: true, min_order: 3, delivery_fee: 0.5, description: 'Sándwiches frescos al momento', coverage_area: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'store-6', owner_id: 'mock-store', name: 'Dunkin\'', emoji: '🍩', cover_color: '#FF6E7F', is_open: true, min_order: 2, delivery_fee: 0, description: 'Donas y café para empezar el día', coverage_area: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'store-7', owner_id: 'mock-store', name: 'Farmacia Cruz Verde', emoji: '💊', cover_color: '#059669', is_open: true, min_order: 1, delivery_fee: 2.0, description: 'Medicamentos y cuidado personal 24h', coverage_area: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'store-8', owner_id: 'mock-store', name: 'Supermercado Más', emoji: '🛒', cover_color: '#2563EB', is_open: true, min_order: 10, delivery_fee: 0, description: 'Tu supermercado de confianza', coverage_area: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'store-9', owner_id: 'mock-store', name: 'Taco Bell', emoji: '🌮', cover_color: '#702082', is_open: false, min_order: 4, delivery_fee: 1.5, description: 'Tacos y burritos mexicanos', coverage_area: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'store-10', owner_id: 'mock-store', name: 'Starbucks', emoji: '☕', cover_color: '#00704A', is_open: true, min_order: 3, delivery_fee: 0, description: 'El mejor café de especialidad', coverage_area: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
];

export const mockCategories = [
  { id: 'cat-1', name: 'Hamburguesas', emoji: '🍔', bg_color: '#FEF3C7', created_at: '2025-01-01' },
  { id: 'cat-2', name: 'Pizzas', emoji: '🍕', bg_color: '#FEE2E2', created_at: '2025-01-01' },
  { id: 'cat-3', name: 'Pollo', emoji: '🍗', bg_color: '#FFEDD5', created_at: '2025-01-01' },
  { id: 'cat-4', name: 'Mexicano', emoji: '🌮', bg_color: '#F3E8FF', created_at: '2025-01-01' },
  { id: 'cat-5', name: 'Café', emoji: '☕', bg_color: '#ECFDF5', created_at: '2025-01-01' },
  { id: 'cat-6', name: 'Sushi', emoji: '🍱', bg_color: '#FCE7F3', created_at: '2025-01-01' },
  { id: 'cat-7', name: 'Helados', emoji: '🍦', bg_color: '#E0F2FE', created_at: '2025-01-01' },
  { id: 'cat-8', name: 'Farmacia', emoji: '💊', bg_color: '#D1FAE5', created_at: '2025-01-01' },
];

export const mockProducts: Record<string, any[]> = {
  'store-1': [
    { id: 'prod-1', store_id: 'store-1', category_id: 'cat-1', name: 'Whopper', description: 'Carne a la parrilla con vegetales frescos', price: 5.99, emoji: '🍔', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-2', store_id: 'store-1', category_id: 'cat-1', name: 'Doble Whopper', description: 'Doble carne con queso derretido', price: 7.99, emoji: '🧀', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-3', store_id: 'store-1', category_id: 'cat-1', name: 'Papas Grandes', description: 'Papas crujientes doradas', price: 2.99, emoji: '🍟', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-4', store_id: 'store-1', category_id: 'cat-1', name: 'Onion Rings', description: 'Aros de cebolla empanizados', price: 3.49, emoji: '🧅', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-5', store_id: 'store-1', category_id: 'cat-1', name: 'Coca-Cola 500ml', description: 'Refrescante cola bien fría', price: 1.99, emoji: '🥤', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-6', store_id: 'store-1', category_id: 'cat-1', name: 'Combo Whopper', description: 'Whopper + Papas + Bebida', price: 8.99, emoji: '🍱', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
  ],
  'store-2': [
    { id: 'prod-7', store_id: 'store-2', category_id: 'cat-1', name: 'Big Mac', description: 'Dos carnes con salsa especial', price: 6.49, emoji: '🍔', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-8', store_id: 'store-2', category_id: 'cat-1', name: 'Cuarto de Libra', description: 'Carne 100% de res', price: 5.49, emoji: '🥩', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-9', store_id: 'store-2', category_id: 'cat-1', name: 'McNuggets 10', description: '10 piezas de pollo', price: 5.99, emoji: '🍗', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-10', store_id: 'store-2', category_id: 'cat-1', name: 'McFlurry Oreo', description: 'Helado suave con trozos de Oreo', price: 3.99, emoji: '🍦', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
  ],
  'store-4': [
    { id: 'prod-11', store_id: 'store-4', category_id: 'cat-2', name: 'Pizza Personal', description: 'Pizza individual de pepperoni', price: 7.99, emoji: '🍕', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-12', store_id: 'store-4', category_id: 'cat-2', name: 'Pizza Familiar', description: 'Pizza grande de 4 quesos', price: 12.99, emoji: '🧀', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-13', store_id: 'store-4', category_id: 'cat-2', name: 'Alitas BBQ', description: '6 alitas con salsa BBQ', price: 6.99, emoji: '🍖', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-14', store_id: 'store-4', category_id: 'cat-2', name: 'Cheesy Bread', description: 'Pan con queso derretido', price: 4.49, emoji: '🧈', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
  ],
  'store-3': [
    { id: 'prod-15', store_id: 'store-3', category_id: 'cat-3', name: 'Bucket 6 piezas', description: '6 piezas de pollo frito', price: 8.99, emoji: '🍗', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-16', store_id: 'store-3', category_id: 'cat-3', name: 'Bucket 12 piezas', description: '12 piezas de pollo frito', price: 14.99, emoji: '🐔', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-17', store_id: 'store-3', category_id: 'cat-3', name: 'Puré de Papas', description: 'Puré cremoso con gravy', price: 2.99, emoji: '🥔', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-18', store_id: 'store-3', category_id: 'cat-3', name: 'Coleslaw', description: 'Ensalada de repollo cremosa', price: 1.99, emoji: '🥗', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
  ],
  'store-5': [
    { id: 'prod-19', store_id: 'store-5', category_id: 'cat-1', name: 'Sub 6" Pavo', description: 'Sándwich de pavo con vegetales', price: 5.49, emoji: '🥪', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-20', store_id: 'store-5', category_id: 'cat-1', name: 'Sub 12" Italiano', description: 'Sándwich italiano con pepperoni', price: 8.99, emoji: '🇮🇹', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-21', store_id: 'store-5', category_id: 'cat-1', name: 'Ensalada Caesar', description: 'Ensalada fresca con pollo', price: 6.99, emoji: '🥗', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
  ],
  'store-6': [
    { id: 'prod-22', store_id: 'store-6', category_id: 'cat-5', name: 'Dona Glaseada', description: 'Dona clásica glaseada', price: 1.49, emoji: '🍩', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-23', store_id: 'store-6', category_id: 'cat-5', name: 'Dona Rellena', description: 'Dona rellena de crema pastelera', price: 1.99, emoji: '🥯', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-24', store_id: 'store-6', category_id: 'cat-5', name: 'Café Americano', description: 'Café negro recién hecho', price: 2.49, emoji: '☕', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-25', store_id: 'store-6', category_id: 'cat-5', name: 'Latte Caramelo', description: 'Café latte con caramelo', price: 3.99, emoji: '🧋', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
  ],
  'store-10': [
    { id: 'prod-26', store_id: 'store-10', category_id: 'cat-5', name: 'Latte Vainilla', description: 'Latte con jarabe de vainilla', price: 4.49, emoji: '☕', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-27', store_id: 'store-10', category_id: 'cat-5', name: 'Mocha', description: 'Café con chocolate', price: 4.99, emoji: '🍫', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-28', store_id: 'store-10', category_id: 'cat-5', name: 'Frappuccino', description: 'Bebida fría batida', price: 5.49, emoji: '🥤', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-29', store_id: 'store-10', category_id: 'cat-5', name: 'Sandwich', description: 'Sandwich de jamón y queso', price: 5.99, emoji: '🥪', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
  ],
  'store-7': [
    { id: 'prod-30', store_id: 'store-7', category_id: 'cat-8', name: 'Paracetamol 500mg', description: 'Alivio del dolor rápido', price: 3.99, emoji: '💊', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-31', store_id: 'store-7', category_id: 'cat-8', name: 'Ibuprofeno 400mg', description: 'Antiinflamatorio', price: 4.99, emoji: '💊', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-32', store_id: 'store-7', category_id: 'cat-8', name: 'Alcohol Antiséptico', description: 'Alcohol 70° para desinfección', price: 2.49, emoji: '🧴', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
  ],
  'store-8': [
    { id: 'prod-33', store_id: 'store-8', category_id: 'cat-1', name: 'Leche 1L', description: 'Leche entera fresca', price: 1.29, emoji: '🥛', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-34', store_id: 'store-8', category_id: 'cat-1', name: 'Pan Integral', description: 'Pan de molde integral 500g', price: 2.49, emoji: '🍞', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-35', store_id: 'store-8', category_id: 'cat-1', name: 'Huevos x12', description: 'Huevos de campo frescos', price: 3.99, emoji: '🥚', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-36', store_id: 'store-8', category_id: 'cat-1', name: 'Arroz 2kg', description: 'Arroz de grano largo', price: 3.29, emoji: '🍚', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
  ],
  'store-9': [
    { id: 'prod-37', store_id: 'store-9', category_id: 'cat-4', name: 'Crunchwrap Supreme', description: 'Tortilla rellena crujiente', price: 4.99, emoji: '🌯', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-38', store_id: 'store-9', category_id: 'cat-4', name: 'Quesadilla', description: 'Quesadilla de pollo', price: 3.99, emoji: '🫓', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'prod-39', store_id: 'store-9', category_id: 'cat-4', name: 'Tacos Dorados', description: '3 tacos dorados de pollo', price: 5.49, emoji: '🌮', image_url: null, is_active: true, created_at: '2025-01-01', updated_at: '2025-01-01' },
  ],
};

export function getMockProductsByStore(storeId: string) {
  return mockProducts[storeId] || [];
}

export function getMockProductsByCategory(categoryId: string) {
  return Object.values(mockProducts).flat().filter(p => p.category_id === categoryId);
}

export const mockOrders: Record<string, any[]> = {};

export function createMockOrder(params: any, userId: string) {
  const subtotal = params.productIds.reduce((sum: number, pid: string, i: number) => {
    const product = Object.values(mockProducts).flat().find(p => p.id === pid);
    return sum + (product ? product.price * (params.quantities[i] || 1) : 0);
  }, 0);
  const deliveryFee = 1.5;
  const discount = params.couponCode === 'RAYO15' ? Math.min(subtotal * 0.15, 5) : 0;
  const tax = (subtotal - discount) * 0.08;
  const tip = params.tip || 0;
  const total = subtotal + deliveryFee - discount + tax + tip;
  const orderId = `order-${Date.now()}`;

  const order = {
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
    order_items: params.productIds.map((pid: string, i: number) => {
      const product = Object.values(mockProducts).flat().find(p => p.id === pid);
      return {
        id: `item-${Date.now()}-${i}`,
        order_id: orderId,
        product_id: pid,
        product_name: product?.name || 'Producto',
        quantity: params.quantities[i] || 1,
        unit_price: product?.price || 0,
      };
    }),
    store: { name: 'Burger King', emoji: '👑' },
  };

  if (!mockOrders[userId]) mockOrders[userId] = [];
  mockOrders[userId].unshift(order);
  return order;
}

export function getMockOrders(userId: string) {
  return mockOrders[userId] || [];
}

export const mockNotifications: Record<string, any[]> = {
  'mock-customer': [
    { id: 'notif-1', user_id: 'mock-customer', title: 'Pedido en camino', body: 'Tu pedido de Burger King está en camino', read_at: null, created_at: new Date().toISOString() },
    { id: 'notif-2', user_id: 'mock-customer', title: 'Promo especial', body: '20% OFF en KFC por tiempo limitado', read_at: null, created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'notif-3', user_id: 'mock-customer', title: 'Bienvenido', body: 'Gracias por registrarte en RayoExpress', read_at: new Date().toISOString(), created_at: new Date(Date.now() - 86400000).toISOString() },
  ],
  'mock-driver': [
    { id: 'notif-4', user_id: 'mock-driver', title: 'Nuevo pedido', body: 'Hay un pedido disponible cerca de ti', read_at: null, created_at: new Date().toISOString() },
  ],
  'mock-store': [
    { id: 'notif-5', user_id: 'mock-store', title: 'Nuevo pedido', body: 'Tienes un nuevo pedido para preparar', read_at: null, created_at: new Date().toISOString() },
  ],
  'mock-admin': [
    { id: 'notif-6', user_id: 'mock-admin', title: 'Reporte diario', body: 'Hoy se realizaron 47 pedidos', read_at: null, created_at: new Date().toISOString() },
  ],
};
