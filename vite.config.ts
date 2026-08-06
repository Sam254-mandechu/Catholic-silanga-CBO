import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // The Netlify Supabase extension provisions SUPABASE_DATABASE_URL (the
  // project URL) and SUPABASE_ANON_KEY, but only VITE_-prefixed vars are
  // exposed to client code by default. Bridge them here so the app's
  // existing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY keep working,
  // while still allowing an explicit .env override for local dev.
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_DATABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

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
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
  };
});
