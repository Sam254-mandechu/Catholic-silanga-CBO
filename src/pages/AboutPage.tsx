import React from 'react';
import { motion } from 'framer-motion';
import { History, Target, Eye, Heart, Award, Users, BookOpen, Lightbulb } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { CallToAction } from '../components/home/CallToAction';

const coreValues = [
  {
    icon: Heart,
    title: 'Faith & Love',
    description: 'Anchored in Christ\'s teachings, we serve with compassion and mercy.',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Building bridges and strengthening bonds across all members.',
  },
  {
    icon: Award,
    title: 'Integrity',
    description: 'Operating with transparency, accountability, and honesty.',
  },
  {
    icon: Lightbulb,
    title: 'Stewardship',
    description: 'Responsibly managing resources entrusted to our care.',
  },
  {
    icon: BookOpen,
    title: 'Education',
    description: 'Empowering minds through knowledge and lifelong learning.',
  },
  {
    icon: Target,
    title: 'Excellence',
    description: 'Pursuing the highest standards in all our endeavors.',
  },
];

const objectives = [
  'Promote holistic community development through faith-based programs.',
  'Provide educational scholarships and learning resources to underprivileged children.',
  'Foster economic empowerment through skills training and micro-enterprise support.',
  'Deliver healthcare outreach and wellness programs to vulnerable populations.',
  'Advocate for social justice, human dignity, and the common good.',
  'Strengthen parish fellowship and intergenerational spiritual growth.',
  'Protect the environment through sustainable practices and awareness.',
];

const timeline = [
  { year: '2005', title: 'Founded', text: 'CBO established by 12 visionary parish members.' },
  { year: '2010', title: 'First School Built', text: 'Opened Silanga Academy with 80 students.' },
  { year: '2014', title: 'Health Clinic', text: 'Launched community health outreach program.' },
  { year: '2018', title: '500 Members', text: 'Milestone: reached 500 active members.' },
  { year: '2022', title: 'Women Cooperative', text: 'Empowered 120 women through entrepreneurship.' },
  { year: '2025', title: '20 Years', text: 'Celebrating 20 years of faith and service.' },
];

export const AboutPage: React.FC = () => {
  return (
    <>
      <PageHeader
        title="Our Story"
        subtitle="About Catholic Silanga CBO"
        description="Discover the journey, mission, and impact that drives our faith-based community development."
      />

      {/* History */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1200&q=80"
                  alt="Catholic Silanga CBO history"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gold-400 rounded-2xl flex items-center justify-center text-cream-900 text-center font-bold shadow-xl">
                <div>
                  <div className="text-4xl">20+</div>
                  <div className="text-xs uppercase tracking-wider">Years</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full mb-4">
                <History className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Our History
                </span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-6 text-foreground">
                A Legacy of Faith, Service & Transformation
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Catholic Silanga Community Based Organization was founded in 2005 by a small
                  group of visionary parishioners who saw a need to transform their community
                  through faith-driven action. What began as informal meetings after Sunday Mass
                  has grown into one of the most impactful faith-based organizations in the region.
                </p>
                <p>
                  Our name, <em>"Silanga"</em>, meaning <strong>"unity"</strong> in the local
                  dialect, reflects our foundational belief that lasting change emerges when
                  people come together with shared purpose and unwavering faith.
                </p>
                <p>
                  Over two decades, we have evolved from a modest charity into a comprehensive
                  community development organization — touching thousands of lives through
                  education, healthcare, economic empowerment, and spiritual formation.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl bg-gradient-to-br from-primary to-accent p-10 text-white shadow-xl"
            >
              <Target className="w-10 h-10 text-gold-400 mb-4" />
              <h3 className="font-heading text-2xl font-bold mb-3">Our Mission</h3>
              <p className="text-white/90 leading-relaxed">
                To empower the Catholic Silanga community through faith-based programs that
                promote holistic human development — spiritual, educational, economic, and social —
                while upholding the dignity of every person and stewarding God's creation.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl bg-gradient-to-br from-gold-500 to-gold-700 p-10 text-white shadow-xl"
            >
              <Eye className="w-10 h-10 text-white mb-4" />
              <h3 className="font-heading text-2xl font-bold mb-3">Our Vision</h3>
              <p className="text-white/95 leading-relaxed">
                A thriving, self-reliant community where every member lives with dignity, walks
                with faith, and contributes meaningfully to society — guided by Catholic teaching
                and sustained through collaborative partnerships.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary tracking-wider uppercase mb-2">
              What We Stand For
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Our Core Values
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreValues.map((value, idx) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex w-12 h-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                  <value.icon className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Objectives */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-sm font-semibold text-primary tracking-wider uppercase mb-2">
                Our Goals
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
                Strategic Objectives
              </h2>
              <p className="text-muted-foreground mb-6">
                Our work is guided by a clear set of objectives that respond to the most pressing
                needs in our community.
              </p>
            </motion.div>

            <motion.ul
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-3"
            >
              {objectives.map((objective, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-card"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <span className="text-sm text-foreground/90 pt-1.5">{objective}</span>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary tracking-wider uppercase mb-2">
              Milestones
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Our Journey Through the Years
            </h2>
          </div>
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-primary/30 -translate-x-1/2"></div>
            {timeline.map((item, idx) => (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`relative mb-8 sm:flex items-center ${
                  idx % 2 === 0 ? 'sm:justify-start' : 'sm:justify-end'
                }`}
              >
                <div className="absolute left-4 sm:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gold-400 border-4 border-background z-10"></div>
                <div
                  className={`ml-12 sm:ml-0 sm:w-5/12 p-5 rounded-xl border bg-card shadow-sm ${
                    idx % 2 === 0 ? 'sm:mr-auto sm:pr-6' : 'sm:ml-auto sm:pl-6'
                  }`}
                >
                  <div className="text-sm font-bold text-primary mb-1">{item.year}</div>
                  <h4 className="font-heading text-lg font-semibold mb-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Impact */}
      <section className="py-20 bg-gradient-to-br from-primary to-accent text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Community Impact
            </h2>
            <p className="text-white/90 max-w-2xl mx-auto">
              The numbers tell a story of compassion in action.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {[
              { v: '3,500+', l: 'Lives Touched' },
              { v: '120', l: 'Scholarships Awarded' },
              { v: '60', l: 'Community Projects' },
              { v: '8', l: 'Partner Organizations' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
              >
                <div className="text-3xl sm:text-5xl font-bold text-gold-400 mb-2">{item.v}</div>
                <div className="text-sm uppercase tracking-wider">{item.l}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <CallToAction />
    </>
  );
};
