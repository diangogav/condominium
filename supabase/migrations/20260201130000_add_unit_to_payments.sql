-- Migration: Add unit column to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS "unit" TEXT;

-- Populate existing payments with unit from profiles
UPDATE public.payments p
SET "unit" = prof.unit
FROM public.profiles prof
WHERE p.user_id = prof.id;

-- Make unit NOT NULL after populating
-- ALTER TABLE public.payments ALTER COLUMN "unit" SET NOT NULL; 
-- ^ Commented out to prevent failure if some old profiles don't have unit yet, 
-- but ideally it should be NOT NULL.

-- Create index for unit-centric queries
CREATE INDEX IF NOT EXISTS idx_payments_building_unit ON public.payments(building_id, "unit");
