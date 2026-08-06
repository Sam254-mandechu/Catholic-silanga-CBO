import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Users, Heart, Calendar, FolderKanban } from 'lucide-react';
import { listApprovedMembersByHierarchy } from '../../services/supabaseAuth';
import { getProjects } from '../../services/supabaseData';
import { getRecentDonations } from '../../services/supabaseData';

interface Stat {
  icon: any;
  target: number;
  suffix: string;
  label: string;
  description: string;
  prefix?: string;
}

const FOUNDED_YEAR = 2005;

const CountUp: React.FC<{
  target: number;
  suffix: string;
  prefix?: string;
  duration?: number;
  delay?: number;
}> = ({ target, suffix, prefix = '', duration = 2, delay = 0 }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, target, { duration, delay, ease: 'easeOut' });
    return () => controls.stop();
  }, [target, duration, delay]);

  useEffect(() => {
    return rounded.on('change', (latest) => {
      if (ref.current) ref.current.textContent = `${prefix}${latest}${suffix}`;
    });
  }, [rounded, prefix, suffix]);

  return (
    <span>
      <span ref={ref}>{`${prefix}0${suffix}`}</span>
    </span>
  );
};

export const Stats: React.FC = () => {
  const [stats, setStats] = useState<Stat[]>([
    { icon: Users, target: 0, suffix: '+', label: 'Community Members', description: 'Active members in our parish' },
    { icon: FolderKanban, target: 0, suffix: '+', label: 'Active Projects', description: 'Running initiatives' },
    { icon: Heart, target: 0, suffix: '+', label: 'Lives Impacted', description: 'Through outreach programs' },
    { icon: Calendar, target: new Date().getFullYear() - FOUNDED_YEAR, suffix: ' yrs', label: 'Of Service', description: `Building community since ${FOUNDED_YEAR}` },
  ]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [members, projects, donations] = await Promise.all([
          listApprovedMembersByHierarchy().catch(() => []),
          getProjects().catch(() => []),
          getRecentDonations(1000).catch(() => []),
        ]);
        if (!mounted) return;

        const memberCount = members.length;
        const projectCount = projects.length;
        const completedDonations = donations.filter((d) => d.status === 'completed');
        const livesImpacted = Math.max(completedDonations.length * 3, projectCount * 12);

        setStats([
          { icon: Users, target: memberCount, suffix: '+', label: 'Community Members', description: 'Active members in our parish' },
          { icon: FolderKanban, target: projectCount, suffix: '+', label: 'Active Projects', description: 'Running initiatives' },
          { icon: Heart, target: livesImpacted, suffix: '+', label: 'Lives Impacted', description: 'Through outreach programs' },
          { icon: Calendar, target: new Date().getFullYear() - FOUNDED_YEAR, suffix: ' yrs', label: 'Of Service', description: `Building community since ${FOUNDED_YEAR}` },
        ]);
      } catch (err) {
        console.warn('Stats: live data fetch failed, keeping defaults', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <section className="relative -mt-12 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-card shadow-2xl border p-8 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="text-center relative"
            >
              {idx < stats.length - 1 && (
                <div className="hidden lg:block absolute right-0 top-1/4 bottom-1/4 w-px bg-border"></div>
              )}
              <div className="inline-flex w-12 h-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-1">
                <CountUp target={stat.target} suffix={stat.suffix} delay={idx * 0.15} />
              </div>
              <div className="text-sm font-semibold text-foreground">{stat.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.description}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};