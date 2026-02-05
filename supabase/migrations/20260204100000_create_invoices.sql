-- Create Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    period VARCHAR(20) NOT NULL, -- e.g., '2024-01'
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED')),
    type VARCHAR(20) DEFAULT 'EXPENSE' CHECK (type IN ('EXPENSE', 'DEBT', 'EXTRAORDINARY')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policies
-- Residents/Owners can view invoices for their units
CREATE POLICY "Users can view invoices for their units" ON public.invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profile_units
            WHERE profile_id = auth.uid()
            AND unit_id = invoices.unit_id
        )
    );

-- Admins/Board can manage invoices
CREATE POLICY "Admins and Board can manage invoices" ON public.invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'board') 
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_unit_id ON public.invoices(unit_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON public.invoices(period);
