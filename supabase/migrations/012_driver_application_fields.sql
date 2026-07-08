-- 012_driver_application_fields.sql
-- Add new fields for driver applications: documents, contract, contact

ALTER TABLE public.driver_applications
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS id_card_front_url TEXT,
  ADD COLUMN IF NOT EXISTS id_card_back_url TEXT,
  ADD COLUMN IF NOT EXISTS motorcycle_docs_url TEXT,
  ADD COLUMN IF NOT EXISTS license_url TEXT,
  ADD COLUMN IF NOT EXISTS contract_url TEXT,
  ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT false;
