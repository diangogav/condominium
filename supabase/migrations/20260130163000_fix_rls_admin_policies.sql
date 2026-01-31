-- Function to get current user role safely (bypassing RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user building_id safely
CREATE OR REPLACE FUNCTION public.get_my_building_id()
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT building_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 1. PROFILES POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Profiles visibility"
    ON public.profiles FOR SELECT
    USING (
        auth.uid() = id -- Own profile
        OR
        public.get_my_role() = 'admin' -- Admin sees all
        OR
        (
            public.get_my_role() = 'board' 
            AND 
            building_id = public.get_my_building_id()
        ) -- Board sees their building members
    );

-- Also allow Admins to update any profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Profiles update"
    ON public.profiles FOR UPDATE
    USING (
        auth.uid() = id
        OR
        public.get_my_role() = 'admin'
    );

-- =====================================================
-- 2. PAYMENTS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

CREATE POLICY "Payments visibility"
    ON public.payments FOR SELECT
    USING (
        auth.uid() = user_id -- Own payments
        OR
        public.get_my_role() = 'admin' -- Admin sees all
        OR
        (
            public.get_my_role() = 'board' 
            AND 
            building_id = public.get_my_building_id()
        ) -- Board sees their building payments
    );

DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;

CREATE POLICY "Payments update"
    ON public.payments FOR UPDATE
    USING (
        auth.uid() = user_id
        OR
        public.get_my_role() = 'admin'
        OR
        (
            public.get_my_role() = 'board' 
            AND 
            building_id = public.get_my_building_id()
        )
    );
