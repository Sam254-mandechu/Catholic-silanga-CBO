import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { getSiteContentMap } from '../../services/supabaseData';

const DEFAULT_MESSAGE =
  'Dear brothers and sisters, welcome to our community. Whether you are a long-time member, a first-time visitor, or simply searching for a place to belong — know that you are loved by God and embraced by our parish family. Together, we walk in faith, serve in love, and grow in hope.';
const DEFAULT_SUBTITLE = 'A Warm Welcome';

export const WelcomeMessage: React.FC = () => {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const map = await getSiteContentMap(['welcome_message', 'welcome_subtitle']);
        if (!mounted) return;
        if (map.welcome_message) setMessage(map.welcome_message);
        if (map.welcome_subtitle) setSubtitle(map.welcome_subtitle);
      } catch (err) {
        console.warn('Failed to load welcome_message from site_content', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold-400/10 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">
              {subtitle}
            </span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-6">
            From the Desk of the Chairperson
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6 italic whitespace-pre-line">
            "{message}"
          </p>
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-gold-400"></div>
            <p className="text-sm font-semibold text-foreground">— Sr. Margaret Akinyi, CBO Chairperson</p>
            <div className="h-px w-12 bg-gold-400"></div>
          </div>
          <Link to="/about">
            <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Read Our Full Story
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};