-- Add status column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'inactive', 'rejected'));

-- Update role check constraint to include 'board'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('resident', 'admin', 'board'));
