-- Migration to support multiple periods per payment
-- 1. Add new 'periods' column
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS periods TEXT[];

-- 2. Migrate existing data (if any)
UPDATE public.payments 
SET periods = ARRAY[period] 
WHERE period IS NOT NULL AND periods IS NULL;

-- 3. Drop old 'period' column (optional, or we can keep it for safety but let's clean up)
-- We will drop it to avoid confusion
ALTER TABLE public.payments DROP COLUMN IF EXISTS period;

-- 4. Update Index
DROP INDEX IF EXISTS idx_payments_period;
CREATE INDEX IF NOT EXISTS idx_payments_periods ON public.payments USING GIN(periods);
