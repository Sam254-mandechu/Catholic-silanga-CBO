import { Link } from 'react-router-dom';
import { Facebook as FbIcon, Twitter as TwIcon, Instagram as IgIcon, Youtube as YtIcon, Mail, Phone, MapPin, Heart } from 'lucide-react';
import { Logo } from '../common/Logo';

const quickLinks = [
  { name: 'About Us', path: '/about' },
  { name: 'Members', path: '/members' },
  { name: 'Leadership', path: '/leadership' },
  { name: 'Projects', path: '/projects' },
  { name: 'Gallery', path: '/gallery' },
  { name: 'News & Events', path: '/news-events' },
  { name: 'Contributions', path: '/contributions' },
  { name: 'Contact', path: '/contact' },
  { name: 'Terms', path: '/terms' },
];

const supportLinks = [
  { name: 'Register', path: '/register' },
  { name: 'Login', path: '/login' },
  { name: 'Privacy Policy', path: '/privacy' },
  { name: 'Terms of Service', path: '/terms' },
];

export const Footer: React.FC = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 inline-block">
              <Logo size="md" />
            </div>
            <p className="text-sm opacity-90 leading-relaxed">
              Catholic Silanga CBO is dedicated to uplifting our community through faith, education,
              sustainable development, and compassionate service to all.
            </p>
            <div className="flex gap-3">
              <a href="https://facebook.com" target="_self" rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-gold-500 flex items-center justify-center transition-colors"
                aria-label="Facebook"><FbIcon className="w-4 h-4" /></a>
              <a href="https://twitter.com" target="_self" rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-gold-500 flex items-center justify-center transition-colors"
                aria-label="Twitter"><TwIcon className="w-4 h-4" /></a>
              <a href="https://instagram.com" target="_self" rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-gold-500 flex items-center justify-center transition-colors"
                aria-label="Instagram"><IgIcon className="w-4 h-4" /></a>
              <a href="https://youtube.com" target="_self" rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-gold-500 flex items-center justify-center transition-colors"
                aria-label="YouTube"><YtIcon className="w-4 h-4" /></a>
            </div>
          </div>

          <div>
            <h3 className="font-heading text-lg font-semibold mb-4 text-gold-400">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm opacity-90 hover:opacity-100 hover:text-gold-400 transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-heading text-lg font-semibold mb-4 text-gold-400">Support</h3>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm opacity-90 hover:opacity-100 hover:text-gold-400 transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-heading text-lg font-semibold mb-4 text-gold-400">Get In Touch</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm opacity-90">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gold-400" />
                <span>Catholic Silanga Parish, Kisumu West, Kenya</span>
              </li>
              <li className="flex items-center gap-3 text-sm opacity-90">
                <Phone className="w-4 h-4 flex-shrink-0 text-gold-400" />
                <a href="tel:+254700000000" className="hover:text-gold-400">+254 700 000 000</a>
              </li>
              <li className="flex items-center gap-3 text-sm opacity-90">
                <Mail className="w-4 h-4 flex-shrink-0 text-gold-400" />
                <a href="mailto:info@catholicsilanga.org" className="hover:text-gold-400">info@catholicsilanga.org</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/20 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs opacity-80">
            © {new Date().getFullYear()} Catholic Silanga Community Based Organization. All rights reserved.
          </p>
          <p className="text-xs opacity-80 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-gold-400 fill-gold-400" /> for our community
          </p>
        </div>
      </div>
    </footer>
  );
};
