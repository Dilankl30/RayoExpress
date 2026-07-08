DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_name_key') THEN
    ALTER TABLE public.categories ADD CONSTRAINT categories_name_key UNIQUE (name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'promotions_code_key') THEN
    ALTER TABLE public.promotions ADD CONSTRAINT promotions_code_key UNIQUE (code);
  END IF;
END $$;
