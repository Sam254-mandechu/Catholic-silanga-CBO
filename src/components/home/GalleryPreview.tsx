import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Loader } from '../common/Loader';
import { getGalleryImages } from '../../services/supabaseData';
import type { GalleryImage } from '../../types/database';

const fallbackImage =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>';

export const GalleryPreview: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchGallery = async () => {
      try {
        const data = await getGalleryImages();
        if (mounted) setImages(data.slice(0, 8));
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

  const displayImages = images;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
          <div>
            <p className="text-sm font-semibold text-primary tracking-wider uppercase mb-2">
              Moments Captured
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Gallery Preview
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              A glimpse into the life, fellowship, and impact of our community.
            </p>
          </div>
          <Link to="/gallery">
            <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Full Gallery
            </Button>
          </Link>
        </div>

        {loading ? (
          <Loader />
        ) : displayImages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-xl mb-2">Gallery preview will appear here</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Once photos are uploaded from the admin dashboard, the latest ones will appear here.
            </p>
            <Link
              to="/admin-dashboard"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Go to admin dashboard →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {displayImages.map((img, idx) => (
              <motion.button
                key={img.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                onClick={() => setLightboxImage(img)}
                className={`relative overflow-hidden rounded-lg group cursor-pointer ${
                  idx === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'
                }`}
                aria-label={img.title || `Gallery image ${idx + 1}`}
              >
                <img
                  src={(img.url ?? fallbackImage) || fallbackImage}
                  alt={img.title ?? ''}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = fallbackImage;
                  }}
                />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-white text-sm font-medium">View</span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gold-400 transition-colors p-2"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxImage(null);
            }}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightboxImage.url ?? fallbackImage}
            alt={lightboxImage.title ?? ''}
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </section>
  );
};
