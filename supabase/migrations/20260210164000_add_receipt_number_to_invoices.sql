-- Add receipt_number to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50);

-- Add index for faster lookups by receipt number
CREATE INDEX IF NOT EXISTS idx_invoices_receipt_number ON public.invoices(receipt_number);
