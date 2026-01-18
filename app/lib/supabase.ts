// app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // During build time on Vercel, if env vars are missing, we log a warning 
  // instead of crashing hard, unless the app tries to use the client.
  console.warn("⚠️ Supabase Credentials missing. Check your Vercel Environment Variables.");
}

// We provide fallback strings to prevent the build from crashing at import time.
// The app will still fail at runtime if these are invalid, but the build will pass.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co", 
  supabaseKey || "placeholder-key"
);