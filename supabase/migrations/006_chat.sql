-- 006_chat.sql
-- Chats and messages for order-level communication

CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  driver_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'driver', 'store', 'admin')),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chats_order_id ON chats(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Chats RLS
CREATE POLICY "Users can view their own chats"
  ON chats FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = store_id OR auth.uid() = driver_id);

CREATE POLICY "Users can insert chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Messages RLS
CREATE POLICY "Users can view messages in their chats"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.customer_id = auth.uid() OR chats.store_id = auth.uid() OR chats.driver_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their chats"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.customer_id = auth.uid() OR chats.store_id = auth.uid() OR chats.driver_id = auth.uid())
    )
  );

-- Realtime
ALTER publication supabase_realtime ADD TABLE messages;
