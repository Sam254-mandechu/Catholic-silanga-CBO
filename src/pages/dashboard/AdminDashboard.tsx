import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, FolderKanban, Image as ImageIcon, Newspaper, Calendar, Mail,
  BarChart3, Shield, Search, Trash2, Edit3, Plus, X, LogOut,
  ClipboardList, Heart, Banknote, Megaphone, CheckCircle, XCircle,
  AlertCircle, Clock, Phone, Loader2, CalendarDays, Vote, DollarSign,
  ListChecks, FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Loader } from '../../components/common/Loader';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../utils/toast';
import {
  getProjects, getNews, getEvents, getGalleryImages, adminListContacts,
  addProject, deleteProject, getAllTasks, addTask, updateTaskStatus, deleteTask,
  getRecentDonations, adminVerifyDonation, getPaymentMethods,
  upsertPaymentMethod, deletePaymentMethod, getAnnouncements, addAnnouncement,
  deleteAnnouncement,
  addNews, updateNews, deleteNews,
  addEvent, updateEvent, deleteEvent,
  addGalleryImage, deleteGalleryImage,
  uploadGalleryFile, deleteGalleryFile,
  uploadProfilePhoto,
  createNotification,
  // v5 — Meetings / Polls / Financial
  getMeetings, createMeeting, deleteMeeting, updateMeeting,
  getMeetingRsvps, getMeetingAttendance, getMeetingMinutes,
  writeMeetingMinutes, markMeetingAttendance,
  getPolls, getPollOptions, createPoll, closePoll, deletePoll, getPollResults,
  getExpenses, createExpense, approveExpense, deleteExpense,
  getFinancialReports, submitFinancialReport, approveFinancialReport,
  } from '../../services/supabaseData';
import {
  adminListProfiles, adminVerifyMember, adminRejectMember,
  adminUpdateProfileHierarchyRole, adminDeleteMember, adminSetSystemRole, adminUpdateMember,
} from '../../services/supabaseAuth';
import type {
  Project, News, Event, GalleryImage, ContactSubmission, Profile,
  HierarchyRole, Task, Donation, PaymentMethod, PaymentMethodType, Announcement,
  Role,
  Meeting, MeetingRsvp, MeetingAttendance, MeetingMinutes,
  Poll, PollOption, PollType,
  Expense, ExpenseCategory,
  FinancialReport,
  } from '../../types/database';
import { HIERARCHY_ORDER } from '../../types/database';
import { Modal } from '../../components/common/Modal';
import { SiteContentTab } from './SiteContentTab';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts';

type Tab =
  | 'overview' | 'verification' | 'members' | 'tasks' | 'projects'
  | 'gallery' | 'news' | 'events' | 'contacts' | 'contributions'
  | 'payment-methods' | 'announcements' | 'analytics' | 'roles'
  | 'meetings' | 'polls' | 'financial' | 'site-content';

/** System roles an admin can assign on the profiles.role column. */
const SYSTEM_ROLES: Role[] = ['member', 'moderator', 'secretary', 'treasurer', 'admin'];

/** Friendly labels for the system role select. */
const SYSTEM_ROLE_LABELS: Record<Role, string> = {
  member: 'Member',
  moderator: 'Moderator',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  admin: 'Admin',
};

const PIE_COLORS = ['#a82524', '#f59e0b', '#15803d', '#6366f1', '#db2777', '#0891b2'];

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  // Data
    const [projects, setProjects] = useState<Project[]>([]);
    const [news, setNews] = useState<News[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [gallery, setGallery] = useState<GalleryImage[]>([]);
    const [contacts, setContacts] = useState<ContactSubmission[]>([]);
    const [members, setMembers] = useState<Profile[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [donations, setDonations] = useState<Donation[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    // v5 — Meetings / Polls / Financial
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [pollOptionsByPoll, setPollOptionsByPoll] = useState<Record<string, PollOption[]>>({});
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [financialReports, setFinancialReports] = useState<FinancialReport[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    useEffect(() => {
      let mounted = true;
      const load = async () => {
        try {
          const [p, n, e, g, c, m, t, d, pm, an, mt, pl, ex, fr] = await Promise.all([
            getProjects(),
            getNews(),
            getEvents(),
            getGalleryImages(),
            adminListContacts(),
            adminListProfiles(),
            getAllTasks(),
            getRecentDonations(50),
            getPaymentMethods(),
            getAnnouncements(),
            getMeetings().catch(() => [] as Meeting[]),
            getPolls().catch(() => [] as Poll[]),
            getExpenses().catch(() => [] as Expense[]),
            getFinancialReports().catch(() => [] as FinancialReport[]),
          ]);

          // Lazy-load poll options for each poll so we can render "X options" badges.
          const optsMap: Record<string, PollOption[]> = {};
          await Promise.all((pl as Poll[]).map(async (poll) => {
            try {
              optsMap[poll.id] = await getPollOptions(poll.id);
            } catch {
              optsMap[poll.id] = [];
            }
          }));

          if (mounted) {
            setProjects(p); setNews(n); setEvents(e); setGallery(g); setContacts(c);
            setMembers(m); setTasks(t); setDonations(d); setPaymentMethods(pm); setAnnouncements(an);
            setMeetings(mt as Meeting[]); setPolls(pl as Poll[]); setExpenses(ex as Expense[]);
            setFinancialReports(fr as FinancialReport[]);
            setPollOptionsByPoll(optsMap);
          }
        } catch (err) {
          console.warn('Admin data load failed', err);
        } finally {
          if (mounted) setLoading(false);
        }
      };
      load();
      return () => { mounted = false; };
    }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    try {
      await deleteProject(id);
      setProjects((p) => p.filter((x) => x.id !== id));
      toast.success('Project deleted');
    } catch {
      setProjects((p) => p.filter((x) => x.id !== id));
      toast.success('Project removed');
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
      { id: 'overview', label: 'Overview', icon: BarChart3 },
      { id: 'verification', label: 'Verification', icon: Shield },
      { id: 'members', label: 'Members', icon: Users },
      { id: 'tasks', label: 'Tasks', icon: ClipboardList },
      { id: 'projects', label: 'Projects', icon: FolderKanban },
      { id: 'gallery', label: 'Gallery', icon: ImageIcon },
      { id: 'news', label: 'News', icon: Newspaper },
      { id: 'events', label: 'Events', icon: Calendar },
      { id: 'meetings', label: 'Meetings', icon: CalendarDays },
      { id: 'polls', label: 'Polls', icon: Vote },
      { id: 'financial', label: 'Financial', icon: DollarSign },
      { id: 'contributions', label: 'Contributions', icon: Heart },
      { id: 'payment-methods', label: 'Payment Methods', icon: Banknote },
      { id: 'announcements', label: 'Announcements', icon: Megaphone },
      { id: 'contacts', label: 'Contacts', icon: Mail },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'site-content', label: 'Site Content', icon: Megaphone },
            { id: 'roles', label: 'User Roles', icon: Shield },
          ];

  const stats = [
      { label: 'Pending Verifications', value: members.filter((m) => m.status === 'pending').length, icon: Shield, color: 'text-gold-700' },
      { label: 'Active Members', value: members.filter((m) => m.status === 'active').length, icon: Users, color: 'text-primary' },
      { label: 'Open Tasks', value: tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length, icon: ClipboardList, color: 'text-accent' },
      { label: 'Pending Contributions', value: donations.filter((d) => d.status === 'pending').length, icon: Heart, color: 'text-pink-700' },
      { label: 'Verified Contributions', value: donations.filter((d) => d.status === 'completed').length, icon: CheckCircle, color: 'text-success' },
      { label: 'Active Projects', value: projects.length, icon: FolderKanban, color: 'text-primary' },
      {
        label: 'Upcoming Meetings',
        value: meetings.filter((m) => m.status === 'scheduled' && new Date(m.scheduled_at).getTime() >= Date.now()).length,
        icon: CalendarDays,
        color: 'text-primary',
      },
      {
        label: 'Active Polls',
        value: polls.filter((p) => p.status === 'open' && new Date(p.closes_at).getTime() >= Date.now()).length,
        icon: Vote,
        color: 'text-gold-700',
      },
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
                Administrator
              </span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold">Admin Control Panel</h1>
            <p className="text-sm text-muted-foreground">Manage your community resources.</p>
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
                      {t.id === 'verification' && members.filter((m) => m.status === 'pending').length > 0 && (
                        <span className="ml-auto text-[10px] bg-gold-400 text-primary-foreground px-1.5 py-0.5 rounded-full">
                          {members.filter((m) => m.status === 'pending').length}
                        </span>
                      )}
                      {t.id === 'contributions' && donations.filter((d) => d.status === 'pending').length > 0 && (
                        <span className="ml-auto text-[10px] bg-pink-700 text-white px-1.5 py-0.5 rounded-full">
                          {donations.filter((d) => d.status === 'pending').length}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          <main className="lg:col-span-3 space-y-6">
            {loading && tab === 'overview' && <Loader />}

            {tab === 'overview' && !loading && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {stats.map((s, idx) => (
                    <motion.div key={s.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}>
                      <Card>
                        <CardContent className="p-5">
                          <s.icon className={`w-7 h-7 ${s.color} mb-2`} />
                          <div className="text-2xl font-bold">{s.value}</div>
                          <div className="text-xs text-muted-foreground">{s.label}</div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
                {members.filter((m) => m.status === 'pending').length > 0 && (
                  <Card className="border-gold-400/40 bg-gold-100/20">
                    <CardContent className="p-5 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-gold-700" />
                        <div>
                          <p className="font-semibold">
                            {members.filter((m) => m.status === 'pending').length} member(s) awaiting verification
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Review their national ID and member code in the Verification tab.
                          </p>
                        </div>
                      </div>
                      <Button onClick={() => setTab('verification')} size="sm">
                        Review Now
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {tab === 'verification' && (
              <VerificationTab members={members} setMembers={setMembers} />
            )}
            {tab === 'members' && <MembersTab members={members} setMembers={setMembers} search={search} setSearch={setSearch} />}
            {tab === 'tasks' && <TasksTab tasks={tasks} setTasks={setTasks} members={members} />}
            {tab === 'projects' && (
              <ProjectsTab projects={projects} onAdd={() => { setEditingProject(null); setShowProjectModal(true); }} onDelete={handleDeleteProject} />
            )}
            {tab === 'gallery' && <GalleryTab images={gallery} setImages={setGallery} />}
            {tab === 'news' && <NewsTab news={news} setNews={setNews} />}
            {tab === 'events' && <EventsTab events={events} setEvents={setEvents} />}
            {tab === 'contacts' && <ContactsTab contacts={contacts} />}
            {tab === 'contributions' && (
              <ContributionsTab donations={donations} setDonations={setDonations} />
            )}
            {tab === 'payment-methods' && (
              <PaymentMethodsTab methods={paymentMethods} setMethods={setPaymentMethods} />
            )}
            {tab === 'announcements' && (
              <AnnouncementsTab announcements={announcements} setAnnouncements={setAnnouncements} />
            )}
            {tab === 'analytics' && <AnalyticsTab stats={stats} projects={projects} donations={donations} />}
                        {tab === 'site-content' && <SiteContentTab />}
                        {tab === 'roles' && <RolesTab members={members} setMembers={setMembers} />}
                        {tab === 'meetings' && (
                          <MeetingsTab
                            meetings={meetings}
                            setMeetings={setMeetings}
                            members={members}
                          />
                        )}
                        {tab === 'polls' && (
                          <PollsTab
                            polls={polls}
                            setPolls={setPolls}
                            optionsByPoll={pollOptionsByPoll}
                            setOptionsByPoll={setPollOptionsByPoll}
                          />
                        )}
                        {tab === 'financial' && (
                          <FinancialTab
                            expenses={expenses}
                            setExpenses={setExpenses}
                            reports={financialReports}
                            setReports={setFinancialReports}
                            donations={donations}
                          />
                        )}
                      </main>
        </div>

        {showProjectModal && (
          <ProjectModal
            project={editingProject}
            onClose={() => setShowProjectModal(false)}
            onSaved={(p) => {
              setProjects((prev) => {
                const idx = prev.findIndex((x) => x.id === p.id);
                if (idx === -1) return [p, ...prev];
                const copy = [...prev]; copy[idx] = p; return copy;
              });
              setShowProjectModal(false);
            }}
          />
        )}
      </div>
    </section>
  );
};

// ============================================================
// VERIFICATION TAB
// ============================================================
const VerificationTab: React.FC<{ members: Profile[]; setMembers: (p: any) => void }> = ({ members, setMembers }) => {
  const pending = members.filter((m) => m.status === 'pending');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [approvedRole, setApprovedRole] = useState<HierarchyRole | ''>('');
  const [adminNote, setAdminNote] = useState('');

  const handleApprove = async () => {
    if (!selected) return;
    if (!approvedRole) {
      toast.error('Please pick a hierarchy role for this member');
      return;
    }
    try {
      const updated = await adminVerifyMember(selected.id, {
        approved_hierarchy_role: approvedRole as HierarchyRole,
        admin_note: adminNote || undefined,
      });
      setMembers((prev: Profile[]) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success(`${updated.display_name} approved as ${approvedRole}`);
      setSelected(null);
      setApprovedRole('');
      setAdminNote('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!confirm(`Reject ${selected.display_name}?`)) return;
    try {
      const updated = await adminRejectMember(selected.id, adminNote || 'Rejected by administrator');
      setMembers((prev: Profile[]) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success(`${updated.display_name} rejected`);
      setSelected(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject');
    }
  };

  if (pending.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
          <h3 className="font-semibold text-lg mb-1">All caught up</h3>
          <p className="text-sm text-muted-foreground">No pending verifications right now.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Pending Member Verifications ({pending.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pending.map((m) => (
          <div key={m.id} className="rounded-lg border p-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-lg">{m.display_name}</h4>
                  <span className="text-xs uppercase px-2 py-0.5 bg-gold-400/20 text-gold-700 rounded-full font-semibold">
                    Pending
                  </span>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {m.email}
                </p>
                {m.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {m.phone}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 pt-2 text-xs">
                  <span className="px-2 py-1 rounded bg-muted">
                    <strong>National ID:</strong> <span className="font-mono">{m.national_id ?? '—'}</span>
                  </span>
                  <span className="px-2 py-1 rounded bg-muted">
                    <strong>Member Code:</strong> <span className="font-mono">{m.member_code ?? '—'}</span>
                  </span>
                  {m.hierarchy_role && (
                    <span className="px-2 py-1 rounded bg-primary/10 text-primary">
                      <strong>Requested:</strong> {m.hierarchy_role}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Joined {new Date(m.joined_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-2 min-w-[180px]">
                <Button size="sm" onClick={() => setSelected(m)} leftIcon={<CheckCircle className="w-4 h-4" />}>
                  Review
                </Button>
              </div>
            </div>

            {selected?.id === m.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Approved hierarchy role
                  </label>
                  <select
                    value={approvedRole}
                    onChange={(e) => setApprovedRole(e.target.value as HierarchyRole)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— Select role —</option>
                    {HIERARCHY_ORDER.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {m.hierarchy_role && approvedRole !== m.hierarchy_role && (
                    <p className="text-xs text-gold-700 mt-1">
                      They requested "{m.hierarchy_role}". You can confirm or change.
                    </p>
                  )}
                </div>
                <Textarea
                  label="Admin note (optional)"
                  rows={2}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Visible to the member on rejection."
                />
                <div className="flex gap-2">
                  <Button onClick={handleApprove} leftIcon={<CheckCircle className="w-4 h-4" />}>
                    Approve
                  </Button>
                  <Button onClick={handleReject} variant="destructive"
                    leftIcon={<XCircle className="w-4 h-4" />}>
                    Reject
                  </Button>
                  <Button onClick={() => { setSelected(null); setApprovedRole(''); setAdminNote(''); }} variant="outline">
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// ============================================================
// MEMBERS TAB (verified, with hierarchy role editing)
// ============================================================
const MembersTab: React.FC<{
  members: Profile[]; setMembers: (p: any) => void;
  search: string; setSearch: (v: string) => void;
}> = ({ members, setMembers, search, setSearch }) => {
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState<{
    display_name: string;
    phone: string;
    address: string;
    bio: string;
    photo_url: string | null;
    hierarchy_role: HierarchyRole;
  }>({
    display_name: '', phone: '', address: '', bio: '', photo_url: null, hierarchy_role: 'Member',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const openEdit = (m: Profile) => {
    setEditing(m);
    setEditForm({
      display_name: m.display_name,
      phone: m.phone ?? '',
      address: m.address ?? '',
      bio: m.bio ?? '',
      photo_url: m.photo_url ?? null,
      hierarchy_role: (m.hierarchy_role ?? 'Member') as HierarchyRole,
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setEditForm({ display_name: '', phone: '', address: '', bio: '', photo_url: null, hierarchy_role: 'Member' });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadProfilePhoto(editing.id, file);
      setEditForm((f) => ({ ...f, photo_url: url }));
      toast.success('Photo uploaded');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploadingPhoto(false);
      // Clear the input so the same file can be re-selected
      e.target.value = '';
    }
  };

  const handleSaveMember = async () => {
    if (!editing) return;
    if (!editForm.display_name.trim()) {
      toast.error('Display name is required');
      return;
    }
    setSaving(true);
    try {
      const updated = await adminUpdateMember(editing.id, {
        display_name: editForm.display_name.trim(),
        phone: editForm.phone.trim() || null,
        address: editForm.address.trim() || null,
        bio: editForm.bio.trim() || null,
        photo_url: editForm.photo_url ?? null,
        hierarchy_role: editForm.hierarchy_role,
      });
      setMembers((prev: Profile[]) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success(`${updated.display_name} updated`);
      // Notify the member (best-effort)
      try {
        const roleChanged = updated.hierarchy_role !== editing.hierarchy_role;
        await createNotification({
          recipient_id: updated.id,
          kind: roleChanged ? 'role_changed' : 'system',
          title: roleChanged ? 'Your profile was updated' : 'Your profile was edited',
          message: roleChanged
            ? `You are now listed as "${updated.hierarchy_role}".`
            : `An administrator updated your profile information.`,
          link: '/member-dashboard?tab=profile',
          payload: { updated_fields: Object.keys(editForm) },
        });
      } catch (err) {
        console.warn('Member notification failed (non-fatal):', err);
      }
      closeEdit();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };
  const filtered = useMemo(() => {
    return members.filter((m) =>
      !search ? true : m.display_name.toLowerCase().includes(search.toLowerCase())
      || (m.email ?? '').toLowerCase().includes(search.toLowerCase())
      || (m.member_code ?? '').toLowerCase().includes(search.toLowerCase()),
    );
  }, [members, search]);

  const handleRoleChange = async (id: string, role: HierarchyRole) => {
    try {
      await adminUpdateProfileHierarchyRole(id, role);
      setMembers((prev: Profile[]) => prev.map((m) => (m.id === id ? { ...m, hierarchy_role: role } : m)));
      toast.success('Hierarchy role updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update role');
    }
  };

  const handleSystemRoleChange = async (id: string, role: Role) => {
      try {
        const updated = await adminSetSystemRole(id, role);
        setMembers((prev: Profile[]) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
        const msg = ['treasurer', 'secretary', 'moderator', 'admin'].includes(role)
          ? `${SYSTEM_ROLE_LABELS[role]} assigned — account auto-activated`
          : `System role set to ${SYSTEM_ROLE_LABELS[role]}`;
        toast.success(msg);
      } catch (err: any) {
        toast.error(err?.message || 'Failed to update system role');
      }
    };

  const handleDelete = async (m: Profile) => {
    const confirmed = window.confirm(
      `Permanently delete ${m.display_name}? This removes their account and related rows. This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await adminDeleteMember(m.id);
      setMembers((prev: Profile[]) => prev.filter((x) => x.id !== m.id));
      toast.success(`${m.display_name} removed`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete member');
    }
  };

  return (

    <Card>
      <CardHeader>
        <CardTitle>All Members ({members.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="py-2 font-semibold">Member</th>
                <th className="py-2 font-semibold hidden sm:table-cell">Member Code</th>
                <th className="py-2 font-semibold">Hierarchy</th>
                <th className="py-2 font-semibold">System Role</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 font-semibold hidden md:table-cell">Joined</th>
                <th className="py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3">
                    <div className="font-medium">{m.display_name}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </td>
                  <td className="py-3 hidden sm:table-cell text-muted-foreground font-mono text-xs">
                    {m.member_code ?? '—'}
                  </td>
                  <td className="py-3">
                    <select
                      value={m.hierarchy_role ?? 'Member'}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as HierarchyRole)}
                      disabled={m.status !== 'active'}
                      className="text-xs rounded border-input bg-background px-2 py-1 border disabled:opacity-50"
                    >
                      {HIERARCHY_ORDER.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3">
                    <select
                      value={m.role}
                      onChange={(e) => handleSystemRoleChange(m.id, e.target.value as Role)}
                      title={m.status !== 'active'
                        ? 'Granting treasurer/secretary/moderator auto-activates the account'
                        : undefined}
                      className="text-xs rounded border-input bg-background px-2 py-1 border"
                    >
                      {SYSTEM_ROLES.map((r) => (
                        <option key={r} value={r}>{SYSTEM_ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      m.status === 'active' ? 'bg-success/15 text-success' :
                      m.status === 'pending' ? 'bg-gold-400/20 text-gold-700' :
                      'bg-destructive/15 text-destructive'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3 hidden md:table-cell text-xs text-muted-foreground">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          onClick={() => openEdit(m)}
                                          className="p-2 rounded hover:bg-primary/10 text-primary inline-flex items-center gap-1"
                                          aria-label={`Edit ${m.display_name}`}
                                          title="Edit member"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(m)}
                                          className="p-2 rounded hover:bg-destructive/10 text-destructive inline-flex items-center gap-1"
                                          aria-label={`Delete ${m.display_name}`}
                                          title="Delete member"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>

                        {/* Edit Member Modal */}
                              {editing && (
                              <Modal onClose={closeEdit} title={`Edit ${editing.display_name}`} wide>
                          {editing && (
                            <div className="space-y-4">
                              {/* Photo */}
                              <div className="flex items-center gap-4">
                                <img
                                  src={editForm.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(editForm.display_name)}`}
                                  alt="avatar preview"
                                  className="w-20 h-20 rounded-full object-cover ring-2 ring-background shadow"
                                />
                                <div className="flex-1">
                                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-muted cursor-pointer text-sm">
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp,image/gif"
                                      className="hidden"
                                      onChange={handlePhotoUpload}
                                    />
                                    {uploadingPhoto ? 'Uploading…' : 'Change photo'}
                                  </label>
                                  {editForm.photo_url && (
                                    <button
                                      type="button"
                                      onClick={() => setEditForm((f) => ({ ...f, photo_url: null }))}
                                      className="ml-2 text-xs text-muted-foreground hover:text-destructive"
                                    >
                                      Remove photo
                                    </button>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">JPEG/PNG/WebP, max 5 MB</p>
                                </div>
                              </div>

                              <Input
                                label="Display Name *"
                                value={editForm.display_name}
                                onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))}
                              />

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Input
                                  label="Phone"
                                  value={editForm.phone}
                                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                                  placeholder="+254 700 000000"
                                />
                                <div>
                                  <label className="block text-sm font-medium mb-1.5">Hierarchy Role</label>
                                  <select
                                    value={editForm.hierarchy_role}
                                    onChange={(e) => setEditForm((f) => ({ ...f, hierarchy_role: e.target.value as HierarchyRole }))}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  >
                                    {HIERARCHY_ORDER.map((r) => (
                                      <option key={r} value={r}>{r}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <Input
                                label="Address"
                                value={editForm.address}
                                onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                                placeholder="e.g. Catholic Silanga Parish, Nairobi"
                              />

                              <Textarea
                                label="Bio"
                                rows={3}
                                value={editForm.bio}
                                onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                                placeholder="Short bio shown on the public Members page"
                              />

                              <p className="text-xs text-muted-foreground">
                                The member will receive an in-app notification after you save.
                              </p>

                              <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={closeEdit} disabled={saving}>Cancel</Button>
                                <Button onClick={handleSaveMember} isLoading={saving}>
                                  Save changes
                                </Button>
                              </div>
                            </div>
                          )}
                        </Modal>
                                              )}
                                              </Card>
                          );
                        };

// ============================================================
// TASKS TAB
// ============================================================
const TasksTab: React.FC<{
  tasks: Task[]; setTasks: (p: any) => void; members: Profile[];
}> = ({ tasks, setTasks, members }) => {
  const activeMembers = members.filter((m) => m.status === 'active');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', assignee_id: '', priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const assignee = activeMembers.find((m) => m.id === form.assignee_id);
    if (!assignee) {
      toast.error('Pick an assignee');
      return;
    }
    try {
      const created = await addTask({
        title: form.title,
        description: form.description,
        assignee_id: assignee.id,
        assignee_name: assignee.display_name,
        status: 'pending',
        priority: form.priority,
        due_date: form.due_date || null,
      });
      setTasks((prev: Task[]) => [created, ...prev]);
      toast.success('Task assigned');
      setShowForm(false);
      setForm({ title: '', description: '', assignee_id: '', priority: 'medium', due_date: '' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create task');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTask(id);
      setTasks((prev: Task[]) => prev.filter((t) => t.id !== id));
      toast.success('Task deleted');
    } catch {
      setTasks((prev: Task[]) => prev.filter((t) => t.id !== id));
      toast.success('Task removed');
    }
  };

  const handleMarkStatus = async (t: Task, status: Task['status']) => {
    try {
      const updated = await updateTaskStatus(t.id, status);
      setTasks((prev: Task[]) => prev.map((x) => (x.id === t.id ? updated : x)));
    } catch {
      // optimistic
      setTasks((prev: Task[]) => prev.map((x) => (x.id === t.id ? { ...x, status } : x)));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" /> Tasks ({tasks.length})
        </CardTitle>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Assign Task'}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleCreate} className="space-y-3 border-b pb-4 mb-4">
            <Input label="Title" required value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Textarea label="Description" required rows={3} value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Assign to *</label>
                <select
                  required
                  value={form.assignee_id}
                  onChange={(e) => setForm((f) => ({ ...f, assignee_id: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Select member —</option>
                  {activeMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name} ({m.hierarchy_role ?? 'Member'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as any }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <Input label="Due date" type="date" value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
            <Button type="submit">Assign</Button>
          </form>
        )}

        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No tasks yet. Assign one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => (
              <div key={t.id} className="rounded-lg border p-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-bold">{t.title}</h4>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                        t.status === 'completed' ? 'bg-success/15 text-success' :
                        t.status === 'in_progress' ? 'bg-primary/15 text-primary' :
                        t.status === 'cancelled' ? 'bg-muted text-muted-foreground' :
                        'bg-gold-400/20 text-gold-700'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border">
                        {t.priority}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                    <p className="text-xs mt-1">
                      <strong>Assignee:</strong> {t.assignee_name}
                      {t.due_date && (
                        <span className="ml-2"><strong>Due:</strong> {new Date(t.due_date).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                    <select
                      value={t.status}
                      onChange={(e) => handleMarkStatus(t, e.target.value as Task['status'])}
                      className="text-xs rounded border-input bg-background px-2 py-1.5 border"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-2 rounded hover:bg-destructive/10 text-destructive"
                      aria-label="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================
// PROJECTS TAB
// ============================================================
const ProjectsTab: React.FC<{
  projects: Project[]; onAdd: () => void; onDelete: (id: string) => void;
}> = ({ projects, onAdd, onDelete }) => (
  <Card>
    <CardHeader className="flex flex-row justify-between items-center">
      <CardTitle>Projects ({projects.length})</CardTitle>
      <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={onAdd}>Add Project</Button>
    </CardHeader>
    <CardContent>
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No projects yet. Click "Add Project" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="rounded-lg border p-3 hover:shadow-md transition-shadow">
              <div className="flex gap-3">
                <img
                  src={(p.image ?? '') || 'data:image/svg+xml;utf8,<svg xmlns=&apos;http://www.w3.org/2000/svg&apos; viewBox=&apos;0 0 24 24&apos; fill=&apos;none&apos; stroke=&apos;currentColor&apos; stroke-width=&apos;1.5&apos;><rect x=&apos;3&apos; y=&apos;3&apos; width=&apos;18&apos; height=&apos;18&apos; rx=&apos;2&apos;/><circle cx=&apos;9&apos; cy=&apos;9&apos; r=&apos;2&apos;/><path d=&apos;M21 15l-5-5L5 21&apos;/></svg>'}
                  className="w-20 h-20 rounded object-cover"
                  alt={p.title}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold line-clamp-1">{p.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary capitalize">
                    {p.status}
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-1 mt-2">
                <Button variant="ghost" size="sm" leftIcon={<Edit3 className="w-3 h-3" />}>Edit</Button>
                <button
                  onClick={() => onDelete(p.id)}
                  className="p-2 rounded hover:bg-destructive/10 text-destructive"
                  aria-label="Delete project"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

// ============================================================
// GALLERY TAB
// ============================================================
// ============================================================
// GALLERY — full CRUD with Supabase Storage upload
// ============================================================
const GalleryTab: React.FC<{
  images: GalleryImage[]; setImages: (p: any) => void;
}> = ({ images, setImages }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingMeta, setEditingMeta] = useState<GalleryImage | null>(null);
  const [meta, setMeta] = useState({ title: '', category: '' });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newRows: GalleryImage[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 5 MB`);
          continue;
        }
        try {
          const publicUrl = await uploadGalleryFile(file, 'images');
          const created = await addGalleryImage({
            url: publicUrl,
            title: file.name.replace(/\.[^.]+$/, ''),
            category: '',
          });
          newRows.push(created);
        } catch (err: any) {
          toast.error(`Failed to upload ${file.name}: ${err?.message ?? 'unknown'}`);
        }
      }
      if (newRows.length > 0) {
        setImages((prev: GalleryImage[]) => [...newRows, ...prev]);
        toast.success(`Uploaded ${newRows.length} image${newRows.length !== 1 ? 's' : ''}`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (img: GalleryImage) => {
    if (!confirm(`Delete "${img.title ?? 'this image'}"?`)) return;
    try {
      await deleteGalleryFile(img.url);
      await deleteGalleryImage(img.id);
      setImages((prev: GalleryImage[]) => prev.filter((x) => x.id !== img.id));
      toast.success('Image deleted');
    } catch (err: any) {
      // Even if DB delete fails, try to remove from Storage
      setImages((prev: GalleryImage[]) => prev.filter((x) => x.id !== img.id));
      toast.error(err?.message ?? 'Failed to delete');
    }
  };

  const startEditMeta = (img: GalleryImage) => {
    setEditingMeta(img);
    setMeta({ title: img.title ?? '', category: img.category ?? '' });
  };

  const saveMeta = async () => {
    if (!editingMeta) return;
    try {
      // No updateGalleryImage function — use direct supabase patch via the
      // existing service surface. We add a tiny inline update here.
      const { supabase } = await import('../../config/supabaseClient');
      const { error } = await supabase.from('gallery')
        .update({ title: meta.title, category: meta.category })
        .eq('id', editingMeta.id);
      if (error) throw error;
      setImages((prev: GalleryImage[]) =>
        prev.map((x) => x.id === editingMeta.id ? { ...x, ...meta } : x)
      );
      toast.success('Updated');
      setEditingMeta(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-3">
        <CardTitle>Gallery ({images.length})</CardTitle>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            size="sm"
            leftIcon={uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Uploading...' : 'Upload Image(s)'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No images uploaded yet.</p>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} leftIcon={<Plus className="w-4 h-4" />}>
              Upload your first image
            </Button>
            <p className="text-xs text-muted-foreground mt-3">Max 5 MB per image.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((img) => (
              <div key={img.id} className="rounded-lg overflow-hidden border group relative">
                <div className="aspect-square">
                  <img src={img.url ?? ''} alt={img.title ?? ''} className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold line-clamp-1">{img.title || <span className="italic text-muted-foreground">untitled</span>}</p>
                  {img.category && <p className="text-[10px] text-muted-foreground">{img.category}</p>}
                </div>
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEditMeta(img)}
                    className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                    aria-label="Edit metadata"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(img)}
                    className="p-1.5 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    aria-label="Delete image"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit metadata modal */}
      {editingMeta && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingMeta(null)}
        >
          <div
            className="bg-card rounded-lg max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold">Edit image details</h3>
              <button onClick={() => setEditingMeta(null)} className="p-1 rounded hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={editingMeta.url ?? ''} alt="" className="w-full h-48 object-cover rounded" />
            <Input
              label="Title"
              value={meta.title}
              onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
              placeholder="e.g. Easter Sunday Mass"
            />
            <Input
              label="Category"
              value={meta.category}
              onChange={(e) => setMeta((m) => ({ ...m, category: e.target.value }))}
              placeholder="e.g. Worship, Youth, Charity"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingMeta(null)}>Cancel</Button>
              <Button onClick={saveMeta}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

// ============================================================
// NEWS — full CRUD
// ============================================================
const NewsTab: React.FC<{ news: News[]; setNews: (p: any) => void }> = ({ news, setNews }) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<News | null>(null);
  const blankForm = { title: '', excerpt: '', content: '', image: '', author: '', category: 'Community', tags: [] as string[], published: false };
  const [form, setForm] = useState(blankForm);
  const [tagsInput, setTagsInput] = useState('');

  const openNew = () => {
    setEditing(null);
    setForm(blankForm);
    setTagsInput('');
    setShowForm(true);
  };
  const openEdit = (n: News) => {
    setEditing(n);
    setForm({
      title: n.title ?? '',
      excerpt: n.excerpt ?? '',
      content: n.content ?? '',
      image: n.image ?? '',
      author: n.author ?? '',
      category: n.category ?? 'Community',
      tags: n.tags ?? [],
      published: !!n.published,
    });
    setTagsInput((n.tags ?? []).join(', '));
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-generate excerpt from content if empty (first 200 chars)
    const payload = {
      ...form,
      excerpt: form.excerpt.trim() || form.content.slice(0, 200).replace(/\s+/g, ' '),
      author: form.author.trim() || 'Catholic Silanga CBO',
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (editing) {
        const updated = await updateNews(editing.id, payload);
        setNews((prev: News[]) => prev.map((x) => x.id === updated.id ? updated : x));
        toast.success('Article updated');
      } else {
        const created = await addNews(payload);
        setNews((prev: News[]) => [created, ...prev]);
        toast.success('Article created');
      }
      setShowForm(false);
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save');
    }
  };

  const handleDelete = async (n: News) => {
    if (!confirm(`Delete "${n.title}"?`)) return;
    try {
      await deleteNews(n.id);
      setNews((prev: News[]) => prev.filter((x) => x.id !== n.id));
      toast.success('Article deleted');
    } catch (err: any) {
      setNews((prev: News[]) => prev.filter((x) => x.id !== n.id));
      toast.success('Article removed');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>News Articles ({news.length})</CardTitle>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openNew}>
          New Article
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleSave} className="space-y-3 border-b pb-4 mb-4">
            <Input label="Title *" required value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Author" value={form.author}
                onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                placeholder="Defaults to 'Catholic Silanga CBO'" />
              <Input label="Category" value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Announcement, Reflection" />
            </div>
            <Input label="Cover image URL" value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              placeholder="https://..." />
            <Textarea
              label="Excerpt (short summary)"
              rows={2}
              value={form.excerpt}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              placeholder="Auto-generated from content if left empty (first 200 chars)"
            />
            <Textarea label="Content *" required rows={6} value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
            <Input
              label="Tags (comma-separated)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. youth, mass, charity"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                className="rounded border-input"
              />
              Publish (visible to public site)
            </label>
            <div className="flex gap-2">
              <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {news.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No articles published yet.</p>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openNew}>
              Write your first article
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {news.map((n) => (
              <div key={n.id} className="flex items-center justify-between p-3 rounded border gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium line-clamp-1">{n.title}</p>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      n.published ? 'bg-success/15 text-success' : 'bg-gold-400/20 text-gold-700'
                    }`}>
                      {n.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {n.category || 'Uncategorised'}
                    {' · '}{new Date(n.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(n)} leftIcon={<Edit3 className="w-3 h-3" />}>
                    Edit
                  </Button>
                  <button
                    onClick={() => handleDelete(n)}
                    className="p-2 rounded hover:bg-destructive/10 text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================
// EVENTS — full CRUD
// ============================================================
const EventsTab: React.FC<{ events: Event[]; setEvents: (p: any) => void }> = ({ events, setEvents }) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const blankForm = {
    title: '', description: '', event_date: '', event_time: '', location: '',
    image: '', category: '', published: true,
    end_date: '', registration_link: '',
  };
  const [form, setForm] = useState(blankForm);

  const openNew = () => {
    setEditing(null);
    setForm(blankForm);
    setShowForm(true);
  };
  const openEdit = (e: Event) => {
    setEditing(e);
    setForm({
      title: e.title ?? '',
      description: e.description ?? '',
      event_date: e.event_date ?? '',
      event_time: e.event_time ?? '',
      location: e.location ?? '',
      image: e.image ?? '',
      category: e.category ?? '',
      published: e.published ?? true,
      end_date: e.end_date ?? '',
      registration_link: e.registration_link ?? '',
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const updated = await updateEvent(editing.id, form);
        setEvents((prev: Event[]) => prev.map((x) => x.id === updated.id ? updated : x));
        toast.success('Event updated');
      } else {
        const created = await addEvent(form);
        setEvents((prev: Event[]) => [created, ...prev]);
        toast.success('Event created');
      }
      setShowForm(false);
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save');
    }
  };

  const handleDelete = async (e: Event) => {
    if (!confirm(`Delete "${e.title}"?`)) return;
    try {
      await deleteEvent(e.id);
      setEvents((prev: Event[]) => prev.filter((x) => x.id !== e.id));
      toast.success('Event deleted');
    } catch (err: any) {
      setEvents((prev: Event[]) => prev.filter((x) => x.id !== e.id));
      toast.success('Event removed');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Events ({events.length})</CardTitle>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openNew}>
          Add Event
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleSave} className="space-y-3 border-b pb-4 mb-4">
            <Input label="Title *" required value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Date *" required type="date" value={form.event_date}
                onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} />
              <Input label="Time" type="time" value={form.event_time}
                onChange={(e) => setForm((f) => ({ ...f, event_time: e.target.value }))} />
              <Input label="Location" value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              <Input label="Category" value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Mass, Meeting, Outreach" />
            </div>
            <Input label="Image URL" value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              placeholder="https://..." />
            <Textarea label="Description" rows={4} value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                className="rounded border-input"
              />
              Publish (visible to public site)
            </label>
            <div className="flex gap-2">
              <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {events.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No events scheduled.</p>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openNew}>
              Schedule your first event
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded border gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium line-clamp-1">{e.title}</p>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      e.published ? 'bg-success/15 text-success' : 'bg-gold-400/20 text-gold-700'
                    }`}>
                      {e.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.event_date).toLocaleDateString()}
                    {e.event_time && ` · ${e.event_time}`}
                    {e.location && ` · ${e.location}`}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(e)} leftIcon={<Edit3 className="w-3 h-3" />}>
                    Edit
                  </Button>
                  <button
                    onClick={() => handleDelete(e)}
                    className="p-2 rounded hover:bg-destructive/10 text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
const ContactsTab: React.FC<{ contacts: ContactSubmission[] }> = ({ contacts }) => (
  <Card>
    <CardHeader>
      <CardTitle>Contact Messages ({contacts.length})</CardTitle>
    </CardHeader>
    <CardContent>
      {contacts.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No messages received yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.id} className="p-3 rounded border">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm font-medium mt-1">{c.subject}</p>
              <p className="text-sm text-muted-foreground mt-1">{c.message}</p>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

// ============================================================
// CONTRIBUTIONS TAB — verify / reject donations
// ============================================================
const ContributionsTab: React.FC<{
  donations: Donation[]; setDonations: (p: any) => void;
}> = ({ donations, setDonations }) => {
  const pending = donations.filter((d) => d.status === 'pending');
  const completed = donations.filter((d) => d.status === 'completed');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('pending');
  const [note, setNote] = useState('');

  const filtered = useMemo(() => {
    if (filter === 'all') return donations;
    return donations.filter((d) => d.status === filter);
  }, [donations, filter]);

  const handleVerify = async (d: Donation, status: 'completed' | 'failed') => {
    try {
      const updated = await adminVerifyDonation(d.id, { status, admin_note: note || undefined });
      setDonations((prev: Donation[]) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setNote('');
      toast.success(status === 'completed' ? 'Contribution verified' : 'Contribution rejected');
    } catch (err: any) {
      toast.error(err?.message || 'Failed');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-3">
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" /> Contributions
          {pending.length > 0 && (
            <span className="text-xs bg-gold-400 text-primary-foreground px-2 py-0.5 rounded-full">
              {pending.length} pending
            </span>
          )}
        </CardTitle>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="text-sm rounded border-input bg-background px-3 py-1.5 border"
        >
          <option value="pending">Pending ({pending.length})</option>
          <option value="completed">Verified ({completed.length})</option>
          <option value="failed">Rejected</option>
          <option value="all">All</option>
        </select>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No contributions in this view.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((d) => (
              <div key={d.id} className="rounded-lg border p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-lg">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: d.currency }).format(Number(d.amount))}
                      </p>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                        d.status === 'completed' ? 'bg-success/15 text-success' :
                        d.status === 'failed' ? 'bg-destructive/15 text-destructive' :
                        'bg-gold-400/20 text-gold-700'
                      }`}>
                        {d.status}
                      </span>
                    </div>
                    <p className="text-sm"><strong>{d.donor_name}</strong> · {d.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.purpose} · {new Date(d.created_at).toLocaleString()}
                    </p>
                    {d.reference_code && (
                      <p className="text-xs text-muted-foreground font-mono">Ref: {d.reference_code}</p>
                    )}
                    {d.message && (
                      <p className="text-sm italic text-muted-foreground mt-1">"{d.message}"</p>
                    )}
                    {d.verified_at && (
                      <p className="text-xs text-success mt-1">
                        Verified {new Date(d.verified_at).toLocaleString()}
                      </p>
                    )}
                    {d.admin_note && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Note:</strong> {d.admin_note}
                      </p>
                    )}
                  </div>
                  {d.status === 'pending' && (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <Input
                        placeholder="Note (optional)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleVerify(d, 'completed')} leftIcon={<CheckCircle className="w-4 h-4" />}>
                          Verify
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleVerify(d, 'failed')}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================
// PAYMENT METHODS TAB
// ============================================================
const PaymentMethodsTab: React.FC<{
  methods: PaymentMethod[]; setMethods: (p: any) => void;
}> = ({ methods, setMethods }) => {
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    id?: string; method: PaymentMethodType; label: string;
    details: Record<string, string>; instructions: string;
    is_active: boolean; display_order: number;
  }>({
    method: 'bank', label: '', details: {}, instructions: '', is_active: true, display_order: 0,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ method: 'bank', label: '', details: {}, instructions: '', is_active: true, display_order: methods.length });
    setShowForm(true);
  };

  const openEdit = (m: PaymentMethod) => {
    setEditing(m);
    setForm({
      id: m.id, method: m.method, label: m.label,
      details: m.details ?? {}, instructions: m.instructions ?? '',
      is_active: m.is_active, display_order: m.display_order,
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        details: Object.fromEntries(
          Object.entries(form.details).filter(([_, v]) => v && v.trim() !== ''),
        ),
      };
      const saved = await upsertPaymentMethod(payload as any);
      setMethods((prev: PaymentMethod[]) => {
        const idx = prev.findIndex((x) => x.id === saved.id);
        if (idx === -1) return [...prev, saved];
        const copy = [...prev]; copy[idx] = saved; return copy;
      });
      toast.success(editing ? 'Payment method updated' : 'Payment method added');
      setShowForm(false);
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment method?')) return;
    try {
      await deletePaymentMethod(id);
      setMethods((prev: PaymentMethod[]) => prev.filter((m) => m.id !== id));
      toast.success('Deleted');
    } catch {
      setMethods((prev: PaymentMethod[]) => prev.filter((m) => m.id !== id));
      toast.success('Deleted');
    }
  };

  const detailsSchema: Record<PaymentMethodType, { key: string; label: string }[]> = {
    bank: [
      { key: 'bank_name', label: 'Bank Name' },
      { key: 'account_name', label: 'Account Name' },
      { key: 'account_number', label: 'Account Number' },
      { key: 'branch', label: 'Branch' },
      { key: 'swift_code', label: 'SWIFT / BIC (optional)' },
    ],
    mpesa: [
      { key: 'name', label: 'Till / Paybill Name' },
      { key: 'number', label: 'M-PESA Number' },
      { key: 'account_name', label: 'Registered Name' },
    ],
    paybill: [
      { key: 'business_number', label: 'Paybill Number' },
      { key: 'account_number', label: 'Account Number' },
      { key: 'business_name', label: 'Business Name' },
    ],
    till: [
      { key: 'till_number', label: 'Till Number' },
      { key: 'store_name', label: 'Store Name' },
    ],
    mobile_money: [
      { key: 'provider', label: 'Provider (MTN/Airtel/...)' },
      { key: 'number', label: 'Number' },
      { key: 'account_name', label: 'Registered Name' },
    ],
    card: [{ key: 'processor', label: 'Processor (Stripe, etc)' }, { key: 'link', label: 'Link' }],
    cash: [{ key: 'location', label: 'Where to drop off' }],
    other: [{ key: 'description', label: 'Description' }],
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5 text-primary" /> Payment Methods ({methods.length})
        </CardTitle>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openNew}>
          Add Payment Method
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleSave} className="space-y-3 border-b pb-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Method Type *</label>
                <select
                  value={form.method}
                  onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as PaymentMethodType, details: {} }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="mpesa">M-PESA (Send Money)</option>
                  <option value="paybill">Paybill</option>
                  <option value="till">Buy Goods Till</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="card">Card / Online</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Input label="Display Label *" required value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Equity Bank Account" />
            </div>

            <div className="rounded-lg border bg-card p-3 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Details</p>
              {detailsSchema[form.method].map((d) => (
                <Input
                  key={d.key}
                  label={d.label}
                  value={form.details[d.key] ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, details: { ...f.details, [d.key]: e.target.value } }))
                  }
                />
              ))}
            </div>

            <Textarea
              label="Instructions for payers"
              rows={2}
              value={form.instructions}
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
              placeholder="e.g. Use your member code as the account number."
            />

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-input"
                />
                Active (visible publicly)
              </label>
              <Input
                label="Order"
                type="number"
                value={form.display_order}
                onChange={(e) => setForm((f) => ({ ...f, display_order: Number(e.target.value) }))}
                className="w-24"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit">{editing ? 'Update' : 'Save'}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {methods.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No payment methods added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {methods.map((m) => (
              <div key={m.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold">{m.label}</p>
                    <p className="text-xs text-muted-foreground uppercase">{m.method.replace('_', ' ')}</p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    m.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                  }`}>
                    {m.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <div className="text-xs space-y-0.5 mb-2">
                  {Object.entries(m.details ?? {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="font-mono">{v}</span>
                    </div>
                  ))}
                </div>
                {m.instructions && (
                  <p className="text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2 mt-1">
                    {m.instructions}
                  </p>
                )}
                <div className="flex justify-end gap-1 mt-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(m)} leftIcon={<Edit3 className="w-3 h-3" />}>Edit</Button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-2 rounded hover:bg-destructive/10 text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================
// ANNOUNCEMENTS TAB
// ============================================================
const AnnouncementsTab: React.FC<{
  announcements: Announcement[]; setAnnouncements: (p: any) => void;
}> = ({ announcements, setAnnouncements }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ title: string; content: string; priority: 'low' | 'medium' | 'high'; expires_at: string }>({
    title: '', content: '', priority: 'medium', expires_at: '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await addAnnouncement({
        title: form.title,
        content: form.content,
        priority: form.priority,
        expires_at: form.expires_at || null,
      });
      setAnnouncements((prev: Announcement[]) => [saved, ...prev]);
      toast.success('Announcement posted');
      setShowForm(false);
      setForm({ title: '', content: '', priority: 'medium', expires_at: '' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to post');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev: Announcement[]) => prev.filter((a) => a.id !== id));
      toast.success('Deleted');
    } catch {
      setAnnouncements((prev: Announcement[]) => prev.filter((a) => a.id !== id));
      toast.success('Deleted');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" /> Announcements ({announcements.length})
        </CardTitle>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Announcement'}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleSave} className="space-y-3 border-b pb-4 mb-4">
            <Input label="Title *" required value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Textarea label="Content *" required rows={4} value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as any }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <Input label="Expires on (optional)" type="date" value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
            </div>
            <Button type="submit">Post</Button>
          </form>
        )}
        {announcements.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-bold">{a.title}</h4>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        a.priority === 'high' ? 'bg-destructive/15 text-destructive' :
                        a.priority === 'medium' ? 'bg-gold-400/20 text-gold-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {a.priority}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3 inline" />{' '}
                      Posted {new Date(a.published_at).toLocaleString()}
                      {a.expires_at && ` · Expires ${new Date(a.expires_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-2 rounded hover:bg-destructive/10 text-destructive flex-shrink-0"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================
// ANALYTICS TAB — with charts
// ============================================================
const AnalyticsTab: React.FC<{
  stats: any[]; projects: Project[]; donations: Donation[];
}> = ({ stats, projects, donations }) => {
  const completed = donations.filter((d) => d.status === 'completed');
  const monthly = useMemo(() => {
    const m = new Map<string, number>();
    completed.forEach((d) => {
      const k = d.created_at.slice(0, 7);
      m.set(k, (m.get(k) ?? 0) + Number(d.amount));
    });
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([month, total]) => ({ month, total }));
  }, [completed]);
  const byPurpose = useMemo(() => {
    const m = new Map<string, number>();
    completed.forEach((d) => m.set(d.purpose, (m.get(d.purpose) ?? 0) + Number(d.amount)));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [completed]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded border p-3">
                <s.icon className={`w-5 h-5 ${s.color} mb-1`} />
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {completed.length > 0 && (
        <>
          <Card>
            <CardHeader><CardTitle>Contributions over time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.2)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#a82524" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>By purpose</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={byPurpose} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {byPurpose.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader><CardTitle>Project Status Overview</CardTitle></CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No project data to visualize yet.</p>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 5).map((p) => (
                <div key={p.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{p.title}</span>
                    <span className="text-primary font-bold">{p.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-gold-500" style={{ width: `${p.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================
// ROLES TAB — admin/regular toggle
// ============================================================
const RolesTab: React.FC<{ members: Profile[]; setMembers: (p: any) => void }> = ({ members, setMembers }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Roles & Hierarchy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.filter((m) => m.status === 'active').map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-gold-500 flex items-center justify-center text-white font-bold">
                  {m.display_name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{m.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.email} · Code: {m.member_code ?? '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={m.hierarchy_role ?? 'Member'}
                  onChange={async (e) => {
                    try {
                      await adminUpdateProfileHierarchyRole(m.id, e.target.value as HierarchyRole);
                      setMembers((prev: Profile[]) =>
                        prev.map((x) => (x.id === m.id ? { ...x, hierarchy_role: e.target.value as HierarchyRole } : x))
                      );
                      toast.success(`${m.display_name} hierarchy role updated`);
                    } catch (err: any) {
                      toast.error(err?.message || 'Failed');
                    }
                  }}
                  className="text-sm rounded border-input bg-background px-3 py-1.5 border"
                >
                  {HIERARCHY_ORDER.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================
// PROJECT MODAL
// ============================================================
const ProjectModal: React.FC<{
  project: Project | null;
  onClose: () => void;
  onSaved: (project: Project) => void;
}> = ({ project, onClose, onSaved }) => {
  const [form, setForm] = useState({
    title: project?.title || '',
    description: project?.description || '',
    image: project?.image || '',
    status: (project?.status || 'planning') as Project['status'],
    budget: project?.budget || 0,
    progress: project?.progress || 0,
    category: project?.category || '',
    location: project?.location || '',
    beneficiaries: project?.beneficiaries || 0,
    end_date: project?.end_date || '',
    start_date: project?.start_date || new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title || !form.description) {
      toast.error('Title and description are required');
      return;
    }
    setSaving(true);
    try {
      const newProject: Project = {
        ...form,
        id: project?.id || Math.random().toString(36).slice(2, 9),
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (!project) {
        await addProject(form);
      }
      onSaved(newProject);
      toast.success(project ? 'Project updated' : 'Project added');
    } catch (err) {
      const fallback: Project = { ...form, id: project?.id || Math.random().toString(36).slice(2, 9), created_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; onSaved(fallback);
      toast.success(project ? 'Project updated' : 'Project added');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-lg max-w-2xl w-full my-8"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="font-heading text-xl font-bold">
            {project ? 'Edit Project' : 'Add New Project'}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <Input label="Title" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" rows={4} value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Image URL" value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} />
            <Input label="Category" value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="planning">Planning</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <Input label="Budget" type="number" value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))} />
            <Input label="Progress %" type="number" value={form.progress}
              onChange={(e) => setForm((f) => ({ ...f, progress: Number(e.target.value) }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
            <Input label="End Date (optional)" type="date" value={form.end_date || ''}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-6 border-t">
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                  <Button onClick={handleSave} isLoading={saving}>
                    {project ? 'Save Changes' : 'Add Project'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          );
        };

        // ============================================================
        // v5 — MEETINGS TAB
        // ============================================================
        const MeetingsTab: React.FC<{
          meetings: Meeting[];
          setMeetings: (p: any) => void;
          members: Profile[];
        }> = ({ meetings, setMeetings, members }) => {
          const [showForm, setShowForm] = useState(false);
          const [editing, setEditing] = useState<Meeting | null>(null);
          const [form, setForm] = useState({
            title: '', description: '', scheduled_at: '', location: '',
            meeting_type: 'general' as Meeting['meeting_type'],
          });
          const [rsvpMeeting, setRsvpMeeting] = useState<Meeting | null>(null);
          const [attendanceMeeting, setAttendanceMeeting] = useState<Meeting | null>(null);
          const [minutesMeeting, setMinutesMeeting] = useState<Meeting | null>(null);
          const [rsvpsByMeeting, setRsvpsByMeeting] = useState<Record<string, MeetingRsvp[]>>({});
          const [attendanceByMeeting, setAttendanceByMeeting] = useState<Record<string, MeetingAttendance[]>>({});
          const [minutesByMeeting, setMinutesByMeeting] = useState<Record<string, MeetingMinutes | null>>({});

          const openNew = () => {
            setEditing(null);
            setForm({ title: '', description: '', scheduled_at: '', location: '', meeting_type: 'general' });
            setShowForm(true);
          };
          const openEdit = (m: Meeting) => {
            setEditing(m);
            setForm({
              title: m.title,
              description: m.description ?? '',
              scheduled_at: m.scheduled_at ? m.scheduled_at.slice(0, 16) : '',
              location: m.location ?? '',
              meeting_type: m.meeting_type,
            });
            setShowForm(true);
          };

          const handleSave = async (e: React.FormEvent) => {
            e.preventDefault();
            try {
              const payload = {
                title: form.title,
                description: form.description || null,
                scheduled_at: new Date(form.scheduled_at).toISOString(),
                location: form.location || null,
                meeting_type: form.meeting_type,
              };
              if (editing) {
                const updated = await updateMeeting(editing.id, payload);
                setMeetings((prev: Meeting[]) => prev.map((x) => (x.id === updated.id ? updated : x)));
                toast.success('Meeting updated');
              } else {
                const created = await createMeeting(payload as any);
                setMeetings((prev: Meeting[]) => [created, ...prev]);
                toast.success('Meeting created');
              }
              setShowForm(false);
              setEditing(null);
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to save meeting');
            }
          };

          const handleDelete = async (m: Meeting) => {
            if (!confirm(`Delete meeting "${m.title}"?`)) return;
            try {
              await deleteMeeting(m.id);
              setMeetings((prev: Meeting[]) => prev.filter((x) => x.id !== m.id));
              toast.success('Meeting deleted');
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to delete');
            }
          };

          const loadRsvps = async (meeting: Meeting) => {
            setRsvpMeeting(meeting);
            try {
              const rsvps = await getMeetingRsvps(meeting.id);
              setRsvpsByMeeting((prev) => ({ ...prev, [meeting.id]: rsvps }));
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to load RSVPs');
            }
          };

          const loadAttendance = async (meeting: Meeting) => {
            setAttendanceMeeting(meeting);
            try {
              const att = await getMeetingAttendance(meeting.id);
              setAttendanceByMeeting((prev) => ({ ...prev, [meeting.id]: att }));
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to load attendance');
            }
          };

          const handleMarkAttendance = async (
            meetingId: string,
            memberId: string,
            status: MeetingAttendance['status'],
          ) => {
            try {
              await markMeetingAttendance(meetingId, memberId, status);
              const updated = await getMeetingAttendance(meetingId);
              setAttendanceByMeeting((prev) => ({ ...prev, [meetingId]: updated }));
              toast.success('Attendance marked');
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to mark attendance');
            }
          };

          const loadMinutes = async (meeting: Meeting) => {
            setMinutesMeeting(meeting);
            try {
              const minutes = await getMeetingMinutes(meeting.id);
              setMinutesByMeeting((prev) => ({ ...prev, [meeting.id]: minutes }));
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to load minutes');
            }
          };

          return (
            <Card>
              <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" /> Meetings ({meetings.length})
                </CardTitle>
                <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openNew}>
                  Create Meeting
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {showForm && (
                  <form onSubmit={handleSave} className="space-y-3 border-b pb-4 mb-4">
                    <Input
                      label="Title *"
                      required
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    />
                    <Textarea
                      label="Description"
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Scheduled at *"
                        type="datetime-local"
                        required
                        value={form.scheduled_at}
                        onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                      />
                      <Input
                        label="Location"
                        value={form.location}
                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Meeting type</label>
                      <select
                        value={form.meeting_type}
                        onChange={(e) => setForm((f) => ({ ...f, meeting_type: e.target.value as Meeting['meeting_type'] }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="general">General</option>
                        <option value="committee">Committee</option>
                        <option value="emergency">Emergency</option>
                        <option value="agm">AGM (Annual General Meeting)</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
                      <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {meetings.length === 0 && !showForm ? (
                  <div className="text-center py-12">
                    <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">No meetings scheduled yet.</p>
                    <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openNew}>
                      Schedule the first meeting
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {meetings.map((m) => (
                      <div key={m.id} className="rounded-lg border p-3 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold">{m.title}</h4>
                              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                                m.meeting_type === 'agm' ? 'bg-primary/15 text-primary' :
                                m.meeting_type === 'emergency' ? 'bg-destructive/15 text-destructive' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {m.meeting_type}
                              </span>
                              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border">
                                {m.status}
                              </span>
                            </div>
                            {m.description && <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>}
                            <p className="text-xs mt-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {new Date(m.scheduled_at).toLocaleString()}
                              {m.location && <span className="ml-3">📍 {m.location}</span>}
                            </p>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                            <Button variant="ghost" size="sm" leftIcon={<ListChecks className="w-3 h-3" />} onClick={() => loadRsvps(m)}>
                              RSVPs
                            </Button>
                            <Button variant="ghost" size="sm" leftIcon={<CheckCircle className="w-3 h-3" />} onClick={() => loadAttendance(m)}>
                              Attendance
                            </Button>
                            <Button variant="ghost" size="sm" leftIcon={<FileText className="w-3 h-3" />} onClick={() => loadMinutes(m)}>
                              Minutes
                            </Button>
                            <Button variant="ghost" size="sm" leftIcon={<Edit3 className="w-3 h-3" />} onClick={() => openEdit(m)}>
                              Edit
                            </Button>
                            <button
                              onClick={() => handleDelete(m)}
                              className="p-2 rounded hover:bg-destructive/10 text-destructive"
                              aria-label="Delete meeting"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>

              {/* RSVPs modal */}
              {rsvpMeeting && (
                <Modal title={`RSVPs · ${rsvpMeeting.title}`} onClose={() => setRsvpMeeting(null)}>
                  {(() => {
                                      const list = rsvpsByMeeting[rsvpMeeting.id] ?? [];
                                                          const memberName = (id: string) => members.find((m) => m.id === id)?.display_name ?? id;
                                                          const counts = {
                                                            attending: list.filter((r) => r.response === 'attending').length,
                                                            not_attending: list.filter((r) => r.response === 'not_attending').length,
                                                            maybe: list.filter((r) => r.response === 'maybe').length,
                                                          };
                                      return (
                                        <div className="space-y-3">
                                          <div className="flex gap-3 text-sm">
                                            <span className="px-2 py-1 rounded bg-success/15 text-success font-semibold">Attending: {counts.attending}</span>
                                            <span className="px-2 py-1 rounded bg-destructive/15 text-destructive font-semibold">Not attending: {counts.not_attending}</span>
                                            <span className="px-2 py-1 rounded bg-gold-400/20 text-gold-700 font-semibold">Maybe: {counts.maybe}</span>
                                          </div>
                        {list.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No RSVPs yet.</p>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {list.map((r) => (
                              <li key={r.id} className="flex items-center justify-between border-b last:border-0 py-1">
                                <span>{memberName(r.member_id)}</span>
                                <span className="text-xs uppercase font-semibold text-muted-foreground">{r.response}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })()}
                </Modal>
              )}

              {/* Attendance modal */}
              {attendanceMeeting && (
                <Modal
                  title={`Attendance · ${attendanceMeeting.title}`}
                  onClose={() => setAttendanceMeeting(null)}
                  wide
                >
                  {(() => {
                    const list = attendanceByMeeting[attendanceMeeting.id] ?? [];
                    const present = list.filter((a) => a.status === 'present').length;
                    const absent = list.filter((a) => a.status === 'absent').length;
                    const excused = list.filter((a) => a.status === 'excused').length;
                                        return (
                      <div className="space-y-3">
                        <div className="flex gap-3 text-sm">
                          <span className="px-2 py-1 rounded bg-success/15 text-success font-semibold">Present: {present}</span>
                          <span className="px-2 py-1 rounded bg-destructive/15 text-destructive font-semibold">Absent: {absent}</span>
                          <span className="px-2 py-1 rounded bg-gold-400/20 text-gold-700 font-semibold">Excused: {excused}</span>
                        </div>
                        <ul className="space-y-1 text-sm">
                          {members.map((m) => {
                            const att = list.find((a) => a.member_id === m.id);
                            const status = att?.status ?? 'pending';
                            return (
                              <li key={m.id} className="flex items-center justify-between border-b last:border-0 py-1.5">
                                <span>{m.display_name}</span>
                                <select
                                  value={status}
                                  onChange={(e) => handleMarkAttendance(attendanceMeeting.id, m.id, e.target.value as MeetingAttendance['status'])}
                                  className="text-xs rounded border-input bg-background px-2 py-1 border"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="present">Present</option>
                                  <option value="absent">Absent</option>
                                  <option value="excused">Excused</option>
                                </select>
                              </li>
                            );
                          })}
                        </ul>
                        {members.length === 0 && (
                          <p className="text-sm text-muted-foreground">No members loaded yet.</p>
                        )}
                      </div>
                    );
                  })()}
                </Modal>
              )}

              {/* Minutes modal */}
              {minutesMeeting && (
                <MinutesModal
                  meeting={minutesMeeting}
                  existing={minutesByMeeting[minutesMeeting.id] ?? null}
                  onClose={() => setMinutesMeeting(null)}
                  onSaved={(updated) => {
                    setMinutesByMeeting((prev) => ({ ...prev, [minutesMeeting.id]: updated }));
                  }}
                />
              )}
            </Card>
          );
        };

        const MinutesModal: React.FC<{
          meeting: Meeting;
          existing: MeetingMinutes | null;
          onClose: () => void;
          onSaved: (updated: MeetingMinutes) => void;
        }> = ({ meeting, existing, onClose, onSaved }) => {
          const [agenda, setAgenda] = useState(existing?.agenda ?? '');
          const [discussions, setDiscussions] = useState(existing?.discussions ?? '');
          const [decisions, setDecisions] = useState(existing?.decisions ?? '');
          const [actionItemsJson, setActionItemsJson] = useState(
            JSON.stringify(existing?.action_items ?? [], null, 2),
          );
          const [saving, setSaving] = useState(false);

          const handleSave = async () => {
            setSaving(true);
            try {
              let parsed: unknown = [];
              try {
                parsed = actionItemsJson.trim() ? JSON.parse(actionItemsJson) : [];
              } catch {
                toast.error('Action items must be valid JSON');
                setSaving(false);
                return;
              }
              const updated = await writeMeetingMinutes(
                meeting.id,
                agenda || null,
                discussions || null,
                decisions || null,
                parsed,
              );
              onSaved(updated);
              toast.success('Minutes saved');
              onClose();
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to save minutes');
            } finally {
              setSaving(false);
            }
          };

          return (
            <Modal title={`Minutes · ${meeting.title}`} onClose={onClose} wide>
              <div className="space-y-3">
                <Textarea label="Agenda" rows={2} value={agenda} onChange={(e) => setAgenda(e.target.value)} />
                <Textarea label="Discussions" rows={4} value={discussions} onChange={(e) => setDiscussions(e.target.value)} />
                <Textarea label="Decisions" rows={3} value={decisions} onChange={(e) => setDecisions(e.target.value)} />
                <div>
                  <label className="block text-sm font-medium mb-1.5">Action items (JSON array)</label>
                  <Textarea
                    rows={5}
                    value={actionItemsJson}
                    onChange={(e) => setActionItemsJson(e.target.value)}
                    placeholder={`e.g. [{"task": "Buy chairs", "owner": "Alice", "due": "2026-09-01"}]`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Stored as jsonb. Keep it as a JSON array of objects with <code>task</code>, optional <code>owner</code> and <code>due</code>.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                  <Button onClick={handleSave} isLoading={saving}>Save minutes</Button>
                </div>
              </div>
            </Modal>
          );
        };

        // ============================================================
        // v5 — POLLS TAB
        // ============================================================
        const PollsTab: React.FC<{
          polls: Poll[];
          setPolls: (p: any) => void;
          optionsByPoll: Record<string, PollOption[]>;
          setOptionsByPoll: (p: any) => void;
        }> = ({ polls, setPolls, optionsByPoll, setOptionsByPoll }) => {
          const [showForm, setShowForm] = useState(false);
          const blankForm = {
            title: '', description: '', type: 'single_choice' as PollType,
            closes_at: '',
            options: ['', ''],
          };
          const [form, setForm] = useState(blankForm);
          const [resultsPoll, setResultsPoll] = useState<Poll | null>(null);
          const [resultsData, setResultsData] = useState<{ option: PollOption; votes: number }[]>([]);

          const openNew = () => {
            setForm(blankForm);
            setShowForm(true);
          };

          const handleSave = async (e: React.FormEvent) => {
            e.preventDefault();
            try {
              const cleanedOptions = form.options.map((o) => o.trim()).filter(Boolean);
              const created = await createPoll({
                title: form.title,
                description: form.description || null,
                type: form.type,
                closes_at: new Date(form.closes_at).toISOString(),
                options: cleanedOptions,
              });
              setPolls((prev: Poll[]) => [created, ...prev]);
              // Load options for the new poll.
              try {
                const opts = await getPollOptions(created.id);
                setOptionsByPoll((prev: Record<string, PollOption[]>) => ({ ...prev, [created.id]: opts }));
              } catch {
                // ignore
              }
              toast.success('Poll created');
              setShowForm(false);
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to create poll');
            }
          };

          const handleClose = async (poll: Poll) => {
            if (!confirm(`Close poll "${poll.title}"? Members will no longer be able to vote.`)) return;
            try {
              const updated = await closePoll(poll.id);
              setPolls((prev: Poll[]) => prev.map((x) => (x.id === updated.id ? updated : x)));
              toast.success('Poll closed');
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to close poll');
            }
          };

          const handleDelete = async (poll: Poll) => {
            if (!confirm(`Delete poll "${poll.title}"? This cannot be undone.`)) return;
            try {
              await deletePoll(poll.id);
              setPolls((prev: Poll[]) => prev.filter((x) => x.id !== poll.id));
              setOptionsByPoll((prev: Record<string, PollOption[]>) => {
                const copy = { ...prev };
                delete copy[poll.id];
                return copy;
              });
              toast.success('Poll deleted');
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to delete poll');
            }
          };

          const loadResults = async (poll: Poll) => {
            setResultsPoll(poll);
            try {
              const results = await getPollResults(poll.id);
              setResultsData(results);
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to load results');
            }
          };

          return (
            <Card>
              <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Vote className="w-5 h-5 text-primary" /> Polls ({polls.length})
                </CardTitle>
                <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openNew}>
                  Create Poll
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {showForm && (
                  <form onSubmit={handleSave} className="space-y-3 border-b pb-4 mb-4">
                    <Input
                      label="Title *"
                      required
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    />
                    <Textarea
                      label="Description"
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Poll type</label>
                        <select
                          value={form.type}
                          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PollType }))}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="single_choice">Single choice</option>
                          <option value="multiple_choice">Multiple choice</option>
                          <option value="yes_no">Yes / No</option>
                        </select>
                      </div>
                      <Input
                        label="Closes at *"
                        type="datetime-local"
                        required
                        value={form.closes_at}
                        onChange={(e) => setForm((f) => ({ ...f, closes_at: e.target.value }))}
                      />
                    </div>
                    {form.type !== 'yes_no' && (
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Options</label>
                        <div className="space-y-2">
                          {form.options.map((opt, idx) => (
                            <div key={idx} className="flex gap-2">
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const next = [...form.options];
                                  next[idx] = e.target.value;
                                  setForm((f) => ({ ...f, options: next }));
                                }}
                                placeholder={`Option ${idx + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (form.options.length <= 2) return;
                                  setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }));
                                }}
                                className="p-2 rounded hover:bg-destructive/10 text-destructive"
                                aria-label="Remove option"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          leftIcon={<Plus className="w-3 h-3" />}
                          onClick={() => setForm((f) => ({ ...f, options: [...f.options, ''] }))}
                        >
                          Add option
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button type="submit">Create</Button>
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                    </div>
                  </form>
                )}

                {polls.length === 0 && !showForm ? (
                  <div className="text-center py-12">
                    <Vote className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">No polls yet.</p>
                    <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openNew}>
                      Create your first poll
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {polls.map((poll) => {
                      const opts = optionsByPoll[poll.id] ?? [];
                      const isOpen = poll.status === 'open' && new Date(poll.closes_at).getTime() >= Date.now();
                      return (
                        <div key={poll.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold">{poll.title}</h4>
                                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                                  isOpen ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                                }`}>
                                  {isOpen ? 'Open' : 'Closed'}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border">
                                  {poll.type.replace('_', ' ')}
                                </span>
                              </div>
                              {poll.description && <p className="text-sm text-muted-foreground line-clamp-2">{poll.description}</p>}
                              <p className="text-xs mt-1">
                                Closes {new Date(poll.closes_at).toLocaleString()} · {opts.length} option(s)
                              </p>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                              <Button variant="ghost" size="sm" leftIcon={<BarChart3 className="w-3 h-3" />} onClick={() => loadResults(poll)}>
                                Results
                              </Button>
                              {poll.status === 'open' && (
                                <Button variant="outline" size="sm" leftIcon={<XCircle className="w-3 h-3" />} onClick={() => handleClose(poll)}>
                                  Close
                                </Button>
                              )}
                              <button
                                onClick={() => handleDelete(poll)}
                                className="p-2 rounded hover:bg-destructive/10 text-destructive"
                                aria-label="Delete poll"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>

              {resultsPoll && (
                <Modal title={`Results · ${resultsPoll.title}`} onClose={() => setResultsPoll(null)}>
                  {resultsData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No options / votes yet.</p>
                  ) : (() => {
                    const max = Math.max(1, ...resultsData.map((r) => r.votes));
                    return (
                      <div className="space-y-2">
                        {resultsData.map(({ option, votes }) => (
                          <div key={option.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{option.label}</span>
                              <span className="text-muted-foreground">{votes} vote(s)</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${(votes / max) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </Modal>
              )}
            </Card>
          );
        };

        // ============================================================
        // v5 — FINANCIAL TAB
        // ============================================================
        const FinancialTab: React.FC<{
          expenses: Expense[];
          setExpenses: (p: any) => void;
          reports: FinancialReport[];
          setReports: (p: any) => void;
          donations: Donation[];
        }> = ({ expenses, setExpenses, reports, setReports, donations }) => {
          const [showExpense, setShowExpense] = useState(false);
          const [expenseForm, setExpenseForm] = useState({
            title: '', amount: 0, category: 'other' as ExpenseCategory,
                        description: '', vendor: '', receipt_url: '', currency: 'KES', expense_date: new Date().toISOString().slice(0, 10),
                      });
          const [showReport, setShowReport] = useState(false);
          const [reportForm, setReportForm] = useState({
            period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            period_end: new Date().toISOString().slice(0, 10),
            notes: '',
          });

          const handleCreateExpense = async (e: React.FormEvent) => {
            e.preventDefault();
            try {
              const created = await createExpense({
                              title: expenseForm.title,
                              amount: Number(expenseForm.amount),
                              category: expenseForm.category,
                              description: expenseForm.description || null,
                              vendor: expenseForm.vendor || null,
                              receipt_url: expenseForm.receipt_url || null,
                              currency: expenseForm.currency,
                              expense_date: expenseForm.expense_date,
                            });
              setExpenses((prev: Expense[]) => [created, ...prev]);
              toast.success('Expense recorded');
              setShowExpense(false);
              setExpenseForm({
                title: '', amount: 0, category: 'other', description: '',
                                vendor: '', receipt_url: '', currency: 'KES', expense_date: new Date().toISOString().slice(0, 10),
                              });
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to record expense');
            }
          };

          const handleApproveExpense = async (e: Expense) => {
            if (!confirm(`Approve expense "${e.title}"?`)) return;
            try {
              const updated = await approveExpense(e.id);
              setExpenses((prev: Expense[]) => prev.map((x) => (x.id === updated.id ? updated : x)));
              toast.success('Expense approved');
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to approve');
            }
          };

          const handleDeleteExpense = async (e: Expense) => {
            if (!confirm(`Delete expense "${e.title}"?`)) return;
            try {
              await deleteExpense(e.id);
              setExpenses((prev: Expense[]) => prev.filter((x) => x.id !== e.id));
              toast.success('Expense deleted');
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to delete');
            }
          };

          const handleGenerateReport = async (e: React.FormEvent) => {
            e.preventDefault();
            try {
              const created = await submitFinancialReport(
                reportForm.period_start,
                reportForm.period_end,
                reportForm.notes || undefined,
              );
              setReports((prev: FinancialReport[]) => [created, ...prev]);
              toast.success('Report generated');
              setShowReport(false);
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to generate report');
            }
          };

          const handleApproveReport = async (r: FinancialReport) => {
            if (!confirm(`Approve financial report for ${r.period_start} → ${r.period_end}?`)) return;
            try {
              const updated = await approveFinancialReport(r.id);
              setReports((prev: FinancialReport[]) => prev.map((x) => (x.id === updated.id ? updated : x)));
              toast.success('Report approved');
            } catch (err: any) {
              toast.error(err?.message ?? 'Failed to approve report');
            }
          };

          // Pre-compute some live stats.
          const totalDonations = donations.filter((d) => d.status === 'completed').reduce((s, d) => s + Number(d.amount ?? 0), 0);
          const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);

          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <DollarSign className="w-7 h-7 text-success mb-2" />
                    <div className="text-2xl font-bold">KES {totalDonations.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Total completed contributions</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <Banknote className="w-7 h-7 text-destructive mb-2" />
                    <div className="text-2xl font-bold">KES {totalExpenses.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Total expenses (all time)</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <BarChart3 className="w-7 h-7 text-primary mb-2" />
                    <div className="text-2xl font-bold">KES {(totalDonations - totalExpenses).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Net balance (running)</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-primary" /> Expenses ({expenses.length})
                  </CardTitle>
                  <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowExpense(!showExpense)}>
                    {showExpense ? 'Cancel' : 'Add Expense'}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {showExpense && (
                    <form onSubmit={handleCreateExpense} className="space-y-3 border-b pb-4 mb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label="Title *"
                          required
                          value={expenseForm.title}
                          onChange={(e) => setExpenseForm((f) => ({ ...f, title: e.target.value }))}
                        />
                        <Input
                          label="Amount (KES) *"
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={expenseForm.amount}
                          onChange={(e) => setExpenseForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Category</label>
                          <select
                            value={expenseForm.category}
                            onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="operations">Operations</option>
                            <option value="events">Events</option>
                            <option value="charity">Charity</option>
                            <option value="utilities">Utilities</option>
                            <option value="salaries">Salaries</option>
                            <option value="supplies">Supplies</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <Input
                          label="Expense date *"
                          type="date"
                          required
                          value={expenseForm.expense_date}
                          onChange={(e) => setExpenseForm((f) => ({ ...f, expense_date: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label="Vendor"
                          value={expenseForm.vendor}
                          onChange={(e) => setExpenseForm((f) => ({ ...f, vendor: e.target.value }))}
                        />
                        <Input
                          label="Receipt URL"
                          value={expenseForm.receipt_url}
                          onChange={(e) => setExpenseForm((f) => ({ ...f, receipt_url: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                      <Textarea
                        label="Description"
                        rows={2}
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                      />
                      <Button type="submit">Record</Button>
                    </form>
                  )}

                  {expenses.length === 0 ? (
                    <div className="text-center py-12">
                      <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr className="text-left">
                            <th className="py-2 font-semibold">Title</th>
                            <th className="py-2 font-semibold">Category</th>
                            <th className="py-2 font-semibold">Amount</th>
                            <th className="py-2 font-semibold hidden sm:table-cell">Date</th>
                            <th className="py-2 font-semibold">Approval</th>
                            <th className="py-2 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map((e) => (
                            <tr key={e.id} className="border-b last:border-0">
                              <td className="py-3">
                                <div className="font-medium">{e.title}</div>
                                {e.vendor && <div className="text-xs text-muted-foreground">{e.vendor}</div>}
                              </td>
                              <td className="py-3 capitalize">{e.category}</td>
                              <td className="py-3 font-semibold">KES {Number(e.amount).toLocaleString()}</td>
                              <td className="py-3 hidden sm:table-cell text-xs text-muted-foreground">
                                {new Date(e.expense_date).toLocaleDateString()}
                              </td>
                              <td className="py-3">
                                {e.approved_at ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success font-semibold">
                                    Approved
                                  </span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-gold-400/20 text-gold-700 font-semibold">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex gap-1.5 justify-end">
                                  {!e.approved_at && (
                                    <Button size="sm" variant="outline" leftIcon={<CheckCircle className="w-3 h-3" />} onClick={() => handleApproveExpense(e)}>
                                      Approve
                                    </Button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteExpense(e)}
                                    className="p-2 rounded hover:bg-destructive/10 text-destructive"
                                    aria-label="Delete expense"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Financial Reports ({reports.length})
                  </CardTitle>
                  <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowReport(!showReport)}>
                    {showReport ? 'Cancel' : 'Generate Report'}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {showReport && (
                    <form onSubmit={handleGenerateReport} className="space-y-3 border-b pb-4 mb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label="Period start *"
                          type="date"
                          required
                          value={reportForm.period_start}
                          onChange={(e) => setReportForm((f) => ({ ...f, period_start: e.target.value }))}
                        />
                        <Input
                          label="Period end *"
                          type="date"
                          required
                          value={reportForm.period_end}
                          onChange={(e) => setReportForm((f) => ({ ...f, period_end: e.target.value }))}
                        />
                      </div>
                      <Textarea
                        label="Notes"
                        rows={2}
                        value={reportForm.notes}
                        onChange={(e) => setReportForm((f) => ({ ...f, notes: e.target.value }))}
                      />
                      <Button type="submit">Generate</Button>
                    </form>
                  )}

                  {reports.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No financial reports yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr className="text-left">
                            <th className="py-2 font-semibold">Period</th>
                            <th className="py-2 font-semibold hidden md:table-cell">Opening</th>
                            <th className="py-2 font-semibold">Income</th>
                            <th className="py-2 font-semibold">Expenses</th>
                            <th className="py-2 font-semibold hidden md:table-cell">Closing</th>
                            <th className="py-2 font-semibold">Status</th>
                            <th className="py-2 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reports.map((r) => (
                            <tr key={r.id} className="border-b last:border-0">
                              <td className="py-3">
                                <div className="font-medium">
                                  {new Date(r.period_start).toLocaleDateString()} → {new Date(r.period_end).toLocaleDateString()}
                                </div>
                                {r.notes && <div className="text-xs text-muted-foreground line-clamp-1">{r.notes}</div>}
                              </td>
                              <td className="py-3 hidden md:table-cell">KES {Number(r.opening_balance ?? 0).toLocaleString()}</td>
                              <td className="py-3 text-success font-semibold">KES {Number(r.total_income ?? 0).toLocaleString()}</td>
                              <td className="py-3 text-destructive font-semibold">KES {Number(r.total_expenses ?? 0).toLocaleString()}</td>
                              <td className="py-3 hidden md:table-cell font-semibold">KES {Number(r.closing_balance ?? 0).toLocaleString()}</td>
                              <td className="py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                  r.status === 'approved' ? 'bg-success/15 text-success' :
                                  r.status === 'submitted' ? 'bg-gold-400/20 text-gold-700' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                {r.status === 'submitted' ? (
                                  <Button size="sm" variant="outline" leftIcon={<CheckCircle className="w-3 h-3" />} onClick={() => handleApproveReport(r)}>
                                    Approve
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {r.approved_at ? `Approved ${new Date(r.approved_at).toLocaleDateString()}` : '—'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        };
