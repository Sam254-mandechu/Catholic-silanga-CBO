import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Calendar, Users } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Loader } from '../components/common/Loader';
import { Card, CardContent, CardFooter } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { getProjects } from '../services/supabaseData';
import type { Project } from '../types/database';
import { formatCurrency } from '../utils/helpers';

const fallbackImage =
  'data:image/svg+xml;utf8,<svg xmlns=&apos;http://www.w3.org/2000/svg&apos; viewBox=&apos;0 0 24 24&apos; fill=&apos;none&apos; stroke=&apos;currentColor&apos; stroke-width=&apos;1.5&apos;><rect x=&apos;3&apos; y=&apos;3&apos; width=&apos;18&apos; height=&apos;18&apos; rx=&apos;2&apos;/><circle cx=&apos;9&apos; cy=&apos;9&apos; r=&apos;2&apos;/><path d=&apos;M21 15l-5-5L5 21&apos;/></svg>';

const statusColors: Record<Project['status'], string> = {
  planning: 'bg-primary/10 text-primary border-gold-500/20',
  ongoing: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-success/10 text-success border-success/20',
};

const ProjectCard: React.FC<{ project: Project; index: number }> = ({ project, index }) => {
  const colorClass = statusColors[project.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <Card className="h-full flex flex-col hover:shadow-xl transition-shadow overflow-hidden group">
        <div className="relative h-52 overflow-hidden">
          <img
            src={project.image || fallbackImage}
            alt={project.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = fallbackImage;
            }}
          />
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full border backdrop-blur-sm bg-white/90 ${colorClass}`}
            >
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary text-primary-foreground backdrop-blur-sm self-start">
              {project.category}
            </span>
          </div>
        </div>
        <CardContent className="flex-1 space-y-3">
          <h3 className="font-heading text-xl font-bold">{project.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>

          <div className="space-y-2 pt-2 text-xs text-muted-foreground">
            {project.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                {project.location}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Started {new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
            {project.beneficiaries !== undefined && (
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                {project.beneficiaries} Beneficiaries
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-bold text-primary">{project.progress}%</span>
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
        <CardFooter className="flex justify-between items-center pt-4 border-t">
          <div>
            <div className="text-xs text-muted-foreground">Budget</div>
            <div className="font-bold text-foreground">{formatCurrency(project.budget)}</div>
          </div>
          <Button size="sm">Learn More</Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    let mounted = true;
    const fetchProjects = async () => {
      try {
        const data = await getProjects();
        if (mounted) setProjects(data);
      } catch (err) {
        console.warn('Projects fetch failed', err);
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [projects]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (
        search &&
        !p.title.toLowerCase().includes(search.toLowerCase()) &&
        !p.description.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [projects, search, statusFilter, categoryFilter]);

  return (
    <>
      <PageHeader
        title="Our Projects"
        subtitle="Making an Impact"
        description="Explore the transformative initiatives driving positive change across our community."
      />

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8 p-4 rounded-xl border bg-card">
            <div className="md:col-span-2">
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'planning', label: 'Planning' },
                { value: 'ongoing', label: 'Ongoing' },
                { value: 'completed', label: 'Completed' },
              ]}
            />
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Categories' },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>

          {loading ? (
            <Loader />
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
              <h3 className="font-semibold text-lg mb-2">No projects found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or check back later.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                Showing {filtered.length} of {projects.length} projects
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((project, idx) => (
                  <ProjectCard key={project.id} project={project} index={idx} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
};
