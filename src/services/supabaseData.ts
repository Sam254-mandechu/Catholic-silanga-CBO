<?typescript  
// Updated notify kinds to DB-allowed values
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
    // v14 — donation type
    DonationType,
  } from '../types/database';

// ... (rest of file unchanged - truncated)