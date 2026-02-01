CREATE TABLE IF NOT EXISTS public.units (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    floor VARCHAR(50),
    aliquot NUMERIC(10, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(building_id, name)
);

-- RLS Policies
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Everyone can read units (needed for registration)
CREATE POLICY "Everyone can read units" ON public.units
    FOR SELECT USING (true);

-- Only admins/board can manage units
CREATE POLICY "Admins and Board can insert units" ON public.units
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND (role = 'admin' OR (role = 'board' AND building_id = units.building_id))
        )
    );

CREATE POLICY "Admins and Board can update units" ON public.units
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND (role = 'admin' OR (role = 'board' AND building_id = units.building_id))
        )
    );

CREATE POLICY "Admins and Board can delete units" ON public.units
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND (role = 'admin' OR (role = 'board' AND building_id = units.building_id))
        )
    );
