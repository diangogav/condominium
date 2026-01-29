import { createClient } from '@supabase/supabase-js';
import { Config } from '../core/config';

export const supabase = createClient(Config.SUPABASE_URL, Config.SUPABASE_KEY, {
    auth: {
        persistSession: false
    }
});
