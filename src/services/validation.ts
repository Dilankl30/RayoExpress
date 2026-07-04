export function isSecurePassword(value: string): boolean {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(value)
  );
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPhone(value: string): boolean {
  return /^\+?\d{7,15}$/.test(value.replace(/[\s-]/g, ''));
}

export function isPositiveNumber(value: number): boolean {
  return typeof value === 'number' && value > 0 && isFinite(value);
}

export function validateOrderItem(price: number, quantity: number): string | null {
  if (!isPositiveNumber(price)) return 'Precio inválido';
  if (!Number.isInteger(quantity) || quantity <= 0) return 'Cantidad inválida';
  if (quantity > 100) return 'Cantidad máxima excedida';
  return null;
}

export async function hashText(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
