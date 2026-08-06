import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, Phone, Award, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { PageHeader } from '../common/PageHeader';
import { listApprovedMembersByHierarchy } from '../../services/supabaseAuth';
import { HIERARCHY_WEIGHT } from '../../services/supabaseData';
import type { Profile } from '../../types/database';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80';

export const MeetOurMembers: React.FC<{ limit?: number }> = ({ limit = 8 }) => {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await listApprovedMembersByHierarchy();
        if (mounted) {
          // De-duplicate (the helper may return multiple per hierarchy bucket)
          // and trim to limit
          const seen = new Set<string>();
          const deduped = list.filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });
          setMembers(deduped.slice(0, limit));
        }
      } catch (err) {
        console.warn('MeetOurMembers: failed to load', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [limit]);

  if (loading) return null;
  if (members.length === 0) return null;

  return (
    <section className="py-16 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader
          subtitle="Our Community"
          title="Meet Our Members"
          description="The verified members of the Catholic Silanga CBO, ordered by their roles in the community."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {members.map((m, idx) => {
            const weight = HIERARCHY_WEIGHT[m.hierarchy_role ?? 'Member'] ?? 99;
            const isLeadership = weight <= 4;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.04 }}
              >
                <Card className={`h-full hover:shadow-lg transition-shadow ${
                  isLeadership ? 'border-gold-400/40 bg-gold-400/5' : ''
                }`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative">
                        <img
                          src={m.photo_url ?? FALLBACK_AVATAR}
                          alt={m.display_name}
                          className="w-20 h-20 rounded-full object-cover ring-2 ring-background shadow-md"
                          loading="lazy"
                        />
                        {isLeadership && (
                          <span className="absolute -top-1 -right-1 inline-flex w-7 h-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold-500 text-white shadow-md">
                            <Award className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 font-heading font-semibold text-base line-clamp-1">
                        {m.display_name}
                      </h3>
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary mt-1">
                        {m.hierarchy_role ?? 'Member'}
                      </p>
                      {m.member_code && (
                        <p className="text-[10px] text-muted-foreground font-mono mt-1">
                          {m.member_code}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        {m.email && (
                          <a
                            href={`mailto:${m.email}`}
                            className="hover:text-primary inline-flex items-center gap-1"
                            aria-label={`Email ${m.display_name}`}
                          >
                            <Mail className="w-3 h-3" />
                          </a>
                        )}
                        {m.phone && (
                          <a
                            href={`tel:${m.phone}`}
                            className="hover:text-primary inline-flex items-center gap-1"
                            aria-label={`Call ${m.display_name}`}
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/members"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-md border border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            View all members
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};