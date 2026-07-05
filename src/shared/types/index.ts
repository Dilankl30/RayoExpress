export type Screen =
  | 'landing'
  | 'login'
  | 'home'
  | 'store-detail'
  | 'cart'
  | 'tracking'
  | 'orders'
  | 'promotions'
  | 'favorites'
  | 'addresses'
  | 'personal-info'
  | 'notification-settings'
  | 'wallet'
  | 'driver'
  | 'store-admin'
  | 'admin'
  | 'profile'
  | 'register-store'
  | 'register-driver';

export type Role = 'customer' | 'driver' | 'store' | 'admin';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  emoji: string;
  storeId?: string;
  storeName?: string;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: Role;
  avatar_url: string | null;
  is_suspended: boolean;
}

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

export type Database = {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          emoji: string;
          cover_color: string;
          is_open: boolean;
          min_order: number;
          delivery_fee: number;
          coverage_area: unknown;
          created_at: string;
          updated_at: string;
        };
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price: number;
          emoji: string;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          emoji: string;
          bg_color: string;
          created_at: string;
        };
      };
      orders: {
        Row: {
          id: string;
          customer_id: string;
          store_id: string;
          driver_id: string | null;
          status: OrderStatus;
          payment_method: 'cash' | 'transfer' | 'card';
          transfer_receipt_url: string | null;
          subtotal: number;
          delivery_fee: number;
          discount: number;
          tax: number;
          tip: number;
          total: number;
          delivery_address: string;
          customer_delivery_code: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
