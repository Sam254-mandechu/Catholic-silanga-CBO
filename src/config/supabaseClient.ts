import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Supabase configuration — reads from env vars, with hardcoded
// fallbacks so the deployed app always connects even if Vercel's
// env-var injection misbehaves.
//
// If you change your Supabase project, update the two FALLBACK
// values below. These are SAFE to expose because they're the
// public `anon` key (protected by RLS), not the `service_role` key.
// ============================================================

const ENV_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Hardcoded fallbacks — used only if Vercel env vars are missing.
// These match your project `eimivtfqwfvislxxhnac`.
const FALLBACK_URL = 'https://eimivtfqwfvislxxhnac.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbWl2dGZxd2Z2aXNseHhobmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NjgzMTksImV4cCI6MjEwMTE0NDMxOX0.eZks4JxSs_L6gW-cLOihukci0IXYL0yg1de5j7ylTYg';

const supabaseUrl = ENV_URL && ENV_URL !== 'https://your-project-ref.supabase.co'
  ? ENV_URL
  : FALLBACK_URL;

const supabaseAnonKey = ENV_KEY && ENV_KEY !== 'eyJhbGciOi...your-anon-key'
  ? ENV_KEY
  : FALLBACK_KEY;

// Allow the app to boot even without env vars set — services will throw helpful errors
// at runtime if you try to make real requests, but auth-context/dashboards still render.

export const isSupabaseConfigured: boolean = Boolean(supabaseUrl && supabaseAnonKey);

// Helpful diagnostic — visible in DevTools console on every page load.
if (typeof window !== 'undefined') {
  console.info(
    '[Supabase] URL=%s KEY=%sconfigured',
    supabaseUrl,
    isSupabaseConfigured ? '' : 'NOT ',
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'public-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'catholic-silanga-auth',
    },
  },
);