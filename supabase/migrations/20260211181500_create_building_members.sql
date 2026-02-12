-- 1. Create building_members table
CREATE TABLE IF NOT EXISTS public.building_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'board',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(profile_id, building_id, role)
);

-- 2. Populate building_members with existing 'board' roles from profile_units
INSERT INTO public.building_members (profile_id, building_id, role, created_at)
SELECT DISTINCT 
    pu.profile_id, 
    u.building_id, 
    'board',
    pu.created_at
FROM public.profile_units pu
JOIN public.units u ON u.id = pu.unit_id
WHERE pu.building_role = 'board'
ON CONFLICT DO NOTHING;

-- 3. Update RLS helper function to use the new table
CREATE OR REPLACE FUNCTION public.get_my_board_buildings()
RETURNS TABLE(building_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT bm.building_id
    FROM public.building_members bm
    WHERE bm.profile_id = auth.uid()
    AND bm.role = 'board';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update RLS policies (Updating existing ones to ensure they reference the new logic if needed)
-- Note: Since they already use get_my_board_buildings(), updating the function is usually enough.
-- However, let's re-verify specific ones that might join units.

-- A. Invoices Visibility: Ensure it checks building_members if unit join is not enough
DROP POLICY IF EXISTS "Admins and Board can manage invoices" ON public.invoices;
CREATE POLICY "Admins and Board can manage invoices" ON public.invoices FOR ALL USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
        SELECT 1 FROM public.units u
        WHERE u.id = invoices.unit_id
        AND u.building_id IN (SELECT building_id FROM public.get_my_board_buildings())
    )
    OR EXISTS (
        -- User can manage invoices for their own units
        SELECT 1 FROM public.profile_units pu
        WHERE pu.profile_id = auth.uid()
        AND pu.unit_id = invoices.unit_id
    )
);

-- 5. Drop the old column from profile_units
ALTER TABLE public.profile_units DROP COLUMN IF EXISTS building_role;
ALTER TABLE public.profile_units DROP COLUMN IF EXISTS role; -- Legacy column from early schema

-- 6. Enable RLS on building_members
ALTER TABLE public.building_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view building members for their buildings" ON public.building_members
    FOR SELECT USING (
        profile_id = auth.uid()
        OR public.get_my_role() = 'admin'
        OR building_id IN (SELECT building_id FROM public.get_my_board_buildings())
    );

CREATE POLICY "Admins can manage building members" ON public.building_members
    FOR ALL USING (public.get_my_role() = 'admin');
