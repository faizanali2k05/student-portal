const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";

// The CDN declares 'supabase' as the library namespace globally.
// We reassign it to hold the initialized client instance instead.
supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
