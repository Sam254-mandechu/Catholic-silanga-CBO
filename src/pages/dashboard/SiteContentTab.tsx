import React, { useEffect, useState } from 'react';
import { Megaphone, Save, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Loader } from '../../components/common/Loader';
import { toast } from '../../utils/toast';
import { supabase } from '../../config/supabaseClient';
import {
  getSiteContentMap,
  upsertSiteContent,
  uploadProfilePhoto,
} from '../../services/supabaseData';
import type { SiteContentKey } from '../../types/database';

/**
 * Admin-editable copy that drives public pages (welcome message, mission,
 * vision, contact details, legal pages, hero image).
 *
 * - Each section has its own Save button.
 * - A top-right "Save all sections" button writes everything at once.
 * - Image upload for the home hero uses the same `profile-photos` bucket
 *   as user avatars (we just save the resulting URL under home_hero_image).
 */
export const SiteContentTab: React.FC = () => {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [uploadingHero, setUploadingHero] = useState(false);

  const KEYS: SiteContentKey[] = [
    'welcome_message', 'welcome_subtitle', 'home_hero_image',
    'mission', 'vision',
    'contact_address', 'contact_phone', 'contact_email', 'contact_hours',
    'terms_of_service', 'privacy_policy',
  ];

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const map = await getSiteContentMap(KEYS);
        if (!mounted) return;
        setContent(map);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const save = async (key: SiteContentKey) => {
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      await upsertSiteContent({ [key]: content[key] ?? '' });
      toast.success('Saved');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  };

  const saveAll = async () => {
    setSaving({ welcome_message: true });
    try {
      await upsertSiteContent(content);
      toast.success('All sections saved');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    } finally {
      setSaving({});
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Not signed in');
      return;
    }
    setUploadingHero(true);
    try {
      const url = await uploadProfilePhoto(user.id, file);
      setContent((c) => ({ ...c, home_hero_image: url }));
      await upsertSiteContent({ home_hero_image: url });
      toast.success('Hero image uploaded');
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed');
    } finally {
      setUploadingHero(false);
      e.target.value = '';
    }
  };

  const SectionHeader: React.FC<{ title: string; hint: string }> = ({ title, hint }) => (
    <div className="mb-3">
      <h3 className="font-heading text-lg font-bold">{title}</h3>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );

  const SaveBtn: React.FC<{ k: SiteContentKey }> = ({ k }) => (
    <Button
      onClick={() => save(k)}
      isLoading={saving[k]}
      size="sm"
      leftIcon={<Save className="w-3 h-3" />}
      className="mt-2"
    >
      Save
    </Button>
  );

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" /> Welcome Message (Home Hero)
          </CardTitle>
          <Button
            size="sm"
            onClick={saveAll}
            isLoading={saving.welcome_message}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save all sections
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Main welcome line</label>
            <Textarea
              rows={2}
              value={content.welcome_message ?? ''}
              onChange={(e) => setContent({ ...content, welcome_message: e.target.value })}
              placeholder="Welcome to Catholic Silanga CBO..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Appears at the top of the home page, just below the hero.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Subtitle</label>
            <Input
              value={content.welcome_subtitle ?? ''}
              onChange={(e) => setContent({ ...content, welcome_subtitle: e.target.value })}
              placeholder="Building a stronger parish together."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Home hero background image (optional)
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {content.home_hero_image ? (
                <img
                  src={content.home_hero_image}
                  alt="Hero"
                  className="w-32 h-20 object-cover rounded border"
                />
              ) : (
                <div className="w-32 h-20 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleHeroUpload}
                />
                <span className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                  <Upload className="w-4 h-4" /> {uploadingHero ? 'Uploading…' : 'Upload'}
                </span>
              </label>
              {content.home_hero_image && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setContent({ ...content, home_hero_image: '' })}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Optional. Image URL is saved to <code>site_content.home_hero_image</code>.
            </p>
          </div>
          <SaveBtn k="welcome_message" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mission & Vision (About page)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SectionHeader title="Mission" hint="Short statement of what the CBO does." />
          <Textarea
            rows={3}
            value={content.mission ?? ''}
            onChange={(e) => setContent({ ...content, mission: e.target.value })}
          />
          <SaveBtn k="mission" />
          <hr />
          <SectionHeader title="Vision" hint="Aspirational description of where the CBO is heading." />
          <Textarea
            rows={3}
            value={content.vision ?? ''}
            onChange={(e) => setContent({ ...content, vision: e.target.value })}
          />
          <SaveBtn k="vision" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact (Contact page)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Address</label>
              <Input
                value={content.contact_address ?? ''}
                onChange={(e) => setContent({ ...content, contact_address: e.target.value })}
              />
              <SaveBtn k="contact_address" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <Input
                value={content.contact_phone ?? ''}
                onChange={(e) => setContent({ ...content, contact_phone: e.target.value })}
              />
              <SaveBtn k="contact_phone" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <Input
                type="email"
                value={content.contact_email ?? ''}
                onChange={(e) => setContent({ ...content, contact_email: e.target.value })}
              />
              <SaveBtn k="contact_email" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Office hours</label>
              <Input
                value={content.contact_hours ?? ''}
                onChange={(e) => setContent({ ...content, contact_hours: e.target.value })}
              />
              <SaveBtn k="contact_hours" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legal pages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SectionHeader title="Terms of Service" hint="Shown on the /legal/terms page (or footer link)." />
          <Textarea
            rows={6}
            value={content.terms_of_service ?? ''}
            onChange={(e) => setContent({ ...content, terms_of_service: e.target.value })}
          />
          <SaveBtn k="terms_of_service" />
          <hr />
          <SectionHeader title="Privacy Policy" hint="Shown on the /legal/privacy page." />
          <Textarea
            rows={6}
            value={content.privacy_policy ?? ''}
            onChange={(e) => setContent({ ...content, privacy_policy: e.target.value })}
          />
          <SaveBtn k="privacy_policy" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live preview links</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            After saving, visit these pages to see your changes reflected publicly:
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li><a className="text-primary hover:underline" href="/" target="_blank" rel="noreferrer">/ (Home)</a></li>
            <li><a className="text-primary hover:underline" href="/about" target="_blank" rel="noreferrer">/about</a></li>
            <li><a className="text-primary hover:underline" href="/contact" target="_blank" rel="noreferrer">/contact</a></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteContentTab;