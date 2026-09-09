-- RayoExpress | Migration 043: Bank accounts table for internal payment control

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                    -- "Cuenta Admin Principal", "Cuenta Repartidor Juan"
  bank_name text NOT NULL,               -- "Pichincha", "Banco Guayaquil"
  account_type text NOT NULL CHECK (account_type IN ('corriente', 'ahorros')), -- "corriente", "ahorros"
  account_number text NOT NULL,          -- Últimos 4 dígitos o alias visible
  holder_name text NOT NULL,             -- Titular de la cuenta
  holder_id text,                          -- Cédula/RUC (opcional)
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- FK desde orders (la columna se creó en 042 sin referencia).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_receiving_account_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_receiving_account_id_fkey
      FOREIGN KEY (receiving_account_id) REFERENCES public.bank_accounts(id);
  END IF;
END;
$$;

-- RLS Policies
DROP POLICY IF EXISTS "bank_accounts_admin_all" ON public.bank_accounts;
CREATE POLICY "bank_accounts_admin_all" ON public.bank_accounts
  FOR ALL USING (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

DROP POLICY IF EXISTS "bank_accounts_select" ON public.bank_accounts;
CREATE POLICY "bank_accounts_select" ON public.bank_accounts
  FOR SELECT USING (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_bank_accounts_default ON public.bank_accounts(is_default) WHERE (is_active = true);

------------------------------------------------------------
-- Función para obtener cuenta receptora por defecto
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_default_bank_account()
RETURNS jsonb AS $$
DECLARE
    result record;
BEGIN
    SELECT id, name, bank_name, account_type, account_number, holder_name, holder_id
    INTO result
    FROM public.bank_accounts
    WHERE is_active = true AND is_default = true
    LIMIT 1;
    
    IF result IS NOT NULL THEN
        return to_jsonb(result);
    END IF;
    return null;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_default_bank_account() TO authenticated;
