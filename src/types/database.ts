// Domain types shared across the app. These mirror the SQL schema in supabase/schema.sql.

export type Role = 'admin' | 'member' | 'moderator';
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
