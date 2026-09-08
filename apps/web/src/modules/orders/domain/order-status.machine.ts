import type { Role } from '../../../shared/types';

export type OrderStatus =
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'on_the_way'
  | 'arrived'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid';

export const ORDER_FLOW: OrderStatus[] = [
  'confirmed',
  'preparing',
  'ready',
  'picked_up',
  'on_the_way',
  'arrived',
  'delivered',
];

export const ALLOWED_TRANSITIONS: Record<OrderStatus, { to: OrderStatus[]; by: Role[] }> = {
  confirmed:  { to: ['preparing', 'cancelled'], by: ['store', 'admin'] },
  preparing:  { to: ['ready', 'cancelled'], by: ['store', 'driver', 'admin'] },
  ready:      { to: ['picked_up'], by: ['driver', 'admin'] },
  picked_up:  { to: ['on_the_way'], by: ['driver', 'admin'] },
  on_the_way: { to: ['arrived', 'delivered'], by: ['driver', 'admin'] },
  arrived:    { to: ['delivered'], by: ['driver', 'admin', 'customer'] },
  delivered:  { to: [], by: ['admin'] },
  cancelled:  { to: [], by: ['admin'] },
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  picked_up: 'Recogido',
  on_the_way: 'En camino',
  arrived: 'Llegó',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const STATUS_ICONS: Record<OrderStatus, string> = {
  confirmed: '✅',
  preparing: '👨‍🍳',
  ready: '📦',
  picked_up: '📦',
  on_the_way: '🛵',
  arrived: '📍',
  delivered: '🎉',
  cancelled: '❌',
};

export function canTransition(from: OrderStatus, to: OrderStatus, role: Role): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.to.includes(to) && allowed.by.includes(role);
}

export function getAvailableTransitions(from: OrderStatus, role: Role): OrderStatus[] {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) return [];
  return allowed.to.filter((target) => canTransition(from, target, role));
}

export function getStepIndex(status: OrderStatus): number {
  return ORDER_FLOW.indexOf(status);
}
