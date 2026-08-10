import React, { useState } from 'react';
import { User } from 'lucide-react';

/**
 * Universal member avatar.
 * - If `photo_url` exists, render the image with onError fallback to initials.
 * - Else render the initials circle (purple→gold gradient).
 * - All sizes controlled by Tailwind classes passed via `className`.
 *
 * Usage:
 *   <Avatar photoUrl={p.photo_url} displayName={p.display_name} size="md" />
 *   <Avatar photoUrl={p.photo_url} displayName={p.display_name} className="w-10 h-10 text-sm" />
 */

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<Size, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-3xl',
};

function getInitials(name: string | null | undefined, fallback: string = '?'): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return fallback;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar: React.FC<{
  photoUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
  size?: Size;
  className?: string;
  /** Override the default initials content (used for role badges, etc). */
  children?: React.ReactNode;
}> = ({ photoUrl, displayName, email, size = 'md', className = '', children }) => {
  const [errored, setErrored] = useState(false);
  const showImg = !!photoUrl && !errored;

  const baseClass = [
    'inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0',
    'bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold',
    SIZE_CLASSES[size],
    className,
  ].filter(Boolean).join(' ');

  if (showImg) {
    return (
      <img
        src={photoUrl as string}
        alt={displayName ?? email ?? 'Avatar'}
        onError={() => setErrored(true)}
        className={`${baseClass} object-cover`}
      />
    );
  }

  if (children != null) {
    return <span className={baseClass}>{children}</span>;
  }

  return (
    <span className={baseClass} aria-label={displayName ?? email ?? 'Member avatar'}>
      {displayName || email ? getInitials(displayName ?? email) : <User className="w-1/2 h-1/2" />}
    </span>
  );
};

export default Avatar;
