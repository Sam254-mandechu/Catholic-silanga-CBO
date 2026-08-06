import { supabase } from '../config/supabaseClient';
import { isAdminEmail } from '../config/adminConfig';
import type { Profile, Role, HierarchyRole } from '../types/database';

export interface AuthError extends Error {
  status?: number;
}

// ---------- Account creation ----------

export interface SignUpInput {
  email: string;
  password: string;
  display_name: string;
  national_id: string;
  member_code: string;       // CBO-issued member code, e.g. "CBO-2025-014"
  position_requested: HierarchyRole;  // position they claim to hold
  phone?: string;
}

/**
 * Register a new member.
 * The user fills out: name, national id, member code, requested position.
 * They go into the profiles table with status='pending'. The admin then
 * verifies them in the admin dashboard → marks status='active' and
 * approves the hierarchy role (or assigns a different one).
 */
export async function signUp(input: SignUpInput): Promise<Profile> {
  const { email, password, display_name, national_id, member_code, position_requested, phone } = input;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name,
        national_id,
        member_code,
        hierarchy_role: position_requested,
        phone: phone ?? null,
      },
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
    },
  });

  if (error) throw toAppError(error);
  if (!data.user) throw new Error('Sign up failed: no user returned');

  // Always create or update the profile row explicitly so the new columns are present.
  // (The trigger does an INSERT with defaults; we then UPDATE with the registration data.)
  const { error: upsertErr } = await supabase.from('profiles').upsert({
    id: data.user.id,
    email,
    display_name,
    national_id,
    member_code,
    hierarchy_role: position_requested,
    phone: phone ?? null,
    role: 'member',
    status: 'pending',
    email_verified: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (upsertErr) {
    // Not fatal: trigger-created profile will still exist
    console.warn('profile upsert failed (non-fatal):', upsertErr.message);
  }

  if (data.session) {
    const profile = await getProfile(data.user.id);
    if (profile) {
      // Magic-admin: if this email is configured in VITE_ADMIN_EMAIL, promote them now.
      return (await autoPromoteIfAdminEmail(email, profile)) ?? profile;
    }
  }

  // Pending state — never logged in until admin approves.
  const pendingProfile: Profile = {
    id: data.user.id,
    email,
    display_name,
    role: 'member',
    status: 'pending',
    phone: phone ?? null,
    address: null,
    bio: null,
    photo_url: null,
    email_verified: false,
    joined_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    national_id,
    member_code,
    hierarchy_role: position_requested,
    verified_at: null,
  };
  return (await autoPromoteIfAdminEmail(email, pendingProfile)) ?? pendingProfile;
}

// ---------- Login / logout ----------

export async function signIn(email: string, password: string): Promise<Profile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw toAppError(error);
  if (!data.user) throw new Error('Login failed');

  // Magic-admin: bypass the pending gate if email is configured as admin.
  // We force the status='active' promotion BEFORE the getProfile check.
  let profile = await getProfile(data.user.id);
  if (!profile) throw new Error('Profile missing for this account');

  if (isAdminEmail(email)) {
    const promoted = await autoPromoteIfAdminEmail(email, profile);
    if (promoted) profile = promoted;
  } else {
    // Normal flow — pending members can't sign in
    if (profile.status === 'pending') {
      await supabase.auth.signOut();
      throw new Error('Your account is awaiting administrator verification. Please try again later.');
    }
    if (profile.status === 'suspended') {
      await supabase.auth.signOut();
      throw new Error('Your account has been suspended. Please contact the administrator.');
    }
  }
  return profile;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
  });
  if (error) throw toAppError(error);
}

export async function verifyEmailOtp(token: string, type: 'signup' | 'email_change' | 'recovery' = 'signup'): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ token_hash: token, type });
  if (error) throw toAppError(error);
}

// ---------- Profile ----------

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw toAppError(error);
  return data as Profile | null;
}

export async function updateOwnProfile(patch: Partial<Pick<Profile, 'display_name' | 'phone' | 'address' | 'bio' | 'photo_url'>>): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('*')
    .single();
  if (error) throw toAppError(error);
  return data as Profile;
}

// ---------- Admin: verify / hierarchy / role management ----------

/** All profiles (any status). Admin-only. */
export async function adminListProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('joined_at', { ascending: false });
  if (error) throw toAppError(error);
  return (data ?? []) as Profile[];
}

/** Profiles that are awaiting admin verification (status = 'pending'). */
export async function adminListPendingMembers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'pending')
    .order('joined_at', { ascending: false });
  if (error) throw toAppError(error);
  return (data ?? []) as Profile[];
}

/** Approved members ordered by hierarchy position. Used for the public /members page. */
export async function listApprovedMembersByHierarchy(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'active')
    .order('hierarchy_role', { ascending: true });
  if (error) throw toAppError(error);
  return (data ?? []) as Profile[];
}

/**
 * Admin verifies a pending member. They can override the requested hierarchy role
 * (e.g. someone requested "Chairperson" but admin knows that spot is taken).
 */
export async function adminVerifyMember(
  id: string,
  opts: {
    approved_hierarchy_role?: HierarchyRole | null;
    admin_note?: string;
  } = {},
): Promise<Profile> {
  const updates: Record<string, any> = {
    status: 'active',
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (opts.approved_hierarchy_role !== undefined) {
    updates.hierarchy_role = opts.approved_hierarchy_role;
  }
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select('*').single();
  if (error) throw toAppError(error);
  return data as Profile;
}

export async function adminRejectMember(id: string, reason?: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      status: 'suspended',
      admin_note: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw toAppError(error);
  return data as Profile;
}

export async function adminUpdateProfileRole(id: string, role: Role): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
  if (error) throw toAppError(error);
}

export async function adminUpdateProfileHierarchyRole(id: string, hierarchy_role: HierarchyRole | null): Promise<void> {
  const { error } = await supabase.from('profiles').update({ hierarchy_role, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw toAppError(error);
}

/**
 * Admin edits another member's profile fields (display name, phone, address,
 * bio, photo URL, hierarchy role). Bypasses RLS via SECURITY DEFINER RPC when
 * available; falls back to a direct UPDATE if the RPC isn't installed.
 */
export async function adminUpdateMember(
  id: string,
  patch: {
    display_name?: string;
    phone?: string | null;
    address?: string | null;
    bio?: string | null;
    photo_url?: string | null;
    hierarchy_role?: HierarchyRole | null;
  },
): Promise<Profile> {
  const updateRow = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  // Try the secure RPC path first
  try {
    const { data, error } = await supabase.rpc('admin_update_member', {
      target_user_id: id,
      patch: updateRow,
    });
    if (!error && data) return data as Profile;
    if (error && !/does not exist/i.test(error.message)) throw toAppError(error);
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) throw err;
  }

  // Fallback: direct update (requires admin privileges via RLS).
  const { data, error } = await supabase
    .from('profiles')
    .update(updateRow)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw toAppError(error);
  return data as Profile;
}

export async function adminDeleteProfile(id: string): Promise<void> {
  await adminRejectMember(id, 'Deleted by administrator');
}

/**
 * Hard-delete a member. Uses the database RPC `admin_delete_member(target_user_id)`
 * so that RLS-protected cascading deletes (auth user, related rows) happen in one
 * server-side transaction. The RPC returns boolean (true on success).
 *
 * Falls back to a soft-delete via `adminDeleteProfile` if the RPC isn't installed
 * yet (e.g. on older schemas where schema_v5.sql hasn't been applied).
 */
export async function adminDeleteMember(target_user_id: string): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('admin_delete_member', { target_user_id });
    if (!error) {
      if (data === false) throw new Error('Member could not be deleted');
      return;
    }
    if (!/does not exist/i.test(error.message)) throw toAppError(error);
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) {
      // RPC exists but failed — bubble up.
      throw toAppError(err);
    }
    // RPC missing → fall through to soft-delete.
  }
  await adminDeleteProfile(target_user_id);
}

/**
 * Set a profile's *system role* (admin | moderator | secretary | treasurer | member).
 * This is distinct from `hierarchy_role`, which describes the CBO's organisational
 * position (Chairperson, Secretary, etc.).
 *
 * Goes through the SECURITY DEFINER RPC `admin_set_system_role(target_user_id, new_role)`
 * which validates the requested role against the allowed set and enforces admin-only
 * callers. Returns the updated Profile row.
 *
 * Falls back to a direct UPDATE via `adminUpdateProfileRole` if the RPC isn't
 * installed yet.
 */
export async function adminSetSystemRole(
  target_user_id: string,
  new_role: Role,
): Promise<Profile> {
  try {
    const { data, error } = await supabase.rpc('admin_set_system_role', {
      target_user_id,
      new_role,
    });
    if (!error) return data as Profile;
    if (!/does not exist/i.test(error.message)) throw toAppError(error);
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) {
      throw toAppError(err);
    }
  }
  // RPC missing — direct fallback (will fail RLS unless caller is admin).
  await adminUpdateProfileRole(target_user_id, new_role);
  return (await getProfile(target_user_id)) ?? Promise.reject(new Error('Profile not found after update'));
}

export async function promoteCurrentUserToAdmin(): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  await adminUpdateProfileRole(user.id, 'admin');
  return (await getProfile(user.id))!;
}

// ---------- Magic-admin helpers ----------

/**
 * Calls the database RPC `promote_admin_by_email(target_email)`. This runs
 * with SECURITY DEFINER, so it can update the caller's profile even when
 * the user is not yet an admin (RLS chicken-and-egg).
 *
 * Two paths to promotion:
 *  (a) the auth.users trigger in schema_v3.sql auto-promotes on first
 *      sign-in if the email is on the allow-list (so the database does
 *      the work); OR
 *  (b) the frontend calls this RPC explicitly (defensive fallback for
 *      installs where the trigger isn't present yet).
 *
 * Returns the (possibly updated) profile.
 */
export async function autoPromoteIfAdminEmail(email: string, currentProfile?: Profile | null): Promise<Profile | null> {
  if (!isAdminEmail(email)) return currentProfile ?? null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return currentProfile ?? null;
  if (user.email?.toLowerCase() !== email.trim().toLowerCase()) return currentProfile ?? null;

  // Already admin? nothing to do.
  if (currentProfile?.role === 'admin' && currentProfile?.status === 'active') {
    return currentProfile;
  }

  try {
    // Prefer the secure RPC path. It will fail silently if the function
    // doesn't exist yet — we then fall back to a direct UPDATE.
    const { data, error } = await supabase.rpc('promote_admin_by_email', {
      target_email: email,
    });
    if (!error && data) {
      return data as Profile;
    }
    if (error && !/does not exist/i.test(error.message)) {
      throw error;
    }
  } catch (err: any) {
    console.warn('promote_admin_by_email RPC unavailable, falling back:', err?.message);
  }

  // ---- Fallback: direct update (works only if RLS allows it) ----
  const updates: Record<string, any> = {
    role: 'admin',
    status: 'active',
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (!currentProfile?.hierarchy_role) updates.hierarchy_role = 'Chairperson';

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from('profiles').insert({
      id: user.id,
      email,
      display_name: currentProfile?.display_name ?? (user.email?.split('@')[0] ?? 'Admin'),
      role: 'admin',
      status: 'active',
      hierarchy_role: 'Chairperson',
      email_verified: !!user.email_confirmed_at,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return (await getProfile(user.id)) ?? null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) {
    console.warn('autoPromoteIfAdminEmail fallback UPDATE failed:', error.message);
    return currentProfile ?? null;
  }
  return data as Profile;
}

// ---------- Helpers ----------

function toAppError(err: any): AuthError {
  const e: AuthError = new Error(err?.message ?? 'Unexpected authentication error');
  e.status = err?.status;
  ;(e as any).raw = err;
  return e;
}
