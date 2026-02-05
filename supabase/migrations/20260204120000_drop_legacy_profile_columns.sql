-- ==============================================================================
-- Drop Legacy Columns & Update Policies
-- ==============================================================================

-- 1. Drop Dependent Policies (on profiles, payments, units)
DROP POLICY IF EXISTS "Profiles visibility" ON public.profiles;
DROP POLICY IF EXISTS "Payments visibility" ON public.payments;
DROP POLICY IF EXISTS "Payments update" ON public.payments;

DROP POLICY IF EXISTS "Admins and Board can insert units" ON public.units;
DROP POLICY IF EXISTS "Admins and Board can update units" ON public.units;
DROP POLICY IF EXISTS "Admins and Board can delete units" ON public.units;

-- 2. Drop Dependent Function
DROP FUNCTION IF EXISTS public.get_my_building_id();

-- 3. Drop Legacy Columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS unit_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS building_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS unit;

-- 4. Re-Create Policies with Multi-Unit Support

-- A. Profiles Visibility
-- Admin: All
-- Self: Own
-- Board: Profiles that belong to units in buildings managed by the Board member
CREATE POLICY "Profiles visibility" ON public.profiles FOR SELECT USING (
    auth.uid() = id
    OR public.get_my_role() = 'admin'
    OR (
        public.get_my_role() = 'board' AND EXISTS (
            SELECT 1 
            FROM public.profile_units pu_auth
            JOIN public.units u_auth ON u_auth.id = pu_auth.unit_id
            JOIN public.units u_target ON u_target.building_id = u_auth.building_id
            JOIN public.profile_units pu_target ON pu_target.unit_id = u_target.id
            WHERE pu_auth.profile_id = auth.uid()
            AND pu_target.profile_id = profiles.id
        )
    )
);

-- B. Payments Visibility & Update
-- Admin: All
-- Self: Own
-- Board: Payments linked to buildings they managed
CREATE POLICY "Payments visibility" ON public.payments FOR SELECT USING (
    auth.uid() = user_id
    OR public.get_my_role() = 'admin'
    OR (
        public.get_my_role() = 'board' AND EXISTS (
            SELECT 1 
            FROM public.profile_units pu
            JOIN public.units u ON u.id = pu.unit_id
            WHERE pu.profile_id = auth.uid()
            AND u.building_id = payments.building_id
        )
    )
);

CREATE POLICY "Payments update" ON public.payments FOR UPDATE USING (
    auth.uid() = user_id
    OR public.get_my_role() = 'admin'
    OR (
        public.get_my_role() = 'board' AND EXISTS (
            SELECT 1 
            FROM public.profile_units pu
            JOIN public.units u ON u.id = pu.unit_id
            WHERE pu.profile_id = auth.uid()
            AND u.building_id = payments.building_id
        )
    )
);

-- C. Units Management
CREATE POLICY "Admins and Board can insert units" ON public.units FOR INSERT WITH CHECK (
    public.get_my_role() = 'admin'
    OR (
        public.get_my_role() = 'board' AND EXISTS (
            SELECT 1 
            FROM public.profile_units pu
            JOIN public.units u ON u.id = pu.unit_id
            WHERE pu.profile_id = auth.uid()
            AND u.building_id = units.building_id
        )
    )
);

CREATE POLICY "Admins and Board can update units" ON public.units FOR UPDATE USING (
    public.get_my_role() = 'admin'
    OR (
        public.get_my_role() = 'board' AND EXISTS (
            SELECT 1 
            FROM public.profile_units pu
            JOIN public.units u ON u.id = pu.unit_id
            WHERE pu.profile_id = auth.uid()
            AND u.building_id = units.building_id
        )
    )
);

CREATE POLICY "Admins and Board can delete units" ON public.units FOR DELETE USING (
    public.get_my_role() = 'admin'
    OR (
        public.get_my_role() = 'board' AND EXISTS (
            SELECT 1 
            FROM public.profile_units pu
            JOIN public.units u ON u.id = pu.unit_id
            WHERE pu.profile_id = auth.uid()
            AND u.building_id = units.building_id
        )
    )
);
