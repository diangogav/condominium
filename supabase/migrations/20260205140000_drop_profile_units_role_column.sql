-- Drop legacy role column from profile_units
-- Consolidate all permissions into building_role

-- 1. Ensure all data is migrated to building_role
-- Copy role='owner' to building_role where building_role='resident'
UPDATE profile_units
SET building_role = 'owner'
WHERE role = 'owner' AND building_role = 'resident';

-- 2. Drop constraint and column
ALTER TABLE profile_units DROP CONSTRAINT IF EXISTS profile_units_role_check;
ALTER TABLE profile_units DROP COLUMN IF EXISTS role;

-- Now profile_units only has building_role for permissions
-- building_role can be: 'board', 'resident', or 'owner'
