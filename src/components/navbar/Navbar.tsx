import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Moon, Sun, User, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { Logo } from '../common/Logo';
import { Button } from '../ui/Button';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_EMAILS } from '../../config/adminConfig';

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Members', path: '/members' },
  { name: 'Leadership', path: '/leadership' },
  { name: 'Projects', path: '/projects' },
  { name: 'Gallery', path: '/gallery' },
  { name: 'News & Events', path: '/news-events' },
  { name: 'Contributions', path: '/contributions' },
  { name: 'Contact', path: '/contact' },
];

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useDarkMode();
  const { user, profile, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setShowProfileMenu(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const dashboardPath = profile?.role === 'admin' ? '/admin-dashboard' : '/member-dashboard';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-background/95 backdrop-blur-md shadow-md'
          : 'bg-background/80 backdrop-blur-sm'
      }`}
    >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex-shrink-0 flex items-center gap-3">
            <Logo size="md" />
            {ADMIN_EMAILS.length > 0 && (
              <span
                title={`Magic-admin emails: ${ADMIN_EMAILS.join(', ')}`}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wider font-semibold rounded-full bg-gold-400/15 text-gold-700 border border-gold-400/30"
              >
                <ShieldCheck className="w-3 h-3" />
                Magic-Admin On
              </span>
            )}
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  location.pathname === link.path
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground/80 hover:text-primary hover:bg-primary/5'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-md text-foreground/80 hover:text-primary hover:bg-primary/5 transition-colors"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-md hover:bg-primary/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
                    {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium">{profile?.display_name?.split(' ')[0] || 'User'}</span>
                </button>
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 rounded-md bg-card border shadow-lg overflow-hidden"
                    >
                      <Link
                        to={dashboardPath}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-primary/5 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-destructive/10 text-destructive transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-md text-foreground/80"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-foreground hover:bg-primary/5 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="py-4 space-y-1 border-t">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`block px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                      location.pathname === link.path
                        ? 'text-primary bg-primary/10'
                        : 'text-foreground/80 hover:bg-primary/5'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
                <div className="pt-4 mt-4 border-t space-y-2 px-4">
                  {user ? (
                    <>
                      <Link to={dashboardPath}>
                        <Button variant="outline" fullWidth leftIcon={<User className="w-4 h-4" />}>
                          Dashboard
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        fullWidth
                        leftIcon={<LogOut className="w-4 h-4" />}
                        onClick={handleLogout}
                      >
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/login">
                        <Button variant="outline" fullWidth>
                          Login
                        </Button>
                      </Link>
                      <Link to="/register">
                        <Button variant="primary" fullWidth>
                          Register
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};
