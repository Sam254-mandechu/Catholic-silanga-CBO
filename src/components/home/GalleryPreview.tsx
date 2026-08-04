import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Loader } from '../common/Loader';
import { getGalleryImages } from '../../services/supabaseData';
import type { GalleryImage } from '../../types/database';

const fallbackImage = 'https://images.unsplash.com/photo-1509099836639-18ba1795211d?auto=format&fit=crop&w=800&q=80';

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

  // Placeholder static demo images in case no data yet — keeps the layout populated
  const placeholders: GalleryImage[] = Array.from({ length: 8 }).map((_, i) => ({
    id: `placeholder-${i}`,
    url: `https://images.unsplash.com/photo-${
      ['1509099836639-18ba1795211d', '1469571486292-0ba58a3f068b', '1517457373958-b7bdd4587205', '1542816417-0983c9c9ad53', '1582213782179-e0d53f98f2ca', '1488521787991-ed7bbaae773c', '1532009324734-20a7a5813719', '1497250681960-ef0a4e2b95b6'][i]
    }?auto=format&fit=crop&w=600&q=60`,
    title: '',
    category: '',
    uploaded_at: new Date().toISOString(),
    uploaded_by: null,
  }));

  const displayImages = images.length > 0 ? images : placeholders;

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
