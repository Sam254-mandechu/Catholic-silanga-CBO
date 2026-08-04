import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { getProjects } from '../../services/supabaseData';
import type { Project } from '../../types/database';
import { formatCurrency } from '../../utils/helpers';
import { Loader } from '../common/Loader';

const statusColors: Record<Project['status'], string> = {
  planning: 'bg-primary/10 text-primary border-gold-500/20',
  ongoing: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-success/10 text-success border-success/20',
};

const imageFallback =
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80';

export const FeaturedProjects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchProjects = async () => {
      try {
        const data = await getProjects();
        if (mounted) setProjects(data.slice(0, 3));
      } catch (err) {
        console.warn('Failed to fetch projects, using fallback display', err);
        if (mounted) setProjects([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchProjects();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Loader message="Loading featured projects..." />
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
          <div>
            <p className="text-sm font-semibold text-primary tracking-wider uppercase mb-2">
              Making a Difference
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Featured Projects
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Discover the initiatives transforming lives across our community.
            </p>
          </div>
          <Link to="/projects">
            <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View All Projects
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card className="h-full hover:border-primary/40">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={project.image || imageFallback}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = imageFallback;
                      }}
                    />
                    <div className="absolute top-3 left-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColors[project.status]}`}
                      >
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <CardContent className="space-y-3 pt-6">
                    <h3 className="font-heading text-xl font-bold">{project.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold text-primary">{project.progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${project.progress}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className="h-full bg-gradient-to-r from-primary to-gold-500"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground">
                      Budget: {formatCurrency(project.budget)}
                    </span>
                    <Link to={`/projects`} className="text-sm text-primary hover:underline font-medium">
                      Details →
                    </Link>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const EmptyState: React.FC = () => (
  <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
    <Loader2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 animate-spin" />
    <h3 className="font-semibold text-lg mb-2">No projects yet</h3>
    <p className="text-sm text-muted-foreground">
      Featured projects will appear here once added by administrators.
    </p>
  </div>
);
