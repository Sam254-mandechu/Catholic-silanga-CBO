import { motion } from 'framer-motion';
import { Target, Eye, Heart, Cross } from 'lucide-react';

const values = [
  {
    icon: Cross,
    title: 'Faith',
    description: 'Rooted in Catholic teachings, guided by love and service to God and neighbor.',
  },
  {
    icon: Heart,
    title: 'Community',
    description: 'Building bridges across cultures, generations, and circumstances to unite our parish.',
  },
  {
    icon: Target,
    title: 'Integrity',
    description: 'Operating with transparency, accountability, and unwavering moral principles.',
  },
];

export const MissionVision: React.FC = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary tracking-wider uppercase mb-2">
            Who We Are
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Mission, Vision & Values
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our foundation is built on timeless Catholic principles that drive every initiative
            and outreach program.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl bg-gradient-to-br from-primary to-accent p-8 text-primary-foreground shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/20 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gold-400 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading text-2xl font-bold mb-3">Our Mission</h3>
              <p className="text-primary-foreground/90 leading-relaxed">
                To empower the Catholic Silanga community through faith-based programs that
                promote holistic human development — spiritual, educational, economic, and social —
                while upholding the dignity of every person and stewarding God's creation.
              </p>
            </div>
          </motion.div>

          {/* Vision */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl bg-gradient-to-br from-gold-600 to-gold-800 p-8 text-white shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-gold-800" />
              </div>
              <h3 className="font-heading text-2xl font-bold mb-3">Our Vision</h3>
              <p className="text-white/95 leading-relaxed">
                A thriving, self-reliant community where every member lives with dignity, walks
                with faith, and contributes meaningfully to society — guided by Catholic
                teaching and sustained through collaborative partnerships.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((value, idx) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="rounded-xl border bg-card p-6 text-center hover:shadow-lg transition-shadow"
            >
              <div className="inline-flex w-12 h-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <value.icon className="w-6 h-6" />
              </div>
              <h4 className="font-heading text-xl font-semibold mb-2 text-foreground">
                {value.title}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
