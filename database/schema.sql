-- =====================================================
-- Condominio Database Schema
-- =====================================================
-- Execute this script in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. BUILDINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample buildings
INSERT INTO public.buildings (name, address) VALUES
    ('Torre A', 'Av. Principal #123, Caracas'),
    ('Torre B', 'Av. Principal #125, Caracas'),
    ('Edificio Central', 'Calle 5 con Av. 2, Valencia')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. PROFILES TABLE
-- =====================================================
-- This table extends auth.users with additional profile info
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    unit TEXT,
    building_id UUID REFERENCES public.buildings(id),
    role TEXT DEFAULT 'resident' CHECK (role IN ('resident', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Policy: Anyone can insert (for registration)
CREATE POLICY "Anyone can insert profile"
    ON public.profiles FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- 3. PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    payment_date DATE NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('PAGO_MOVIL', 'TRANSFER', 'CASH')),
    reference TEXT,
    bank TEXT,
    proof_url TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    period TEXT, -- Format: YYYY-MM (e.g., "2024-03")
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payments
CREATE POLICY "Users can view own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own payments
CREATE POLICY "Users can insert own payments"
    ON public.payments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_period ON public.payments(period);

-- =====================================================
-- 4. STORAGE BUCKET FOR PAYMENT PROOFS
-- =====================================================
-- Note: This must be executed in Supabase Dashboard > Storage
-- Or use the Supabase client to create the bucket

-- Create bucket (run this in SQL Editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload payment proofs"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'payment-proofs');

-- Storage Policy: Allow public read access
CREATE POLICY "Public can view payment proofs"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'payment-proofs');

-- =====================================================
-- 5. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for payments
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================
-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.buildings TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.payments TO authenticated;

-- Grant access to anon users (for public endpoints like /buildings)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.buildings TO anon;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify everything was created correctly:

-- Check buildings
-- SELECT * FROM public.buildings;

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
