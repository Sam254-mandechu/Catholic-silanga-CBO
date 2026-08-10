// Domain types shared across the app. These mirror the SQL schema in supabase/schema.sql
// (plus the additive v2/v3/v4/v5 migration files).

// v5: extended with 'secretary' and 'treasurer' for role-gated workflows
// (meetings, minutes, polls, expenses, financial reports).
export type Role = 'admin' | 'member' | 'moderator' | 'secretary' | 'treasurer';
export type AccountStatus = 'active' | 'pending' | 'suspended';
export type ProjectStatus = 'planning' | 'ongoing' | 'completed';
export type DonationStatus = 'pending' | 'completed' | 'failed';
export type AnnouncementPriority = 'low' | 'medium' | 'high';

/**
 * Hierarchy positions inside the CBO. These map to authority/display order
 * (Chairperson is "highest"; Member is the default role for any approved user).
 */
export type HierarchyRole =
  | 'Chairperson'
  | 'Vice Chairperson'
  | 'Secretary'
  | 'Vice Secretary'
  | 'Treasurer'
  | 'Vice Treasurer'
  | 'Coordinator'
  | 'Member';

export const HIERARCHY_ORDER: HierarchyRole[] = [
  'Chairperson',
  'Vice Chairperson',
  'Coordinator',
  'Secretary',
  'Vice Secretary',
  'Treasurer',
  'Vice Treasurer',
  'Member',
];

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  status: AccountStatus;
  phone: string | null;
  address: string | null;
  bio: string | null;
  photo_url: string | null;
  email_verified: boolean;
  joined_at: string;
  updated_at: string;
  // v2 additions
  national_id: string | null;
  member_code: string | null;
  hierarchy_role: HierarchyRole | null;
  verified_at: string | null;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  image: string | null;
  status: ProjectStatus;
  budget: number;
  progress: number;
  category: string;
  location: string | null;
  beneficiaries: number | null;
  start_date: string;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface News {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string | null;
  author: string;
  category: string;
  tags: string[];
  published: boolean;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  image: string | null;
  event_date: string;
  end_date: string | null;
  event_time: string;
  location: string;
  category: string;
  registration_link: string | null;
  published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  title: string | null;
  category: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface Leadership {
  id: string;
  name: string;
  position: string;
  bio: string;
  photo: string | null;
  email: string | null;
  phone: string | null;
  display_order: number;
  created_at: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  read: boolean;
  created_at: string;
}

/** A contribution / donation. Pending → admin marks it completed after verification. */
export interface Donation {
  id: string;
  donor_name: string;
  email: string;
  amount: number;
  currency: string;
  purpose: string;
  message: string | null;
  status: DonationStatus;
  donor_id: string | null;
  member_id: string | null;        // v2 — link to authenticated member (nullable, donors may be non-members)
  method_id: string | null;        // v2 — which payment method was used
  reference_code: string | null;   // v2 — e.g. MPESA transaction code
  proof_url: string | null;        // v2 — uploaded screenshot
  verified_by: string | null;      // v2 — admin who verified it
  verified_at: string | null;      // v2
  admin_note: string | null;       // v2
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  published_at: string;
  expires_at: string | null;
  /** v11 — who posted this announcement (used for edit history + audit). */
  created_by: string | null;
}

// ---------- v2: Tasks ----------
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee_id: string;
  assignee_name: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- v2: Payment Methods ----------
export type PaymentMethodType =
  | 'bank' | 'mpesa' | 'paybill' | 'till' | 'mobile_money' | 'card' | 'cash' | 'other';

export interface PaymentMethod {
  id: string;
  method: PaymentMethodType;
  label: string;
  details: Record<string, string>;
  instructions: string | null;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- v2: Registration payload (client → service) ----------
export interface SignUpInput {
  email: string;
  password: string;
  display_name: string;
  national_id: string;
  member_code: string;        // The CBO-issued code (e.g. "CBO-2025-014")
  position_requested: HierarchyRole;  // The position the registrant says they hold
  phone?: string;
}

// =====================================================================
// v5 — Meetings
// =====================================================================

export type MeetingType = 'general' | 'committee' | 'emergency' | 'agm';
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type RsvpResponse = 'attending' | 'not_attending' | 'maybe';
export type AttendanceStatus = 'present' | 'absent' | 'excused';
export type MinutesStatus = 'draft' | 'published';

/** Structured action-item shape stored in `meeting_minutes.action_items` jsonb. */
export interface ActionItem {
  who?: string;
  what?: string;
  by?: string;
  [k: string]: unknown;
}

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  location: string | null;
  meeting_type: MeetingType;
  status: MeetingStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingRsvp {
  id: string;
  meeting_id: string;
  member_id: string;
  response: RsvpResponse;
  reason: string | null;
  submitted_at: string;
}

export interface MeetingAttendance {
  id: string;
  meeting_id: string;
  member_id: string;
  status: AttendanceStatus;
  checked_in_at: string;
  marked_by: string | null;
}

export interface MeetingMinutes {
  id: string;
  meeting_id: string;
  agenda: string | null;
  discussions: string | null;
  decisions: string | null;
  /** jsonb — opaque to the client. Use a structured helper when reading. */
  action_items: unknown;
  published_by: string | null;
  published_at: string;
  /** v10 — draft until explicitly published; only published is publicly visible. */
  status: MinutesStatus;
}

/** Public-facing row returned by `get_meeting_minutes_full(meeting_id)`. */
export interface MeetingProceedings {
  meeting_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  location: string | null;
  meeting_type: string;
  agenda: string | null;
  discussions: string | null;
  decisions: string | null;
  action_items: ActionItem[];
  published_at: string;
  published_by_name: string | null;
  attendance_roll: AttendanceRollEntry[];
}

export interface AttendanceRollEntry {
  display_name: string;
  hierarchy_role: string | null;
  status: AttendanceStatus;
  checked_in_at: string;
}

// =====================================================================
// v5 — Polls
// =====================================================================

export type PollType = 'single_choice' | 'multiple_choice' | 'yes_no';
export type PollStatus = 'open' | 'closed';

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  type: PollType;
  status: PollStatus;
  closes_at: string;
  created_by: string | null;
  created_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  display_order: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  voter_id: string;
  voted_at: string;
}

// =====================================================================
// v5 — Expenses / Financial Reports
// =====================================================================

export type ExpenseCategory =
  | 'operations'
  | 'events'
  | 'charity'
  | 'utilities'
  | 'salaries'
  | 'supplies'
  | 'maintenance'
  | 'other';

export type FinancialReportStatus = 'draft' | 'submitted' | 'approved';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string | null;
  receipt_url: string | null;
  vendor: string | null;
  expense_date: string;
  recorded_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface FinancialReport {
  id: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  total_income: number;
  total_expenses: number;
  closing_balance: number;
  notes: string | null;
  status: FinancialReportStatus;
  prepared_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

// =====================================================================
// v5 — RPC payload shapes (client → service)
// =====================================================================

/** Payload for `record_expense(jsonb)`. */
export interface ExpenseInput {
  title: string;
  amount: number;
  currency?: string;
  category: ExpenseCategory;
  description?: string | null;
  receipt_url?: string | null;
  vendor?: string | null;
  /** ISO date string, e.g. "2026-08-06". */
  expense_date: string;
}

/** Payload for `submit_financial_report(date, date, text)`. */
export interface FinancialReportInput {
  period_start: string;
  period_end: string;
  notes?: string | null;
}

/** Payload for `submit_meeting_rsvp(uuid, text, text)`. */
export interface MeetingRsvpInput {
  meeting_id: string;
  response: RsvpResponse;
  reason?: string | null;
}

/** Payload for `mark_meeting_attendance(uuid, uuid, text)`. */
export interface MeetingAttendanceInput {
  meeting_id: string;
  member_id: string;
  status: AttendanceStatus;
}

/** Payload for `write_meeting_minutes(...)`. */
export interface MeetingMinutesInput {
  meeting_id: string;
  agenda?: string | null;
  discussions?: string | null;
  decisions?: string | null;
  action_items?: unknown;
}

/** Payload for `cast_poll_vote(uuid, uuid)`. */
export interface PollVoteInput {
  poll_id: string;
  option_id: string;
}

/** Payload for `admin_set_system_role(uuid, text)`. */
export interface SystemRoleInput {
  target_user_id: string;
  new_role: Role;
}

// ---------- v6: Site Content (editable copy) ----------
/**
 * Known keys for `site_content`. Add new keys here as the admin grows.
 * `getSiteContent` returns a `Record<string, string>` so callers can pick
 * any subset they need; consumers should fall back to hardcoded defaults
 * when a key is missing.
 */
export const SITE_CONTENT_KEYS = [
  'welcome_message',
  'welcome_subtitle',
  'welcome_image_url',
  'home_hero_image',
  'mission',
  'vision',
  'values',
  'contact_address',
  'contact_phone',
  'contact_email',
  'contact_hours',
  'social_facebook',
  'social_twitter',
  'social_instagram',
  'social_youtube',
  'terms_of_service',
  'privacy_policy',
] as const;

export type SiteContentKey = (typeof SITE_CONTENT_KEYS)[number];

export interface SiteContentRow {
  key: string;
  value: string;
  updated_by: string | null;
  updated_at: string;
}

// ---------- v7: Notifications ----------
export type NotificationKind =
  | 'task_assigned'
  | 'task_updated'
  | 'task_completed'
  | 'role_changed'
  | 'contribution_submitted'
  | 'contribution_verified'
  | 'contribution_rejected'
  | 'announcement_posted'
  | 'mention'
  | 'system';

export interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  kind: NotificationKind;
  title: string;
  message: string;
  link: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}


// ---------- v9: Fines ----------
export type FineStatus = 'unpaid' | 'paid' | 'waived';

export interface Fine {
  id: string;
  member_id: string;
  amount: number;
  currency: string;
  reason: string;
  status: FineStatus;
  issued_by: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FineStats {
  total_collected: number;
  total_outstanding: number;
  total_waived: number;
  unpaid_count: number;
  paid_count: number;
  waived_count: number;
}


// ---------- v11 — Financial Record Summaries (Treasurer "Create Record") ----------

/** Categories the Treasurer can include in a financial record snapshot. */
export type FinancialRecordCategory =
  | 'donations'
  | 'expenses'
  | 'fines_paid'
  | 'fines_unpaid'
  | 'fines_waived';

/** One line in the per-category breakdown shown on the public detail page. */
export interface FinancialRecordLine {
  category: FinancialRecordCategory;
  label: string;
  amount: number;
  count: number;
}

/**
 * Result of `preview_financial_summary(...)` — totals for a date range
 * BEFORE persisting. Used by the Create-Record wizard's preview panel.
 */
export interface FinancialRecordPreview {
  period_start: string;
  period_end: string;
  total_donations: number;
  donation_count: number;
  total_expenses: number;
  expense_count: number;
  total_fines_paid: number;
  fines_paid_count: number;
  total_fines_unpaid: number;
  fines_unpaid_count: number;
  total_fines_waived: number;
  fines_waived_count: number;
  total_income: number;
  net_position: number;
  lines: FinancialRecordLine[];
  included_categories: FinancialRecordCategory[];
}

/** A persisted, optionally published, financial record snapshot. */
export interface FinancialRecordSummary {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  total_donations: number;
  donation_count: number;
  total_expenses: number;
  expense_count: number;
  total_fines_paid: number;
  fines_paid_count: number;
  total_fines_unpaid: number;
  fines_unpaid_count: number;
  total_fines_waived: number;
  fines_waived_count: number;
  total_income: number;
  net_position: number;
  lines: FinancialRecordLine[];
  included_categories: FinancialRecordCategory[];
  notes: string | null;
  status: 'draft' | 'published';
  created_by: string | null;
  published_by: string | null;
  published_at: string | null;
    created_at: string;
    updated_at: string;
  }


  // ---------- v13 — Administration (auto-generated leadership) ----------

  /** Row from public.list_administration() — verified management roster. */
  export interface AdministrationMember {
    id: string;
    display_name: string;
    photo_url: string | null;
    hierarchy_role: string | null;
    role: Role;
    email: string;
    joined_at: string;
  }

  /** Friendly labels for the role badges on /leadership. */
  export const ROLE_LABEL: Record<Role, string> = {
    admin: 'Coordinator',
    moderator: 'Moderator',
    secretary: 'Secretary',
    treasurer: 'Treasurer',
    member: 'Member',
  };
