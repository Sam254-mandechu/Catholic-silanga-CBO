import { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';
import type { Profile } from '../types/database';

/**
 * Subscribes to realtime changes on public.profiles.
 * Returns the current list (initial fetch + live updates).
 *
 * Usage:
 *   const members = useProfilesLive({ where: { status: 'active' }, orderBy: 'hierarchy_role' });
 *
 * If `userId` is provided, only fires a callback when that user's row changes
 * (useful for navbar avatar refresh). When `userId` is omitted, returns the
 * full list.
 */

type Filter = (p: Profile) => boolean;

interface Options {
  /** Optional predicate to filter the list (applied client-side). */
  filter?: Filter;
  /** Only react to changes for this user id (sets a callback instead of list). */
  watchUserId?: string;
  /** Optional callback fired whenever the watched user's row changes. */
  onUserChange?: (p: Profile) => void;
}

export function useProfilesLive(options: Options = {}) {
  const { filter, watchUserId, onUserChange } = options;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const refresh = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('hierarchy_role', { ascending: true });
        if (error) throw error;
        if (!mounted) return;
        let list = (data ?? []) as Profile[];
        if (filter) list = list.filter(filter);
        setProfiles(list);
        setLoading(false);
      } catch (err) {
        console.warn('useProfilesLive: fetch failed', err);
        if (mounted) setLoading(false);
      }
    };
    refresh();

    try {
      channel = supabase
        .channel('profiles_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          (payload) => {
            const row = (payload.new ?? payload.old) as Profile | null;
            if (!row) return;

            // Single-user watch mode
            if (watchUserId && row.id === watchUserId && payload.eventType !== 'DELETE') {
              onUserChange?.(row);
            }

            // Full-list mode
            setProfiles((prev) => {
              if (payload.eventType === 'DELETE') {
                const old = payload.old as { id: string };
                return prev.filter((p) => p.id !== old.id);
              }
              const next = (payload.new as Profile);
              const idx = prev.findIndex((p) => p.id === next.id);
              let list: Profile[];
              if (idx === -1) {
                list = [...prev, next];
              } else {
                list = [...prev];
                list[idx] = next;
              }
              return filter ? list.filter(filter) : list;
            });
          },
        )
        .subscribe();
    } catch (err) {
      console.warn('useProfilesLive: realtime subscribe failed', err);
    }

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchUserId, filter?.toString()]);

  return { profiles, loading };
}