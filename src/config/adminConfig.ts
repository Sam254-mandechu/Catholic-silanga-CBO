// Centralised configuration for "magic admin email" promotion.
//
// Set VITE_ADMIN_EMAIL in your .env (comma-separate several if you want
// multiple people to be granted admin automatically). When any of those
// addresses registers or signs in, the app will silently promote them to
// role='admin' so they get instant access to /admin-dashboard.
//
// Example:
//   VITE_ADMIN_EMAIL=chairperson@catholicsilanga.org,secretary@cbo.org
//
// No manual SQL "update profiles set role='admin'" needed afterwards.

const raw = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined) ?? '';

/** Normalised list of admin emails configured via env. Empty => no magic promotion. */
export const ADMIN_EMAILS: string[] = raw
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Returns true if the supplied email matches one of the configured admin addresses.
 * Comparison is case-insensitive and ignores surrounding whitespace.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const norm = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(norm);
}

/** Returns the configured admin emails (masked slightly, useful for debugging UIs). */
export function describeAdminConfig(): string[] {
  return ADMIN_EMAILS.map((e) => {
    const [user, domain] = e.split('@');
    if (!domain) return e;
    const maskedUser = user.length <= 2 ? '**' : `${user.slice(0, 2)}***`;
    return `${maskedUser}@${domain}`;
  });
}
