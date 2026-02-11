-- =====================================================
-- Migration: Fix Invoice Type Length
-- Increases 'type' column length and updates check constraint
-- =====================================================

-- 1. Increase column length
ALTER TABLE public.invoices 
ALTER COLUMN type TYPE VARCHAR(50);

-- 2. Drop old check constraint (Postgres default name is invoices_type_check)
ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_type_check;

-- 3. Add new check constraint with PETTY_CASH_REPLENISHMENT
ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_type_check 
CHECK (type IN ('EXPENSE', 'DEBT', 'EXTRAORDINARY', 'PETTY_CASH_REPLENISHMENT'));
