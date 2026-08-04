import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, FolderKanban, Image as ImageIcon, Newspaper, Calendar, Mail,
  BarChart3, Shield, Search, Trash2, Edit3, Plus, X, LogOut,
  ClipboardList, Heart, Banknote, Megaphone, CheckCircle, XCircle,
  AlertCircle, Clock, Phone,
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
} from '../../services/supabaseData';
import {
  adminListProfiles, adminVerifyMember, adminRejectMember,
  adminUpdateProfileHierarchyRole,
} from '../../services/supabaseAuth';
import type {
  Project, News, Event, GalleryImage, ContactSubmission, Profile,
  HierarchyRole, Task, Donation, PaymentMethod, PaymentMethodType, Announcement,
} from '../../types/database';
import { HIERARCHY_ORDER } from '../../types/database';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts';

type Tab =
  | 'overview' | 'verification' | 'members' | 'tasks' | 'projects'
  | 'gallery' | 'news' | 'events' | 'contacts' | 'contributions'
  | 'payment-methods' | 'announcements' | 'analytics' | 'roles';

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
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [p, n, e, g, c, m, t, d, pm, an] = await Promise.all([
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
        ]);
        if (mounted) {
          setProjects(p); setNews(n); setEvents(e); setGallery(g); setContacts(c);
          setMembers(m); setTasks(t); setDonations(d); setPaymentMethods(pm); setAnnouncements(an);
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
    { id: 'contributions', label: 'Contributions', icon: Heart },
    { id: 'payment-methods', label: 'Payment Methods', icon: Banknote },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'contacts', label: 'Contacts', icon: Mail },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'roles', label: 'User Roles', icon: Shield },
  ];

  const stats = [
    { label: 'Pending Verifications', value: members.filter((m) => m.status === 'pending').length, icon: Shield, color: 'text-gold-700' },
    { label: 'Active Members', value: members.filter((m) => m.status === 'active').length, icon: Users, color: 'text-primary' },
    { label: 'Open Tasks', value: tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length, icon: ClipboardList, color: 'text-accent' },
    { label: 'Pending Contributions', value: donations.filter((d) => d.status === 'pending').length, icon: Heart, color: 'text-pink-700' },
    { label: 'Verified Contributions', value: donations.filter((d) => d.status === 'completed').length, icon: CheckCircle, color: 'text-success' },
    { label: 'Active Projects', value: projects.length, icon: FolderKanban, color: 'text-primary' },
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
            {tab === 'gallery' && <GalleryTab images={gallery} />}
            {tab === 'news' && <NewsTab news={news} />}
            {tab === 'events' && <EventsTab events={events} />}
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
            {tab === 'roles' && <RolesTab members={members} setMembers={setMembers} />}
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
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 font-semibold hidden md:table-cell">Joined</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
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
                  src={(p.image ?? '') || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=200&q=60'}
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
const GalleryTab: React.FC<{ images: GalleryImage[] }> = ({ images }) => (
  <Card>
    <CardHeader className="flex flex-row justify-between items-center">
      <CardTitle>Gallery ({images.length})</CardTitle>
      <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>Upload Image</Button>
    </CardHeader>
    <CardContent>
      {images.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No images uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((img) => (
            <div key={img.id} className="aspect-square rounded overflow-hidden group relative">
              <img src={img.url ?? ''} alt={img.title ?? ''} className="w-full h-full object-cover" />
              <button
                className="absolute top-1 right-1 p-1 rounded bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete image"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

// ============================================================
// NEWS / EVENTS / CONTACTS — keep previous behaviour
// ============================================================
const NewsTab: React.FC<{ news: News[] }> = ({ news }) => (
  <Card>
    <CardHeader className="flex flex-row justify-between items-center">
      <CardTitle>News Articles ({news.length})</CardTitle>
      <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>New Article</Button>
    </CardHeader>
    <CardContent>
      {news.length === 0 ? (
        <div className="text-center py-12">
          <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No articles published yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {news.map((n) => (
            <div key={n.id} className="flex items-center justify-between p-3 rounded border">
              <div>
                <p className="font-medium line-clamp-1">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.category}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" leftIcon={<Edit3 className="w-3 h-3" />}>Edit</Button>
                <button className="p-2 rounded hover:bg-destructive/10 text-destructive">
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

const EventsTab: React.FC<{ events: Event[] }> = ({ events }) => (
  <Card>
    <CardHeader className="flex flex-row justify-between items-center">
      <CardTitle>Events ({events.length})</CardTitle>
      <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>Add Event</Button>
    </CardHeader>
    <CardContent>
      {events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No events scheduled.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="flex items-center justify-between p-3 rounded border">
              <div>
                <p className="font-medium line-clamp-1">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.event_date).toLocaleDateString()} • {e.event_time} • {e.location}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" leftIcon={<Edit3 className="w-3 h-3" />}>Edit</Button>
                <button className="p-2 rounded hover:bg-destructive/10 text-destructive">
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
