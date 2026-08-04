import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Edit3, LogOut, Mail, Phone, Award,
  Activity, ClipboardList, Heart, CheckCircle2, Clock,
  Send, Banknote, Bell, BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../utils/toast';
import {
  getTasksForMember, updateTaskStatus, getMyDonations,
  recordDonation, getPaymentMethods,
} from '../../services/supabaseData';
import type { Task, Donation, PaymentMethod, TaskStatus } from '../../types/database';

type Tab = 'overview' | 'tasks' | 'contributions';

export const MemberDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, logout, updateProfile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    bio: profile?.bio || '',
  });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  // Donations
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(true);
  const [showContributeForm, setShowContributeForm] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [contribForm, setContribForm] = useState({
    amount: 0,
    currency: 'KES',
    purpose: 'General',
    method_id: '',
    reference_code: '',
    message: '',
  });
  const [submittingContrib, setSubmittingContrib] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    setForm({
      display_name: profile?.display_name || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      bio: profile?.bio || '',
    });
  }, [profile]);

  const loadMemberData = React.useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [t, d, m] = await Promise.all([
        getTasksForMember(profile.id),
        getMyDonations(profile.id),
        getPaymentMethods(),
      ]);
      setTasks(t);
      setMyDonations(d);
      setPaymentMethods(m.filter((mm) => mm.is_active));
    } catch (err) {
      console.warn('Failed to load member data', err);
    } finally {
      setTasksLoading(false);
      setDonationsLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadMemberData();
  }, [loadMemberData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      await refreshProfile();
      toast.success('Profile updated');
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleMarkTask = async (t: Task, status: TaskStatus) => {
    try {
      const updated = await updateTaskStatus(t.id, status);
      setTasks((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
      toast.success(`Task marked ${status.replace('_', ' ')}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update task');
    }
  };

  const handleSubmitContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || contribForm.amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSubmittingContrib(true);
    try {
      await recordDonation({
        donor_name: profile.display_name,
        email: profile.email,
        amount: contribForm.amount,
        currency: contribForm.currency,
        purpose: contribForm.purpose,
        message: contribForm.message || null,
        member_id: profile.id,
        method_id: contribForm.method_id || null,
        reference_code: contribForm.reference_code || null,
        proof_url: null,
        admin_note: null,
        verified_by: null,
        verified_at: null,
      });
      toast.success('Contribution submitted! The admin will verify it shortly.');
      setShowContributeForm(false);
      setContribForm({ amount: 0, currency: 'KES', purpose: 'General', method_id: '', reference_code: '', message: '' });
      // refresh
      const d = await getMyDonations(profile.id);
      setMyDonations(d);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit contribution');
    } finally {
      setSubmittingContrib(false);
    }
  };

  if (!user || !profile) return null;

  const myTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const completedDonations = myDonations.filter((d) => d.status === 'completed');
  const pendingDonations = myDonations.filter((d) => d.status === 'pending');
  const totalContributed = completedDonations.reduce((s, d) => s + Number(d.amount), 0);

  const tabBtn = (id: Tab, label: string, Icon: any) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all ${
        tab === id ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-primary/5'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <section className="min-h-screen pt-24 pb-16 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2">
                Welcome back,{' '}
                <span className="text-primary">
                  {profile.display_name?.split(' ')[0] || 'Member'}
                </span>
                !
              </h1>
              <p className="text-muted-foreground">
                You're signed in as{' '}
                <strong className="text-foreground">
                  {profile.hierarchy_role ?? 'Member'}
                </strong>
                {profile.member_code ? ` · Code: ${profile.member_code}` : ''}
              </p>
            </div>
            <Button variant="destructive" onClick={handleLogout} leftIcon={<LogOut className="w-4 h-4" />}>
              Logout
            </Button>
          </div>

          {/* Tabs */}
          <div className="inline-flex flex-wrap gap-1 bg-card border rounded-lg p-1 mb-6">
            {tabBtn('overview', 'Overview', Activity)}
            {tabBtn('tasks', `Tasks (${myTasks.length})`, ClipboardList)}
            {tabBtn('contributions', `Contributions (${myDonations.length})`, Heart)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile (always shown, sticky-ish) */}
            <Card className="lg:col-span-1 h-fit">
              <CardContent className="p-6 text-center">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-3xl font-bold mb-4 shadow-lg">
                  {(profile.display_name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <h2 className="font-heading text-xl font-bold mb-1">{profile.display_name}</h2>
                <p className="text-sm text-muted-foreground mb-3">{user.email}</p>
                {profile.hierarchy_role && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gold-400/15 text-gold-700 rounded-full text-xs font-semibold mb-2">
                    <Award className="w-3 h-3" /> {profile.hierarchy_role}
                  </span>
                )}
                <div className="space-y-2 text-left text-sm mt-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  {profile.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" /> {profile.phone}
                    </div>
                  )}
                </div>
                {!editing ? (
                  <Button
                    onClick={() => setEditing(true)}
                    variant="outline"
                    fullWidth
                    className="mt-4"
                    leftIcon={<Edit3 className="w-4 h-4" />}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <div className="space-y-3 mt-4 text-left">
                    <Input label="Full Name" value={form.display_name}
                      onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))} />
                    <Input label="Phone" value={form.phone ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                    <Input label="Address" value={form.address ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
                    <Textarea label="Bio" rows={3} value={form.bio ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
                    <div className="flex gap-2">
                      <Button onClick={handleSave} fullWidth isLoading={saving} size="sm">Save</Button>
                      <Button onClick={() => setEditing(false)} variant="outline" fullWidth size="sm">Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-6">

              {/* === OVERVIEW TAB === */}
              {tab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card><CardContent className="p-4 text-center">
                      <ClipboardList className="w-6 h-6 text-primary mx-auto mb-1" />
                      <p className="text-2xl font-bold">{myTasks.length}</p>
                      <p className="text-xs text-muted-foreground">Open tasks</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-4 text-center">
                      <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-1" />
                      <p className="text-2xl font-bold">{completedTasks.length}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-4 text-center">
                      <Heart className="w-6 h-6 text-gold-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold">
                        {new Intl.NumberFormat('en-US', { notation: 'compact' }).format(totalContributed)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total given</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-4 text-center">
                      <Banknote className="w-6 h-6 text-accent mx-auto mb-1" />
                      <p className="text-2xl font-bold">{pendingDonations.length}</p>
                      <p className="text-xs text-muted-foreground">Pending verify</p>
                    </CardContent></Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" /> Upcoming Events
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { id: 1, title: 'Sunday Service', date: 'Sunday 9:00 AM' },
                        { id: 2, title: 'Bible Study Group', date: 'Wednesday 6:00 PM' },
                        { id: 3, title: 'Community Outreach', date: 'Saturday 10:00 AM' },
                      ].map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/40 hover:bg-primary/5 transition-colors">
                          <div>
                            <h4 className="font-semibold">{a.title}</h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {a.date}
                            </p>
                          </div>
                          <Button size="sm" variant="outline">Details</Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-primary" /> Resources
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {[
                        { id: 1, name: 'CBO Constitution (PDF)', size: '2.4 MB' },
                        { id: 2, name: 'Annual Report 2025', size: '5.1 MB' },
                        { id: 3, name: 'Member Handbook', size: '1.8 MB' },
                      ].map((d) => (
                        <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/40 hover:bg-primary/5 transition-colors">
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-primary" />
                            <div>
                              <p className="text-sm font-medium">{d.name}</p>
                              <p className="text-xs text-muted-foreground">{d.size}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">Download</Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* === TASKS TAB === */}
              {tab === 'tasks' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-primary" /> My Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tasksLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                        ))}
                      </div>
                    ) : tasks.length === 0 ? (
                      <div className="text-center py-10">
                        <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                        <p className="font-semibold mb-1">No tasks assigned</p>
                        <p className="text-sm text-muted-foreground">When the admin assigns a task, it'll show up here.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tasks.map((t) => {
                          const priorityColor =
                            t.priority === 'high' ? 'text-destructive border-destructive/30 bg-destructive/5'
                            : t.priority === 'medium' ? 'text-gold-700 border-gold-400/30 bg-gold-100/10'
                            : 'text-muted-foreground border-border bg-muted/30';
                          return (
                            <div key={t.id} className={`rounded-lg border p-4 ${priorityColor}`}>
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h4 className="font-bold">{t.title}</h4>
                                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                                      t.status === 'completed' ? 'bg-success/20 text-success' :
                                      t.status === 'in_progress' ? 'bg-primary/20 text-primary' :
                                      t.status === 'cancelled' ? 'bg-muted text-muted-foreground' :
                                      'bg-gold-400/20 text-gold-700'
                                    }`}>
                                      {t.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border">
                                      {t.priority} priority
                                    </span>
                                  </div>
                                  <p className="text-sm mb-2">{t.description}</p>
                                  {t.due_date && (
                                    <p className="text-xs flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      Due {new Date(t.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </p>
                                  )}
                                </div>
                                {t.status !== 'completed' && t.status !== 'cancelled' && (
                                  <div className="flex gap-2 flex-shrink-0">
                                    {t.status === 'pending' && (
                                      <Button size="sm" variant="outline" onClick={() => handleMarkTask(t, 'in_progress')}>
                                        Start
                                      </Button>
                                    )}
                                    <Button size="sm" onClick={() => handleMarkTask(t, 'completed')}>
                                      Mark Done
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* === CONTRIBUTIONS TAB === */}
              {tab === 'contributions' && (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="w-5 h-5 text-primary" /> My Contributions
                      </CardTitle>
                      <Button size="sm" leftIcon={<Send className="w-4 h-4" />}
                        onClick={() => setShowContributeForm(!showContributeForm)}>
                        {showContributeForm ? 'Cancel' : 'Contribute'}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {showContributeForm && (
                        <form onSubmit={handleSubmitContribution} className="space-y-3 border-b pb-4 mb-4">
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              label="Amount"
                              type="number"
                              value={contribForm.amount || ''}
                              onChange={(e) => setContribForm((p) => ({ ...p, amount: Number(e.target.value) }))}
                              required
                              min={1}
                            />
                            <div>
                              <label className="block text-sm font-medium mb-1.5">Currency</label>
                              <select
                                value={contribForm.currency}
                                onChange={(e) => setContribForm((p) => ({ ...p, currency: e.target.value }))}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              >
                                <option>KES</option>
                                <option>USD</option>
                                <option>EUR</option>
                                <option>UGX</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">Purpose</label>
                            <select
                              value={contribForm.purpose}
                              onChange={(e) => setContribForm((p) => ({ ...p, purpose: e.target.value }))}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option>General</option>
                              <option>Education</option>
                              <option>Health</option>
                              <option>Outreach</option>
                              <option>Building Fund</option>
                              <option>Youth</option>
                              <option>Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">Paid via (optional)</label>
                            <select
                              value={contribForm.method_id}
                              onChange={(e) => setContribForm((p) => ({ ...p, method_id: e.target.value }))}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">— Select payment method —</option>
                              {paymentMethods.map((m) => (
                                <option key={m.id} value={m.id}>{m.label}</option>
                              ))}
                            </select>
                          </div>
                          <Input
                            label="Reference / Transaction Code (optional)"
                            placeholder="e.g. QGH8X3RT for M-PESA"
                            value={contribForm.reference_code}
                            onChange={(e) => setContribForm((p) => ({ ...p, reference_code: e.target.value }))}
                          />
                          <Textarea
                            label="Note (optional)"
                            rows={2}
                            value={contribForm.message}
                            onChange={(e) => setContribForm((p) => ({ ...p, message: e.target.value }))}
                          />
                          <Button type="submit" isLoading={submittingContrib}>
                            Submit Contribution
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Your contribution will be marked pending until the admin verifies it.
                          </p>
                        </form>
                      )}

                      {donationsLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                          ))}
                        </div>
                      ) : myDonations.length === 0 ? (
                        <div className="text-center py-10">
                          <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                          <p className="font-semibold mb-1">No contributions yet</p>
                          <p className="text-sm text-muted-foreground">
                            Click "Contribute" above to send your first one.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {myDonations.map((d) => (
                            <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <p className="font-bold">
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: d.currency }).format(Number(d.amount))}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {d.purpose} · {new Date(d.created_at).toLocaleDateString()}
                                </p>
                                {d.reference_code && (
                                  <p className="text-xs text-muted-foreground font-mono">Ref: {d.reference_code}</p>
                                )}
                              </div>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                d.status === 'completed' ? 'bg-success/15 text-success' :
                                d.status === 'failed' ? 'bg-destructive/15 text-destructive' :
                                'bg-gold-400/15 text-gold-700'
                              }`}>
                                {d.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {d.status === 'completed' ? 'Verified' : d.status === 'failed' ? 'Rejected' : 'Pending'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
