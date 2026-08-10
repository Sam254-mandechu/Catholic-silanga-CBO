import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Users as UsersIcon, Shield, Sparkles, Crown } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Loader } from '../components/common/Loader';
import { Card, CardContent } from '../components/ui/Card';
import { listAdministration } from '../services/supabaseData';
import type { AdministrationMember } from '../types/database';
import { ROLE_LABEL } from '../types/database';

const fallbackAvatar =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></svg>';

const ROLE_TONE: Record<AdministrationMember['role'], { cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  admin:     { cls: 'bg-primary text-primary-foreground',  icon: Crown },
  moderator: { cls: 'bg-accent text-accent-foreground',    icon: Shield },
  secretary: { cls: 'bg-gold-400 text-gold-900',           icon: Sparkles },
  treasurer: { cls: 'bg-success text-white',                icon: Sparkles },
  member:    { cls: 'bg-muted text-foreground',             icon: UsersIcon },
};

const AdministrationCard: React.FC<{ member: AdministrationMember; index: number }> = ({ member, index }) => {
  const tone = ROLE_TONE[member.role];
  const Icon = tone.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <Card className="h-full hover:shadow-xl transition-shadow overflow-hidden">
        <div className="relative h-48 overflow-hidden bg-muted">
          <img
            src={member.photo_url || fallbackAvatar}
            alt={member.display_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = fallbackAvatar;
            }}
          />
          <div className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${tone.cls}`}>
            <Icon className="w-3 h-3" />
            {ROLE_LABEL[member.role]}
          </div>
        </div>
        <CardContent className="text-center pt-6">
          <h3 className="font-heading text-xl font-bold mb-1">{member.display_name}</h3>
          {member.hierarchy_role && (
            <p className="text-sm font-semibold text-primary mb-3">{member.hierarchy_role}</p>
          )}
          <div className="flex gap-2 justify-center mt-3">
            <a
              href={`mailto:${member.email}`}
              className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
              aria-label={`Email ${member.display_name}`}
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const LeadershipPage: React.FC = () => {
  const [members, setMembers] = useState<AdministrationMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchAdministration = async () => {
      try {
        const data = await listAdministration();
        if (mounted) setMembers(data);
      } catch (err) {
        console.warn('Failed to fetch administration', err);
        if (mounted) setMembers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAdministration();
    return () => {
      mounted = false;
    };
  }, []);

  // Group by role so admins appear first, then moderator, secretary, treasurer
  const grouped = {
    admin:     members.filter((m) => m.role === 'admin'),
    moderator: members.filter((m) => m.role === 'moderator'),
    secretary: members.filter((m) => m.role === 'secretary'),
    treasurer: members.filter((m) => m.role === 'treasurer'),
  };

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
          ) : members.length === 0 ? (
            <div className="max-w-2xl mx-auto rounded-2xl border border-dashed bg-card/50 p-12 text-center">
              <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-xl mb-2">Leadership profiles will appear here</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Verified members with management roles will appear automatically once an
                admin, moderator, secretary, or treasurer is assigned.
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

              {grouped.admin.length > 0 && (
                <div className="mb-10">
                  <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" /> Coordinator
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {grouped.admin.map((m, i) => (
                      <AdministrationCard key={m.id} member={m} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {grouped.moderator.length + grouped.secretary.length + grouped.treasurer.length > 0 && (
                <div className="mb-6">
                  <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-accent" /> Verified Administration
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...grouped.moderator, ...grouped.secretary, ...grouped.treasurer].map((m, i) => (
                      <AdministrationCard key={m.id} member={m} index={i + grouped.admin.length} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
};