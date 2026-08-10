import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Inbox, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import {
  listMyNotifications,
  markNotificationsRead,
} from '../../services/supabaseData';
import type { NotificationRow, NotificationKind } from '../../types/database';
import { toast } from '../../utils/toast';

const KIND_LABEL: Record<NotificationKind, { icon: string; tone: string }> = {
  task_assigned: { icon: '📋', tone: 'bg-primary/10 text-primary' },
  task_updated: { icon: '🔄', tone: 'bg-muted text-muted-foreground' },
  task_completed: { icon: '✅', tone: 'bg-success/15 text-success' },
  task_published: { icon: '📋', tone: 'bg-primary/10 text-primary' },
  role_changed: { icon: '🎖️', tone: 'bg-gold-400/20 text-gold-700' },
  contribution_submitted: { icon: '💸', tone: 'bg-muted text-muted-foreground' },
  contribution_verified: { icon: '✅', tone: 'bg-success/15 text-success' },
  contribution_rejected: { icon: '⚠️', tone: 'bg-destructive/15 text-destructive' },
  donation_submitted: { icon: '💰', tone: 'bg-warning/15 text-warning' },
  announcement_posted: { icon: '📣', tone: 'bg-primary/10 text-primary' },
  news_posted: { icon: '📰', tone: 'bg-primary/10 text-primary' },
  meeting_scheduled: { icon: '📅', tone: 'bg-primary/10 text-primary' },
  rsvp_submitted: { icon: '✉️', tone: 'bg-info/15 text-info' },
  poll_vote: { icon: '🗳️', tone: 'bg-info/15 text-info' },
  record_published: { icon: '📊', tone: 'bg-success/15 text-success' },
  mention: { icon: '💬', tone: 'bg-muted text-muted-foreground' },
  system: { icon: '⚙️', tone: 'bg-muted text-muted-foreground' },
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

export const NotificationsTab: React.FC = () => {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const list = await listMyNotifications(filter === 'unread');
      setItems(list);
    } catch (err) {
      console.warn('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const handleClick = async (n: NotificationRow) => {
    if (!n.read_at) {
      try {
        await markNotificationsRead([n.id]);
        setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read_at: new Date().toISOString() } : p)));
      } catch { /* ignore */ }
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (ids.length === 0) return;
    try {
      await markNotificationsRead(ids);
      const now = new Date().toISOString();
      setItems((prev) => prev.map((p) => (p.read_at ? p : { ...p, read_at: now })));
      toast.success('All marked as read');
    } catch (err: any) {
      toast.error(err?.message || 'Failed');
    }
  };

  const unreadCount = items.filter((i) => !i.read_at).length;

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-3">
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Notifications
          {unreadCount > 0 && (
            <span className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">
              {unreadCount} unread
            </span>
          )}
        </CardTitle>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
            className="text-xs rounded border-input bg-background px-2 py-1 border"
          >
            <option value="all">All</option>
            <option value="unread">Unread only</option>
          </select>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
              onClick={handleMarkAll}>
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs text-muted-foreground">
              When something happens, you'll see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const meta = KIND_LABEL[n.kind];
              return (
                <motion.button
                  key={n.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left rounded-lg border p-3 flex items-start gap-3 hover:bg-muted/40 transition-colors ${
                    !n.read_at ? 'border-primary/30 bg-primary/5' : ''
                  }`}
                >
                  <div className={`inline-flex w-10 h-10 items-center justify-center rounded-lg ${meta.tone}`}>
                    <span className="text-xl leading-none">{meta.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{n.title}</p>
                      {!n.read_at && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      {n.link && (
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};