-- Add unit_id columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id);

-- Backfill profiles (matching unit name to unit table)
-- We join on building_id as well to ensure correctness
UPDATE public.profiles
SET unit_id = units.id
FROM public.units
WHERE profiles.unit = units.name 
  AND profiles.building_id = units.building_id
  AND profiles.unit_id IS NULL;

-- Backfill payments
UPDATE public.payments
SET unit_id = units.id
FROM public.units
WHERE payments.unit = units.name 
  AND payments.building_id = units.building_id
  AND payments.unit_id IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_unit_id ON public.profiles(unit_id);
CREATE INDEX IF NOT EXISTS idx_payments_unit_id ON public.payments(unit_id);
