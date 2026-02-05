-- Create Payment Allocations table
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT, -- Don't delete invoice if paid
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view allocations for their payments
CREATE POLICY "Users can view own payment allocations" ON public.payment_allocations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.payments
            WHERE id = payment_allocations.payment_id
            AND user_id = auth.uid()
        )
    );

-- Admins can view/manage
CREATE POLICY "Admins can manage payment allocations" ON public.payment_allocations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'board') 
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_allocations_payment_id ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_allocations_invoice_id ON public.payment_allocations(invoice_id);

-- Trigger to update Invoice Status on Allocation
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid NUMERIC;
    invoice_total NUMERIC;
BEGIN
    -- Get total paid for this invoice
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.payment_allocations
    WHERE invoice_id = NEW.invoice_id;

    -- Get invoice total
    SELECT amount INTO invoice_total
    FROM public.invoices
    WHERE id = NEW.invoice_id;

    -- Update status
    IF total_paid >= invoice_total THEN
        UPDATE public.invoices SET status = 'PAID' WHERE id = NEW.invoice_id;
    ELSIF total_paid > 0 THEN
        UPDATE public.invoices SET status = 'PARTIALLY_PAID' WHERE id = NEW.invoice_id;
    ELSE
        UPDATE public.invoices SET status = 'PENDING' WHERE id = NEW.invoice_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_status
AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocations
FOR EACH ROW
EXECUTE FUNCTION update_invoice_status();
