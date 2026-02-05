-- Create profile_units table
CREATE TABLE IF NOT EXISTS public.profile_units (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'resident' CHECK (role IN ('owner', 'resident')),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(profile_id, unit_id)
);

-- Enable RLS
ALTER TABLE public.profile_units ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own unit associations" ON public.profile_units
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Admins and Board can view all unit associations" ON public.profile_units
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'board') -- Simplified for now, board logic might need specific building check later
        )
    );

CREATE POLICY "Admins can manage unit associations" ON public.profile_units
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Data Migration: Move existing profile->unit links to profile_units
INSERT INTO public.profile_units (profile_id, unit_id, role, is_primary)
SELECT id, unit_id, COALESCE(role, 'resident'), true
FROM public.profiles
WHERE unit_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profile_units_profile_id ON public.profile_units(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_units_unit_id ON public.profile_units(unit_id);
