import type { OrderStatus } from '../../modules/orders/domain/order-status.machine';

export function validateOrderStatus(status: string): status is OrderStatus {
  const valid: OrderStatus[] = [
    'pending', 'accepted', 'preparing', 'picked_up',
    'on_the_way', 'arrived', 'delivered', 'cancelled', 'refunded',
  ];
  return valid.includes(status as OrderStatus);
}

export function validatePaymentMethod(method: string): method is 'cash' | 'transfer' | 'card' {
  return ['cash', 'transfer', 'card'].includes(method);
}

export function validateFile(file: File, maxMb = 5): string | null {
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) return `El archivo excede el límite de ${maxMb}MB`;
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowed.includes(file.type)) return 'Formato no permitido. Usa JPG, PNG, WebP o PDF';
  return null;
}

export function validateOrderInput(params: {
  storeId?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  productIds?: string[];
  quantities?: number[];
}): string | null {
  if (!params.storeId) return 'ID de tienda requerido';
  if (!params.deliveryAddress?.trim()) return 'Dirección de entrega requerida';
  if (!params.paymentMethod || !validatePaymentMethod(params.paymentMethod)) return 'Método de pago inválido';
  if (!params.productIds?.length) return 'Debe incluir al menos un producto';
  if (!params.quantities?.length || params.quantities.length !== params.productIds.length) return 'Cantidades inválidas';
  for (const qty of params.quantities) {
    if (!Number.isInteger(qty) || qty < 1) return 'Cantidad inválida';
    if (qty > 100) return 'Cantidad máxima excedida (100)';
  }
  return null;
}

export function validateProfileUpdate(data: {
  full_name?: string;
  phone?: string;
}): string | null {
  if (data.full_name !== undefined && data.full_name.trim().length < 2) return 'Nombre debe tener al menos 2 caracteres';
  if (data.full_name !== undefined && data.full_name.length > 100) return 'Nombre muy largo (máx 100 caracteres)';
  if (data.phone !== undefined && data.phone && !/^\+?\d{7,15}$/.test(data.phone.replace(/[\s-]/g, ''))) return 'Teléfono inválido';
  return null;
}
