import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, Award, Users } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Loader } from '../components/common/Loader';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { listApprovedMembersByHierarchy } from '../services/supabaseAuth';
import { HIERARCHY_WEIGHT } from '../services/supabaseData';
import type { Profile } from '../types/database';
import { HIERARCHY_ORDER } from '../types/database';

const fallbackAvatar =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80';

const MemberCard: React.FC<{ member: Profile; rank: number }> = ({ member, rank }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: Math.min(rank * 0.04, 0.3) }}
    >
      <Card className="h-full hover:shadow-xl transition-shadow overflow-hidden group">
        <div className="relative h-44 overflow-hidden bg-muted">
          <img
            src={member.photo_url ?? fallbackAvatar}
            alt={member.display_name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = fallbackAvatar;
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs font-semibold">
              <Award className="w-3 h-3" />
              {member.hierarchy_role ?? 'Member'}
            </span>
          </div>
        </div>
        <CardContent className="text-center pt-5 space-y-2">
          <h3 className="font-heading text-lg font-bold">{member.display_name}</h3>
          {member.member_code && (
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Code: {member.member_code}
            </p>
          )}
          <div className="space-y-1 text-sm">
            {member.email && (
              <a href={`mailto:${member.email}`} className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{member.email}</span>
              </a>
            )}
            {member.phone && (
              <a href={`tel:${member.phone}`} className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary">
                <Phone className="w-3.5 h-3.5" /> {member.phone}
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const MembersPage: React.FC = () => {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const data = await listApprovedMembersByHierarchy();
        if (mounted) setMembers(data);
      } catch (err) {
        console.warn('failed to load members', err);
        if (mounted) setMembers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  // Sort by hierarchy weight (Chairperson first), then by joined_at desc as tie-breaker
  const sorted = useMemo(() => {
    const filtered = members.filter((m) =>
      !search
        ? true
        : m.display_name.toLowerCase().includes(search.toLowerCase()) ||
          (m.hierarchy_role ?? '').toLowerCase().includes(search.toLowerCase()),
    );
    return filtered.sort((a, b) => {
      const aw = a.hierarchy_role ? HIERARCHY_WEIGHT[a.hierarchy_role] : 99;
      const bw = b.hierarchy_role ? HIERARCHY_WEIGHT[b.hierarchy_role] : 99;
      if (aw !== bw) return aw - bw;
      return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
    });
  }, [members, search]);

  const groupedByHierarchy = useMemo(() => {
    const groups = new Map<string, Profile[]>();
    HIERARCHY_ORDER.forEach((r) => groups.set(r, []));
    sorted.forEach((m) => {
      const key = m.hierarchy_role ?? 'Member';
      const arr = groups.get(key) ?? [];
      arr.push(m);
      groups.set(key, arr);
    });
    return Array.from(groups.entries()).filter(([, list]) => list.length > 0);
  }, [sorted]);

  return (
    <>
      <PageHeader
        title="Our Members"
        subtitle="Hierarchy of Stewards"
        description="Verified members of Catholic Silanga CBO, ordered by position of service within the community."
      />

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-md">
            <Input
              placeholder="Search by name or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Users className="w-4 h-4" />}
            />
          </div>

          {loading ? (
            <Loader />
          ) : sorted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">No verified members yet</h3>
              <p className="text-sm text-muted-foreground">
                Approved members will appear here in their hierarchy order.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {groupedByHierarchy.map(([role, list]) => (
                <div key={role}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3 mb-6"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-heading text-2xl font-bold">{role}s</h2>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        {list.length} member{list.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex-1 h-px bg-border ml-3" />
                  </motion.div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {list.map((m, idx) => (
                      <MemberCard key={m.id} member={m} rank={idx} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};
