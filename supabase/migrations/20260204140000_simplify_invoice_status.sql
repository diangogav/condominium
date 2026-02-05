-- Simplify Invoice Status Logic: Remove PARTIALLY_PAID
-- 1. Update existing data: Convert PARTIALLY_PAID to PENDING
UPDATE public.invoices SET status = 'PENDING' WHERE status = 'PARTIALLY_PAID';

-- 2. Update Constraint: Drop old check and add new one
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('PENDING', 'PAID', 'CANCELLED'));

-- 3. Update Trigger Function to use only PENDING/PAID
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid NUMERIC;
    invoice_total NUMERIC;
    v_invoice_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    -- Get total paid for this invoice ONLY from APPROVED payments
    SELECT COALESCE(SUM(pa.amount), 0) INTO total_paid
    FROM public.payment_allocations pa
    JOIN public.payments p ON p.id = pa.payment_id
    WHERE pa.invoice_id = v_invoice_id
    AND p.status = 'APPROVED';

    -- Get invoice total
    SELECT amount INTO invoice_total
    FROM public.invoices
    WHERE id = v_invoice_id;

    -- Update status and paid_amount
    IF total_paid >= invoice_total THEN
        UPDATE public.invoices 
        SET status = 'PAID', paid_amount = total_paid 
        WHERE id = v_invoice_id;
    ELSE
        -- Covers both 0 and partial amounts
        UPDATE public.invoices 
        SET status = 'PENDING', paid_amount = total_paid 
        WHERE id = v_invoice_id;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function update (for consistency)
CREATE OR REPLACE FUNCTION update_invoice_status_for_id(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    total_paid NUMERIC;
    invoice_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(pa.amount), 0) INTO total_paid
    FROM public.payment_allocations pa
    JOIN public.payments p ON p.id = pa.payment_id
    WHERE pa.invoice_id = p_invoice_id
    AND p.status = 'APPROVED';

    SELECT amount INTO invoice_total
    FROM public.invoices
    WHERE id = p_invoice_id;

    IF total_paid >= invoice_total THEN
        UPDATE public.invoices SET status = 'PAID', paid_amount = total_paid WHERE id = p_invoice_id;
    ELSE
        UPDATE public.invoices SET status = 'PENDING', paid_amount = total_paid WHERE id = p_invoice_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
