import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, HandHeart, UserPlus, Mail } from 'lucide-react';
import { Button } from '../ui/Button';

export const CallToAction: React.FC = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-primary-700 to-accent p-10 sm:p-16 shadow-2xl"
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-gold-400/20 rounded-full -mr-36 -mt-36"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold-400/10 rounded-full -ml-48 -mb-48"></div>

          <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            <div className="lg:col-span-3 text-white">
              <p className="text-sm font-semibold text-gold-400 tracking-wider uppercase mb-3">
                Be Part of Something Greater
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                Walk With Us in Faith & Service
              </h2>
              <p className="text-white/90 text-lg leading-relaxed mb-6">
                Whether you donate, volunteer, or simply share our mission — your support
                empowers lives, strengthens families, and builds a legacy of faith for generations.
              </p>
            </div>
            <div className="lg:col-span-2 flex flex-col gap-3">
              <Link to="/register">
                <Button variant="gold" size="lg" fullWidth leftIcon={<UserPlus className="w-5 h-5" />}>
                  Join as Member
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  className="border-white text-white hover:bg-white hover:text-primary"
                  leftIcon={<HandHeart className="w-5 h-5" />}
                >
                  Volunteer Today
                </Button>
              </Link>
              <Link to="/contact">
                <Button
                  variant="ghost"
                  size="lg"
                  fullWidth
                  className="text-white hover:bg-white/10"
                  leftIcon={<Mail className="w-5 h-5" />}
                >
                  Contact Us
                </Button>
              </Link>
              <Link to="/projects">
                <Button
                  size="lg"
                  fullWidth
                  className="bg-transparent border border-gold-400 text-gold-400 hover:bg-gold-400 hover:text-primary"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  See Our Work
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
