import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays, Clock, MapPin, FileText,
  Calendar, CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Loader } from '../components/common/Loader';
import {
  getMeetings, getMeetingRsvps, submitMeetingRsvp,
  getMeetingMinutes, getMeetingAttendance,
} from '../services/supabaseData';
import type { Meeting, MeetingRsvp, MeetingMinutes, MeetingAttendance, RsvpResponse } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/common/Modal';
import { Textarea } from '../components/ui/Input';
import { toast } from '../utils/toast';

const TYPE_LABEL: Record<string, string> = {
  general: 'General',
  committee: 'Committee',
  emergency: 'Emergency',
  agm: 'AGM',
};

function fmtDateTime(iso: string): string {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export const MeetingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, MeetingRsvp[]>>({});
  const [minutes, setMinutes] = useState<Record<string, MeetingMinutes | null>>({});
  const [attendance, setAttendance] = useState<Record<string, MeetingAttendance[]>>({});
  const [myRsvps, setMyRsvps] = useState<Record<string, MeetingRsvp>>({});
  const [loading, setLoading] = useState(true);
  const [rsvpModal, setRsvpModal] = useState<Meeting | null>(null);
  const [rsvpResponse, setRsvpResponse] = useState<RsvpResponse>('attending');
  const [rsvpReason, setRsvpReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const all = await getMeetings();
        if (!mounted) return;
        setMeetings(all);

        const rsvpMap: Record<string, MeetingRsvp[]> = {};
        const minuteMap: Record<string, MeetingMinutes | null> = {};
        const attMap: Record<string, MeetingAttendance[]> = {};
        const myMap: Record<string, MeetingRsvp> = {};
        await Promise.all(
          all.map(async (m) => {
            try {
              const list = await getMeetingRsvps(m.id);
              rsvpMap[m.id] = list;
              const mine = list.find((r) => r.member_id === profile?.id);
              if (mine) myMap[m.id] = mine;
            } catch { rsvpMap[m.id] = []; }
            try {
              minuteMap[m.id] = await getMeetingMinutes(m.id);
            } catch { minuteMap[m.id] = null; }
            try {
              attMap[m.id] = await getMeetingAttendance(m.id);
            } catch { attMap[m.id] = []; }
          }),
        );
        if (!mounted) return;
        setRsvps(rsvpMap);
        setMinutes(minuteMap);
        setAttendance(attMap);
        setMyRsvps(myMap);
      } catch (err) {
        console.warn('Meetings load failed', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [profile?.id]);

  const now = Date.now();
  const upcomingMeetings = meetings.filter((m) => new Date(m.scheduled_at).getTime() >= now);
  const pastMeetings = meetings.filter((m) => new Date(m.scheduled_at).getTime() < now);
  const visible = tab === 'upcoming' ? upcomingMeetings : pastMeetings;

  const submitRsvp = async () => {
    if (!rsvpModal || !user) return;
    setSubmitting(true);
    try {
      await submitMeetingRsvp(rsvpModal.id, rsvpResponse, rsvpReason || undefined);
      const list = await getMeetingRsvps(rsvpModal.id);
      setRsvps({ ...rsvps, [rsvpModal.id]: list });
      const mine = list.find((r) => r.member_id === profile?.id);
      if (mine) setMyRsvps({ ...myRsvps, [rsvpModal.id]: mine });
      toast.success('RSVP recorded');
      setRsvpModal(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit RSVP');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Meetings"
        subtitle="Upcoming gatherings and published minutes from past meetings."
      />

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <Loader />
          ) : meetings.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CalendarDays className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-xl font-bold mb-2">No meetings scheduled</h3>
                <p className="text-sm text-muted-foreground">
                  Check back later — the secretary will post upcoming meetings here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="inline-flex bg-card border rounded-lg p-1 mb-6">
                <button
                  onClick={() => setTab('upcoming')}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    tab === 'upcoming' ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/5'
                  }`}
                >
                  <Calendar className="w-4 h-4" /> Upcoming ({upcomingMeetings.length})
                </button>
                <button
                  onClick={() => setTab('past')}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    tab === 'past' ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/5'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Past ({pastMeetings.length})
                </button>
              </div>

              {visible.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    {tab === 'upcoming' ? 'No upcoming meetings.' : 'No past meetings.'}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visible.map((m) => {
                    const list = rsvps[m.id] ?? [];
                    const counts = {
                      attending: list.filter((r) => r.response === 'attending').length,
                      not_attending: list.filter((r) => r.response === 'not_attending').length,
                      maybe: list.filter((r) => r.response === 'maybe').length,
                    };
                    const att = attendance[m.id] ?? [];
                    const present = att.filter((a) => a.status === 'present').length;
                    const myR = myRsvps[m.id];
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4 }}
                      >
                        <Card className="h-full hover:shadow-xl transition-shadow">
                          <CardHeader>
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="line-clamp-1">{m.title}</CardTitle>
                              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                {TYPE_LABEL[m.meeting_type] ?? m.meeting_type}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {m.description && (
                              <p className="text-sm text-muted-foreground line-clamp-3">{m.description}</p>
                            )}
                            <div className="text-xs space-y-1">
                              <p className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" /> {fmtDateTime(m.scheduled_at)}
                              </p>
                              <p className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="w-3 h-3" /> {m.location}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="px-2 py-0.5 rounded bg-success/15 text-success font-semibold">
                                ✓ {counts.attending}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-destructive/15 text-destructive font-semibold">
                                ✗ {counts.not_attending}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-gold-400/20 text-gold-700 font-semibold">
                                ? {counts.maybe}
                              </span>
                              {att.length > 0 && (
                                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                                  Att: {present}/{att.length}
                                </span>
                              )}
                            </div>
                            {myR && (
                              <p className="text-xs">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                                  myR.response === 'attending' ? 'bg-success/15 text-success' :
                                  myR.response === 'not_attending' ? 'bg-destructive/15 text-destructive' :
                                  'bg-gold-400/20 text-gold-700'
                                }`}>
                                  Your RSVP: {myR.response.replace('_', ' ')}
                                </span>
                              </p>
                            )}
                            <div className="flex gap-2">
                              {tab === 'upcoming' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setRsvpModal(m);
                                    setRsvpResponse(myR?.response ?? 'attending');
                                    setRsvpReason(myR?.reason ?? '');
                                  }}
                                >
                                  {myR ? 'Update RSVP' : 'RSVP'}
                                </Button>
                              )}
                              {tab === 'past' && minutes[m.id]?.status === 'published' && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => navigate(`/meetings/${m.id}/proceedings`)}
                                  leftIcon={<FileText className="w-3 h-3" />}
                                >
                                  View proceedings
                                </Button>
                              )}
                              {tab === 'past' && (!minutes[m.id] || minutes[m.id]?.status !== 'published') && (
                                <span className="text-xs text-muted-foreground inline-flex items-center px-2 py-0.5 rounded-full bg-muted">
                                  Minutes pending
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* RSVP modal */}
      {rsvpModal && (
        <Modal title={`RSVP · ${rsvpModal.title}`} onClose={() => setRsvpModal(null)}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {fmtDateTime(rsvpModal.scheduled_at)} • {rsvpModal.location}
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
              rows={3}
              value={rsvpReason}
              onChange={(e) => setRsvpReason(e.target.value)}
              placeholder="e.g. Travel, illness, prior commitment…"
            />
            <div className="flex gap-2">
              <Button onClick={submitRsvp} isLoading={submitting}>
                Submit
              </Button>
              <Button variant="outline" onClick={() => setRsvpModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default MeetingsPage;