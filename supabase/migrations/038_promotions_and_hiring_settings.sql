-- Promotions, coupons, and configurable driver hiring.

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'coupon',
  ADD COLUMN IF NOT EXISTS discount text,
  ADD COLUMN IF NOT EXISTS bg_color text NOT NULL DEFAULT '#6D28D9',
  ADD COLUMN IF NOT EXISTS text_color text NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS emoji text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_uses_per_customer integer NOT NULL DEFAULT 1;

ALTER TABLE public.promotions
  DROP CONSTRAINT IF EXISTS promotions_type_check;

ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_type_check
  CHECK (type IN ('restaurant', 'super', 'shipping', 'coupon'));

ALTER TABLE public.promotions
  DROP CONSTRAINT IF EXISTS promotions_max_uses_per_customer_check;

ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_max_uses_per_customer_check
  CHECK (max_uses_per_customer >= 0);

UPDATE public.promotions
SET
  type = COALESCE(type, 'coupon'),
  discount = COALESCE(
    discount,
    CASE
      WHEN discount_type = 'fixed' THEN '$' || ROUND(discount_value::numeric, 2)::text
      ELSE ROUND(discount_value::numeric, 2)::text || '% OFF'
    END
  ),
  expires_at = COALESCE(expires_at, ends_at),
  is_active = COALESCE(is_active, active, true),
  max_uses_per_customer = COALESCE(max_uses_per_customer, 1);

CREATE TABLE IF NOT EXISTS public.promotion_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_promotion_user
  ON public.promotion_redemptions(promotion_id, user_id);

CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_user
  ON public.promotion_redemptions(user_id);

ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotion_redemptions_select_own_or_admin" ON public.promotion_redemptions;
CREATE POLICY "promotion_redemptions_select_own_or_admin"
  ON public.promotion_redemptions
  FOR SELECT
  USING (user_id = auth.uid() OR public.current_user_is_admin());

DROP POLICY IF EXISTS "promotion_redemptions_insert_own" ON public.promotion_redemptions;
CREATE POLICY "promotion_redemptions_insert_own"
  ON public.promotion_redemptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "promotion_redemptions_admin_all" ON public.promotion_redemptions;
CREATE POLICY "promotion_redemptions_admin_all"
  ON public.promotion_redemptions
  FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_config_select_all" ON public.app_config;
CREATE POLICY "app_config_select_all"
  ON public.app_config
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "app_config_admin_all" ON public.app_config;
CREATE POLICY "app_config_admin_all"
  ON public.app_config
  FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

INSERT INTO public.app_config (key, value)
VALUES ('driver_hiring_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
