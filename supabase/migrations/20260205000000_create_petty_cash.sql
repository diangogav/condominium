-- Migration to create Petty Cash tables

-- 1. Create petty_cash_fund table
CREATE TABLE IF NOT EXISTS public.petty_cash_fund (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_building_fund UNIQUE (building_id)
);

-- 2. Create petty_cash_transactions table
CREATE TABLE IF NOT EXISTS public.petty_cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID NOT NULL REFERENCES public.petty_cash_fund(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    evidence_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Add indexes
CREATE INDEX IF NOT EXISTS idx_petty_cash_fund_building ON public.petty_cash_fund(building_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_transactions_fund ON public.petty_cash_transactions(fund_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_transactions_created_at ON public.petty_cash_transactions(created_at);

-- 4. Enable RLS (Assuming existing policies or standard practice)
ALTER TABLE public.petty_cash_fund ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_transactions ENABLE ROW LEVEL SECURITY;
