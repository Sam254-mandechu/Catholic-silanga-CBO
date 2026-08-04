import { motion } from 'framer-motion';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  bgImage?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  description,
  bgImage = 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=2000&q=80',
}) => {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgImage}')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-primary/90"></div>
      </div>
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gold-400/15 rounded-full blur-3xl"></div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {subtitle && (
            <p className="text-sm font-semibold text-gold-400 tracking-wider uppercase mb-3">
              {subtitle}
            </p>
          )}
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-lg text-white/90 max-w-3xl mx-auto">{description}</p>
          )}
        </motion.div>
      </div>
    </section>
  );
};
