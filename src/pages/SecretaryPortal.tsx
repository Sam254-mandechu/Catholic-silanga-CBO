import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays, ClipboardList, Vote, FileText, BarChart3, LogOut,
  Plus, X, Eye, Trash2, Save, XCircle, Clock, ListChecks,
  CheckCheck, Users, Search, Send,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/toast';

import {
  getMeetings, createMeeting, updateMeeting, deleteMeeting,
  getMeetingRsvps, markMeetingAttendance, getMeetingAttendance,
  getMeetingMinutes,
  saveMinutesDraft, publishMeetingMinutes,
  getPolls, getPollOptions, createPoll, closePoll, deletePoll,
  getPollResults,
} from '../services/supabaseData';
import { listApprovedMembersByHierarchy } from '../services/supabaseAuth';
import type {
  Meeting, MeetingRsvp, MeetingAttendance, MeetingMinutes, MeetingStatus,
  Poll, PollOption, PollType, MinutesStatus, ActionItem,
  Profile,
} from '../types/database';

type Tab =
  | 'overview' | 'meetings' | 'rsvps' | 'attendance'
  | 'minutes' | 'polls' | 'members';

// ---------- Helpers ----------
const PIE_COLORS = ['#a82524', '#f59e0b', '#15803d', '#6366f1', '#db2777', '#0891b2'];

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

// ============================================================
// MAIN PAGE
// ============================================================
export const SecretaryPortal: React.FC = () => {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  // Data
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, MeetingRsvp[]>>({});
  const [attendance, setAttendance] = useState<Record<string, MeetingAttendance[]>>({});
  const [minutes, setMinutes] = useState<Record<string, MeetingMinutes | null>>({});
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollOptions, setPollOptions] = useState<Record<string, PollOption[]>>({});
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const m = await getMeetings();
        if (!mounted) return;
        setMeetings(m);

        // Fetch minutes + attendance + rsvps for each meeting in parallel
        const minutesMap: Record<string, MeetingMinutes | null> = {};
        const attMap: Record<string, MeetingAttendance[]> = {};
        const rsvpMap: Record<string, MeetingRsvp[]> = {};
        await Promise.all(
          m.map(async (meeting) => {
            try {
              minutesMap[meeting.id] = await getMeetingMinutes(meeting.id);
            } catch { minutesMap[meeting.id] = null; }
            try {
              attMap[meeting.id] = await getMeetingAttendance(meeting.id);
            } catch { attMap[meeting.id] = []; }
            try {
              rsvpMap[meeting.id] = await getMeetingRsvps(meeting.id);
            } catch { rsvpMap[meeting.id] = []; }
          }),
        );
        if (!mounted) return;
        setMinutes(minutesMap);
        setAttendance(attMap);
        setRsvps(rsvpMap);

        const pl = await getPolls();
        if (!mounted) return;
        setPolls(pl);

        const optsMap: Record<string, PollOption[]> = {};
        await Promise.all(
          pl.map(async (p) => {
            try {
              optsMap[p.id] = await getPollOptions(p.id);
            } catch { optsMap[p.id] = []; }
          }),
        );
        if (!mounted) return;
        setPollOptions(optsMap);

        // Fetch all active members for the attendance picker
        try {
          const allMembers = await listApprovedMembersByHierarchy();
          if (mounted) setMembers(allMembers);
        } catch (err) {
          console.warn('Failed to load members for attendance picker', err);
        }
      } catch (err) {
        console.warn('Secretary data load failed', err);
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

  // Derived stats
  const upcoming = useMemo(() => {
    const now = Date.now();
    return meetings.filter((m) => new Date(m.scheduled_at).getTime() >= now && m.status === 'scheduled');
  }, [meetings]);
  const past = useMemo(() => {
    const now = Date.now();
    return meetings.filter((m) => new Date(m.scheduled_at).getTime() < now || m.status !== 'scheduled');
  }, [meetings]);
  const openPolls = useMemo(() => {
    const now = Date.now();
    return polls.filter((p) => p.status === 'open' && new Date(p.closes_at).getTime() >= now);
  }, [polls]);

  const totalRsvps = useMemo(
    () => Object.values(rsvps).reduce((sum, list) => sum + list.length, 0),
    [rsvps],
  );
  const totalPresent = useMemo(() => {
    let n = 0;
    for (const list of Object.values(attendance)) {
      for (const a of list) if (a.status === 'present') n++;
    }
    return n;
  }, [attendance]);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'meetings', label: 'Meetings', icon: CalendarDays },
    { id: 'rsvps', label: 'RSVPs', icon: ListChecks },
    { id: 'attendance', label: 'Attendance', icon: CheckCheck },
    { id: 'minutes', label: 'Minutes', icon: FileText },
    { id: 'polls', label: 'Polls', icon: Vote },
    { id: 'members', label: 'Members', icon: Users },
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
              <ClipboardList className="w-4 h-4 text-gold-700" />
              <span className="text-xs font-semibold text-gold-700 uppercase tracking-wider">
                Secretary Portal
              </span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold">
              {profile?.display_name ?? 'Secretary'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage meetings, RSVPs, attendance, minutes, and polls.
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
                      {t.id === 'rsvps' && totalRsvps > 0 && (
                        <span className="ml-auto text-[10px] bg-gold-400 text-primary-foreground px-1.5 py-0.5 rounded-full">
                          {totalRsvps}
                        </span>
                      )}
                      {t.id === 'polls' && openPolls.length > 0 && (
                        <span className="ml-auto text-[10px] bg-pink-700 text-white px-1.5 py-0.5 rounded-full">
                          {openPolls.length}
                        </span>
                      )}
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
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard label="Upcoming meetings" value={upcoming.length} icon={CalendarDays} color="text-primary" />
                  <StatCard label="Past meetings" value={past.length} icon={Clock} color="text-muted-foreground" />
                  <StatCard label="Total RSVPs" value={totalRsvps} icon={ListChecks} color="text-gold-700" />
                  <StatCard label="Total present (all meetings)" value={totalPresent} icon={CheckCheck} color="text-success" />
                  <StatCard label="Open polls" value={openPolls.length} icon={Vote} color="text-pink-700" />
                  <StatCard label="Total polls" value={polls.length} icon={BarChart3} color="text-accent" />
                </div>

                {upcoming.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Next meeting</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <NextMeetingCard meeting={upcoming[0]} rsvpCount={rsvps[upcoming[0].id]?.length ?? 0} />
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {tab === 'meetings' && (
              <MeetingsTab
                meetings={meetings}
                setMeetings={setMeetings}
                rsvps={rsvps}
                attendance={attendance}
                minutes={minutes}
              />
            )}
            {tab === 'rsvps' && <RsvpsTab meetings={meetings} rsvps={rsvps} />}
            {tab === 'attendance' && (
              <AttendanceTab
                meetings={meetings}
                attendance={attendance}
                setAttendance={setAttendance}
                members={members}
              />
            )}
            {tab === 'minutes' && (
              <MinutesTab
                meetings={meetings}
                minutes={minutes}
                setMinutes={setMinutes}
                attendance={attendance}
                members={members}
              />
            )}
            {tab === 'polls' && (
              <PollsTab
                polls={polls}
                setPolls={setPolls}
                pollOptions={pollOptions}
                setPollOptions={setPollOptions}
              />
            )}
            {tab === 'members' && <MembersTab members={members} />}
          </main>
        </div>
      </div>
    </section>
  );
};

// ============================================================
// STAT CARD
// ============================================================
const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = ({ label, value, icon: Icon, color }) => (
  <Card>
    <CardContent className="p-5">
      <Icon className={`w-7 h-7 ${color} mb-2`} />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </CardContent>
  </Card>
);

const NextMeetingCard: React.FC<{ meeting: Meeting; rsvpCount: number }> = ({ meeting, rsvpCount }) => (
  <div className="rounded-lg border p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h3 className="font-bold text-lg">{meeting.title}</h3>
        <p className="text-sm text-muted-foreground">{meeting.description ?? '—'}</p>
        <p className="text-xs mt-2">
          <Clock className="w-3 h-3 inline" /> {fmtDateTime(meeting.scheduled_at)}
        </p>
        <p className="text-xs">{meeting.location}</p>
      </div>
      <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-semibold uppercase">
        {meeting.meeting_type}
      </span>
    </div>
    <div className="mt-3 text-xs text-muted-foreground">
      {rsvpCount} RSVP{rsvpCount === 1 ? '' : 's'} so far
    </div>
  </div>
);

// ============================================================
// MEETINGS TAB
// ============================================================
const MeetingsTab: React.FC<{
  meetings: Meeting[];
  setMeetings: (m: Meeting[]) => void;
  rsvps: Record<string, MeetingRsvp[]>;
  attendance: Record<string, MeetingAttendance[]>;
  minutes: Record<string, MeetingMinutes | null>;
}> = ({ meetings, setMeetings, rsvps, attendance, minutes }) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    location: '',
    meeting_type: 'general' as Meeting['meeting_type'],
    status: 'scheduled' as MeetingStatus,
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      title: '', description: '',
      scheduled_at: new Date().toISOString().slice(0, 16),
      location: '',
      meeting_type: 'general',
      status: 'scheduled',
    });
    setShowForm(true);
  };

  const openEdit = (m: Meeting) => {
    setEditing(m);
    setForm({
      title: m.title,
      description: m.description ?? '',
      scheduled_at: m.scheduled_at.slice(0, 16),
      location: m.location ?? '',
      meeting_type: m.meeting_type,
      status: m.status,
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const updated = await updateMeeting(editing.id, form);
        setMeetings(meetings.map((m) => (m.id === updated.id ? updated : m)));
        toast.success('Meeting updated');
      } else {
        const created = await createMeeting(form);
        setMeetings([created, ...meetings]);
        toast.success('Meeting created');
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save');
    }
  };

  const handleDelete = async (m: Meeting) => {
    if (!confirm(`Delete meeting "${m.title}"?`)) return;
    try {
      await deleteMeeting(m.id);
      setMeetings(meetings.filter((x) => x.id !== m.id));
      toast.success('Meeting deleted');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Meetings ({meetings.length})</CardTitle>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openNew}>
          Create Meeting
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleSave} className="space-y-3 border-b pb-4 mb-4">
            <Input label="Title *" required value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Textarea label="Description" rows={3} value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Scheduled at *" required type="datetime-local" value={form.scheduled_at}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))} />
              <Input label="Location" value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Type</label>
                <select
                  value={form.meeting_type}
                  onChange={(e) => setForm((f) => ({ ...f, meeting_type: e.target.value as Meeting['meeting_type'] }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="general">General</option>
                  <option value="committee">Committee</option>
                  <option value="emergency">Emergency</option>
                  <option value="agm">AGM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MeetingStatus }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" leftIcon={<Save className="w-4 h-4" />}>
                {editing ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {meetings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No meetings yet. Click "Create Meeting" to add one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => {
              const rsvpCount = rsvps[m.id]?.length ?? 0;
              const attCount = attendance[m.id]?.length ?? 0;
              const hasMinutes = !!minutes[m.id];
              return (
                <div key={m.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-bold">{m.title}</h4>
                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {m.meeting_type}
                        </span>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                          m.status === 'scheduled' ? 'bg-gold-400/20 text-gold-700' :
                          m.status === 'in_progress' ? 'bg-primary/15 text-primary' :
                          m.status === 'completed' ? 'bg-success/15 text-success' :
                          'bg-destructive/15 text-destructive'
                        }`}>
                          {m.status.replace('_', ' ')}
                        </span>
                        {hasMinutes && (
                          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-success/15 text-success">
                            minutes ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                      <p className="text-xs mt-2">
                        <Clock className="w-3 h-3 inline" /> {fmtDateTime(m.scheduled_at)} • {m.location}
                      </p>
                      <div className="flex gap-3 mt-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-gold-400/15 text-gold-700 font-semibold">
                          RSVPs: {rsvpCount}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                          Attendance: {attCount}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" leftIcon={<Eye className="w-3 h-3" />}
                        onClick={() => openEdit(m)}>
                        Edit
                      </Button>
                      <button
                        onClick={() => handleDelete(m)}
                        className="p-2 rounded hover:bg-destructive/10 text-destructive"
                        aria-label="Delete meeting"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================
// RSVPS TAB
// ============================================================
const RsvpsTab: React.FC<{
  meetings: Meeting[];
  rsvps: Record<string, MeetingRsvp[]>;
}> = ({ meetings, rsvps }) => {
  const [selected, setSelected] = useState<Meeting | null>(null);

  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <ListChecks className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Create a meeting first to start collecting RSVPs.</p>
        </CardContent>
      </Card>
    );
  }

  const list = selected ? (rsvps[selected.id] ?? []) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>RSVPs by meeting</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {meetings.map((m) => {
            const list = rsvps[m.id] ?? [];
            const counts = {
              attending: list.filter((r) => r.response === 'attending').length,
              not_attending: list.filter((r) => r.response === 'not_attending').length,
              maybe: list.filter((r) => r.response === 'maybe').length,
            };
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="text-left rounded-lg border p-3 hover:shadow-md transition-shadow"
              >
                <p className="font-bold line-clamp-1">{m.title}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(m.scheduled_at)}</p>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-success/15 text-success font-semibold">
                    ✓ {counts.attending}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-destructive/15 text-destructive font-semibold">
                    ✗ {counts.not_attending}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-gold-400/20 text-gold-700 font-semibold">
                    ? {counts.maybe}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <Modal title={`RSVPs · ${selected.title}`} onClose={() => setSelected(null)} wide>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {list.length === 0 ? 'No RSVPs yet.' : `${list.length} member${list.length === 1 ? '' : 's'} responded.`}
              </p>
              {list.length > 0 && (
                <div className="space-y-2">
                  {list.map((r) => (
                    <div key={r.id} className="flex items-center justify-between border-b last:border-0 py-2">
                      <div>
                        <p className="text-sm font-medium">Member: {r.member_id.slice(0, 8)}…</p>
                        {r.reason && <p className="text-xs text-muted-foreground">"{r.reason}"</p>}
                      </div>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                        r.response === 'attending' ? 'bg-success/15 text-success' :
                        r.response === 'not_attending' ? 'bg-destructive/15 text-destructive' :
                        'bg-gold-400/20 text-gold-700'
                      }`}>
                        {r.response.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Modal>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================
// ATTENDANCE TAB
// ============================================================
const AttendanceTab: React.FC<{
  meetings: Meeting[];
  attendance: Record<string, MeetingAttendance[]>;
  setAttendance: (m: Record<string, MeetingAttendance[]>) => void;
  members: Profile[];
}> = ({ meetings, attendance, setAttendance, members }) => {
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [memberInput, setMemberInput] = useState('');
  const [statusInput, setStatusInput] = useState<'present' | 'absent' | 'excused'>('present');

  const markOne = async (memberId: string, status: 'present' | 'absent' | 'excused') => {
    if (!selected) return;
    try {
      const rec = await markMeetingAttendance(selected.id, memberId, status);
      setAttendance({
        ...attendance,
        [selected.id]: [
          ...(attendance[selected.id] ?? []).filter((a) => a.member_id !== memberId),
          rec,
        ],
      });
      toast.success(`Marked ${status}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to mark');
    }
  };

  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <CheckCheck className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No meetings to record attendance for.</p>
        </CardContent>
      </Card>
    );
  }

  const list = selected ? (attendance[selected.id] ?? []) : [];
  const memberById = useMemo(() => {
    const m = new Map<string, Profile>();
    members.forEach((p) => m.set(p.id, p));
    return m;
  }, [members]);
  const recordedIds = new Set(list.map((a) => a.member_id));
  const unmarked = members.filter((p) => !recordedIds.has(p.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {meetings.map((m) => {
            const list = attendance[m.id] ?? [];
            const present = list.filter((a) => a.status === 'present').length;
            const absent = list.filter((a) => a.status === 'absent').length;
            const excused = list.filter((a) => a.status === 'excused').length;
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="text-left rounded-lg border p-3 hover:shadow-md transition-shadow"
              >
                <p className="font-bold line-clamp-1">{m.title}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(m.scheduled_at)}</p>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-success/15 text-success font-semibold">P {present}</span>
                  <span className="px-2 py-0.5 rounded bg-destructive/15 text-destructive font-semibold">A {absent}</span>
                  <span className="px-2 py-0.5 rounded bg-gold-400/20 text-gold-700 font-semibold">E {excused}</span>
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <Modal title={`Attendance · ${selected.title}`} onClose={() => setSelected(null)} wide>
            <div className="space-y-4">
              {/* Member picker + status dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Member</label>
                  <select
                    value={memberInput}
                    onChange={(e) => setMemberInput(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— select a member —</option>
                    {members.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name}
                        {p.hierarchy_role ? ` (${p.hierarchy_role})` : ''}
                        {recordedIds.has(p.id) ? ' · recorded' : ''}
                      </option>
                    ))}
                  </select>
                  {members.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No active members loaded — check that members have status='active'.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value as typeof statusInput)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="excused">Excused</option>
                  </select>
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <Button
                    disabled={!memberInput}
                    onClick={() => memberInput && markOne(memberInput, statusInput)}
                  >
                    Mark attendance
                  </Button>
                </div>
              </div>

              {/* Quick-mark list for anyone not yet recorded */}
              {unmarked.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                    Quick mark · {unmarked.length} member{unmarked.length === 1 ? '' : 's'} not yet recorded
                  </p>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {unmarked.map((p) => (
                      <div key={p.id} className="flex items-center justify-between border-b last:border-0 py-2">
                        <div>
                          <p className="text-sm font-medium">{p.display_name}</p>
                          {p.hierarchy_role && (
                            <p className="text-xs text-muted-foreground">{p.hierarchy_role}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => markOne(p.id, 'present')}
                          >
                            P
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markOne(p.id, 'absent')}
                          >
                            A
                          </Button>
                          <Button
                            size="sm"
                            variant="gold"
                            onClick={() => markOne(p.id, 'excused')}
                          >
                            E
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recorded list */}
              <div className="border-t pt-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Recorded ({list.length})
                </p>
                {list.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>
                ) : (
                  <div className="space-y-1">
                    {list.map((a) => {
                      const m = memberById.get(a.member_id);
                      return (
                        <div key={a.id} className="flex items-center justify-between border-b last:border-0 py-2">
                          <div>
                            <p className="text-sm font-medium">
                              {m?.display_name ?? `Member: ${a.member_id.slice(0, 8)}…`}
                            </p>
                            {m?.hierarchy_role && (
                              <p className="text-xs text-muted-foreground">{m.hierarchy_role}</p>
                            )}
                          </div>
                          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                            a.status === 'present' ? 'bg-success/15 text-success' :
                            a.status === 'absent' ? 'bg-destructive/15 text-destructive' :
                            'bg-gold-400/20 text-gold-700'
                          }`}>
                            {a.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================
// MINUTES TAB
// ============================================================
const MinutesTab: React.FC<{
  meetings: Meeting[];
  minutes: Record<string, MeetingMinutes | null>;
  setMinutes: (m: Record<string, MeetingMinutes | null>) => void;
  attendance: Record<string, MeetingAttendance[]>;
  members: Profile[];
}> = ({ meetings, minutes, setMinutes, attendance, members }) => {
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [form, setForm] = useState({ agenda: '', discussions: '', decisions: '', action_items: '' });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const openEdit = (m: Meeting) => {
    const existing = minutes[m.id];
    setEditing(m);
    setForm({
      agenda: existing?.agenda ?? '',
      discussions: existing?.discussions ?? '',
      decisions: existing?.decisions ?? '',
      action_items: JSON.stringify(existing?.action_items ?? [], null, 2),
    });
  };

  const parseActionItems = (): ActionItem[] | null => {
    try {
      const parsed = JSON.parse(form.action_items || '[]');
      if (!Array.isArray(parsed)) {
        toast.error('Action items must be a JSON array');
        return null;
      }
      return parsed as ActionItem[];
    } catch {
      toast.error('Action items must be valid JSON');
      return null;
    }
  };

  const handleSaveDraft = async () => {
    if (!editing) return;
    const actionItems = parseActionItems();
    if (!actionItems) return;
    setSaving(true);
    try {
      const saved = await saveMinutesDraft(
        editing.id,
        form.agenda,
        form.discussions,
        form.decisions,
        actionItems,
      );
      setMinutes({ ...minutes, [editing.id]: saved });
      toast.success('Draft saved');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!editing) return;
    const actionItems = parseActionItems();
    if (!actionItems) return;
    setPublishing(true);
    try {
      const saved = await publishMeetingMinutes(
        editing.id,
        form.agenda,
        form.discussions,
        form.decisions,
        actionItems,
      );
      setMinutes({ ...minutes, [editing.id]: saved });
      toast.success('Minutes published — visible at /meetings');
      setConfirmPublish(false);
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No meetings to attach minutes to.</p>
        </CardContent>
      </Card>
    );
  }

  // Sort meetings so newest-first
  const sortedMeetings = [...meetings].sort(
    (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meeting Minutes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedMeetings.map((m) => {
          const existing = minutes[m.id];
          const status: MinutesStatus | 'none' = existing?.status ?? 'none';
          const attList = attendance[m.id] ?? [];
          const presentCount = attList.filter((a) => a.status === 'present').length;
          return (
            <div key={m.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateTime(m.scheduled_at)} • {m.location}
                  </p>
                  <div className="flex gap-2 mt-1 text-xs flex-wrap">
                    {status === 'published' ? (
                      <span className="px-2 py-0.5 rounded-full bg-success/15 text-success font-semibold">
                        Published
                      </span>
                    ) : status === 'draft' ? (
                      <span className="px-2 py-0.5 rounded-full bg-gold-400/20 text-gold-700 font-semibold">
                        Draft
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                        No minutes yet
                      </span>
                    )}
                    {attList.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                        {presentCount}/{attList.length} present
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {status === 'published' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(`/meetings/${m.id}/proceedings`, '_blank')}
                      leftIcon={<Eye className="w-3 h-3" />}
                    >
                      View proceedings
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<FileText className="w-3 h-3" />}
                    onClick={() => openEdit(m)}
                  >
                    {status === 'published' ? 'Amend' : status === 'draft' ? 'Edit draft' : 'Write minutes'}
                  </Button>
                </div>
              </div>
              {existing && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Agenda</p>
                    <p className="line-clamp-3 whitespace-pre-line">{existing.agenda ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Decisions</p>
                    <p className="line-clamp-3 whitespace-pre-line">{existing.decisions ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Action items</p>
                    <p className="text-xs">
                      {Array.isArray(existing.action_items) ? existing.action_items.length : 0} items
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      {editing && (
        <Modal title={`Minutes · ${editing.title}`} onClose={() => { setEditing(null); setConfirmPublish(false); }} wide>
          <div className="space-y-3">
            {/* Attendance roll side-panel */}
            {(() => {
              const attList = attendance[editing.id] ?? [];
              const memberById = new Map(members.map((p) => [p.id, p]));
              const present = attList.filter((a) => a.status === 'present');
              const excused = attList.filter((a) => a.status === 'excused');
              const absent = attList.filter((a) => a.status === 'absent');
              return (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                    Attendance roll ({attList.length} of {members.length} recorded · {present.length} present)
                  </p>
                  {attList.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No attendance recorded yet — go to the Attendance tab to mark who was there.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="font-semibold text-success mb-1">Present ({present.length})</p>
                        <ul className="space-y-0.5">
                          {present.map((a) => (
                            <li key={a.id}>{memberById.get(a.member_id)?.display_name ?? a.member_id.slice(0, 8)}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-gold-700 mb-1">Excused ({excused.length})</p>
                        <ul className="space-y-0.5">
                          {excused.map((a) => (
                            <li key={a.id}>{memberById.get(a.member_id)?.display_name ?? a.member_id.slice(0, 8)}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-destructive mb-1">Absent ({absent.length})</p>
                        <ul className="space-y-0.5">
                          {absent.map((a) => (
                            <li key={a.id}>{memberById.get(a.member_id)?.display_name ?? a.member_id.slice(0, 8)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <Textarea label="Agenda" rows={3} value={form.agenda}
              onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))} />
            <Textarea label="Discussions" rows={5} value={form.discussions}
              onChange={(e) => setForm((f) => ({ ...f, discussions: e.target.value }))} />
            <Textarea label="Decisions" rows={4} value={form.decisions}
              onChange={(e) => setForm((f) => ({ ...f, decisions: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Action items (JSON array)
              </label>
              <textarea
                rows={6}
                value={form.action_items}
                onChange={(e) => setForm((f) => ({ ...f, action_items: e.target.value }))}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder='[{"who": "John", "what": "Send report", "by": "2026-08-30"}]'
              />
              <p className="text-xs text-muted-foreground mt-1">
                Each item is an object: <code>{`{who, what, by}`}</code>. <code>by</code> is a date string.
              </p>
            </div>

            {!confirmPublish ? (
              <div className="flex gap-2 flex-wrap justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  isLoading={saving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save draft
                </Button>
                <Button
                  onClick={() => setConfirmPublish(true)}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Publish…
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 space-y-2">
                <p className="font-semibold text-sm">Recheck before publishing</p>
                <p className="text-xs text-muted-foreground">
                  Publishing makes these minutes <strong>public</strong> at{' '}
                  <code>/meetings/{editing.id}/proceedings</code>. Anyone visiting the site will be able
                  to read the agenda, discussions, decisions, action items, and the attendance roll.
                </p>
                <p className="text-xs text-muted-foreground">
                  Once published, only admins can amend them. You'll be credited as the publisher.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setConfirmPublish(false)}>Back to editing</Button>
                  <Button
                    onClick={handlePublish}
                    isLoading={publishing}
                    leftIcon={<Send className="w-4 h-4" />}
                  >
                    Confirm and publish
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </Card>
  );
};

// ============================================================
// MEMBERS TAB
// ============================================================
const MembersTab: React.FC<{ members: Profile[] }> = ({ members }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.display_name, m.email, m.phone, m.hierarchy_role, m.bio]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [members, search]);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> Members ({members.length})
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, role…"
            className="pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm w-full sm:w-72"
          />
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No active members loaded.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No members match &ldquo;{search}&rdquo;.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="text-left rounded-lg border p-3 hover:shadow-md transition-shadow bg-card"
              >
                <p className="font-semibold">{m.display_name}</p>
                {m.hierarchy_role && (
                  <p className="text-xs text-primary mt-0.5">{m.hierarchy_role}</p>
                )}
                <p className="text-xs text-muted-foreground truncate mt-1">{m.email}</p>
                {m.phone && (
                  <p className="text-xs text-muted-foreground">{m.phone}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </CardContent>

      {selected && (
        <Modal title={selected.display_name} onClose={() => setSelected(null)}>
          <div className="space-y-3 text-sm">
            {selected.photo_url && (
              <img
                src={selected.photo_url}
                alt={selected.display_name}
                className="w-24 h-24 rounded-full object-cover mx-auto"
              />
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Role</p>
              <p>{selected.hierarchy_role ?? 'Member'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Email</p>
              <a href={`mailto:${selected.email}`} className="text-primary hover:underline">
                {selected.email}
              </a>
            </div>
            {selected.phone && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Phone</p>
                <a href={`tel:${selected.phone.replace(/\s/g, '')}`} className="text-primary hover:underline">
                  {selected.phone}
                </a>
              </div>
            )}
            {selected.address && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Address</p>
                <p className="whitespace-pre-line">{selected.address}</p>
              </div>
            )}
            {selected.bio && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Bio</p>
                <p className="whitespace-pre-line">{selected.bio}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Member since</p>
              <p>{fmtDate(selected.joined_at)}</p>
            </div>
            <div className="pt-2 border-t flex gap-2 justify-end">
              {selected.email && (
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Send className="w-3 h-3" />}
                  onClick={() => window.location.href = `mailto:${selected.email}`}
                >
                  Email
                </Button>
              )}
              {selected.phone && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => window.location.href = `tel:${selected.phone!.replace(/\s/g, '')}`}
                >
                  Call
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};

// ============================================================
// POLLS TAB
// ============================================================
const PollsTab: React.FC<{
  polls: Poll[];
  setPolls: (p: Poll[]) => void;
  pollOptions: Record<string, PollOption[]>;
  setPollOptions: (m: Record<string, PollOption[]>) => void;
}> = ({ polls, setPolls, pollOptions, setPollOptions }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    type: PollType;
    closes_at: string;
    options: string[];
  }>({
    title: '',
    description: '',
    type: 'single_choice',
    closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    options: ['', ''],
  });
  const [resultsPoll, setResultsPoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<{ option: PollOption; votes: number }[]>([]);

  const openResults = async (p: Poll) => {
    setResultsPoll(p);
    try {
      const r = await getPollResults(p.id);
      setResults(r);
    } catch {
      setResults([]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const opts = form.type === 'yes_no'
      ? ['Yes', 'No']
      : form.options.filter((o) => o.trim() !== '');
    if (opts.length < 2) {
      toast.error('Poll needs at least 2 options');
      return;
    }
    try {
      const created = await createPoll({
        title: form.title,
        description: form.description,
        type: form.type,
        closes_at: form.closes_at,
        options: opts,
      });
      setPolls([created, ...polls]);
      toast.success('Poll created');
      setShowForm(false);
      setForm({
        title: '',
        description: '',
        type: 'single_choice',
        closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        options: ['', ''],
      });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create poll');
    }
  };

  const handleClose = async (p: Poll) => {
    try {
      const updated = await closePoll(p.id);
      setPolls(polls.map((x) => (x.id === updated.id ? updated : x)));
      toast.success('Poll closed');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to close poll');
    }
  };

  const handleDelete = async (p: Poll) => {
    if (!confirm(`Delete poll "${p.title}"?`)) return;
    try {
      await deletePoll(p.id);
      setPolls(polls.filter((x) => x.id !== p.id));
      const next = { ...pollOptions };
      delete next[p.id];
      setPollOptions(next);
      toast.success('Poll deleted');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Polls ({polls.length})</CardTitle>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Create Poll'}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleSave} className="space-y-3 border-b pb-4 mb-4">
            <Input label="Title *" required value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Textarea label="Description" rows={2} value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Type</label>
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
              <Input label="Closes at *" required type="datetime-local" value={form.closes_at}
                onChange={(e) => setForm((f) => ({ ...f, closes_at: e.target.value }))} />
            </div>
            {form.type !== 'yes_no' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Options *</label>
                {form.options.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={o}
                      onChange={(e) => setForm((f) => {
                        const next = [...f.options];
                        next[i] = e.target.value;
                        return { ...f, options: next };
                      })}
                      placeholder={`Option ${i + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }))}
                      className="p-2 rounded hover:bg-destructive/10 text-destructive"
                      aria-label="Remove option"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, options: [...f.options, ''] }))}
                  leftIcon={<Plus className="w-3 h-3" />}
                >
                  Add option
                </Button>
              </div>
            )}
            <Button type="submit" leftIcon={<Save className="w-4 h-4" />}>Create poll</Button>
          </form>
        )}

        {polls.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Vote className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No polls yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {polls.map((p) => {
              const opts = pollOptions[p.id] ?? [];
              const isOpen = p.status === 'open' && new Date(p.closes_at).getTime() >= Date.now();
              return (
                <div key={p.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-bold">{p.title}</h4>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                          p.status === 'open' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                        }`}>
                          {p.status}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border">
                          {p.type.replace('_', ' ')}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                      )}
                      <p className="text-xs mt-1">
                        <Clock className="w-3 h-3 inline" /> closes {fmtDateTime(p.closes_at)}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {opts.map((o) => (
                          <span key={o.id} className="text-xs px-2 py-0.5 rounded bg-muted">
                            {o.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 flex-wrap">
                      <Button size="sm" variant="outline" leftIcon={<Eye className="w-3 h-3" />}
                        onClick={() => openResults(p)}>
                        Results
                      </Button>
                      {isOpen && (
                        <Button size="sm" variant="outline" leftIcon={<XCircle className="w-3 h-3" />}
                          onClick={() => handleClose(p)}>
                          Close
                        </Button>
                      )}
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-2 rounded hover:bg-destructive/10 text-destructive"
                        aria-label="Delete poll"
                      >
                        <Trash2 className="w-4 h-4" />
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
        <Modal title={`Results · ${resultsPoll.title}`} onClose={() => setResultsPoll(null)} wide>
          <div>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No votes yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.map((r) => ({ name: r.option.label, votes: r.votes }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.2)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                    {results.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Modal>
      )}
    </Card>
  );
};

export default SecretaryPortal;