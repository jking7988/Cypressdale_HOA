// studioSupabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// In Sanity Studio, ONLY SANITY_STUDIO_* envs are guaranteed.
// We'll not rely on NEXT_PUBLIC_* here to avoid confusion.
const supabaseUrl = process.env.SANITY_STUDIO_SUPABASE_URL;
const supabaseAnonKey = process.env.SANITY_STUDIO_SUPABASE_ANON_KEY;

let supabase: any = null;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase chat: SANITY_STUDIO_SUPABASE_URL / SANITY_STUDIO_SUPABASE_ANON_KEY are not set. Team chat view will be disabled.',
  );
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
