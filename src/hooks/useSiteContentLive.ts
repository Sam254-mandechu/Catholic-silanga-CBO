import { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { getSiteContentMap } from '../services/supabaseData';
import type { SiteContentKey } from '../types/database';

/**
 * Subscribes to realtime changes on public.site_content and returns the
 * current values for the requested keys. Components re-render automatically
 * when an admin edits site content — no hard refresh needed.
 *
 * Usage:
 *   const map = useSiteContentLive(['welcome_message', 'mission', 'vision']);
 *   <p>{map.welcome_message ?? 'Default text…'}</p>
 *
 * Falls back to one-time fetch if realtime fails (e.g. table not in
 * supabase_realtime publication).
 */
export function useSiteContentLive(keys: readonly SiteContentKey[]) {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      try {
        const fresh = await getSiteContentMap(keys);
        if (mounted) setMap(fresh);
      } catch (err) {
        console.warn('useSiteContentLive: initial load failed', err);
      }
    };
    load();

    try {
      channel = supabase
        .channel(`site_content_${keys.join('_')}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'site_content' },
          (payload) => {
            const row = (payload.new ?? payload.old) as { key?: string; value?: string } | null;
            if (!row || !row.key) return;
            if (!keys.includes(row.key as SiteContentKey)) return;
            if (payload.eventType === 'DELETE') {
              setMap((prev) => {
                const copy = { ...prev };
                delete copy[row.key as string];
                return copy;
              });
            } else {
              setMap((prev) => ({ ...prev, [row.key as string]: row.value ?? '' }));
            }
          },
        )
        .subscribe();
    } catch (err) {
      console.warn('useSiteContentLive: realtime subscribe failed (one-time fetch only)', err);
    }

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join('|')]);

  return map;
}