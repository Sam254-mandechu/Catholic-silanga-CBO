import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, Users as UsersIcon } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Loader } from '../components/common/Loader';
import { Card, CardContent } from '../components/ui/Card';
import { getLeadership } from '../services/supabaseData';
import type { Leadership } from '../types/database';

const fallbackAvatar =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></svg>';

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
          ) : leaders.length === 0 ? (
            <div className="max-w-2xl mx-auto rounded-2xl border border-dashed bg-card/50 p-12 text-center">
              <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-xl mb-2">Leadership profiles will appear here</h3>
              <p className="text-sm text-muted-foreground mb-6">
                The administrator can add your chairperson, secretary, treasurer, and other
                leadership bios from the admin dashboard.
              </p>
              <Link
                to="/admin-dashboard"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Go to admin dashboard →
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-12 max-w-3xl mx-auto">
                <p className="text-muted-foreground">
                  Our governance team brings together decades of experience in community
                  development, finance, education, and pastoral care.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {leaders.map((leader, idx) => (
                  <LeadershipCard key={leader.id} leader={leader} index={idx} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
};
