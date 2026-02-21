const SUPABASE_URL = "https://igrhccupaewbtxlhyqej.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncmhjY3VwYWV3YnR4bGh5cWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDMzNTMsImV4cCI6MjA4NzE3OTM1M30.Y_rQ1Gz2pXEvCNhs-IgNAB0hzLUeUeBwpI6Ojb0Hzlk";

// The CDN declares 'supabase' as the library namespace globally.
// We reassign it to hold the initialized client instance instead.
supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
