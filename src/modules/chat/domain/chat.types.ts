export interface Chat {
  id: string;
  order_id: string;
  customer_id: string;
  store_id: string;
  driver_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_role: 'customer' | 'driver' | 'store' | 'admin';
  content: string;
  read_at: string | null;
  created_at: string;
}
