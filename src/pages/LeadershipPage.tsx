import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Loader } from '../components/common/Loader';
import { Card, CardContent } from '../components/ui/Card';
import { getLeadership } from '../services/supabaseData';
import type { Leadership } from '../types/database';

const fallbackAvatar =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80';

const LeadershipCard: React.FC<{ leader: Leadership; index: number }> = ({ leader, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <Card className="h-full hover:shadow-xl transition-shadow overflow-hidden group">
        <div className="relative h-64 overflow-hidden bg-muted">
          <img
            src={leader.photo || fallbackAvatar}
            alt={leader.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = fallbackAvatar;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white translate-y-full group-hover:translate-y-0 transition-transform">
            <div className="flex gap-2">
              {leader.email && (
                <a
                  href={`mailto:${leader.email}`}
                  className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-gold-400 transition-colors"
                  aria-label={`Email ${leader.name}`}
                >
                  <Mail className="w-4 h-4" />
                </a>
              )}
              {leader.phone && (
                <a
                  href={`tel:${leader.phone}`}
                  className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-gold-400 transition-colors"
                  aria-label={`Call ${leader.name}`}
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
        <CardContent className="text-center pt-6">
          <h3 className="font-heading text-xl font-bold mb-1">{leader.name}</h3>
          <p className="text-sm font-semibold text-primary mb-3">{leader.position}</p>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{leader.bio}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const LeadershipPage: React.FC = () => {
  const [leaders, setLeaders] = useState<Leadership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchLeadership = async () => {
      try {
        const data = await getLeadership();
        if (mounted) setLeaders(data);
      } catch (err) {
        console.warn('Failed to fetch leadership', err);
        if (mounted) setLeaders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchLeadership();
    return () => {
      mounted = false;
    };
  }, []);

  // Static fallback so the page is never empty during initial wiring
  const placeholders: Leadership[] = [
    {
      id: '1',
      name: 'Sr. Margaret Akinyi',
      position: 'Chairperson',
      bio: 'A visionary leader who has served the CBO for over 15 years, guiding our mission with wisdom and unwavering faith.',
      photo: 'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?auto=format&fit=crop&w=400&q=80',
      email: 'chairperson@catholicsilanga.org',
      phone: '+254 700 000 001',
      display_order: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Fr. Daniel Otieno',
      position: 'Patron',
      bio: 'Our parish priest provides spiritual guidance and counsel, ensuring every initiative aligns with Catholic values.',
      photo: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=400&q=80',
      email: 'patron@catholicsilanga.org',
      phone: '',
      display_order: 2,
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Mr. James Owino',
      position: 'Vice Chairperson',
      bio: 'A community development professional with deep ties to Silanga, James leads our strategic planning.',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      email: 'vice@catholicsilanga.org',
      phone: '+254 700 000 003',
      display_order: 3,
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Mrs. Grace Nyambura',
      position: 'Secretary',
      bio: 'A retired educator, Grace manages our records and communications with meticulous care.',
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      email: 'secretary@catholicsilanga.org',
      phone: '+254 700 000 004',
      display_order: 4,
      created_at: new Date().toISOString(),
    },
    {
      id: '5',
      name: 'Mr. Peter Wekesa',
      position: 'Treasurer',
      bio: 'A certified accountant who ensures financial transparency and responsible stewardship of all donations.',
      photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
      email: 'treasurer@catholicsilanga.org',
      phone: '',
      display_order: 5,
      created_at: new Date().toISOString(),
    },
    {
      id: '6',
      name: 'Ms. Linda Atieno',
      position: 'Youth Coordinator',
      bio: 'A passionate youth advocate who empowers young people through mentorship and skills training.',
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      email: 'youth@catholicsilanga.org',
      phone: '+254 700 000 006',
      display_order: 6,
      created_at: new Date().toISOString(),
    },
  ];

  const displayLeaders = leaders.length > 0 ? leaders : placeholders;

  return (
    <>
      <PageHeader
        title="Our Leadership"
        subtitle="Meet the Team"
        description="The dedicated stewards guiding Catholic Silanga CBO's mission with faith, vision, and integrity."
      />

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <Loader message="Loading leadership..." />
          ) : (
            <>
              <div className="text-center mb-12 max-w-3xl mx-auto">
                <p className="text-muted-foreground">
                  Our governance team brings together decades of experience in community
                  development, finance, education, and pastoral care.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayLeaders.map((leader, idx) => (
                  <LeadershipCard key={leader.id} leader={leader} index={idx} />
                ))}
              </div>

              {leaders.length === 0 && (
                <p className="text-center text-xs text-muted-foreground mt-8 italic">
                  Displaying sample leadership. Connect Firebase to load live data.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
};
