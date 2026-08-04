import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';

export const Hero: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    if (heroRef.current) {
      tl.fromTo(
        heroRef.current.querySelector('.hero-badge'),
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8 }
      )
        .fromTo(
          heroRef.current.querySelector('.hero-title'),
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8 },
          '-=0.5'
        )
        .fromTo(
          heroRef.current.querySelector('.hero-subtitle'),
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8 },
          '-=0.5'
        )
        .fromTo(
          heroRef.current.querySelector('.hero-cta'),
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8 },
          '-=0.4'
        );
    }
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-[88vh] flex items-center justify-center overflow-hidden -mt-16"
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=&apos;http://www.w3.org/2000/svg&apos; viewBox=&apos;0 0 1920 800&apos;><defs><linearGradient id=&apos;g&apos; x1=&apos;0&apos; y1=&apos;0&apos; x2=&apos;1&apos; y2=&apos;1&apos;><stop offset=&apos;0&apos; stop-color=&apos;%23a82524&apos;/><stop offset=&apos;1&apos; stop-color=&apos;%23f59e0b&apos;/></linearGradient></defs><rect width=&apos;1920&apos; height=&apos;800&apos; fill=&apos;url(%23g)&apos;/></svg>")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/80 to-accent/80" />
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-gold-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-cream-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
        <motion.div
          className="hero-badge inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 border border-white/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="w-2 h-2 bg-gold-400 rounded-full animate-pulse"></span>
          <span className="text-white text-xs sm:text-sm font-medium tracking-wide uppercase">
            Empowering Our Community Since 2005
          </span>
        </motion.div>

        <h1 className="hero-title font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          Building Hope,<br />
          <span className="text-gold-400">Strengthening Faith</span>
        </h1>

        <p className="hero-subtitle text-lg sm:text-xl text-white/90 max-w-3xl mx-auto mb-8 leading-relaxed">
          Welcome to{' '}
          <strong className="text-gold-400">Catholic Silanga CBO</strong> — a vibrant community
          united by faith, dedicated to sustainable development, education, and compassionate
          service for all.
        </p>

        <div className="hero-cta flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/about">
            <Button variant="gold" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
              Discover Our Story
            </Button>
          </Link>
          <Link to="/projects">
            <Button
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-primary"
            >
              Our Projects
            </Button>
          </Link>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bottom-8 text-white animate-bounce">
          <ChevronDown className="w-6 h-6" />
        </div>
      </div>
    </section>
  );
};
