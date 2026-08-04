import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Users, Heart, Calendar, Award } from 'lucide-react';

const stats = [
  {
    icon: Users,
    target: 1250,
    suffix: '+',
    label: 'Community Members',
    description: 'Active members in our parish',
  },
  {
    icon: Heart,
    target: 35,
    suffix: '+',
    label: 'Lives Impacted',
    description: 'Through outreach programs',
  },
  {
    icon: Calendar,
    target: 18,
    suffix: ' yrs',
    label: 'Of Service',
    description: 'Building community since 2005',
  },
  {
    icon: Award,
    target: 75,
    suffix: '+',
    label: 'Active Volunteers',
    description: 'Dedicated servants of faith',
  },
];

const CountUp: React.FC<{ target: number; suffix: string; duration?: number; delay?: number }> = ({
  target,
  suffix,
  duration = 2,
  delay = 0,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, target, { duration, delay, ease: 'easeOut' });
    return () => controls.stop();
  }, [target, duration, delay]);

  useEffect(() => {
    return rounded.on('change', (latest) => {
      if (ref.current) ref.current.textContent = latest.toString();
    });
  }, [rounded]);

  return (
    <span>
      <span ref={ref}>0</span>
      {suffix}
    </span>
  );
};

export const Stats: React.FC = () => {
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
