import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Edit3, LogOut, Mail, Phone, Award,
  Activity, ClipboardList, Heart, CheckCircle2, Clock,
  Send, Banknote, Bell, BookOpen,
  CalendarDays, Vote, CheckCheck, User, Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/common/Modal';
import { Avatar } from '../../components/common/Avatar';
import { ProfilePhotoUploader } from '../../components/dashboard/ProfilePhotoUploader';
import { NotificationsTab } from '../../components/dashboard/NotificationsTab';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../utils/toast';
import { supabase } from '../../config/supabaseClient';
import {
  getTasksForMember, updateTaskStatus, getMyDonations,
  recordDonation, getPaymentMethods,
  getUpcomingMeetings, getMeetingRsvps, submitMeetingRsvp,
  getActivePolls, getPollOptions, getPollResults, castPollVote, getMyVote,
  getMeetingAttendance,
} from '../../services/supabaseData';
import type {
  Task, Donation, PaymentMethod, TaskStatus,
  Meeting, MeetingRsvp, MeetingAttendance,
  Poll, PollOption, RsvpResponse,
} from '../../types/database';
import { DONATION_TYPE_LABEL } from '../../types/database';

type Tab = 'overview' | 'tasks' | 'contributions' | 'meetings' | 'polls' | 'attendance' | 'profile' | 'notifications';

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

  // v5 — Meetings / Polls / Attendance
    const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
    const [myRsvps, setMyRsvps] = useState<Record<string, MeetingRsvp>>({});
    const [meetingsLoading, setMeetingsLoading] = useState(true);
    const [rsvpModal, setRsvpModal] = useState<Meeting | null>(null);
    const [rsvpResponse, setRsvpResponse] = useState<RsvpResponse>('attending');
    const [rsvpReason, setRsvpReason] = useState('');
    const [submittingRsvp, setSubmittingRsvp] = useState(false);

    const [activePolls, setActivePolls] = useState<Poll[]>([]);
    const [pollOptions, setPollOptions] = useState<Record<string, PollOption[]>>({});
    const [pollResults, setPollResults] = useState<Record<string, { option: PollOption; votes: number }[]>>({});
    const [myPollVotes, setMyPollVotes] = useState<Record<string, string>>({}); // poll_id -> option_id
    const [pollsLoading, setPollsLoading] = useState(true);

    const [myAttendance, setMyAttendance] = useState<MeetingAttendance[]>([]);
    const [attendanceLoading, setAttendanceLoading] = useState(true);

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
      const [t, d, m, meetings, polls] = await Promise.all([
        getTasksForMember(profile.id),
        getMyDonations(profile.id),
        getPaymentMethods(),
        getUpcomingMeetings(20),
        getActivePolls(),
      ]);
      setTasks(t);
      setMyDonations(d);
      setPaymentMethods(m.filter((mm) => mm.is_active));
      setUpcomingMeetings(meetings);

      // Fetch my RSVPs for upcoming meetings
      const rsvpMap: Record<string, MeetingRsvp> = {};
      await Promise.all(
        meetings.map(async (meeting) => {
          try {
            const list = await getMeetingRsvps(meeting.id);
            const mine = list.find((r) => r.member_id === profile.id);
            if (mine) rsvpMap[meeting.id] = mine;
          } catch { /* ignore */ }
        }),
      );
      setMyRsvps(rsvpMap);

      // Fetch poll options + my votes + results
      const optsMap: Record<string, PollOption[]> = {};
      const resMap: Record<string, { option: PollOption; votes: number }[]> = {};
      const votesMap: Record<string, string> = {};
      await Promise.all(
        polls.map(async (poll) => {
          try {
            optsMap[poll.id] = await getPollOptions(poll.id);
            resMap[poll.id] = await getPollResults(poll.id);
            const myVote = await getMyVote(poll.id, profile.id);
            if (myVote) votesMap[poll.id] = myVote.option_id;
          } catch { /* ignore */ }
        }),
      );
      setPollOptions(optsMap);
            setPollResults(resMap);
            setMyPollVotes(votesMap);
            setActivePolls(polls);

      // Fetch my attendance history from all recent meetings
      try {
        const allMeetings = await (await import('../../services/supabaseData')).getMeetings();
        const attList: MeetingAttendance[] = [];
        await Promise.all(
          allMeetings.map(async (meeting) => {
            try {
              const list = await getMeetingAttendance(meeting.id);
              const mine = list.find((a) => a.member_id === profile.id);
              if (mine) attList.push(mine);
            } catch { /* ignore */ }
          }),
        );
        attList.sort((a, b) => (b.checked_in_at ?? '').localeCompare(a.checked_in_at ?? ''));
        setMyAttendance(attList);
      } catch { /* ignore */ }
    } catch (err) {
      console.warn('Failed to load member data', err);
    } finally {
      setTasksLoading(false);
      setDonationsLoading(false);
      setMeetingsLoading(false);
      setPollsLoading(false);
      setAttendanceLoading(false);
    }
    }, [profile?.id]);

  useEffect(() => {
    loadMemberData();
  }, [loadMemberData]);

  // Realtime: refresh when treasury/admin adds/edits/deletes a donation
  // for this member. donations table is in supabase_realtime publication
  // (added in schema_v14.sql). RLS still applies — only events for this
  // member's own rows fire the listener.
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`member-donations-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donations',
          filter: `member_id=eq.${profile.id}`,
        },
        () => { loadMemberData(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, loadMemberData]);

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
              donation_type: 'other',
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
                      {tabBtn('meetings', `Meetings (${upcomingMeetings.length})`, CalendarDays)}
                      {tabBtn('polls', `Polls (${activePolls.length})`, Vote)}
                      {tabBtn('attendance', `Attendance (${myAttendance.length})`, CheckCheck)}
                      {tabBtn('profile', 'Profile', User)}
                      {tabBtn('notifications', 'Notifications', Bell)}
                    </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile (always shown, sticky-ish) */}
            <Card className="lg:col-span-1 h-fit">
              <CardContent className="p-6 text-center">
                <Avatar
                  photoUrl={profile.photo_url ?? null}
                  displayName={profile.display_name}
                  email={user.email}
                  size="xl"
                  className="mx-auto mb-4 shadow-lg"
                />
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
                                <p className="text-xs">
                                  <span className="px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold capitalize">
                                    {(DONATION_TYPE_LABEL as any)[d.donation_type] ?? d.donation_type}
                                  </span>
                                  {d.method_id && (
                                    <span className="ml-2 text-muted-foreground">
                                      via {paymentMethods.find((m) => m.id === d.method_id)?.label ?? 'method'}
                                    </span>
                                  )}
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

                                        {/* === MEETINGS TAB === */}
                                        {tab === 'meetings' && (
                                          <Card>
                                            <CardHeader>
                                              <CardTitle className="flex items-center gap-2">
                                                <CalendarDays className="w-5 h-5 text-primary" /> Upcoming Meetings
                                              </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                              {meetingsLoading ? (
                                                <div className="space-y-2">
                                                  {Array.from({ length: 2 }).map((_, i) => (
                                                    <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                                                  ))}
                                                </div>
                                              ) : upcomingMeetings.length === 0 ? (
                                                <div className="text-center py-10">
                                                  <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                                                  <p className="font-semibold mb-1">No upcoming meetings</p>
                                                  <p className="text-sm text-muted-foreground">
                                                    The secretary will schedule meetings soon.
                                                  </p>
                                                </div>
                                              ) : (
                                                upcomingMeetings.map((m) => {
                                                  const myRsvp = myRsvps[m.id];
                                                  return (
                                                    <div key={m.id} className="rounded-lg border p-4">
                                                      <div className="flex items-start justify-between gap-3 flex-wrap">
                                                        <div className="flex-1 min-w-0">
                                                          <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <h4 className="font-bold">{m.title}</h4>
                                                            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                              {m.meeting_type}
                                                            </span>
                                                          </div>
                                                          {m.description && (
                                                            <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>
                                                          )}
                                                          <p className="text-xs mt-2">
                                                            <Clock className="w-3 h-3 inline" /> {new Date(m.scheduled_at).toLocaleString()}
                                                          </p>
                                                          <p className="text-xs">{m.location}</p>
                                                          {myRsvp && (
                                                            <div className="mt-2 text-xs">
                                                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                                                                myRsvp.response === 'attending' ? 'bg-success/15 text-success' :
                                                                myRsvp.response === 'not_attending' ? 'bg-destructive/15 text-destructive' :
                                                                'bg-gold-400/20 text-gold-700'
                                                              }`}>
                                                                Your RSVP: {myRsvp.response.replace('_', ' ')}
                                                              </span>
                                                            </div>
                                                          )}
                                                        </div>
                                                        <Button
                                                          size="sm"
                                                          onClick={() => {
                                                            setRsvpModal(m);
                                                            setRsvpResponse(myRsvp?.response ?? 'attending');
                                                            setRsvpReason(myRsvp?.reason ?? '');
                                                          }}
                                                          leftIcon={<Send className="w-3 h-3" />}
                                                        >
                                                          {myRsvp ? 'Update RSVP' : 'RSVP'}
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  );
                                                })
                                              )}
                                            </CardContent>
                                          </Card>
                                        )}

                                        {/* === POLLS TAB === */}
                                        {tab === 'polls' && (
                                          <Card>
                                            <CardHeader>
                                              <CardTitle className="flex items-center gap-2">
                                                <Vote className="w-5 h-5 text-primary" /> Active Polls
                                              </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                              {pollsLoading ? (
                                                <div className="space-y-2">
                                                  {Array.from({ length: 2 }).map((_, i) => (
                                                    <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                                                  ))}
                                                </div>
                                              ) : activePolls.length === 0 ? (
                                                <div className="text-center py-10">
                                                  <Vote className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                                                  <p className="font-semibold mb-1">No active polls</p>
                                                  <p className="text-sm text-muted-foreground">
                                                    Polls will appear here when the secretary opens one.
                                                  </p>
                                                </div>
                                              ) : (
                                                activePolls.map((poll) => {
                                                  const opts = pollOptions[poll.id] ?? [];
                                                  const results = pollResults[poll.id] ?? [];
                                                  const myChoice = myPollVotes[poll.id];
                                                  const totalVotes = results.reduce((s, r) => s + r.votes, 0);
                                                  return (
                                                    <div key={poll.id} className="rounded-lg border p-4">
                                                      <h4 className="font-bold mb-1">{poll.title}</h4>
                                                      {poll.description && (
                                                        <p className="text-sm text-muted-foreground mb-2">{poll.description}</p>
                                                      )}
                                                      <p className="text-xs text-muted-foreground mb-3">
                                                        <Clock className="w-3 h-3 inline" /> Closes {new Date(poll.closes_at).toLocaleString()}
                                                        · {totalVotes} vote{totalVotes === 1 ? '' : 's'}
                                                      </p>
                                                      <div className="space-y-2">
                                                        {opts.map((opt) => {
                                                          const isMine = myChoice === opt.id;
                                                          const count = results.find((r) => r.option.id === opt.id)?.votes ?? 0;
                                                          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                                                          return (
                                                            <div key={opt.id}>
                                                              <button
                                                                disabled={!!myChoice}
                                                                onClick={async () => {
                                                                  try {
                                                                    await castPollVote(poll.id, opt.id);
                                                                    setMyPollVotes({ ...myPollVotes, [poll.id]: opt.id });
                                                                    const refreshed = await getPollResults(poll.id);
                                                                    setPollResults({ ...pollResults, [poll.id]: refreshed });
                                                                    toast.success('Vote cast');
                                                                  } catch (err: any) {
                                                                    toast.error(err?.message || 'Failed to vote');
                                                                  }
                                                                }}
                                                                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                                                  isMine ? 'border-primary bg-primary/5' :
                                                                  myChoice ? 'opacity-60' : 'hover:bg-primary/5 cursor-pointer'
                                                                }`}
                                                              >
                                                                <div className="flex items-center justify-between mb-1">
                                                                  <span className="font-medium">{opt.label}</span>
                                                                  {isMine && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                                                </div>
                                                                {myChoice && (
                                                                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                                                                  </div>
                                                                )}
                                                                {myChoice && (
                                                                  <p className="text-xs text-muted-foreground mt-1">{pct}% ({count})</p>
                                                                )}
                                                              </button>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  );
                                                })
                                              )}
                                            </CardContent>
                                          </Card>
                                        )}

                                        {/* === ATTENDANCE TAB === */}
                                        {tab === 'attendance' && (
                                          <Card>
                                            <CardHeader>
                                              <CardTitle className="flex items-center gap-2">
                                                <CheckCheck className="w-5 h-5 text-primary" /> My Attendance
                                              </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                              {attendanceLoading ? (
                                                <div className="space-y-2">
                                                  {Array.from({ length: 2 }).map((_, i) => (
                                                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                                                  ))}
                                                </div>
                                              ) : myAttendance.length === 0 ? (
                                                <div className="text-center py-10">
                                                  <CheckCheck className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                                                  <p className="font-semibold mb-1">No attendance recorded yet</p>
                                                  <p className="text-sm text-muted-foreground">
                                                    When the secretary marks your attendance, it'll appear here.
                                                  </p>
                                                </div>
                                              ) : (
                                                myAttendance.map((a) => (
                                                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                                                    <div>
                                                      <p className="text-sm font-medium">
                                                        Meeting: {a.meeting_id.slice(0, 8)}…
                                                      </p>
                                                      <p className="text-xs text-muted-foreground">
                                                        {a.checked_in_at ? new Date(a.checked_in_at).toLocaleString() : '—'}
                                                      </p>
                                                    </div>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                                      a.status === 'present' ? 'bg-success/15 text-success' :
                                                      a.status === 'absent' ? 'bg-destructive/15 text-destructive' :
                                                      'bg-gold-400/20 text-gold-700'
                                                    }`}>
                                                      {a.status}
                                                    </span>
                                                  </div>
                                                ))
                                              )}
                                            </CardContent>
                                          </Card>
                                        )}

                                        {/* === NOTIFICATIONS TAB === */}
                                        {tab === 'notifications' && (
                                          <NotificationsTab />
                                        )}

                                        {/* === PROFILE TAB === */}
                                                                                {tab === 'profile' && (
                                                                                  <Card>
                                                                                    <CardHeader>
                                                                                      <CardTitle className="flex items-center gap-2">
                                                                                        <User className="w-5 h-5 text-primary" /> Personal Profile
                                                                                      </CardTitle>
                                                                                    </CardHeader>
                                                                                    <CardContent>
                                                                                      {!editing ? (
                                                                                        <div className="space-y-4">
                                                                                          <ProfilePhotoUploader
                                                                                            userId={profile.id}
                                                                                            photoUrl={profile.photo_url ?? null}
                                                                                            displayName={profile.display_name}
                                                                                            onUploaded={() => { loadMemberData(); }}
                                                                                          />
                                                                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                      <p className="text-xs font-semibold text-muted-foreground">Display name</p>
                                                      <p className="text-sm">{profile.display_name}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs font-semibold text-muted-foreground">Email</p>
                                                      <p className="text-sm">{user.email}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs font-semibold text-muted-foreground">Phone</p>
                                                      <p className="text-sm">{profile.phone || '—'}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs font-semibold text-muted-foreground">Address</p>
                                                      <p className="text-sm">{profile.address || '—'}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs font-semibold text-muted-foreground">Member code</p>
                                                      <p className="text-sm font-mono">{profile.member_code || '—'}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs font-semibold text-muted-foreground">National ID</p>
                                                      <p className="text-sm font-mono">{profile.national_id || '—'}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs font-semibold text-muted-foreground">Hierarchy role</p>
                                                      <p className="text-sm">{profile.hierarchy_role || 'Member'}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs font-semibold text-muted-foreground">System role</p>
                                                      <p className="text-sm capitalize">{profile.role}</p>
                                                    </div>
                                                  </div>
                                                  {profile.bio && (
                                                    <div>
                                                      <p className="text-xs font-semibold text-muted-foreground">Bio</p>
                                                      <p className="text-sm whitespace-pre-line">{profile.bio}</p>
                                                    </div>
                                                  )}
                                                  <Button onClick={() => setEditing(true)} leftIcon={<Edit3 className="w-4 h-4" />}>
                                                    Edit profile
                                                  </Button>
                                                </div>
                                              ) : (
                                                <div className="space-y-3">
                                                  <Input label="Display name" value={form.display_name}
                                                    onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))} />
                                                  <Input label="Phone" value={form.phone ?? ''}
                                                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                                                  <Input label="Address" value={form.address ?? ''}
                                                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
                                                  <Textarea label="Bio" rows={4} value={form.bio ?? ''}
                                                    onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
                                                  <div className="flex gap-2">
                                                    <Button onClick={handleSave} isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                                                      Save
                                                    </Button>
                                                    <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                                                  </div>
                                                </div>
                                              )}
                                            </CardContent>
                                          </Card>
                                        )}

                                        {/* RSVP Modal */}
                                        {rsvpModal && (
                                          <Modal title={`RSVP · ${rsvpModal.title}`} onClose={() => setRsvpModal(null)}>
                                            <div className="space-y-3">
                                              <p className="text-sm text-muted-foreground">
                                                {new Date(rsvpModal.scheduled_at).toLocaleString()} • {rsvpModal.location}
                                              </p>
                                              <div>
                                                <label className="block text-sm font-medium mb-1.5">Your response</label>
                                                <select
                                                  value={rsvpResponse}
                                                  onChange={(e) => setRsvpResponse(e.target.value as RsvpResponse)}
                                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                >
                                                  <option value="attending">Attending</option>
                                                  <option value="not_attending">Not attending</option>
                                                  <option value="maybe">Maybe</option>
                                                </select>
                                              </div>
                                              <Textarea
                                                label="Reason (optional)"
                                                rows={2}
                                                value={rsvpReason}
                                                onChange={(e) => setRsvpReason(e.target.value)}
                                                placeholder="e.g. Travel, illness, prior commitment…"
                                              />
                                              <div className="flex gap-2">
                                                <Button
                                                  onClick={async () => {
                                                    setSubmittingRsvp(true);
                                                    try {
                                                      await submitMeetingRsvp(rsvpModal.id, rsvpResponse, rsvpReason || undefined);
                                                      // Refresh my RSVPs
                                                      const list = await getMeetingRsvps(rsvpModal.id);
                                                      const mine = list.find((r) => r.member_id === profile.id);
                                                      if (mine) setMyRsvps({ ...myRsvps, [rsvpModal.id]: mine });
                                                      toast.success('RSVP recorded');
                                                      setRsvpModal(null);
                                                    } catch (err: any) {
                                                      toast.error(err?.message || 'Failed');
                                                    } finally {
                                                      setSubmittingRsvp(false);
                                                    }
                                                  }}
                                                  isLoading={submittingRsvp}
                                                  leftIcon={<Send className="w-4 h-4" />}
                                                >
                                                  Submit
                                                </Button>
                                                <Button variant="outline" onClick={() => setRsvpModal(null)}>Cancel</Button>
                                              </div>
                                            </div>
                                          </Modal>
                                        )}

                                      </div>
                                    </div>
                                  </motion.div>
                                </div>
                              </section>
                            );
                          };
