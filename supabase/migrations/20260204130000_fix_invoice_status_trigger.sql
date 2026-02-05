-- Add paid_amount to invoices for progress tracking
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10, 2) DEFAULT 0.00;

-- Fix update_invoice_status to only sum APPROVED payments and update paid_amount
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
    ELSIF total_paid > 0 THEN
        UPDATE public.invoices 
        SET status = 'PARTIALLY_PAID', paid_amount = total_paid 
        WHERE id = v_invoice_id;
    ELSE
        UPDATE public.invoices 
        SET status = 'PENDING', paid_amount = 0 
        WHERE id = v_invoice_id;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- We also need a trigger on payments table to update invoices when a payment status changes
CREATE OR REPLACE FUNCTION update_invoices_on_payment_status_change()
RETURNS TRIGGER AS $$
DECLARE
    alloc RECORD;
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- For each allocation of this payment, trigger invoice status update
        FOR alloc IN SELECT invoice_id FROM public.payment_allocations WHERE payment_id = NEW.id LOOP
            -- We can just call the status update logic for this invoice
            PERFORM update_invoice_status_for_id(alloc.invoice_id);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to update status by ID to avoid code duplication
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
    ELSIF total_paid > 0 THEN
        UPDATE public.invoices SET status = 'PARTIALLY_PAID', paid_amount = total_paid WHERE id = p_invoice_id;
    ELSE
        UPDATE public.invoices SET status = 'PENDING', paid_amount = 0 WHERE id = p_invoice_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update the main trigger to use the helper
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM update_invoice_status_for_id(OLD.invoice_id);
        RETURN OLD;
    END IF;
    
    PERFORM update_invoice_status_for_id(NEW.invoice_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create trigger on payments if not exists (handled by CREATE OR REPLACE usually but TRIGGER needs explicit drop if changing signature, here just creating)
DROP TRIGGER IF EXISTS trigger_update_invoices_on_payment_status_change ON public.payments;
CREATE TRIGGER trigger_update_invoices_on_payment_status_change
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION update_invoices_on_payment_status_change();
