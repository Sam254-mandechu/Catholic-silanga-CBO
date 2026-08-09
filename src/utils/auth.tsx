import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isAdminEmail } from '../config/adminConfig';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

interface Props {
  children: ReactNode;
}

/** While the auth state is hydrating from Supabase, show a spinner. */
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

export function RequireAuth({ children }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

/**
 * Gate for admin-only routes.
 *
 * 1. Loading -> spinner.
 * 2. No user -> /login.
 * 3. The signed-in email is on the VITE_ADMIN_EMAIL allow-list -> promote on
 *    the fly and let them through (this means even before they have a
 *    profile row, they'll be let in and the auth context will then promote
 *    them in a follow-up render).
 * 4. Profile.role === 'admin' -> /admin-dashboard.
 * 5. Otherwise -> /member-dashboard.
 */
export function RequireAdmin({ children }: Props) {
  const { isAdmin, profile, user, session, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  // Soft promotion check — if Supabase already bootstrapped but our profile
  // hasn't been picked up yet, allow if the session email is admin-listed.
  const email = session?.user?.email;
  if (!profile && email && isAdminEmail(email) && isSupabaseConfigured) {
    // Block render for a single tick so AuthContext can pick up the promotion.
    return <LoadingScreen />;
  }

  if (!profile) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/member-dashboard" replace />;

  return <>{children}</>;
}

export function RedirectIfAuth({ children }: Props) {
  const { user, profile, isAdmin, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname;

  if (loading) return <LoadingScreen />;
  if (user) {
    if (profile && isAdmin()) return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to={from || '/member-dashboard'} replace />;
  }
  return <>{children}</>;
}

/**
 * Gate for role-specific portals (secretary / treasurer).
 * Pass `allow={['secretary']}` to require that role. Admin is always allowed.
 * Non-matching users are sent to their member dashboard.
 */
export function RequireRole({
  allow,
  children,
}: {
  allow: Array<'admin' | 'secretary' | 'treasurer' | 'member' | 'moderator'>;
  children: ReactNode;
}) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/login" replace />;

  const role = profile.role;
  if (role === 'admin' || allow.includes(role)) {
    return <>{children}</>;
  }
  return <Navigate to="/member-dashboard" replace />;
}

/**
 * Decide where to send the user right after a successful login, based on role.
 * Admins go to /admin-dashboard; everyone else goes to /member-dashboard,
 * unless they were originally bounced from a specific protected route.
 */
export function defaultDashboardFor(profile: { role: string } | null | undefined, fallbackPath?: string): string {
  if (fallbackPath) return fallbackPath;
  const role = profile?.role;
  if (role === 'admin') return '/admin-dashboard';
    if (role === 'secretary') return '/secretary-portal';
  if (role === 'treasurer') return '/treasurer-portal';
  if (role === 'moderator') return '/moderator-portal';
  return '/member-dashboard';
}

// Small helper to expose supabase client for places that need to fetch the
// session email for routing decisions.
export { supabase };
