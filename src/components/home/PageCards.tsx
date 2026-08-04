import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Image as ImageIcon, Newspaper, FolderKanban, Phone, History, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';

const cards = [
  {
    title: 'About Us',
    desc: 'Our story, mission, vision, values, and the community we serve.',
    path: '/about',
    icon: History,
  },
  {
    title: 'Leadership',
    desc: 'Meet the dedicated team guiding our faith-based mission.',
    path: '/leadership',
    icon: Users,
  },
  {
    title: 'Projects',
    desc: 'Explore the initiatives transforming lives across Silanga.',
    path: '/projects',
    icon: FolderKanban,
  },
  {
    title: 'Gallery',
    desc: 'Browse moments captured from our programs and events.',
    path: '/gallery',
    icon: ImageIcon,
  },
  {
    title: 'News & Events',
    desc: 'Catch up on the latest updates and upcoming gatherings.',
    path: '/news-events',
    icon: Newspaper,
  },
  {
    title: 'Contact',
    desc: 'Reach out — prayer requests, partnership, or volunteer inquiries.',
    path: '/contact',
    icon: Phone,
  },
];

export const PageCards: React.FC = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary tracking-wider uppercase mb-2">
            Explore
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3">
            Visit Our Pages
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Each section is its own dedicated page — click to dive deeper into the work, the
            people, and the impact of our community.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((c, idx) => (
            <motion.div
              key={c.path}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
            >
              <Link to={c.path} className="block h-full">
                <Card className="h-full hover:border-primary/40 hover:shadow-lg transition-all group">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <c.icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-heading text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {c.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">{c.desc}</p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Visit page
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
