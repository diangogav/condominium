import { createClient } from '@supabase/supabase-js';
import { Config } from '../core/config';

export const supabase = createClient(Config.SUPABASE_URL, Config.SUPABASE_KEY, {
    auth: {
        persistSession: false
    }
});

export const supabaseAdmin = Config.SUPABASE_SERVICE_KEY
    ? createClient(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    })
    : supabase; // Fallback to anon client if no service key (will fail for RLS, but safe)
