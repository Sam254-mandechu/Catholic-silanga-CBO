import { useState, useRef } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { uploadProfilePhoto, deleteProfilePhoto } from '../../services/supabaseData';
import { updateOwnProfile } from '../../services/supabaseAuth';
import { toast } from '../../utils/toast';

const FALLBACK_AVATAR =
  'https://api.dicebear.com/7.x/initials/svg?seed=';

interface Props {
  userId: string;
  photoUrl: string | null;
  displayName: string;
  onUploaded?: (newUrl: string) => void;
}

/**
 * Lets the signed-in member upload / replace / remove their own profile photo.
 * Uploads to the public `profile-photos` bucket (RLS restricts writes to
 * the user's own folder), then patches the `photo_url` column on profiles.
 */
export const ProfilePhotoUploader: React.FC<Props> = ({ userId, photoUrl, displayName, onUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    // Local preview while uploading
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    try {
      const publicUrl = await uploadProfilePhoto(userId, file);
      await updateOwnProfile({ photo_url: publicUrl });
      toast.success('Photo updated');
      onUploaded?.(publicUrl);
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
      setPreview(null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!photoUrl) return;
    if (!window.confirm('Remove your profile photo?')) return;
    try {
      await deleteProfilePhoto(photoUrl);
      await updateOwnProfile({ photo_url: null });
      toast.success('Photo removed');
      onUploaded?.('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove photo');
    }
  };

  const src = preview || photoUrl || `${FALLBACK_AVATAR}${encodeURIComponent(displayName)}`;

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
      <img
        src={src}
        alt={displayName}
        className="w-20 h-20 rounded-full object-cover ring-2 ring-background shadow"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-1">Profile photo</p>
        <p className="text-xs text-muted-foreground mb-2">JPEG/PNG/WebP, max 5 MB.</p>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-muted cursor-pointer">
            <Camera className="w-4 h-4" />
            {uploading ? 'Uploading…' : photoUrl ? 'Replace' : 'Upload'}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFile}
              disabled={uploading}
            />
          </label>
          {photoUrl && (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-destructive/10 hover:text-destructive"
              disabled={uploading}
            >
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
};