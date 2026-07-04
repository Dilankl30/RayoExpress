-- 007_rls_audit.sql
-- Complete RLS hardening + audit log

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs; insert is allowed via trigger/function
CREATE POLICY "Admins can view audit logs"
  ON audit_log FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Service can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- Add updated_at trigger for payment_transactions (missing from 005)
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure payment_transactions has updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_payment_transactions'
  ) THEN
    CREATE TRIGGER set_updated_at_payment_transactions
      BEFORE UPDATE ON public.payment_transactions
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
END;
$$;

-- Add RLS to the old payments table if not already done
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_select') THEN
    CREATE POLICY "payments_select" ON public.payments FOR SELECT
      USING (
        auth.uid() IN (
          SELECT o.customer_id FROM orders o WHERE o.id = payments.order_id
          UNION
          SELECT o.driver_id FROM orders o WHERE o.id = payments.order_id
          UNION
          SELECT s.owner_id FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.id = payments.order_id
        )
        OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_insert') THEN
    CREATE POLICY "payments_insert" ON public.payments FOR INSERT
      WITH CHECK (
        auth.uid() IN (SELECT o.customer_id FROM orders o WHERE o.id = payments.order_id)
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_update') THEN
    CREATE POLICY "payments_update" ON public.payments FOR UPDATE
      USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
  END IF;
END;
$$;

-- Add RLS to delivery_evidence if not already done
ALTER TABLE public.delivery_evidence ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delivery_evidence_select') THEN
    CREATE POLICY "delivery_evidence_select" ON public.delivery_evidence FOR SELECT
      USING (
        auth.uid() IN (
          SELECT o.driver_id FROM orders o WHERE o.id = delivery_evidence.order_id
          UNION
          SELECT o.customer_id FROM orders o WHERE o.id = delivery_evidence.order_id
          UNION
          SELECT s.owner_id FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.id = delivery_evidence.order_id
        )
        OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delivery_evidence_insert') THEN
    CREATE POLICY "delivery_evidence_insert" ON public.delivery_evidence FOR INSERT
      WITH CHECK (
        auth.uid() IN (SELECT o.driver_id FROM orders o WHERE o.id = delivery_evidence.order_id)
      );
  END IF;
END;
$$;

-- Add missing screen path map entries
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read app_config" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Only admins can update app_config" ON public.app_config FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
