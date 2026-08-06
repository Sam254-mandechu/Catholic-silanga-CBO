import { supabase } from '../config/supabaseClient';
import type {
  Project,
  News,
  Event,
  GalleryImage,
  Leadership,
  ContactSubmission,
  Donation,
  Announcement,
  ProjectStatus,
  Task,
  TaskStatus,
  PaymentMethod,
  HierarchyRole,
  // v5 — meetings / polls / finances
  Meeting,
  MeetingRsvp,
  MeetingAttendance,
  MeetingMinutes,
  Poll,
  PollOption,
  PollVote,
  PollType,
  Expense,
  FinancialReport,
} from '../types/database';

// =====================================================================
// PROJECTS
// =====================================================================
export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Project | null;
}

export async function addProject(input: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<Project> {
  const { data, error } = await supabase.from('projects').insert(input).select('*').single();
  if (error) throw error;
  return data as Project;
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  const { data, error } = await supabase.from('projects').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Project;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function getProjectsByStatus(status: ProjectStatus): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects').select('*').eq('status', status).order('start_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

// =====================================================================
// NEWS
// =====================================================================
export async function getNews(): Promise<News[]> {
  const { data, error } = await supabase
    .from('news').select('*').eq('published', true).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as News[];
}
export async function getNewsAll(): Promise<News[]> {
  const { data, error } = await supabase
    .from('news').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as News[];
}
export async function getNewsItem(id: string): Promise<News | null> {
  const { data, error } = await supabase.from('news').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as News | null;
}
export async function addNews(input: Omit<News, 'id' | 'created_at' | 'updated_at' | 'author_id'>): Promise<News> {
  const { data, error } = await supabase.from('news').insert(input).select('*').single();
  if (error) throw error;
  return data as News;
}
export async function deleteNews(id: string): Promise<void> {
  const { error } = await supabase.from('news').delete().eq('id', id);
  if (error) throw error;
}

export async function updateNews(id: string, patch: Partial<News>): Promise<News> {
  const { data, error } = await supabase
    .from('news')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as News;
}

export async function toggleNewsPublished(id: string, published: boolean): Promise<void> {
  const { error } = await supabase.from('news').update({ published }).eq('id', id);
  if (error) throw error;
}

// =====================================================================
// EVENTS
// =====================================================================
export async function getEvents(): Promise<Event[]> {
  const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Event[];
}
export async function getUpcomingEvents(): Promise<Event[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('events').select('*').gte('event_date', today).order('event_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Event[];
}
export async function addEvent(input: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<Event> {
  const { data, error } = await supabase.from('events').insert(input).select('*').single();
  if (error) throw error;
  return data as Event;
}
export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

export async function updateEvent(id: string, patch: Partial<Event>): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Event;
}

// =====================================================================
// GALLERY
// =====================================================================
export async function getGalleryImages(): Promise<GalleryImage[]> {
  const { data, error } = await supabase
    .from('gallery').select('*').order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as GalleryImage[];
}
export async function addGalleryImage(input: Omit<GalleryImage, 'id' | 'uploaded_at' | 'uploaded_by'>): Promise<GalleryImage> {
  const { data, error } = await supabase.from('gallery').insert(input).select('*').single();
  if (error) throw error;
  return data as GalleryImage;
}
export async function deleteGalleryImage(id: string): Promise<void> {
  const { error } = await supabase.from('gallery').delete().eq('id', id);
  if (error) throw error;
}

// =====================================================================
// LEADERSHIP (the standalone "Leadership" page data — separate from profiles)
// =====================================================================
export async function getLeadership(): Promise<Leadership[]> {
  const { data, error } = await supabase
    .from('leadership').select('*').order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Leadership[];
}
export async function addLeadership(input: Omit<Leadership, 'id' | 'created_at'>): Promise<Leadership> {
  const { data, error } = await supabase.from('leadership').insert(input).select('*').single();
  if (error) throw error;
  return data as Leadership;
}

// =====================================================================
// CONTACTS
// =====================================================================
export async function submitContact(input: Omit<ContactSubmission, 'id' | 'created_at' | 'read'>): Promise<void> {
  const { error } = await supabase.from('contacts').insert(input);
  if (error) throw error;
}
export async function adminListContacts(): Promise<ContactSubmission[]> {
  const { data, error } = await supabase
    .from('contacts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ContactSubmission[];
}
export async function adminMarkContactRead(id: string, read: boolean): Promise<void> {
  const { error } = await supabase.from('contacts').update({ read }).eq('id', id);
  if (error) throw error;
}

// =====================================================================
// DONATIONS / CONTRIBUTIONS
// =====================================================================
export async function recordDonation(
  input: Omit<Donation, 'id' | 'created_at' | 'status' | 'donor_id'>,
): Promise<Donation> {
  const { data, error } = await supabase
    .from('donations')
    .insert({ ...input, status: 'pending' })
    .select('*')
    .single();
  if (error) throw error;
  return data as Donation;
}

export async function adminVerifyDonation(
  id: string,
  opts: { status: 'completed' | 'failed'; admin_note?: string } = { status: 'completed' },
): Promise<Donation> {
  const { data: { user } } = await supabase.auth.getUser();
  const updates: Record<string, any> = {
    status: opts.status,
    verified_at: new Date().toISOString(),
    verified_by: user?.id ?? null,
    admin_note: opts.admin_note ?? null,
  };
  const { data, error } = await supabase.from('donations').update(updates).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Donation;
}

export async function getRecentDonations(limit = 50): Promise<Donation[]> {
  const { data, error } = await supabase
    .from('donations').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as Donation[];
}

/** Public list of completed contributions — used on /contributions. */
export async function getVerifiedContributions(limit = 100): Promise<Donation[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Donation[];
}

export async function getMyDonations(memberId: string): Promise<Donation[]> {
  const { data, error } = await supabase
    .from('donations').select('*').eq('member_id', memberId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Donation[];
}

// =====================================================================
// ANNOUNCEMENTS
// =====================================================================
export async function getAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase.from('announcements').select('*').order('published_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Announcement[];
}
export async function addAnnouncement(
  input: Omit<Announcement, 'id' | 'published_at'>,
): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ ...input, published_at: new Date().toISOString() })
    .select('*')
    .single();
  if (error) throw error;
  return data as Announcement;
}
export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}

// =====================================================================
// TASKS — admin assigns to members; member updates own status
// =====================================================================
export async function getAllTasks(): Promise<Task[]> {
  const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Task[];
}
export async function getTasksForMember(memberId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks').select('*').eq('assignee_id', memberId).order('due_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Task[];
}
export async function addTask(input: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'assigned_by'>): Promise<Task> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...input, assigned_by: user?.id ?? null })
    .select('*')
    .single();
  if (error) throw error;
  return data as Task;
}
export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Task;
}
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// =====================================================================
// PAYMENT METHODS — admin sets, public reads
// =====================================================================
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PaymentMethod[];
}

export async function upsertPaymentMethod(
  payload: Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at' | 'created_by'> & { id?: string },
): Promise<PaymentMethod> {
  const { data: { user } } = await supabase.auth.getUser();
  const base = { ...payload, created_by: user?.id ?? null };
  if (payload.id) {
    const { data, error } = await supabase
      .from('payment_methods')
      .update({ ...base, updated_at: new Date().toISOString() })
      .eq('id', payload.id)
      .select('*')
      .single();
    if (error) throw error;
    return data as PaymentMethod;
  }
  const { data, error } = await supabase
    .from('payment_methods')
    .insert({ ...base, updated_at: new Date().toISOString() })
    .select('*')
    .single();
  if (error) throw error;
  return data as PaymentMethod;
}

export async function deletePaymentMethod(id: string): Promise<void> {
  const { error } = await supabase.from('payment_methods').delete().eq('id', id);
  if (error) throw error;
}

// =====================================================================
// HIERARCHY (helper that maps a profile to a sort weight)
// =====================================================================
import { HIERARCHY_ORDER } from '../types/database';
export const HIERARCHY_WEIGHT: Record<HierarchyRole, number> = HIERARCHY_ORDER.reduce(
  (acc, role, idx) => ({ ...acc, [role]: idx }),
  {} as Record<HierarchyRole, number>,
);

// =====================================================================
// STORAGE (gallery uploads)
// =====================================================================
export async function uploadGalleryFile(file: File, pathPrefix = 'images'): Promise<string> {
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '-');
  const path = `${pathPrefix}/${Date.now()}-${safeName}`;
  const { error: uploadErr } = await supabase.storage
    .from('gallery').upload(path, file, { upsert: false, cacheControl: '3600' });
  if (uploadErr) throw uploadErr;
  const { data } = supabase.storage.from('gallery').getPublicUrl(path);
  return data.publicUrl;
}

/** Extract the storage object path from a public URL. Returns null if the URL
 *  is not a Supabase Storage public URL for the gallery bucket. */
export function galleryPathFromUrl(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;
  const marker = '/storage/v1/object/public/gallery/';
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return null;
  return publicUrl.slice(idx + marker.length);
}

/** Delete a file from the gallery bucket. Silently no-ops if the URL isn't
 *  a gallery URL or the file is already gone. */
export async function deleteGalleryFile(publicUrl: string | null | undefined): Promise<void> {
  const path = galleryPathFromUrl(publicUrl);
  if (!path) return;
  await supabase.storage.from('gallery').remove([path]);
}

// =====================================================================
// MEETINGS — v5
//   Schema (supabase/schema_v5.sql):
//     meetings            (id, title, description, scheduled_at, location,
//                          meeting_type, status, created_by, ...)
//     meeting_rsvps       (id, meeting_id, member_id, response, reason, submitted_at)
//     meeting_attendance  (id, meeting_id, member_id, status, checked_in_at, marked_by)
//     meeting_minutes     (id, meeting_id, agenda, discussions, decisions,
//                          action_items jsonb, published_by, published_at)
//   Mutations: meetings table is directly writable by secretary/admin via RLS.
//   RSVPs / check-in / attendance / minutes go through SECURITY DEFINER RPCs
//   so the caller doesn't need elevated rights for their own row.
// =====================================================================

export async function getMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('scheduled_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Meeting[];
}

export async function getUpcomingMeetings(limit?: number): Promise<Meeting[]> {
  let q = supabase
    .from('meetings')
    .select('*')
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true });
  if (typeof limit === 'number') q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Meeting[];
}

export async function getMeetingById(id: string): Promise<Meeting | null> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Meeting | null;
}

export async function createMeeting(
  input: Omit<Meeting, 'id' | 'created_at' | 'updated_at' | 'created_by'>,
): Promise<Meeting> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('meetings')
    .insert({ ...input, created_by: user?.id ?? null })
    .select('*')
    .single();
  if (error) throw error;
  return data as Meeting;
}

export async function updateMeeting(id: string, patch: Partial<Meeting>): Promise<Meeting> {
  const { data, error } = await supabase
    .from('meetings')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Meeting;
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from('meetings').delete().eq('id', id);
  if (error) throw error;
}

export async function getMeetingRsvps(meeting_id: string): Promise<MeetingRsvp[]> {
  const { data, error } = await supabase
    .from('meeting_rsvps')
    .select('*')
    .eq('meeting_id', meeting_id);
  if (error) throw error;
  return (data ?? []) as MeetingRsvp[];
}

/**
 * Records the caller's RSVP for a meeting. Goes through the SECURITY DEFINER
 * RPC `submit_meeting_rsvp(meeting_id, response, reason)` so the upsert is
 * always allowed and the server can validate response values.
 */
export async function submitMeetingRsvp(
  meeting_id: string,
  response: MeetingRsvp['response'],
  reason?: string,
): Promise<MeetingRsvp> {
  const { error } = await supabase.rpc('submit_meeting_rsvp', {
    meeting_id,
    response,
    reason: reason ?? null,
  });
  if (error) throw error;
  // RPC doesn't return the row, so we re-fetch the caller's RSVP.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error: fetchErr } = await supabase
    .from('meeting_rsvps')
    .select('*')
    .eq('meeting_id', meeting_id)
    .eq('member_id', user.id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!data) throw new Error('RSVP was not recorded');
  return data as MeetingRsvp;
}

export async function getMeetingAttendance(meeting_id: string): Promise<MeetingAttendance[]> {
  const { data, error } = await supabase
    .from('meeting_attendance')
    .select('*')
    .eq('meeting_id', meeting_id);
  if (error) throw error;
  return (data ?? []) as MeetingAttendance[];
}

/**
 * Self-service check-in. Goes through `check_in_to_meeting(meeting_id)`,
 * which inserts (or updates) the caller's row with status='present'.
 */
export async function checkInToMeeting(meeting_id: string): Promise<MeetingAttendance> {
  const { error } = await supabase.rpc('check_in_to_meeting', { meeting_id });
  if (error) throw error;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error: fetchErr } = await supabase
    .from('meeting_attendance')
    .select('*')
    .eq('meeting_id', meeting_id)
    .eq('member_id', user.id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!data) throw new Error('Check-in was not recorded');
  return data as MeetingAttendance;
}

/** Secretary/admin manual attendance marking. */
export async function markMeetingAttendance(
  meeting_id: string,
  member_id: string,
  status: MeetingAttendance['status'],
): Promise<MeetingAttendance> {
  const { error } = await supabase.rpc('mark_meeting_attendance', {
    meeting_id,
    member_id,
    status,
  });
  if (error) throw error;
  const { data, error: fetchErr } = await supabase
    .from('meeting_attendance')
    .select('*')
    .eq('meeting_id', meeting_id)
    .eq('member_id', member_id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!data) throw new Error('Attendance was not recorded');
  return data as MeetingAttendance;
}

export async function getMeetingMinutes(meeting_id: string): Promise<MeetingMinutes | null> {
  const { data, error } = await supabase
    .from('meeting_minutes')
    .select('*')
    .eq('meeting_id', meeting_id)
    .maybeSingle();
  if (error) throw error;
  return data as MeetingMinutes | null;
}

/**
 * Secretary/admin writes (or overwrites) the minutes for a meeting. Uses the
 * RPC `write_meeting_minutes(...)` which has the unique(meeting_id) constraint
 * baked in — call it again to update existing minutes.
 */
export async function writeMeetingMinutes(
  meeting_id: string,
  agenda: string | null,
  discussions: string | null,
  decisions: string | null,
  action_items: unknown = [],
): Promise<MeetingMinutes> {
  const { error } = await supabase.rpc('write_meeting_minutes', {
    meeting_id,
    agenda,
    discussions,
    decisions,
    action_items,
  });
  if (error) throw error;
  const { data, error: fetchErr } = await supabase
    .from('meeting_minutes')
    .select('*')
    .eq('meeting_id', meeting_id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!data) throw new Error('Minutes were not recorded');
  return data as MeetingMinutes;
}

// =====================================================================
// POLLS — v5
//   Schema:
//     polls         (id, title, description, type, status, closes_at, created_by, created_at)
//     poll_options  (id, poll_id, label, display_order)
//     poll_votes    (id, poll_id, option_id, voter_id, voted_at) — unique(poll_id, voter_id)
//   Mutations: polls / poll_options are directly writable by secretary/admin.
//   Voting goes through the SECURITY DEFINER RPC `cast_poll_vote(poll_id, option_id)`
//   so we can guarantee one vote per voter and that the poll is still open.
// =====================================================================

export async function getPolls(): Promise<Poll[]> {
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Poll[];
}

export async function getActivePolls(): Promise<Poll[]> {
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .eq('status', 'open')
    .gt('closes_at', new Date().toISOString())
    .order('closes_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Poll[];
}

export async function getPollById(id: string): Promise<Poll | null> {
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Poll | null;
}

export async function getPollOptions(poll_id: string): Promise<PollOption[]> {
  const { data, error } = await supabase
    .from('poll_options')
    .select('*')
    .eq('poll_id', poll_id)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PollOption[];
}

/**
 * Create a poll with its options. The poll row and each option row are
 * inserted directly (secretary/admin can write both tables via RLS).
 *
 * For `yes_no` polls the caller can omit `options` — we default to ['Yes','No'].
 */
export async function createPoll(input: {
  title: string;
  description?: string | null;
  type: PollType;
  closes_at: string;
  options: string[];
}): Promise<Poll> {
  const { data: { user } } = await supabase.auth.getUser();
  const rawOptions = input.type === 'yes_no' && input.options.length === 0
    ? ['Yes', 'No']
    : input.options;

  const { data: poll, error: pollErr } = await supabase
    .from('polls')
    .insert({
      title: input.title,
      description: input.description ?? null,
      type: input.type,
      status: 'open',
      closes_at: input.closes_at,
      created_by: user?.id ?? null,
    })
    .select('*')
    .single();
  if (pollErr) throw pollErr;

  if (rawOptions.length > 0) {
    const rows = rawOptions.map((label, idx) => ({
      poll_id: poll.id,
      label,
      display_order: idx,
    }));
    const { error: optErr } = await supabase.from('poll_options').insert(rows);
    if (optErr) throw optErr;
  }

  return poll as Poll;
}

/** Secretary/admin closes a poll. Uses the RPC so the server can validate role. */
export async function closePoll(poll_id: string): Promise<Poll> {
  const { error } = await supabase.rpc('close_poll', { poll_id });
  if (error) throw error;
  const { data, error: fetchErr } = await supabase
    .from('polls')
    .select('*')
    .eq('id', poll_id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!data) throw new Error('Poll not found after close');
  return data as Poll;
}

/** Secretary/admin hard-deletes a poll. */
export async function deletePoll(id: string): Promise<void> {
  const { error } = await supabase.from('polls').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Vote counts per option for a poll. Returns the option alongside its
 * vote tally — sorted by display_order so the UI doesn't need to re-sort.
 */
export async function getPollResults(
  poll_id: string,
): Promise<{ option: PollOption; votes: number }[]> {
  const [{ data: options, error: optErr }, { data: votes, error: voteErr }] = await Promise.all([
    supabase.from('poll_options').select('*').eq('poll_id', poll_id).order('display_order', { ascending: true }),
    supabase.from('poll_votes').select('option_id').eq('poll_id', poll_id),
  ]);
  if (optErr) throw optErr;
  if (voteErr) throw voteErr;

  const tally = new Map<string, number>();
  for (const v of votes ?? []) {
    tally.set(v.option_id, (tally.get(v.option_id) ?? 0) + 1);
  }
  return ((options ?? []) as PollOption[]).map((option) => ({
    option,
    votes: tally.get(option.id) ?? 0,
  }));
}

/**
 * Cast the caller's vote in a poll. Goes through `cast_poll_vote(poll_id, option_id)`,
 * which enforces: caller is an active member, poll is still open, option belongs
 * to the poll, and the caller hasn't voted before.
 */
export async function castPollVote(poll_id: string, option_id: string): Promise<PollVote> {
  const { error } = await supabase.rpc('cast_poll_vote', { poll_id, option_id });
  if (error) throw error;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error: fetchErr } = await supabase
    .from('poll_votes')
    .select('*')
    .eq('poll_id', poll_id)
    .eq('voter_id', user.id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!data) throw new Error('Vote was not recorded');
  return data as PollVote;
}

/** The caller's vote in a poll, if any. */
export async function getMyVote(
  poll_id: string,
  voter_id: string,
): Promise<PollVote | null> {
  const { data, error } = await supabase
    .from('poll_votes')
    .select('*')
    .eq('poll_id', poll_id)
    .eq('voter_id', voter_id)
    .maybeSingle();
  if (error) throw error;
  return data as PollVote | null;
}

// =====================================================================
// EXPENSES — v5
//   Schema:
//     expenses  (id, title, amount, currency, category, description,
//                receipt_url, vendor, expense_date,
//                recorded_by, approved_by, approved_at, created_at)
//   Insert/update go through the RPCs `record_expense(jsonb)` and
//   `approve_expense(uuid)` so the server can stamp `recorded_by` /
//   `approved_by` and validate the caller's role.
// =====================================================================

export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function createExpense(
  input: Omit<Expense, 'id' | 'created_at' | 'recorded_by' | 'approved_by' | 'approved_at'>,
): Promise<Expense> {
  // RPC takes a jsonb payload matching the expense columns.
  const { data, error } = await supabase.rpc('record_expense', {
    p_expense: {
      title: input.title,
      amount: input.amount,
      currency: input.currency,
      category: input.category,
      description: input.description,
      receipt_url: input.receipt_url,
      vendor: input.vendor,
      expense_date: input.expense_date,
    },
  });
  if (error) throw error;
  return data as Expense;
}

/** Admin-only approval — RPC enforces the role and stamps approved_by/at. */
export async function approveExpense(expense_id: string): Promise<Expense> {
  const { data, error } = await supabase.rpc('approve_expense', { expense_id });
  if (error) throw error;
  return data as Expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// =====================================================================
// FINANCIAL REPORTS — v5
//   Schema:
//     financial_reports (id, period_start, period_end, opening_balance,
//                        total_income, total_expenses, closing_balance,
//                        notes, status,
//                        prepared_by, approved_by, approved_at, created_at)
//   Generation goes through `submit_financial_report(p_start, p_end, p_notes)`
//   which aggregates donations + expenses server-side and inserts the row.
//   Approval goes through `approve_financial_report(report_id)`.
// =====================================================================

export async function getFinancialReports(): Promise<FinancialReport[]> {
  const { data, error } = await supabase
    .from('financial_reports')
    .select('*')
    .order('period_start', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FinancialReport[];
}

export async function getFinancialReportById(id: string): Promise<FinancialReport | null> {
  const { data, error } = await supabase
    .from('financial_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as FinancialReport | null;
}

/**
 * Treasurer/admin generates a financial report for the given period. The RPC
 * aggregates completed donations + all expenses in the period, rolls forward
 * the most recent closing balance as opening, and inserts a `submitted` row.
 */
export async function submitFinancialReport(
  period_start: string,
  period_end: string,
  notes?: string,
): Promise<FinancialReport> {
  const { data, error } = await supabase.rpc('submit_financial_report', {
    p_start: period_start,
    p_end: period_end,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  return data as FinancialReport;
}

/** Admin-only approval. */
export async function approveFinancialReport(id: string): Promise<FinancialReport> {
  const { data, error } = await supabase.rpc('approve_financial_report', { report_id: id });
  if (error) throw error;
  return data as FinancialReport;
}

/**
 * Compute a live income/expense summary for a period without inserting
 * a report row. Useful for the treasurer dashboard preview before generating
 * an official report. Mirrors the SQL in `submit_financial_report`.
 */
export async function getFinancialSummary(
  period_start: string,
  period_end: string,
): Promise<{ total_income: number; total_expenses: number; net: number }> {
  const start = `${period_start}T00:00:00.000Z`;
  const end = `${period_end}T23:59:59.999Z`;

  const [{ data: donations, error: dErr }, { data: expenses, error: eErr }] = await Promise.all([
    supabase
      .from('donations')
      .select('amount, status')
      .eq('status', 'completed')
      .gte('created_at', start)
      .lte('created_at', end),
    supabase
      .from('expenses')
      .select('amount, status')
      .gte('expense_date', period_start)
      .lte('expense_date', period_end),
  ]);
  if (dErr) throw dErr;
  if (eErr) throw eErr;

  const total_income = (donations ?? []).reduce(
    (s: number, d: any) => s + Number(d.amount ?? 0),
    0,
  );
  const total_expenses = (expenses ?? []).reduce(
    (s: number, e: any) => s + Number(e.amount ?? 0),
    0,
  );
  return {
    total_income,
    total_expenses,
    net: total_income - total_expenses,
  };
}
