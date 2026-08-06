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
