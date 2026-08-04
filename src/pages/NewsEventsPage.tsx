import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar as CalendarIcon, MapPin, Clock, User, X, Tag, Newspaper } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Loader } from '../components/common/Loader';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { getNews, getEvents } from '../services/supabaseData';
import type { News, Event } from '../types/database';
import { formatDate } from '../utils/helpers';

const fallbackImage =
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80';
const eventFallback =
  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80';

type Tab = 'news' | 'events';

const categoryColors: Record<string, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  Worship: 'bg-primary/10 text-primary border-primary/20',
  Community: 'bg-primary/10 text-primary border-gold-500/20',
  Education: 'bg-success/10 text-success border-success/20',
  Youth: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  Charity: 'bg-red-500/10 text-red-700 border-red-500/20',
};

const NewsCard: React.FC<{ news: News; index: number; onClick: () => void }> = ({ news, index, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay: index * 0.05 }}
  >
    <Card
      className="h-full cursor-pointer hover:shadow-xl transition-shadow overflow-hidden group"
      onClick={onClick}
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={news.image || fallbackImage}
          alt={news.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = fallbackImage;
          }}
        />
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full border backdrop-blur-sm bg-white/90 ${categoryColors[news.category] || categoryColors.default}`}>
            {news.category}
          </span>
        </div>
      </div>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-3.5 h-3.5" />
            {formatDate(news.created_at)}
          </div>
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {news.author}
          </div>
        </div>
        <h3 className="font-heading text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors">
          {news.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{news.excerpt}</p>
      </CardContent>
    </Card>
  </motion.div>
);

const EventCard: React.FC<{ event: Event; index: number }> = ({ event, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay: index * 0.05 }}
  >
    <Card className="h-full hover:shadow-xl transition-shadow overflow-hidden group">
      <div className="flex flex-col sm:flex-row">
        <div className="relative sm:w-48 h-44 sm:h-auto overflow-hidden flex-shrink-0">
          <img
            src={event.image || eventFallback}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = eventFallback;
            }}
          />
          <div className="absolute top-3 left-3 bg-white rounded-lg px-3 py-2 text-center shadow">
            <div className="text-xs uppercase font-bold text-primary leading-none">
              {new Date(event.event_date).toLocaleString('en-US', { month: 'short' })}
            </div>
            <div className="text-2xl font-bold text-foreground leading-none mt-1">
              {new Date(event.event_date).getDate()}
            </div>
          </div>
        </div>
        <CardContent className="flex-1 space-y-2">
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${categoryColors[event.category] || categoryColors.default}`}>
            {event.category}
          </span>
          <h3 className="font-heading text-lg font-bold">{event.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
          <div className="space-y-1 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              {event.event_time}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              {event.location}
            </div>
          </div>
          {event.registration_link && (
            <Button size="sm" className="mt-2">
              Register Now
            </Button>
          )}
        </CardContent>
      </div>
    </Card>
  </motion.div>
);

export const NewsEventsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('news');
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedNews, setSelectedNews] = useState<News | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      try {
        const [newsData, eventsData] = await Promise.all([getNews(), getEvents()]);
        if (mounted) {
          setNews(newsData);
          setEvents(eventsData);
        }
      } catch (err) {
        console.warn('News/Events fetch failed', err);
        if (mounted) {
          setNews([]);
          setEvents([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      mounted = false;
    };
  }, []);

  const today = new Date();
  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((e) => new Date(e.event_date) >= today)
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [events]);

  const newsCategories = useMemo(() => {
    const set = new Set<string>();
    news.forEach((n) => set.add(n.category));
    return Array.from(set);
  }, [news]);

  const filteredNews = useMemo(() => {
    return news.filter((n) => {
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!n.title.toLowerCase().includes(s) && !n.excerpt.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [news, search, categoryFilter]);

  const filteredEvents = useMemo(() => {
    return upcomingEvents.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!e.title.toLowerCase().includes(s) && !e.description.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [upcomingEvents, search, categoryFilter]);

  return (
    <>
      <PageHeader
        title="News & Events"
        subtitle="Stay Informed"
        description="Catch up on the latest news, announcements, and upcoming events in our community."
      />

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 bg-muted rounded-lg">
              <button
                onClick={() => setTab('news')}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${
                  tab === 'news' ? 'bg-card shadow text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Newspaper className="w-4 h-4 inline mr-2" />
                Latest News
              </button>
              <button
                onClick={() => setTab('events')}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${
                  tab === 'events' ? 'bg-card shadow text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CalendarIcon className="w-4 h-4 inline mr-2" />
                Upcoming Events
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 p-4 rounded-xl border bg-card">
            <div className="md:col-span-2">
              <Input
                placeholder={`Search ${tab === 'news' ? 'articles' : 'events'}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Categories</option>
              {(tab === 'news' ? newsCategories : Array.from(new Set(upcomingEvents.map((e) => e.category)))).map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                )
              )}
            </select>
          </div>

          {loading ? (
            <Loader />
          ) : tab === 'news' ? (
            filteredNews.length === 0 ? (
              <EmptyState message="No articles found" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNews.map((n, idx) => (
                  <NewsCard key={n.id} news={n} index={idx} onClick={() => setSelectedNews(n)} />
                ))}
              </div>
            )
          ) : filteredEvents.length === 0 ? (
            <EmptyState message="No upcoming events" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredEvents.map((e, idx) => (
                <EventCard key={e.id} event={e} index={idx} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* News Modal */}
      <AnimatePresence>
        {selectedNews && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedNews(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl max-w-3xl w-full my-8 overflow-hidden"
            >
              <div className="relative h-64 sm:h-80">
                <img
                  src={selectedNews.image || fallbackImage}
                  alt={selectedNews.title}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedNews(null)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 sm:p-8 space-y-3">
                <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${categoryColors[selectedNews.category] || categoryColors.default}`}>
                  {selectedNews.category}
                </span>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold">{selectedNews.title}</h2>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {selectedNews.author}
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {formatDate(selectedNews.created_at)}
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {selectedNews.content}
                </p>
                {selectedNews.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    {selectedNews.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
    <Newspaper className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
    <h3 className="font-semibold text-lg mb-2">{message}</h3>
    <p className="text-sm text-muted-foreground">Check back soon for updates.</p>
  </div>
);
