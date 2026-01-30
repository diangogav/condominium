-- Add building_id to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id);

-- Backfill building_id from profiles
-- This assumes that the payment belongs to the building the user is CURRENTLY assigned to.
-- Ideally, historical building association would be better, but for this system user->building is likely stable enough or the best we have.
UPDATE public.payments p
SET building_id = u.building_id
FROM public.profiles u
WHERE p.user_id = u.id
AND p.building_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payments_building_id ON public.payments(building_id);
