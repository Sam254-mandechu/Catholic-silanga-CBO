import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { Loader } from '../components/common/Loader';
import { Input } from '../components/ui/Input';
import { getGalleryImages } from '../services/supabaseData';
import type { GalleryImage } from '../types/database';

// Fallback for individual images that fail to load. Uses an inline SVG so
// we don't depend on any external service (no Unsplash, no broken links).
const fallbackImage =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>';

export const GalleryPage: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchGallery = async () => {
      try {
        const data = await getGalleryImages();
        if (mounted) setImages(data);
      } catch (err) {
        console.warn('Gallery fetch failed', err);
        if (mounted) setImages([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchGallery();
    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    images.forEach((i) => i.category && set.add(i.category));
    return Array.from(set);
  }, [images]);

  const filtered = useMemo(() => {
    return images.filter((img) => {
      if (categoryFilter !== 'all' && img.category !== categoryFilter) return false;
      if (
        search &&
        !(img.title ?? '').toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [images, search, categoryFilter]);

  return (
    <>
      <PageHeader
        title="Photo Gallery"
        subtitle="Moments in Time"
        description="Browse memories from our services, programs, and community gatherings."
      />

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          {images.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 p-4 rounded-xl border bg-card">
              <div className="md:col-span-2">
                <Input
                  placeholder="Search gallery..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                    categoryFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                      categoryFilter === cat ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <Loader />
          ) : images.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-xl mb-2">No photos yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                The administrator can upload photos from events, services, and community
                programs. They will appear here once added.
              </p>
              <Link
                to="/admin-dashboard"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Go to admin dashboard →
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
              <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">No images found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                {filtered.length} photo{filtered.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filtered.map((img, idx) => (
                  <motion.button
                    key={img.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: Math.min(idx * 0.03, 0.3) }}
                    onClick={() => setLightbox(img)}
                    className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer"
                    aria-label={img.title || `Gallery image ${idx + 1}`}
                  >
                    <img
                      src={img.url ?? fallbackImage}
                      alt={img.title ?? ''}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = fallbackImage;
                      }}
                    />
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/50 transition-colors flex items-end p-3">
                      <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-left">
                        <p className="text-sm font-semibold line-clamp-1">{img.title}</p>
                        {img.category && (
                          <p className="text-xs text-gold-400">{img.category}</p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          >
            <button
              className="absolute top-4 right-4 text-white hover:text-gold-400 transition-colors p-2"
              aria-label="Close"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(null);
              }}
            >
              <X className="w-8 h-8" />
            </button>
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              src={lightbox.url ?? fallbackImage}
              alt={lightbox.title ?? ''}
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            {lightbox.title && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full text-white text-sm">
                {lightbox.title}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
