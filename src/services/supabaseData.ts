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
  AnnouncementPriority,
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
  // v10 — proceedings / minutes workflow
  MeetingProceedings,
  ActionItem,
  AttendanceRollEntry,
  Poll,
  PollOption,
  PollVote,
  PollType,
  Expense,
  FinancialReport,
  // v6 — site content
  SiteContentKey,
  // v7 — notifications
  NotificationRow,
  NotificationKind,

  Fine,
    FineStats,
    ExpenseCategory,
    // v11 — financial record summaries
    FinancialRecordSummary,
    FinancialRecordPreview,
    // v13 — administration roster
    AdministrationMember,
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
  // v14 — broadcast to every active member if published immediately.
  if (data?.published) {
    notifyAllMembers({
      kind: 'news_posted',
      title: '📰 New article',
      message: data.title,
      link: `/news/${data.id}`,
      payload: { news_id: data.id, category: data.category ?? null },
    }).catch((err) => console.warn('[addNews] notify_all_members failed', err));
  }
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

/**
 * Record a contribution from the current user. Pulls the auth.uid() and
 * attaches it as `donor_id` so the per-member panel can query by it.
 */
export async function recordDonation(
  input: Omit<Donation, 'id' | 'created_at' | 'status' | 'donor_id'>,
): Promise<Donation> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('donations')
    .insert({
      ...input,
      status: 'pending',
      donor_id: user?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;

  // Ping the donor (themselves) — "submission received, awaiting verification"
  if (user?.id) {
    try {
      await createNotification({
        recipient_id: user.id,
        actor_id: user.id,
        kind: 'contribution_submitted',
        title: 'Contribution submitted',
        message: `Your contribution of ${input.amount} ${input.currency} for "${input.purpose}" is awaiting verification.`,
        link: '/member-dashboard?tab=contributions',
        payload: { donation_id: data.id, amount: input.amount, currency: input.currency },
      });
    } catch (err) {
      console.warn('Notification fan-out failed (non-fatal):', err);
    }
  }

  return data as Donation;
}

/** Verifier (admin OR treasurer) marks a contribution as verified or rejected. */
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

/** All recent donations — for the admin/treasurer pending queue. */
export async function getRecentDonations(limit = 50): Promise<Donation[]> {
  const { data, error } = await supabase
    .from('donations').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as Donation[];
}

/**
 * Per-member contributions panel — calls the secure RPC so we always get
 * exactly the donor's own rows (RLS-safe even if the policy isn't set up).
 */
export async function listMyDonations(limit = 100): Promise<Donation[]> {
  try {
    const { data, error } = await supabase.rpc('list_my_donations', { p_limit: limit });
    if (!error && data) return data as Donation[];
    if (error && !/does not exist/i.test(error.message)) throw error;
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) throw err;
  }
  // Fallback: direct query (requires RLS policy "donor_id = auth.uid()")
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .eq('donor_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(limit);
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
  // Prefer the auth-aware RPC so we don't depend on RLS for this read.
  try {
    const { data, error } = await supabase.rpc('list_my_donations', { p_limit: 200 });
    if (!error && data) return (data ?? []) as Donation[];
    if (error && !/does not exist/i.test(error.message)) throw error;
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) throw err;
  }
  // Fallback: query by donor_id (requires RLS policy or admin context)
  const { data, error } = await supabase
    .from('donations').select('*').eq('donor_id', memberId).order('created_at', { ascending: false });
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
  input: Omit<Announcement, 'id' | 'published_at' | 'created_by'> & { created_by?: string | null },
): Promise<Announcement> {
  // v11: stamp created_by to the current user if not explicitly set
  const { data: { user } } = await supabase.auth.getUser();
  const created_by = input.created_by ?? user?.id ?? null;

  const { data, error } = await supabase
    .from('announcements')
    .insert({ ...input, created_by, published_at: new Date().toISOString() })
    .select('*')
    .single();
  if (error) throw error;

  // Broadcast to all active members (best-effort, non-fatal)
  try {
    await broadcastNotification({
      kind: 'announcement_posted',
      title: input.title,
      message: input.content?.slice(0, 200) ?? '',
      link: '/member-dashboard?tab=overview',
      payload: { announcement_id: data.id, priority: input.priority },
    });
  } catch (err) {
    console.warn('Announcement broadcast failed (non-fatal):', err);
  }

  return data as Announcement;
}
export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}

/**
 * v11 — moderator/admin: edit any announcement. Uses the SECURITY DEFINER
 * RPC `update_announcement(uuid, jsonb)` so the role check + audit is on
 * the server. Falls back to a direct UPDATE if the RPC isn't installed.
 */
export async function updateAnnouncement(
  id: string,
  patch: { title?: string; content?: string; priority?: AnnouncementPriority; expires_at?: string | null },
): Promise<Announcement> {
  try {
    const { data, error } = await supabase.rpc('update_announcement', {
      p_announcement_id: id,
      p_patch: patch,
    });
    if (!error && data) return data as Announcement;
    if (error && !/does not exist/i.test(error.message)) throw error;
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) throw err;
  }
  // Fallback: direct update
  const updates: Record<string, unknown> = {};
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.content !== undefined) updates.content = patch.content;
  if (patch.priority !== undefined) updates.priority = patch.priority;
  if (patch.expires_at !== undefined) {
    updates.expires_at = patch.expires_at === '' ? null : patch.expires_at;
  }
  const { data, error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Announcement;
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

  // Notify the assignee (if known)
  try {
    if (input.assignee_id) {
      await createNotification({
        recipient_id: input.assignee_id,
        actor_id: user?.id ?? null,
        kind: 'task_assigned',
        title: 'New task assigned',
        message: `You were assigned: "${input.title}"`,
        link: '/member-dashboard?tab=tasks',
        payload: { task_id: data.id, priority: input.priority },
      });
    }
  } catch (err) {
    console.warn('Task notification fan-out failed:', err);
  }

  // v14 — broadcast "task_published" to every system role so admin/moderator/secretary/treasurer
  // portals see the new task in their bell. Excludes the actor and the assignee (already notified).
  try {
    const roles: Array<'admin' | 'moderator' | 'secretary' | 'treasurer'> = ['admin', 'moderator', 'secretary', 'treasurer'];
    for (const role of roles) {
      await notifyRoleMembers({
        target_role: role,
        kind: 'task_published',
        title: '📋 New task published',
        message: `"${input.title}" (${input.priority})`,
        link: role === 'treasurer' ? '/treasurer-portal' : `/${role}-portal`,
        payload: { task_id: data.id, priority: input.priority },
        actor_id: user?.id ?? null,
        exclude_user_id: input.assignee_id ?? null,
      });
    }
  } catch (err) {
    console.warn('[addTask] task_published fan-out failed:', err);
  }

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
  // RPC parameter names in Postgres are p_-prefixed.
  const { error } = await supabase.rpc('submit_meeting_rsvp', {
    p_meeting_id: meeting_id,
    p_response: response,
    p_reason: reason ?? null,
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
  // RPC parameter names in Postgres are p_-prefixed. PostgREST binds by name,
  // so we have to pass the prefixed keys here.
  const { error } = await supabase.rpc('mark_meeting_attendance', {
    p_meeting_id: meeting_id,
    p_member_id: member_id,
    p_status: status,
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
  // v10: unpublished minutes are private — only the author/admin should call
  // this directly. Public callers should use getMeetingProceedings() instead.
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

  /**
   * v10 — Save minutes as a DRAFT. Idempotent: if no row exists, creates one
   * with status='draft'. If a draft exists, updates it. If a published row
   * exists, this refuses (only admin can amend published minutes — use
   * publishMeetingMinutes for that).
   */
  export async function saveMinutesDraft(
    meeting_id: string,
    agenda: string | null,
    discussions: string | null,
    decisions: string | null,
    action_items: ActionItem[] = [],
  ): Promise<MeetingMinutes> {
    const { data, error } = await supabase.rpc('save_meeting_minutes_draft', {
      p_meeting_id: meeting_id,
      p_agenda: agenda ?? '',
      p_discussions: discussions ?? '',
      p_decisions: decisions ?? '',
      p_action_items: action_items,
    });
    if (error) throw error;
    return data as MeetingMinutes;
  }

  /**
   * v10 — Publish minutes. Idempotent. Sets status='published',
   * published_at=now(), published_by=current_user. Once published, only
   * admins can call this again (to amend).
   */
  export async function publishMeetingMinutes(
    meeting_id: string,
    agenda: string | null,
    discussions: string | null,
    decisions: string | null,
    action_items: ActionItem[] = [],
  ): Promise<MeetingMinutes> {
    const { data, error } = await supabase.rpc('publish_meeting_minutes', {
      p_meeting_id: meeting_id,
      p_agenda: agenda ?? '',
      p_discussions: discussions ?? '',
      p_decisions: decisions ?? '',
      p_action_items: action_items,
    });
    if (error) throw error;
    return data as MeetingMinutes;
  }

  /**
   * v10 — Public-facing proceedings fetch. Returns null if minutes are not
   * yet published (so the proceedings page can 404 cleanly).
   */
  export async function getMeetingProceedings(meeting_id: string): Promise<MeetingProceedings | null> {
    const { data, error } = await supabase.rpc('get_meeting_minutes_full', {
      p_meeting_id: meeting_id,
    });
    if (error) throw error;
    if (!data || (Array.isArray(data) && data.length === 0)) return null;
    const row = Array.isArray(data) ? data[0] : data;
    return {
      meeting_id: row.meeting_id,
      title: row.title,
      description: row.description,
      scheduled_at: row.scheduled_at,
      location: row.location,
      meeting_type: row.meeting_type,
      agenda: row.agenda,
      discussions: row.discussions,
      decisions: row.decisions,
      action_items: Array.isArray(row.action_items) ? (row.action_items as ActionItem[]) : [],
      published_at: row.published_at,
      published_by_name: row.published_by_name,
      attendance_roll: Array.isArray(row.attendance_roll) ? (row.attendance_roll as AttendanceRollEntry[]) : [],
    };
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

/** Result row for a single poll option. */
export interface PollResultRow {
  option: PollOption;
  votes: number;
  is_winner: boolean;
}

/**
 * Vote counts per option for a poll. Returns the option alongside its
 * vote tally — sorted by display_order so the UI doesn't need to re-sort.
 * v14 — routes through `get_poll_results(p_poll_id)` RPC when available
 * (which uses server-side aggregation + tie-aware `is_winner`); falls back
 * to a client-side tally computed from `poll_options` + `poll_votes`.
 * Flags the leading option(s) with `is_winner` (handles ties).
 */
export async function getPollResults(
  poll_id: string,
): Promise<{ option: PollOption; votes: number; is_winner: boolean }[]> {
  // v14 — try the new RPC first (server-aggregated, returns option_id/label/vote_count/is_winner).
  try {
    const { data, error } = await supabase.rpc('get_poll_results', { p_poll_id: poll_id });
    if (!error && data) {
      // RPC returns: { option_id, option_label, display_order, vote_count, is_winner }
      // We need to map back to { option, votes, is_winner } — re-fetch options for full PollOption.
      const ids = (data as any[]).map((r: any) => r.option_id);
      if (ids.length > 0) {
        const { data: opts } = await supabase
          .from('poll_options')
          .select('*')
          .in('id', ids);
        const optMap = new Map(((opts ?? []) as PollOption[]).map((o) => [o.id, o]));
        return (data as any[]).map((r: any) => ({
          option: optMap.get(r.option_id) ?? {
            id: r.option_id,
            poll_id,
            label: r.option_label,
            display_order: r.display_order ?? 0,
          } as PollOption,
          votes: Number(r.vote_count ?? 0),
          is_winner: !!r.is_winner,
        }));
      }
      return [];
    }
    if (error && !/does not exist/i.test(error.message)) throw error;
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) throw err;
  }
  // Fallback: compute counts client-side from poll_options + poll_votes.
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
  const list = ((options ?? []) as PollOption[]).map((option) => ({
    option,
    votes: tally.get(option.id) ?? 0,
    is_winner: false as boolean,
  }));
  const max = list.reduce((m, r) => Math.max(m, r.votes), 0);
  if (max > 0) {
    return list.map((r) => ({ ...r, is_winner: r.votes === max }));
  }
  return list;
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

// =====================================================================
// v6 — SITE CONTENT (welcome message, mission, vision, contact, legal)
// =====================================================================

/**
 * Fetch a single site-content value by key.
 * Returns null if the key doesn't exist.
 */
export async function getSiteContentValue(key: SiteContentKey): Promise<string | null> {
  const { data, error } = await supabase
    .from('site_content')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) {
    console.warn(`getSiteContentValue(${key}) failed`, error);
    return null;
  }
  return (data?.value as string | undefined) ?? null;
}

/**
 * Fetch many site-content keys at once.
 * Returns a Record so callers can destructure just what they need.
 */
export async function getSiteContentMap(keys: readonly SiteContentKey[]): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('site_content')
    .select('key, value')
    .in('key', keys as string[]);
  if (error) {
    console.warn('getSiteContentMap failed', error);
    return {};
  }
  const map: Record<string, string> = {};
  for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
    map[row.key] = row.value;
  }
  return map;
}

/**
 * Upsert one or many site-content rows.
 * Returns the rows that were written.
 * Requires admin role (RLS).
 */
export async function upsertSiteContent(entries: Partial<Record<SiteContentKey, string>>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const rows = Object.entries(entries)
    .filter(([, v]) => v !== undefined)
    .map(([key, value]) => ({
      key,
      value: String(value ?? ''),
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    }));
  if (rows.length === 0) return;
  const { error } = await supabase.from('site_content').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
}

// =====================================================================
// v6 — PROFILE PHOTO UPLOAD
// =====================================================================

/**
 * Upload a profile photo for the given user.
 *
 * Storage path: `${userId}/avatar-${timestamp}.${ext}`
 * Bucket: `profile-photos` (public, must exist in Supabase).
 *
 * Returns the public URL of the uploaded file.
 */
export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeExt = ext.length > 0 && ext.length <= 5 ? ext : 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${safeExt}`;

  const { error: uploadErr } = await supabase.storage
    .from('profile-photos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });
  if (uploadErr) throw uploadErr;

  const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a profile photo by its public URL.
 * Best-effort — silently no-ops if the path can't be parsed.
 */
export async function deleteProfilePhoto(publicUrl: string): Promise<void> {
  try {
    const marker = '/storage/v1/object/public/profile-photos/';
    const idx = publicUrl.indexOf(marker);
    if (idx < 0) return;
    const path = publicUrl.slice(idx + marker.length);
    if (!path) return;
    await supabase.storage.from('profile-photos').remove([path]);
  } catch (err) {
    console.warn('deleteProfilePhoto failed', err);
  }
}


// =====================================================================
// v7 — NOTIFICATIONS
// =====================================================================

/**
 * Create a single notification for a user. Routes through the secure RPC
 * `create_notification(uuid, text, text, text, text, jsonb, uuid)`.
 *
 * Falls back to a direct INSERT (which the RLS allows for authenticated
 * users) if the RPC isn't installed yet.
 */
export async function createNotification(input: {
  recipient_id: string;
  actor_id?: string | null;
  kind: NotificationKind;
  title: string;
  message: string;
  link?: string | null;
  payload?: Record<string, unknown> | null;
}): Promise<NotificationRow | null> {
  const args = {
    p_recipient: input.recipient_id,
    p_kind: input.kind,
    p_title: input.title,
    p_message: input.message,
    p_link: input.link ?? null,
    p_payload: input.payload ?? null,
    p_actor: input.actor_id ?? null,
  };
  try {
    const { data, error } = await supabase.rpc('create_notification', args);
    if (!error) return (data ?? null) as NotificationRow | null;
    if (!/does not exist/i.test(error.message)) throw error;
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) throw err;
  }
  // Fallback: direct insert (allowed by RLS for authenticated users).
  const { data, error } = await supabase.from('notifications').insert({
    recipient_id: args.p_recipient,
    actor_id: args.p_actor,
    kind: args.p_kind,
    title: args.p_title,
    message: args.p_message,
    link: args.p_link,
    payload: args.p_payload,
  }).select('*').single();
  if (error) throw error;
  return data as NotificationRow;
}

/**
 * Send a notification to every active member (admin only).
 * Used for site-wide announcements.
 */
export async function broadcastNotification(input: {
  kind: NotificationKind;
  title: string;
  message: string;
  link?: string | null;
  payload?: Record<string, unknown> | null;
}): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('broadcast_notification', {
      p_kind: input.kind,
      p_title: input.title,
      p_message: input.message,
      p_link: input.link ?? null,
      p_payload: input.payload ?? null,
    });
    if (!error) return (data ?? 0) as number;
    if (!/does not exist/i.test(error.message)) throw error;
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) throw err;
  }
  // Fallback: fan out manually (works with the "Notifications insert-by-authenticated" policy)
  const { data: members } = await supabase
    .from('profiles')
    .select('id')
    .eq('status', 'active');
  if (!members || members.length === 0) return 0;
  const rows = members.map((m) => ({
    recipient_id: m.id,
    kind: input.kind,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
    payload: input.payload ?? null,
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) throw error;
  return rows.length;
}

/** Fetch the current user's notifications. */
export async function listMyNotifications(unreadOnly = false): Promise<NotificationRow[]> {
  try {
    const { data, error } = await supabase.rpc('list_my_notifications', { p_unread_only: unreadOnly });
    if (!error) return (data ?? []) as NotificationRow[];
    if (!/does not exist/i.test(error.message)) throw error;
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) throw err;
  }
  let q = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200);
  if (unreadOnly) q = q.is('read_at', null);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

/** Lightweight unread count for the navbar badge. */
export async function unreadNotificationCount(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('unread_notification_count');
    if (!error) return (data ?? 0) as number;
    if (!/does not exist/i.test(error.message)) throw error;
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) throw err;
  }
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) return 0;
  return count ?? 0;
}

/** Mark specific notifications as read. */
export async function markNotificationsRead(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  try {
    const { data, error } = await supabase.rpc('mark_notifications_read', { p_ids: ids });
    if (!error) return (data ?? 0) as number;
    if (!/does not exist/i.test(error.message)) throw error;
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) throw err;
  }
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw error;
  return ids.length;
}


// =====================================================================
// v14 — COMPREHENSIVE NOTIFICATIONS (7 new kinds)
// =====================================================================

/**
 * Insert a notification into every active member of a given role
 * (e.g. 'admin', 'moderator', 'secretary', 'treasurer').
 * Routes through the secure RPC `notify_role_members(...)` introduced in v14.
 * Returns the number of rows inserted.
 */
export async function notifyRoleMembers(input: {
  target_role: 'admin' | 'moderator' | 'secretary' | 'treasurer' | 'member';
  kind: NotificationKind;
  title: string;
  message: string;
  link?: string | null;
  payload?: Record<string, unknown> | null;
  actor_id?: string | null;
  exclude_user_id?: string | null;
}): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('notify_role_members', {
      p_target_role: input.target_role,
      p_kind: input.kind,
      p_title: input.title,
      p_message: input.message,
      p_link: input.link ?? null,
      p_payload: input.payload ?? null,
      p_actor: input.actor_id ?? null,
      p_exclude_user_id: input.exclude_user_id ?? null,
    });
    if (!error) return (data ?? 0) as number;
    if (!/does not exist/i.test(error.message)) throw error;
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) throw err;
  }
  // Fallback: fan out manually (works with the existing "Notifications insert-by-authenticated" policy)
  let q = supabase
    .from('profiles')
    .select('id')
    .eq('status', 'active')
    .eq('role', input.target_role);
  if (input.exclude_user_id) q = q.neq('id', input.exclude_user_id);
  const { data: targets } = await q;
  if (!targets || targets.length === 0) return 0;
  const rows = targets.map((m) => ({
    recipient_id: m.id,
    actor_id: input.actor_id ?? null,
    kind: input.kind,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
    payload: input.payload ?? null,
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) throw error;
  return rows.length;
}

/**
 * Insert a notification into every active member of the CBO.
 * Used for site-wide events (news posted, meeting scheduled, record published).
 * Routes through the secure RPC `notify_all_members(...)` introduced in v14.
 */
export async function notifyAllMembers(input: {
  kind: NotificationKind;
  title: string;
  message: string;
  link?: string | null;
  payload?: Record<string, unknown> | null;
  actor_id?: string | null;
  exclude_user_id?: string | null;
}): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('notify_all_members', {
      p_kind: input.kind,
      p_title: input.title,
      p_message: input.message,
      p_link: input.link ?? null,
      p_payload: input.payload ?? null,
      p_actor: input.actor_id ?? null,
      p_exclude_user_id: input.exclude_user_id ?? null,
    });
    if (!error) return (data ?? 0) as number;
    if (!/does not exist/i.test(error.message)) throw error;
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) throw err;
  }
  // Fallback: fan out manually.
  let q = supabase.from('profiles').select('id').eq('status', 'active');
  if (input.exclude_user_id) q = q.neq('id', input.exclude_user_id);
  const { data: targets } = await q;
  if (!targets || targets.length === 0) return 0;
  const rows = targets.map((m) => ({
    recipient_id: m.id,
    actor_id: input.actor_id ?? null,
    kind: input.kind,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
    payload: input.payload ?? null,
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) throw error;
  return rows.length;
}

/** Result row for a single poll option. */
// (v14 — the canonical getPollResults definition is up near line 993; see PollResultRow there.)


// =====================================================================
// v9 — FINES + TREASURER MANUAL ENTRY
// =====================================================================


/** Get all fines. For treasurer/admin/moderator dashboards. */
export async function getFines(opts?: { memberId?: string; status?: 'unpaid' | 'paid' | 'waived' }): Promise<Fine[]> {
  try {
    const { data, error } = await supabase.rpc('list_fines', {
      p_member_id: opts?.memberId ?? null,
      p_status: opts?.status ?? null,
    });
    if (!error && data) return (data ?? []) as Fine[];
    if (error && !/does not exist/i.test(error.message)) throw error;
  } catch (err: any) {
    if (!/does not exist/i.test(err?.message ?? '')) throw err;
  }
  // Fallback: direct query
  let q = supabase.from('fines').select('*').order('created_at', { ascending: false });
  if (opts?.memberId) q = q.eq('member_id', opts.memberId);
  if (opts?.status) q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Fine[];
}

/** Record a fine (treasurer/admin/moderator). */
export async function recordFine(input: {
  member_id: string;
  amount: number;
  reason: string;
  due_date?: string | null;
  notes?: string | null;
}): Promise<Fine> {
  const { data, error } = await supabase.rpc('record_fine', {
    p_member_id: input.member_id,
    p_amount: input.amount,
    p_reason: input.reason,
    p_due_date: input.due_date ?? null,
    p_notes: input.notes ?? null,
  });
  if (error) throw error;
  return data as Fine;
}

/** Mark a fine as paid. */
export async function markFinePaid(fine_id: string): Promise<Fine> {
  const { data, error } = await supabase.rpc('mark_fine_paid', { p_fine_id: fine_id });
  if (error) throw error;
  return data as Fine;
}

/** Waive a fine (cancel without payment). */
export async function waiveFine(fine_id: string, reason?: string): Promise<Fine> {
  const { data, error } = await supabase.rpc('waive_fine', {
    p_fine_id: fine_id,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data as Fine;
}

/** Get aggregate fine stats for finance page. */
export async function getFineStats(): Promise<FineStats> {
  try {
    const { data, error } = await supabase.from('fine_stats').select('*').maybeSingle();
    if (!error && data) return data as FineStats;
  } catch {
    // fall through to direct sum
  }
  // Fallback: direct aggregation
  const { data: fines, error } = await supabase.from('fines').select('amount, status');
  if (error) throw error;
  const stats: FineStats = {
    total_collected: 0, total_outstanding: 0, total_waived: 0,
    unpaid_count: 0, paid_count: 0, waived_count: 0,
  };
  (fines ?? []).forEach((f: any) => {
    if (f.status === 'paid') { stats.total_collected += Number(f.amount); stats.paid_count += 1; }
    else if (f.status === 'unpaid') { stats.total_outstanding += Number(f.amount); stats.unpaid_count += 1; }
    else if (f.status === 'waived') { stats.total_waived += Number(f.amount); stats.waived_count += 1; }
  });
  return stats;
}

/** Treasurer: manually record a donation (cash, M-Pesa, etc.). */
export async function treasurerRecordDonation(input: {
  donor_name: string;
  email: string;
  amount: number;
  currency?: string;
  purpose?: string;
  message?: string | null;
  method_id?: string | null;
  reference_code?: string | null;
  donor_id?: string | null;
  created_at?: string | null;
}): Promise<Donation> {
  const { data, error } = await supabase.rpc('treasurer_record_donation', {
    p_donor_name: input.donor_name,
    p_email: input.email,
    p_amount: input.amount,
    p_currency: input.currency ?? 'KES',
    p_purpose: input.purpose ?? 'General donation',
    p_message: input.message ?? null,
    p_method_id: input.method_id ?? null,
    p_reference_code: input.reference_code ?? null,
    p_donor_id: input.donor_id ?? null,
    p_created_at: input.created_at ?? null,
  });
  if (error) throw error;
  return data as Donation;
}

/** Treasurer: edit a donation (locked 1hr after verification). */
export async function treasurerEditDonation(
  donation_id: string,
  patch: Record<string, unknown>,
): Promise<Donation> {
  const { data, error } = await supabase.rpc('treasurer_edit_donation', {
    p_donation_id: donation_id,
    p_patch: patch,
  });
  if (error) throw error;
  return data as Donation;
}

/** Treasurer: manually record an expense. */
export async function treasurerRecordExpense(input: {
  title: string;
  amount: number;
  category: ExpenseCategory | string;
  currency?: string;
  description?: string | null;
  vendor?: string | null;
  receipt_url?: string | null;
  expense_date?: string;
}): Promise<Expense> {
  const { data, error } = await supabase.rpc('treasurer_record_expense', {
    p_title: input.title,
    p_amount: input.amount,
    p_category: input.category,
    p_currency: input.currency ?? 'KES',
    p_description: input.description ?? null,
    p_vendor: input.vendor ?? null,
    p_receipt_url: input.receipt_url ?? null,
    p_expense_date: input.expense_date ?? null,
  });
  if (error) throw error;
  return data as Expense;
}

/** Treasurer: edit an expense (locked after admin approval). */
export async function treasurerEditExpense(
  expense_id: string,
  patch: Record<string, unknown>,
): Promise<Expense> {
  const { data, error } = await supabase.rpc('treasurer_edit_expense', {
    p_expense_id: expense_id,
    p_patch: patch,
  });
  if (error) throw error;
  return data as Expense;
}


// =====================================================================
// v11 — Financial Record Summaries (Treasurer "Create Record" wizard)
// =====================================================================

/**
 * Live preview of a date-range snapshot. Returns totals + per-line
 * breakdown WITHOUT persisting. Safe to call repeatedly as the user
 * tweaks dates / categories in the wizard.
 */
export async function previewFinancialSummary(input: {
  period_start: string;
  period_end: string;
  include_donations?: boolean;
  include_expenses?: boolean;
  include_fines_paid?: boolean;
  include_fines_unpaid?: boolean;
  include_fines_waived?: boolean;
}): Promise<FinancialRecordPreview> {
  const { data, error } = await supabase.rpc('preview_financial_summary', {
    p_period_start: input.period_start,
    p_period_end: input.period_end,
    p_include_donations: input.include_donations ?? true,
    p_include_expenses: input.include_expenses ?? true,
    p_include_fines_paid: input.include_fines_paid ?? true,
    p_include_fines_unpaid: input.include_fines_unpaid ?? true,
    p_include_fines_waived: input.include_fines_waived ?? false,
  });
  if (error) throw error;
  return data as FinancialRecordPreview;
}

/**
 * Persist a financial record snapshot. When `publish: true`, the record
 * goes public immediately at /finance and /finance/:id. When false,
 * it's saved as a draft the Treasurer can edit later.
 */
export async function createFinancialRecordSummary(input: {
  title: string;
  period_start: string;
  period_end: string;
  include_donations?: boolean;
  include_expenses?: boolean;
  include_fines_paid?: boolean;
  include_fines_unpaid?: boolean;
  include_fines_waived?: boolean;
  publish?: boolean;
  notes?: string | null;
}): Promise<FinancialRecordSummary> {
  const { data, error } = await supabase.rpc('create_financial_record_summary', {
    p_title: input.title,
    p_period_start: input.period_start,
    p_period_end: input.period_end,
    p_include_donations: input.include_donations ?? true,
    p_include_expenses: input.include_expenses ?? true,
    p_include_fines_paid: input.include_fines_paid ?? true,
    p_include_fines_unpaid: input.include_fines_unpaid ?? true,
    p_include_fines_waived: input.include_fines_waived ?? false,
    p_publish: input.publish ?? true,
    p_notes: input.notes ?? null,
  });
  if (error) throw error;
  // v14 — broadcast to all active members if the record is published.
  if ((data as FinancialRecordSummary)?.status === 'published') {
    notifyAllMembers({
      kind: 'record_published',
      title: '📊 New financial record published',
      message: input.title,
      link: `/finance/${(data as FinancialRecordSummary).id}`,
      payload: { record_id: (data as FinancialRecordSummary).id },
    }).catch((err) => console.warn('[createFinancialRecordSummary] notify_all_members failed', err));
  }
  return data as FinancialRecordSummary;
}

/** List published records (or include drafts if requested). */
export async function listFinancialRecordSummaries(
  includeDrafts = false,
): Promise<FinancialRecordSummary[]> {
  const { data, error } = await supabase.rpc('list_financial_record_summaries', {
    p_include_drafts: includeDrafts,
  });
  if (error) throw error;
  return (data ?? []) as FinancialRecordSummary[];
}

/** Fetch a single record by id. Public-readable if status='published'. */
export async function getFinancialRecordSummary(
  id: string,
): Promise<FinancialRecordSummary | null> {
  const { data, error } = await supabase.rpc('get_financial_record_summary', {
    p_id: id,
  });
  if (error) throw error;
  return (data as FinancialRecordSummary) ?? null;
}


// =====================================================================
// v13 — Administration (auto-generated leadership roster)
// =====================================================================

/**
 * Fetch all profiles whose role is in (admin, moderator, secretary,
 * treasurer) AND status='active'. Used by the public /leadership page
 * to auto-show the verified administration. Sorted by role hierarchy
 * then name.
 */
export async function listAdministration(): Promise<AdministrationMember[]> {
  const { data, error } = await supabase.rpc('list_administration');
  if (error) throw error;
  return (data ?? []) as AdministrationMember[];
}
