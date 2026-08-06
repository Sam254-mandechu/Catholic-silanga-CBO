# Member Portal Features — Specification

> Design doc for the role-gated portal work. Once the implementation PR is merged, this doc becomes the canonical reference.

## Roles

| Role | Capabilities |
|------|-------------|
| `admin` | Everything: delete members, approve expenses, approve reports, manage all content |
| `secretary` | Manage meetings: create, view RSVPs, mark attendance, write minutes. Manage polls: create, close, view results |
| `treasurer` | Manage finances: record expenses, generate financial reports, view donation summary |
| `member` | View content, RSVP to meetings, vote in polls, check in on meeting day, edit own profile |
| `moderator` | Reserved for future use |

A member can hold **only one** system role at a time (chosen by admin). Hierarchy role (Chairperson / Vice / etc.) is orthogonal.

## Database Tables (schema_v5.sql)

### Meetings
- `meetings` — title, description, scheduled_at, location, meeting_type (`general`/`committee`/`emergency`/`agm`), status (`scheduled`/`in_progress`/`completed`/`cancelled`)
- `meeting_rsvps` — member's response (`attending`/`not_attending`/`maybe`) + optional reason
- `meeting_attendance` — actual presence (`present`/`absent`/`excused`)
- `meeting_minutes` — agenda, discussions, decisions, action_items (jsonb), published_by, published_at

### Polls
- `polls` — title, description, type (`single_choice`/`multiple_choice`/`yes_no`), status (`open`/`closed`), closes_at
- `poll_options` — options per poll
- `poll_votes` — one vote per voter per poll

### Finances
- `expenses` — title, amount, currency, category (`operations`/`events`/`charity`/`utilities`/`salaries`/`supplies`/`maintenance`/`other`), receipt_url, vendor, expense_date, recorded_by, approved_by, approved_at
- `financial_reports` — period_start, period_end, opening_balance, total_income, total_expenses, closing_balance, status (`draft`/`submitted`/`approved`), prepared_by, approved_by

## RPC Functions

All `SECURITY DEFINER`, granted to `authenticated`:

| Function | Called by | Purpose |
|----------|-----------|---------|
| `admin_delete_member(target_user_id)` | Admin | Hard-deletes profile + auth user |
| `admin_set_system_role(target_user_id, new_role)` | Admin | Assigns system role |
| `submit_meeting_rsvp(meeting_id, response, reason)` | Member | Records attendance intent |
| `check_in_to_meeting(meeting_id)` | Member | Self check-in on day of meeting |
| `mark_meeting_attendance(meeting_id, member_id, status)` | Secretary/Admin | Manual attendance marking |
| `write_meeting_minutes(meeting_id, agenda, discussions, decisions, action_items)` | Secretary/Admin | Publishes minutes |
| `cast_poll_vote(poll_id, option_id)` | Member | Records vote (one per poll) |
| `close_poll(poll_id)` | Admin/Secretary | Closes voting |
| `record_expense(p_expense jsonb)` | Treasurer/Admin | Adds expense |
| `approve_expense(expense_id)` | Admin | Marks expense approved |
| `submit_financial_report(p_start, p_end, p_notes)` | Treasurer/Admin | Generates report (aggregates donations + expenses) |
| `approve_financial_report(report_id)` | Admin | Marks report approved |

## Routes

| Path | Role gate | Purpose |
|------|-----------|---------|
| `/secretary-portal` | secretary or admin | Secretary control panel |
| `/treasurer-portal` | treasurer or admin | Treasurer control panel |
| `/meetings` | authenticated members | List of upcoming + past meetings with RSVP |
| `/meetings/:id` | authenticated members | Meeting detail with minutes (after published) |
| `/admin-dashboard` | admin only (existing) | Extended with Meetings/Polls/Financial tabs |

## Admin Dashboard Tabs Added

- **Meetings** — list/create meetings, view RSVPs, mark attendance, edit minutes
- **Polls** — list/create polls, view results, close polls
- **Financial** — list expenses, approve expenses, list/generate financial reports

## Members Tab Changes

- **System Role** dropdown per member (member/moderator/secretary/treasurer/admin)
- **Delete Member** button (hard delete with confirm)
- Existing hierarchy role dropdown unchanged

## Member Dashboard Tabs Added

- **Meetings** — upcoming meetings with RSVP buttons, past meetings with "Check In" button
- **Polls** — active polls with vote UI, closed polls with results
- **Attendance** — personal attendance history
- **Profile** — editable personal profile (photo URL, bio, phone, address), stats (meetings attended, polls voted, contributions total)

## Public / Members-Only Decisions

- Meetings page is **members-only** (chosen by user)
- RSVPs and minutes are private to authenticated members
- Polls results visible to all members after poll closes
- Financial data not exposed publicly — only visible to treasurer/admin via portal

## Behavior Notes

- **Hard delete** for member removal (loses historical references)
- **Single system role per member** (cleaner RLS)
- **Open polls** — any active member can vote
- **Members-only** access to meeting details