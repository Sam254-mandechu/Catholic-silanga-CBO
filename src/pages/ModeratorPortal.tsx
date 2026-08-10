import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, Users, Newspaper, Megaphone, LogOut,
  CheckCircle, XCircle, Trash2, Plus, Save, Search, Pencil,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/toast';

import {
  getNewsAll, addNews, deleteNews, toggleNewsPublished, updateNews,
  getAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement,
} from '../services/supabaseData';
import { adminListPendingMembers, approveMember, suspendMember, unsuspendMember, adminListAllMembers } from '../services/supabaseAuth';
import type {
  Profile, News, Announcement, AnnouncementPriority,
  HierarchyRole,
} from '../types/database';
import { HIERARCHY_ORDER } from '../types/database';

type Tab = 'members' | 'news' | 'announcements' | 'overview';

const fmtDate = (iso: string): string => {
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
};

export const ModeratorPortal: React.FC = () => {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('members');

  // Members data
  const [pending, setPending] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');

  // News data
  const [news, setNews] = useState<News[]>([]);

  // Announcements data
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [p, n, a] = await Promise.all([
          adminListPendingMembers().catch(() => [] as Profile[]),
          getNewsAll().catch(() => [] as News[]),
          getAnnouncements().catch(() => [] as Announcement[]),
        ]);
        if (!mounted) return;
        setPending(p);
        setNews(n);
        setAnnouncements(a);
      } catch (err) {
        console.warn('Moderator data load failed', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const filteredPending = useMemo(() => {
    if (!search) return pending;
    const q = search.toLowerCase();
    return pending.filter((m) =>
      m.display_name.toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q) ||
      (m.member_code ?? '').toLowerCase().includes(q)
    );
  }, [pending, search]);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ];

  return (
    <section className="min-h-screen pt-24 pb-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold-400/10 rounded-full mb-2">
              <Shield className="w-4 h-4 text-gold-700" />
              <span className="text-xs font-semibold text-gold-700 uppercase tracking-wider">
                Moderator Portal
              </span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold">
              {profile?.display_name ?? 'Moderator'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage members, publish news and announcements.
            </p>
          </div>
          <Button variant="destructive" onClick={handleLogout} leftIcon={<LogOut className="w-4 h-4" />}>
            Logout
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <Card className="lg:sticky lg:top-24">
              <CardContent className="p-3">
                <nav className="space-y-1">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                        tab === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/5'
                      }`}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          <main className="lg:col-span-3 space-y-6">
            {loading && tab === 'overview' && (
              <div className="text-center py-12 text-muted-foreground">Loading…</div>
            )}

            {tab === 'overview' && !loading && (
              <OverviewTab
                pending={pending}
                news={news}
                announcements={announcements}
                setTab={setTab}
              />
            )}

            {tab === 'members' && (
              <MembersTab
                pending={filteredPending}
                search={search}
                setSearch={setSearch}
                setPending={setPending}
                allPendingCount={pending.length}
              />
            )}

            {tab === 'news' && (
              <NewsTab
                news={news}
                setNews={setNews}
              />
            )}

            {tab === 'announcements' && (
              <AnnouncementsTab
                announcements={announcements}
                setAnnouncements={setAnnouncements}
              />
            )}
          </main>
        </div>
      </div>
    </section>
  );
};

// ============================================================
// OVERVIEW TAB
// ============================================================
const OverviewTab: React.FC<{
  pending: Profile[];
  news: News[];
  announcements: Announcement[];
  setTab: (t: Tab) => void;
}> = ({ pending, news, announcements, setTab }) => {
  const draftNews = news.filter((n) => !n.published).length;
  const activeNews = news.filter((n) => n.published).length;
  const recentAnnouncements = announcements.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Pending members"
          value={String(pending.length)}
          accent={pending.length > 0 ? 'gold' : 'muted'}
          onClick={() => setTab('members')}
        />
        <StatCard label="Published news" value={String(activeNews)} accent="success" />
        <StatCard label="Draft news" value={String(draftNews)} accent={draftNews > 0 ? 'gold' : 'muted'} />
        <StatCard label="Announcements" value={String(announcements.length)} accent="primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Recent announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAnnouncements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentAnnouncements.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 border-b last:border-0 pb-3 last:pb-0">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2">{a.content}</div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    a.priority === 'high' ? 'bg-destructive/15 text-destructive' :
                    a.priority === 'medium' ? 'bg-gold-400/20 text-gold-700' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {a.priority}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================
// MEMBERS TAB
// ============================================================
const MembersTab: React.FC<{
  pending: Profile[];
  search: string;
  setSearch: (s: string) => void;
  setPending: (p: Profile[]) => void;
  allPendingCount: number;
}> = ({ pending, search, setSearch, setPending, allPendingCount }) => {
  const [filter, setFilter] = useState<'pending' | 'active' | 'suspended' | 'all'>('pending');
  const [allMembers, setAllMembers] = useState<Profile[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [approving, setApproving] = useState<Profile | null>(null);
  const [hierarchyChoice, setHierarchyChoice] = useState<HierarchyRole>('Member');
  const [suspending, setSuspending] = useState<Profile | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [unsuspending, setUnsuspending] = useState<Profile | null>(null);
  const [unsuspendReason, setUnsuspendReason] = useState('');
  const [viewing, setViewing] = useState<Profile | null>(null);

  // Load all members when filter leaves 'pending' (we already have pending)
  useEffect(() => {
    let mounted = true;
    if (filter !== 'pending') {
      (async () => {
        try {
          const status = filter === 'all' ? undefined : filter;
          const list = await adminListAllMembers(status);
          if (mounted) setAllMembers(list);
        } catch (err) {
          console.warn('Failed to load members for filter', filter, err);
          if (mounted) setAllMembers([]);
        }
      })();
    }
    return () => { mounted = false; };
  }, [filter]);

  const openApprove = (m: Profile) => {
    setApproving(m);
    setHierarchyChoice(m.hierarchy_role ?? 'Member');
  };

  const doApprove = async () => {
    if (!approving) return;
    setActing(approving.id);
    try {
      const updated = await approveMember(approving.id, hierarchyChoice);
      setPending(pending.filter((p) => p.id !== approving.id));
      toast.success(`${updated.display_name} approved as ${hierarchyChoice}`);
      setApproving(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to approve');
    } finally {
      setActing(null);
    }
  };

  const doSuspend = async () => {
    if (!suspending) return;
    setActing(suspending.id);
    try {
      await suspendMember(suspending.id, suspendReason || null);
      setPending(pending.filter((p) => p.id !== suspending.id));
      toast.success(`${suspending.display_name} suspended`);
      setSuspending(null);
      setSuspendReason('');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to suspend');
    } finally {
      setActing(null);
    }
  };

  const doUnsuspend = async () => {
    if (!unsuspending) return;
    setActing(unsuspending.id);
    try {
      await unsuspendMember(unsuspending.id, unsuspendReason || null);
      setAllMembers(allMembers.map((m) =>
        m.id === unsuspending.id ? { ...m, status: 'active' as const } : m
      ));
      toast.success(`${unsuspending.display_name} reactivated`);
      setUnsuspending(null);
      setUnsuspendReason('');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to reactivate');
    } finally {
      setActing(null);
    }
  };

  const filteredPending = useMemo(() => {
    if (!search) return pending;
    const q = search.toLowerCase();
    return pending.filter((m) =>
      m.display_name.toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q) ||
      (m.member_code ?? '').toLowerCase().includes(q)
    );
  }, [pending, search]);

  const filteredAll = useMemo(() => {
    if (!search) return allMembers;
    const q = search.toLowerCase();
    return allMembers.filter((m) =>
      m.display_name.toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q) ||
      (m.member_code ?? '').toLowerCase().includes(q)
    );
  }, [allMembers, search]);

  const counts = useMemo(() => ({
    pending: pending.length,
    active: filter === 'active' || filter === 'all' ? allMembers.filter((m) => m.status === 'active').length : '?',
    suspended: filter === 'suspended' || filter === 'all' ? allMembers.filter((m) => m.status === 'suspended').length : '?',
  }), [pending, allMembers, filter]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Members</CardTitle>
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="max-w-xs"
          />
        </div>
        <div className="flex gap-1 flex-wrap text-xs">
          {([
            { id: 'pending' as const, label: `Pending (${counts.pending})` },
            { id: 'active' as const, label: `Active (${counts.active})` },
            { id: 'suspended' as const, label: `Suspended (${counts.suspended})` },
            { id: 'all' as const, label: 'All' },
          ]).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                filter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/70'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {filter === 'pending' ? (
          filteredPending.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {allPendingCount === 0
                  ? 'No pending members to review.'
                  : 'No members match your search.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="py-2 font-semibold">Name</th>
                    <th className="py-2 font-semibold hidden md:table-cell">Email</th>
                    <th className="py-2 font-semibold hidden sm:table-cell">Requested role</th>
                    <th className="py-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPending.map((m) => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3">
                        <button
                          onClick={() => setViewing(m)}
                          className="font-medium text-left hover:text-primary transition-colors"
                        >
                          {m.display_name}
                        </button>
                        {m.member_code && (
                          <div className="text-xs text-muted-foreground">{m.member_code}</div>
                        )}
                      </td>
                      <td className="py-3 hidden md:table-cell text-xs text-muted-foreground">
                        {m.email}
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        {m.hierarchy_role ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gold-400/20 text-gold-700 font-semibold">
                            {m.hierarchy_role}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={acting === m.id}
                            onClick={() => openApprove(m)}
                            leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={acting === m.id}
                            onClick={() => { setSuspending(m); setSuspendReason(''); }}
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                          >
                            Suspend
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredAll.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No members with that status.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="py-2 font-semibold">Name</th>
                  <th className="py-2 font-semibold hidden md:table-cell">Email</th>
                  <th className="py-2 font-semibold hidden sm:table-cell">Role</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAll.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3">
                      <button
                        onClick={() => setViewing(m)}
                        className="font-medium text-left hover:text-primary transition-colors"
                      >
                        {m.display_name}
                      </button>
                      {m.member_code && (
                        <div className="text-xs text-muted-foreground">{m.member_code}</div>
                      )}
                    </td>
                    <td className="py-3 hidden md:table-cell text-xs text-muted-foreground">
                      {m.email}
                    </td>
                    <td className="py-3 hidden sm:table-cell">
                      {m.hierarchy_role ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                          {m.hierarchy_role}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                        m.status === 'active' ? 'bg-success/15 text-success' :
                        m.status === 'suspended' ? 'bg-destructive/15 text-destructive' :
                        'bg-gold-400/20 text-gold-700'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {m.status === 'suspended' && m.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={acting === m.id}
                          onClick={() => { setUnsuspending(m); setUnsuspendReason(''); }}
                        >
                          Reactivate
                        </Button>
                      )}
                      {m.status === 'suspended' && m.role === 'admin' && (
                        <span className="text-xs text-muted-foreground">Admin — protected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Approve modal */}
      {approving && (
        <Modal
          title={`Approve ${approving.display_name}`}
          onClose={() => setApproving(null)}
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pick a hierarchy position. The member will be activated and notified.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1.5">Hierarchy role</label>
              <select
                value={hierarchyChoice}
                onChange={(e) => setHierarchyChoice(e.target.value as HierarchyRole)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {HIERARCHY_ORDER.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setApproving(null)}>Cancel</Button>
              <Button
                onClick={doApprove}
                disabled={acting === approving.id}
                isLoading={acting === approving.id}
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Approve
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Suspend modal */}
      {suspending && (
        <Modal
          title={`Suspend ${suspending.display_name}`}
          onClose={() => setSuspending(null)}
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Optional reason — the member will see this on their dashboard.
            </p>
            <Textarea
              label="Reason (optional)"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              placeholder="e.g. Verification documents unclear"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSuspending(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={doSuspend}
                disabled={acting === suspending.id}
                isLoading={acting === suspending.id}
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                Suspend
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reactivate modal */}
      {unsuspending && (
        <Modal
          title={`Reactivate ${unsuspending.display_name}`}
          onClose={() => setUnsuspending(null)}
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Re-activate this account. Their existing hierarchy role is preserved.
              The member will be notified.
            </p>
            <Textarea
              label="Note (optional)"
              value={unsuspendReason}
              onChange={(e) => setUnsuspendReason(e.target.value)}
              rows={3}
              placeholder="e.g. Documentation verified"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setUnsuspending(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={doUnsuspend}
                disabled={acting === unsuspending.id}
                isLoading={acting === unsuspending.id}
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Reactivate
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Member detail modal */}
      {viewing && (
        <Modal title={viewing.display_name} onClose={() => setViewing(null)}>
          <div className="space-y-3 text-sm">
            {viewing.photo_url && (
              <img
                src={viewing.photo_url}
                alt={viewing.display_name}
                className="w-24 h-24 rounded-full object-cover mx-auto"
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Status</p>
                <span className={`inline-block text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                  viewing.status === 'active' ? 'bg-success/15 text-success' :
                  viewing.status === 'suspended' ? 'bg-destructive/15 text-destructive' :
                  'bg-gold-400/20 text-gold-700'
                }`}>
                  {viewing.status}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Role</p>
                <p>{viewing.role}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Hierarchy position</p>
              <p>{viewing.hierarchy_role ?? 'Member'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Email</p>
              <a href={`mailto:${viewing.email}`} className="text-primary hover:underline">
                {viewing.email}
              </a>
            </div>
            {viewing.phone && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Phone</p>
                <a href={`tel:${viewing.phone.replace(/\s/g, '')}`} className="text-primary hover:underline">
                  {viewing.phone}
                </a>
              </div>
            )}
            {viewing.address && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Address</p>
                <p className="whitespace-pre-line">{viewing.address}</p>
              </div>
            )}
            {viewing.bio && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Bio</p>
                <p className="whitespace-pre-line">{viewing.bio}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Joined</p>
                <p>{fmtDate(viewing.joined_at)}</p>
              </div>
              {viewing.member_code && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Member code</p>
                  <p className="font-mono">{viewing.member_code}</p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};

// ============================================================
// NEWS TAB
// ============================================================
const NewsTab: React.FC<{
  news: News[];
  setNews: (n: News[]) => void;
}> = ({ news, setNews }) => {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<News | null>(null);
  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'Community',
    image: '',
    tags: '',
    publishNow: true,
  });

  const resetForm = () =>
    setForm({ title: '', excerpt: '', content: '', category: 'Community', image: '', tags: '', publishNow: true });

  const openCreate = () => {
    resetForm();
    setCreating(true);
  };

  const openEdit = (n: News) => {
    setForm({
      title: n.title,
      excerpt: n.excerpt ?? '',
      content: n.content ?? '',
      category: n.category ?? 'Community',
      image: n.image ?? '',
      tags: (n.tags ?? []).join(', '),
      publishNow: n.published,
    });
    setEditing(n);
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    try {
      const created = await addNews({
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || form.title.trim().slice(0, 100),
        content: form.content.trim(),
        image: form.image.trim() || null,
        author: 'CBO Team',
        category: form.category,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        published: form.publishNow,
      });
      setNews([created, ...news]);
      toast.success(form.publishNow ? 'News published' : 'Draft saved');
      setCreating(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create news');
    }
  };

  const handleEdit = async () => {
    if (!editing) return;
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    try {
      const updated = await updateNews(editing.id, {
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || form.title.trim().slice(0, 100),
        content: form.content.trim(),
        image: form.image.trim() || null,
        category: form.category,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        published: form.publishNow,
      });
      setNews(news.map((x) => (x.id === editing.id ? updated : x)));
      toast.success('News updated');
      setEditing(null);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update news');
    }
  };

  const handleToggle = async (n: News) => {
    try {
      await toggleNewsPublished(n.id, !n.published);
      setNews(news.map((x) => (x.id === n.id ? { ...x, published: !n.published } : x)));
      toast.success(n.published ? 'Unpublished' : 'Published');
    } catch (err: any) {
      toast.error(err?.message ?? 'Toggle failed');
    }
  };

  const handleDelete = async (n: News) => {
    if (!window.confirm(`Delete "${n.title}"?`)) return;
    try {
      await deleteNews(n.id);
      setNews(news.filter((x) => x.id !== n.id));
      toast.success('Deleted');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle>News ({news.length})</CardTitle>
        <Button
          onClick={openCreate}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New article
        </Button>
      </CardHeader>
      <CardContent>
        {news.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No news yet. Click "New article" to publish.
          </p>
        ) : (
          <div className="space-y-2">
            {news.map((n) => (
              <div key={n.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{n.title}</p>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      n.published ? 'bg-success/15 text-success' : 'bg-gold-400/20 text-gold-700'
                    }`}>
                      {n.published ? 'published' : 'draft'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{n.excerpt}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {n.category} · {fmtDate(n.created_at)}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggle(n)}
                  >
                    {n.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(n)}
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(n)}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {creating && (
        <Modal title="New article" onClose={() => setCreating(false)} wide>
          <div className="space-y-3">
            <Input
              label="Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              label="Excerpt"
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="Short summary (defaults to first 100 chars of title)"
            />
            <Textarea
              label="Content *"
              rows={6}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <Input
                label="Tags (comma-separated)"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>
            <Input
              label="Image URL (optional)"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://..."
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.publishNow}
                onChange={(e) => setForm({ ...form, publishNow: e.target.checked })}
                className="rounded"
              />
              Publish immediately
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {form.publishNow ? 'Publish' : 'Save draft'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={`Edit: ${editing.title}`} onClose={() => setEditing(null)} wide>
          <div className="space-y-3">
            <Input
              label="Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              label="Excerpt"
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="Short summary (defaults to first 100 chars of title)"
            />
            <Textarea
              label="Content *"
              rows={6}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <Input
                label="Tags (comma-separated)"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>
            <Input
              label="Image URL (optional)"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://..."
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.publishNow}
                onChange={(e) => setForm({ ...form, publishNow: e.target.checked })}
                className="rounded"
              />
              Published
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button
                onClick={handleEdit}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save changes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};

// ============================================================
// ANNOUNCEMENTS TAB
// ============================================================
const AnnouncementsTab: React.FC<{
  announcements: Announcement[];
  setAnnouncements: (a: Announcement[]) => void;
}> = ({ announcements, setAnnouncements }) => {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'medium' as AnnouncementPriority,
    expires_at: '',
  });

  const resetForm = () =>
    setForm({ title: '', content: '', priority: 'medium', expires_at: '' });

  const openCreate = () => {
    resetForm();
    setCreating(true);
  };

  const openEdit = (a: Announcement) => {
    setForm({
      title: a.title,
      content: a.content,
      priority: a.priority,
      expires_at: a.expires_at ? a.expires_at.slice(0, 10) : '',
    });
    setEditing(a);
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    try {
      const created = await addAnnouncement({
        title: form.title.trim(),
        content: form.content.trim(),
        priority: form.priority,
        expires_at: form.expires_at || null,
      });
      setAnnouncements([created, ...announcements]);
      toast.success('Announcement posted');
      setCreating(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to post');
    }
  };

  const handleEdit = async () => {
    if (!editing) return;
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    try {
      const updated = await updateAnnouncement(editing.id, {
        title: form.title.trim(),
        content: form.content.trim(),
        priority: form.priority,
        expires_at: form.expires_at || null,
      });
      setAnnouncements(announcements.map((x) => (x.id === editing.id ? updated : x)));
      toast.success('Announcement updated');
      setEditing(null);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update');
    }
  };

  const handleDelete = async (a: Announcement) => {
    if (!window.confirm(`Delete "${a.title}"?`)) return;
    try {
      await deleteAnnouncement(a.id);
      setAnnouncements(announcements.filter((x) => x.id !== a.id));
      toast.success('Deleted');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle>Announcements ({announcements.length})</CardTitle>
        <Button
          onClick={openCreate}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New announcement
        </Button>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No announcements yet.
          </p>
        ) : (
          <ul className="divide-y">
            {announcements.map((a) => (
              <li key={a.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{a.title}</p>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      a.priority === 'high' ? 'bg-destructive/15 text-destructive' :
                      a.priority === 'medium' ? 'bg-gold-400/20 text-gold-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {a.priority}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Posted {fmtDate(a.published_at)}
                    {a.expires_at && ` · expires ${fmtDate(a.expires_at)}`}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(a)}
                    leftIcon={<Pencil className="w-3.5 h-3.5" />}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(a)}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {creating && (
        <Modal title="New announcement" onClose={() => setCreating(false)}>
          <div className="space-y-3">
            <Input
              label="Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Textarea
              label="Content *"
              rows={5}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1.5">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as AnnouncementPriority })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <Input
                label="Expires (optional)"
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                leftIcon={<Megaphone className="w-4 h-4" />}
              >
                Post
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={`Edit: ${editing.title}`} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <Input
              label="Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Textarea
              label="Content *"
              rows={5}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1.5">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as AnnouncementPriority })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <Input
                label="Expires (optional)"
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button
                onClick={handleEdit}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save changes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};

// ============================================================
// STAT CARD
// ============================================================
const StatCard: React.FC<{
  label: string;
  value: string;
  accent: 'success' | 'gold' | 'muted' | 'primary';
  onClick?: () => void;
}> = ({ label, value, accent, onClick }) => {
  const tone: Record<typeof accent, string> = {
    success: 'text-success',
    gold: 'text-gold-700',
    muted: 'text-muted-foreground',
    primary: 'text-primary',
  };
  const inner = (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className={`text-3xl font-bold font-mono ${tone[accent]}`}>{value}</div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-1">
          {label}
        </div>
      </CardContent>
    </Card>
  );
  if (onClick) {
    return (
      <button onClick={onClick} className="text-left">
        {inner}
      </button>
    );
  }
  return inner;
};

export default ModeratorPortal;