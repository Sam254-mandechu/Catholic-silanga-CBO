import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load ALL env vars (not just VITE_* prefixed ones) so we can bridge
  // any naming conventions Vercel/Netlify might use.
  const env = loadEnv(mode, process.cwd(), '');

  // Order of precedence:
  //   1. VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (standard Vite)
  //   2. SUPABASE_URL / SUPABASE_ANON_KEY (some platforms)
  //   3. SUPABASE_DATABASE_URL (Netlify Supabase extension)
  //   4. Hardcoded fallbacks in src/config/supabaseClient.ts
  //
  // We don't hardcode here — we let the client module handle fallbacks
  // and just make sure Vite inlines whichever value we found.

  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    env.SUPABASE_DATABASE_URL ||
    '';

  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  const supabaseAdminEmail =
    env.VITE_ADMIN_EMAIL ||
    env.ADMIN_EMAIL ||
    '';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    // Explicitly inline these into the client bundle so they survive
    // even if Vercel's runtime env-var injection is misconfigured.
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_ADMIN_EMAIL': JSON.stringify(supabaseAdminEmail),
    },
  };
});