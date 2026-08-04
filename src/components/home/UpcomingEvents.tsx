import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, ArrowRight, CalendarPlus } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../common/Loader';
import { getUpcomingEvents } from '../../services/supabaseData';
import type { Event } from '../../types/database';

const categoryColors: Record<string, string> = {
  Worship: 'bg-primary/10 text-primary border-primary/20',
  Community: 'bg-primary/10 text-primary border-gold-500/20',
  Education: 'bg-success/10 text-success border-success/20',
  Youth: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  Charity: 'bg-red-500/10 text-red-700 border-red-500/20',
  default: 'bg-muted text-muted-foreground border-border',
};

const fallbackImage =
  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80';

const EventCard: React.FC<{ event: Event; index: number }> = ({ event, index }) => {
  const colorClass = categoryColors[event.category] || categoryColors.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="h-full flex flex-col group hover:border-primary/40 overflow-hidden">
        <div className="relative h-44 overflow-hidden">
          <img
            src={event.image || fallbackImage}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = fallbackImage;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
          <div className="absolute top-3 left-3">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full border backdrop-blur-sm bg-white/90 ${colorClass}`}
            >
              {event.category}
            </span>
          </div>
          <div className="absolute top-3 right-3 bg-white rounded-lg shadow-md px-3 py-2 text-center">
            <div className="text-xs uppercase font-semibold text-primary">
              {new Date(event.event_date).toLocaleString('en-US', { month: 'short' })}
            </div>
            <div className="text-xl font-bold text-foreground leading-none">
              {new Date(event.event_date).getDate()}
            </div>
          </div>
        </div>
        <CardContent className="flex-1 flex flex-col space-y-2">
          <h3 className="font-heading text-lg font-bold">{event.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
          <div className="space-y-1.5 pt-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{event.event_time}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          </div>
        </CardContent>
        <div className="px-6 pb-6 flex gap-2">
          {event.registration_link ? (
            <Link to={event.registration_link} className="flex-1">
              <Button size="sm" fullWidth leftIcon={<CalendarPlus className="w-4 h-4" />}>
                Register
              </Button>
            </Link>
          ) : (
            <Link to="/news-events" className="flex-1">
              <Button size="sm" variant="outline" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                Details
              </Button>
            </Link>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export const UpcomingEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchEvents = async () => {
      try {
        const data = await getUpcomingEvents();
        if (mounted) setEvents(data.slice(0, 3));
      } catch (err) {
        console.warn('Event fetch failed', err);
        if (mounted) setEvents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchEvents();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
          <div>
            <p className="text-sm font-semibold text-primary tracking-wider uppercase mb-2">
              Join Us
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Upcoming Events
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Stay connected with our community through these upcoming gatherings.
            </p>
          </div>
          <Link to="/news-events">
            <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
              All Events
            </Button>
          </Link>
        </div>

        {loading ? (
          <Loader message="Loading events..." />
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-2">No upcoming events</h3>
            <p className="text-sm text-muted-foreground">
              Check back soon for new events and gatherings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, idx) => (
              <EventCard key={event.id} event={event} index={idx} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
