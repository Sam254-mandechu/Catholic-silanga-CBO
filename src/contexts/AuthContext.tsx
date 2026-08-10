import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import { isAdminEmail } from '../config/adminConfig';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import {
  getProfile,
  signIn as svcSignIn,
  signUp as svcSignUp,
  signOut as svcSignOut,
  sendPasswordReset as svcReset,
  updateOwnProfile,
  autoPromoteIfAdminEmail,
} from '../services/supabaseAuth';
import type { SignUpInput as SignUpPayload } from '../services/supabaseAuth';
import type { Profile, Role, HierarchyRole } from '../types/database';

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;

  login: (email: string, password: string) => Promise<Profile>;
  register: (
    email: string,
    password: string,
    displayName: string,
    extra: {
      national_id: string;
      member_code: string;
      position_requested: HierarchyRole;
      phone?: string;
    },
  ) => Promise<Profile>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (
    patch: Partial<
      Pick<Profile, 'display_name' | 'phone' | 'address' | 'bio' | 'photo_url'>
    >,
  ) => Promise<Profile>;
  refreshProfile: () => Promise<void>;

  isAdmin: () => boolean;
  isMember: () => boolean;
  needsEmailVerification: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }
    try {
      const p = await getProfile(session.user.id);
      setProfile(p);
    } catch (err) {
      console.warn('refreshProfile failed', err);
      setProfile(null);
    }
  }, [session?.user?.id]);

  // Live-refresh the current user's profile whenever their row changes
  // (photo upload, display name change, role change, etc.). This makes the
  // navbar avatar, MemberDashboard header, and any other surface reading
  // `profile.photo_url` update instantly across all open tabs — like
  // Facebook/Instagram profile picture propagation.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`profile_self_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            const next = payload.new as Profile | null;
            if (next) setProfile(next);
          },
        )
        .subscribe();
    } catch (err) {
      console.warn('AuthContext: profile realtime subscribe failed', err);
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const loadProfileFor = useCallback(async (userId: string, email: string | null | undefined) => {
    let p = await getProfile(userId);
    if (p && email && isAdminEmail(email)) {
      const promoted = await autoPromoteIfAdminEmail(email, p);
      if (promoted) p = promoted;
    }
    return p;
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        try {
          const p = await loadProfileFor(newSession.user.id, newSession.user.email);
          setProfile(p);
        } catch (err) {
          console.warn('Profile load failed:', err);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        try {
          const p = await loadProfileFor(data.session.user.id, data.session.user.email);
          setProfile(p);
        } catch (err) {
          console.warn('Profile load failed:', err);
        }
      }
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadProfileFor]);

  const login = async (email: string, password: string) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const p = await svcSignIn(email, password);
    setProfile(p);
    return p;
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
    extra: {
      national_id: string;
      member_code: string;
      position_requested: HierarchyRole;
      phone?: string;
    },
  ) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const payload: SignUpPayload = {
      email,
      password,
      display_name: displayName,
      national_id: extra.national_id,
      member_code: extra.member_code,
      position_requested: extra.position_requested,
      phone: extra.phone,
    };
    const p = await svcSignUp(payload);
    setProfile(p);
    return p;
  };

  const logout = async () => {
    if (!isSupabaseConfigured) return;
    await svcSignOut();
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    await svcReset(email);
  };

  const updateProfile = async (
    patch: Parameters<typeof updateOwnProfile>[0],
  ) => {
    const p = await updateOwnProfile(patch);
    setProfile(p);
    return p;
  };

  const isAdmin = (): boolean => profile?.role === ('admin' as Role);
  const isMember = (): boolean => profile?.role === 'admin' || profile?.role === 'member';
  const needsEmailVerification = (): boolean =>
    isSupabaseConfigured && !!session && session.user?.email_confirmed_at === null;

  const value: AuthContextType = {
    user: session?.user ?? null,
    session,
    profile,
    loading,
    configured: isSupabaseConfigured,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    refreshProfile,
    isAdmin,
    isMember,
    needsEmailVerification,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
