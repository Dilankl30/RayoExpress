export type Screen =
  | 'landing'
  | 'login'
  | 'home'
  | 'super'
  | 'store-detail'
  | 'cart'
  | 'tracking'
  | 'orders'
  | 'promotions'
  | 'favorites'
  | 'addresses'
  | 'personal-info'
  | 'notification-settings'
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

export interface Address {
  id: string;
  title: string;
  line1: string;
  details: string;
  is_default: boolean;
  lat?: number;
  lng?: number;
}

export interface Promotion {
  id: string;
  title: string;
  description: string | null;
  type: 'restaurant' | 'super' | 'shipping' | 'coupon';
  discount: string;
  code?: string | null;
  store_id?: string | null;
  store_name?: string | null;
  store_emoji?: string | null;
  bg_color: string;
  text_color: string;
  emoji: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  min_order?: number;
  max_uses?: number;
  uses_count?: number;
  max_uses_per_customer?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  active?: boolean;
}

export interface FavoriteItem {
  id: string;
  favorite_id?: string;
  kind: 'store' | 'product';
  name: string;
  subtitle: string;
  emoji: string;
  price?: number;
  storeId?: string;
}

export interface NotificationSetting {
  label: string;
  description: string;
  enabled: boolean;
}

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
          city: string | null;
          photo_url: string | null;
          latitude: number | null;
          longitude: number | null;
          address: string | null;
          phone: string | null;
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
      promotions: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          type: string | null;
          discount: string | null;
          code: string | null;
          store_id: string | null;
          bg_color: string | null;
          text_color: string | null;
          emoji: string | null;
          expires_at: string | null;
          is_active: boolean | null;
          discount_type: 'percentage' | 'fixed';
          discount_value: number;
          min_order: number | null;
          max_uses: number | null;
          uses_count: number;
          max_uses_per_customer: number | null;
          starts_at: string | null;
          ends_at: string | null;
          active: boolean;
          created_at: string;
        };
      };
      addresses: {
        Row: Address & {
          user_id: string;
          created_at: string;
          updated_at: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          kind: 'store' | 'product';
          name: string;
          subtitle: string;
          emoji: string;
          price: number | null;
          created_at: string;
        };
      };
    };
  };
};
