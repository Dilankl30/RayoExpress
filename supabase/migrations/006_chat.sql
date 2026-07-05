-- 006_chat.sql
-- Chats and messages for order-level communication
-- Adds new columns to tables created in 001_schema.sql

-- Add new columns to existing chats table
ALTER TABLE IF EXISTS public.chats ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);
ALTER TABLE IF EXISTS public.chats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add new columns to existing messages table
ALTER TABLE IF EXISTS public.messages ADD COLUMN IF NOT EXISTS sender_role TEXT CHECK (sender_role IN ('customer', 'driver', 'store', 'admin'));
ALTER TABLE IF EXISTS public.messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE IF EXISTS public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_chats_order_id ON public.chats(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Chats RLS
CREATE POLICY "Users can view their own chats"
  ON public.chats FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = store_id OR auth.uid() = driver_id);

CREATE POLICY "Users can insert chats"
  ON public.chats FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Messages RLS
CREATE POLICY "Users can view messages in their chats"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE public.chats.id = public.messages.chat_id
      AND (public.chats.customer_id = auth.uid() OR public.chats.store_id = auth.uid() OR public.chats.driver_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their chats"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE public.chats.id = public.messages.chat_id
      AND (public.chats.customer_id = auth.uid() OR public.chats.store_id = auth.uid() OR public.chats.driver_id = auth.uid())
    )
  );

-- Realtime
ALTER publication supabase_realtime ADD TABLE public.messages;
