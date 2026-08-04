import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Mail, Lock, Eye, EyeOff, UserPlus, CheckCircle, IdCard,
  Hash, Award, Phone, Info, ShieldCheck,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/common/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { isValidEmail } from '../../utils/helpers';
import { HIERARCHY_ORDER, type HierarchyRole } from '../../types/database';
import { isAdminEmail } from '../../config/adminConfig';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    national_id: '',
    member_code: '',
    position_requested: 'Member' as HierarchyRole,
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.display_name.trim()) newErrors.display_name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!isValidEmail(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.national_id.trim()) newErrors.national_id = 'National ID is required';
    if (!formData.member_code.trim()) newErrors.member_code = 'CBO member code is required';
    if (!formData.position_requested) newErrors.position_requested = 'Position is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await register(formData.email, formData.password, formData.display_name, {
        national_id: formData.national_id,
        member_code: formData.member_code,
        position_requested: formData.position_requested,
        phone: formData.phone,
      });
      setDone(true);
      // Pending = they can't sign in yet — they go to a "thanks, awaiting approval" page.
      setTimeout(() => navigate('/login?pending=1', { replace: true }), 2000);
    } catch (err: any) {
      setErrors({ form: err?.message || 'Registration failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-primary/10 via-background to-gold-100/20 flex items-center">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-6">
            <Logo size="lg" showText={false} />
            <h1 className="font-heading text-3xl font-bold mt-4 mb-2">Join Our Community</h1>
            <p className="text-sm text-muted-foreground">
              All fields below are required. The administrator will verify your details before activation.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 sm:p-8">
              {done ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                  <h3 className="font-heading text-xl font-bold mb-2">Registration Submitted</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    Thank you! Your account has been created and is awaiting administrator verification.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You'll be able to sign in once the administrator approves your profile.
                  </p>
                  <div className="inline-block w-6 h-6 mt-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Row 1: name + email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      type="text"
                      required
                      value={formData.display_name}
                      onChange={(e) => handleChange('display_name', e.target.value)}
                      error={errors.display_name}
                      leftIcon={<User className="w-4 h-4" />}
                      placeholder="Jane Doe"
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      error={errors.email}
                      leftIcon={<Mail className="w-4 h-4" />}
                      placeholder="you@example.com"
                    />
                  </div>

                  {/* Magic-admin hint: appears the moment a known admin email is typed */}
                  {isAdminEmail(formData.email) && (
                    <div className="rounded-lg border border-gold-400/40 bg-gold-400/10 dark:bg-gold-900/20 p-3 text-xs flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 mt-0.5 text-gold-700 flex-shrink-0" />
                      <p>
                        <strong>Magic admin email detected.</strong> Your registration will
                        bypass the manual verification queue and you will be granted admin
                        access automatically.
                      </p>
                    </div>
                  )}

                  {/* Row 2: national id + member code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="National ID Number"
                      required
                      value={formData.national_id}
                      onChange={(e) => handleChange('national_id', e.target.value)}
                      error={errors.national_id}
                      leftIcon={<IdCard className="w-4 h-4" />}
                      placeholder="12345678"
                    />
                    <Input
                      label="CBO Member Code"
                      required
                      value={formData.member_code}
                      onChange={(e) => handleChange('member_code', e.target.value)}
                      error={errors.member_code}
                      leftIcon={<Hash className="w-4 h-4" />}
                      placeholder="CBO-2025-001"
                    />
                  </div>

                  {/* Row 3: position + phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Position Requested <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                          <Award className="w-4 h-4" />
                        </div>
                        <select
                          value={formData.position_requested}
                          onChange={(e) => handleChange('position_requested', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {HIERARCHY_ORDER.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        The administrator may confirm or adjust this position.
                      </p>
                    </div>
                    <Input
                      label="Phone (optional)"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      leftIcon={<Phone className="w-4 h-4" />}
                      placeholder="+254 700 000 000"
                    />
                  </div>

                  {/* Row 4: password + confirm */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
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
                      hint="At least 6 characters"
                    />
                    <Input
                      label="Confirm Password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      error={errors.confirmPassword}
                      leftIcon={<Lock className="w-4 h-4" />}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="rounded-lg bg-gold-100/40 dark:bg-gold-900/20 border border-gold-300 dark:border-gold-700 p-3 text-xs flex gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-gold-700" />
                    <p>
                      After registering, an administrator will review your National ID &amp; Member
                      Code and approve your account. You will be notified once your account is active.
                    </p>
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
                    leftIcon={<UserPlus className="w-4 h-4" />}
                  >
                    Submit Registration
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {!done && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
};
