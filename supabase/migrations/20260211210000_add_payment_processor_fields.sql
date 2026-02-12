-- Add tracking fields for who approved/rejected a payment and when
-- Also remove legacy 'periods' and 'unit' columns as we transitioned to allocations and unit_id
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
DROP COLUMN IF EXISTS periods,
DROP COLUMN IF EXISTS unit;

-- Add index for better performance when searching by processor
CREATE INDEX IF NOT EXISTS idx_payments_processed_by ON public.payments(processed_by);
