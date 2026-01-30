export class Config {
    static readonly ENV = process.env.NODE_ENV || 'development';
    static readonly PORT = process.env.PORT || 3000;
    static readonly SUPABASE_URL = process.env.SUPABASE_URL || '';
    static readonly SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';
    static readonly SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}
