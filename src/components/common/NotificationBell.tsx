import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import {
  listMyNotifications,
  markNotificationsRead,
  unreadNotificationCount,
} from '../../services/supabaseData';
import type { NotificationRow, NotificationKind } from '../../types/database';

const KIND_ICON: Record<NotificationKind, string> = {
  task_assigned: '📋',
  task_updated: '🔄',
  task_completed: '✅',
  role_changed: '🎖️',
  contribution_submitted: '💸',
  contribution_verified: '✅',
  contribution_rejected: '⚠️',
  announcement_posted: '📣',
  mention: '💬',
  system: '⚙️',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch on mount and every 30s
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const [list, count] = await Promise.all([
          listMyNotifications(false),
          unreadNotificationCount(),
        ]);
        if (!cancelled) {
          setItems(list);
          setUnread(count);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) setLoading(false);
      }
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleClick = async (n: NotificationRow) => {
    // Mark as read
    if (!n.read_at) {
      try {
        await markNotificationsRead([n.id]);
        setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read_at: new Date().toISOString() } : p)));
        setUnread((u) => Math.max(0, u - 1));
      } catch { /* ignore */ }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (ids.length === 0) return;
    try {
      await markNotificationsRead(ids);
      const now = new Date().toISOString();
      setItems((prev) => prev.map((p) => (p.read_at ? p : { ...p, read_at: now })));
      setUnread(0);
    } catch { /* ignore */ }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        className="relative p-2 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground"
            aria-label={`${unread} unread`}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-1rem)] bg-card border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
              <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notifications
                {unread > 0 && (
                  <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                    {unread} new
                  </span>
                )}
              </h3>
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  aria-label="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {loading && (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
              )}
              {!loading && items.length === 0 && (
                <div className="p-8 text-center">
                  <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">No notifications yet</p>
                  <p className="text-xs text-muted-foreground">
                    We'll let you know when something happens.
                  </p>
                </div>
              )}
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b last:border-0 hover:bg-muted/40 transition-colors flex items-start gap-3 ${
                    !n.read_at ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="text-xl leading-none mt-0.5 flex-shrink-0">
                    {KIND_ICON[n.kind] ?? '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm line-clamp-1">{n.title}</p>
                      {!n.read_at && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" aria-label="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="px-4 py-2 border-t bg-muted/20 flex justify-between items-center">
              <Link
                to="/member-dashboard?tab=notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-primary hover:underline"
              >
                View all
              </Link>
              <span className="text-[10px] text-muted-foreground">
                Auto-refreshes every 30s
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};