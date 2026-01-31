-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure we can find the functions
SET search_path = public, extensions;
-- Create admin user in auth.users
-- Password is 'admin123'
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@condominio.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    NULL,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
);
-- Generate identity for the user (required for some auth flows)
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT
    id,
    id,
    format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb,
    'email',
    id,
    now(),
    now(),
    now()
FROM auth.users
WHERE email = 'admin@condominio.com';
-- Create profile for admin
INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    status,
    created_at,
    updated_at
)
SELECT
    id,
    email,
    'Super Admin',
    'admin',
    'active',
    now(),
    now()
FROM auth.users
WHERE email = 'admin@condominio.com';
