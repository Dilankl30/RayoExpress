export type Screen =
  | 'login'
  | 'home'
  | 'store-detail'
  | 'cart'
  | 'tracking'
  | 'driver'
  | 'store-admin'
  | 'admin';

export type Role = 'customer' | 'driver' | 'store' | 'admin';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  emoji: string;
}
