import type { Role } from '../../../shared/types';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'picked_up'
  | 'on_the_way'
  | 'arrived'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export const ORDER_FLOW: OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'picked_up',
  'on_the_way',
  'arrived',
  'delivered',
];

export const ALLOWED_TRANSITIONS: Record<OrderStatus, { to: OrderStatus[]; by: Role[] }> = {
  pending:    { to: ['accepted', 'cancelled'], by: ['store', 'admin'] },
  accepted:   { to: ['preparing', 'cancelled'], by: ['store', 'admin'] },
  preparing:  { to: ['picked_up', 'cancelled'], by: ['store', 'admin'] },
  picked_up:  { to: ['on_the_way'], by: ['driver', 'admin'] },
  on_the_way: { to: ['arrived', 'delivered'], by: ['driver', 'admin'] },
  arrived:    { to: ['delivered'], by: ['driver', 'admin', 'customer'] },
  delivered:  { to: ['refunded'], by: ['admin'] },
  cancelled:  { to: ['refunded'], by: ['admin'] },
  refunded:   { to: [], by: [] },
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptado',
  preparing: 'Preparando',
  picked_up: 'Recogido',
  on_the_way: 'En camino',
  arrived: 'Llegó',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

export const STATUS_ICONS: Record<OrderStatus, string> = {
  pending: '📋',
  accepted: '✅',
  preparing: '👨‍🍳',
  picked_up: '📦',
  on_the_way: '🛵',
  arrived: '📍',
  delivered: '🎉',
  cancelled: '❌',
  refunded: '💵',
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
