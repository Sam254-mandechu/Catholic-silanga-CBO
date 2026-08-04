import { motion } from 'framer-motion';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Megaphone, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Testimonials: React.FC = () => {
  const [index, setIndex] = useState(0);

  // No testimonials yet — admin will add them. (Future: load from a
  // public `testimonials` table once the schema is extended.)
  const testimonials: { name: string; role: string; quote: string; avatar: string; rating: number }[] = [];

  if (testimonials.length === 0) {
    return (
      <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary tracking-wider uppercase mb-2">
              Voices of Our Community
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Stories of Impact
            </h2>
          </div>
          <div className="max-w-2xl mx-auto rounded-2xl bg-card border p-12 text-center">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-xl mb-2">No stories shared yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Testimonials from beneficiaries, volunteers, and partners will appear here
              once the admin adds them from the dashboard.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Share your story
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary tracking-wider uppercase mb-2">
            Voices of Our Community
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Stories of Impact
          </h2>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl bg-card border p-8 sm:p-12 shadow-lg text-center"
          >
            <Quote className="w-10 h-10 text-gold-400 mx-auto mb-4" />
            <p className="text-lg sm:text-xl text-foreground/90 leading-relaxed italic mb-6">
              "{testimonials[index].quote}"
            </p>
            <div className="flex justify-center gap-1 mb-4">
              {Array.from({ length: testimonials[index].rating }).map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-gold-400 text-gold-400" />
              ))}
            </div>
            <img
              src={testimonials[index].avatar}
              alt={testimonials[index].name}
              className="w-16 h-16 rounded-full mx-auto mb-2 object-cover border-4 border-gold-400/30"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <h4 className="font-bold text-foreground">{testimonials[index].name}</h4>
            <p className="text-sm text-muted-foreground">{testimonials[index].role}</p>
          </motion.div>

          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => setIndex((i) => (i === 0 ? testimonials.length - 1 : i - 1))}
              className="p-2 rounded-full bg-card border hover:bg-primary/10 transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? 'bg-primary w-8' : 'bg-muted w-2'
                  }`}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => setIndex((i) => (i + 1) % testimonials.length)}
              className="p-2 rounded-full bg-card border hover:bg-primary/10 transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
