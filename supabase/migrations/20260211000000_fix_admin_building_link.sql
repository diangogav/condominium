-- =====================================================
-- Migration: Fix Admin Building Link
-- Ensures admin@granada.com is linked to a building/unit
-- =====================================================

DO $$
DECLARE
    v_building_id UUID;
    v_unit_id UUID;
    v_user_id UUID;
BEGIN
    -- 1. Get or Create Building "Granada"
    SELECT id INTO v_building_id FROM public.buildings WHERE name ILIKE '%Granada%' LIMIT 1;
    
    IF v_building_id IS NULL THEN
        INSERT INTO public.buildings (name, address) 
        VALUES ('Residencias Granada', 'Calle Granada, Caracas') 
        RETURNING id INTO v_building_id;
        RAISE NOTICE 'Created building Granada with ID %', v_building_id;
    ELSE
        RAISE NOTICE 'Found existing building Granada with ID %', v_building_id;
    END IF;

    -- 2. Get or Create a Unit for that building
    SELECT id INTO v_unit_id FROM public.units WHERE building_id = v_building_id LIMIT 1;
    
    IF v_unit_id IS NULL THEN
        INSERT INTO public.units (building_id, name, floor, type) 
        VALUES (v_building_id, 'ADMIN-01', 'PB', 'residential') 
        RETURNING id INTO v_unit_id;
        RAISE NOTICE 'Created unit ADMIN-01 with ID %', v_unit_id;
    ELSE
        RAISE NOTICE 'Found existing unit with ID %', v_unit_id;
    END IF;

    -- 3. Get User ID for admin@granada.com
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@granada.com' LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- 4. Link user to unit in profile_units with 'board' role
        -- The 'board' role in profile_units allows management operations via RLS
        INSERT INTO public.profile_units (profile_id, unit_id, building_role, is_primary)
        VALUES (v_user_id, v_unit_id, 'board', true)
        ON CONFLICT (profile_id, unit_id) 
        DO UPDATE SET building_role = 'board', is_primary = true;
        
        RAISE NOTICE 'Linked admin@granada.com to building Granada';
    ELSE
        RAISE WARNING 'User admin@granada.com not found in auth.users';
    END IF;
END $$;
