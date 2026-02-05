-- Add building_role to profile_units for building-specific permissions
-- This allows users to be board in one building and resident in another

-- 1. Add building_role column
ALTER TABLE public.profile_units 
ADD COLUMN building_role TEXT DEFAULT 'resident';

-- 2. Add constraint
ALTER TABLE public.profile_units
ADD CONSTRAINT profile_units_building_role_check 
CHECK (building_role IN ('board', 'resident', 'owner'));

-- 3. Migrate existing data
-- Users who are board globally become board in all their buildings
-- Users who are owners in units keep owner status
-- Everyone else is resident
UPDATE public.profile_units pu
SET building_role = CASE 
    WHEN p.role = 'board' THEN 'board'
    WHEN pu.role = 'owner' THEN 'owner'
    ELSE 'resident'
END
FROM public.profiles p
WHERE pu.profile_id = p.id;

-- 4. Create helper function to get buildings where user is board
CREATE OR REPLACE FUNCTION public.get_my_board_buildings()
RETURNS TABLE(building_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT u.building_id
    FROM public.profile_units pu
    JOIN public.units u ON u.id = pu.unit_id
    WHERE pu.profile_id = auth.uid()
    AND pu.building_role = 'board';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update RLS Policies to use building_role

-- A. Profiles Visibility
DROP POLICY IF EXISTS "Profiles visibility" ON public.profiles;
CREATE POLICY "Profiles visibility" ON public.profiles FOR SELECT USING (
    auth.uid() = id
    OR public.get_my_role() = 'admin'
    OR EXISTS (
        -- User can see profiles of users in buildings where they are board
        SELECT 1 
        FROM public.profile_units pu_target
        JOIN public.units u_target ON u_target.id = pu_target.unit_id
        WHERE pu_target.profile_id = profiles.id
        AND u_target.building_id IN (SELECT building_id FROM public.get_my_board_buildings())
    )
);

-- B. Payments Visibility
DROP POLICY IF EXISTS "Payments visibility" ON public.payments;
CREATE POLICY "Payments visibility" ON public.payments FOR SELECT USING (
    auth.uid() = user_id
    OR public.get_my_role() = 'admin'
    OR payments.building_id IN (SELECT building_id FROM public.get_my_board_buildings())
);

-- C. Payments Update
DROP POLICY IF EXISTS "Payments update" ON public.payments;
CREATE POLICY "Payments update" ON public.payments FOR UPDATE USING (
    auth.uid() = user_id
    OR public.get_my_role() = 'admin'
    OR payments.building_id IN (SELECT building_id FROM public.get_my_board_buildings())
);

-- D. Units Management
DROP POLICY IF EXISTS "Admins and Board can insert units" ON public.units;
CREATE POLICY "Admins and Board can insert units" ON public.units FOR INSERT WITH CHECK (
    public.get_my_role() = 'admin'
    OR units.building_id IN (SELECT building_id FROM public.get_my_board_buildings())
);

DROP POLICY IF EXISTS "Admins and Board can update units" ON public.units;
CREATE POLICY "Admins and Board can update units" ON public.units FOR UPDATE USING (
    public.get_my_role() = 'admin'
    OR units.building_id IN (SELECT building_id FROM public.get_my_board_buildings())
);

DROP POLICY IF EXISTS "Admins and Board can delete units" ON public.units;
CREATE POLICY "Admins and Board can delete units" ON public.units FOR DELETE USING (
    public.get_my_role() = 'admin'
    OR units.building_id IN (SELECT building_id FROM public.get_my_board_buildings())
);

-- E. Invoices
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
