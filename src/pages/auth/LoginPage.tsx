import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowLeft, Clock, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/common/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { isValidEmail } from '../../utils/helpers';
import { isAdminEmail } from '../../config/adminConfig';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const justRegistered = new URLSearchParams(location.search).get('pending') === '1';

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!isValidEmail(email)) newErrors.email = 'Invalid email';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    // If user came from a protected route, send them back after login
    const from = (location.state as any)?.from?.pathname;

    try {
      const data = await login(email, password);
      const defaultPath = data?.role === 'admin' ? '/admin-dashboard' : '/member-dashboard';
      navigate(from || defaultPath, { replace: true });
    } catch (err: any) {
      const msg = err?.message || 'Invalid credentials. Please try again.';
      setErrors({ form: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-primary/10 via-background to-gold-500/10 flex items-center">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto"
        >
          <div className="text-center mb-6">
            <Logo size="lg" showText={false} />
            <h1 className="font-heading text-3xl font-bold mt-4 mb-2">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Sign in to access your dashboard.</p>
          </div>

          <Card>
            <CardContent className="p-6 sm:p-8">
              {justRegistered && (
                <div className="mb-4 rounded-lg border border-gold-400/40 bg-gold-100/40 dark:bg-gold-900/20 p-3 text-sm flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-gold-700 flex-shrink-0" />
                  <p>
                    Your registration is submitted and is awaiting administrator verification. You can try
                    signing in once your account is approved.
                  </p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((p) => ({ ...p, email: '' }));
                  }}
                  error={errors.email}
                  leftIcon={<Mail className="w-4 h-4" />}
                  placeholder="you@example.com"
                />

                {/* Magic-admin hint — appears the moment a recognised admin email is typed */}
                {isAdminEmail(email) && (
                  <div className="rounded-lg border border-gold-400/40 bg-gold-400/10 dark:bg-gold-900/20 p-3 text-xs flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-0.5 text-gold-700 flex-shrink-0" />
                    <p>
                      <strong>Magic admin email detected.</strong> You will be granted admin
                      access automatically on sign-in.
                    </p>
                  </div>
                )}

                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((p) => ({ ...p, password: '' }));
                  }}
                  error={errors.password}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="pointer-events-auto hover:text-primary"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  placeholder="••••••••"
                />

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-input" />
                    <span className="text-muted-foreground">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>

                {errors.form && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    {errors.form}
                  </div>
                )}

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  isLoading={submitting}
                  leftIcon={<LogIn className="w-4 h-4" />}
                >
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Create one
            </Link>
          </p>

          <p className="text-center text-sm text-muted-foreground mt-4">
            <Link to="/" className="inline-flex items-center gap-1 hover:text-primary">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
};
