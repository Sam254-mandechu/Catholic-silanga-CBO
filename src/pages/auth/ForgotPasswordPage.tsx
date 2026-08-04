import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/common/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { isValidEmail } from '../../utils/helpers';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Invalid email');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await resetPassword(email);
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email');
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
            <h1 className="font-heading text-3xl font-bold mt-4 mb-2">Forgot Password?</h1>
            <p className="text-sm text-muted-foreground">
              No worries. Enter your email and we'll send you reset instructions.
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
                  <h3 className="font-heading text-xl font-bold mb-2">Check Your Inbox</h3>
                  <p className="text-sm text-muted-foreground">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    error={error}
                    leftIcon={<Mail className="w-4 h-4" />}
                    placeholder="you@example.com"
                  />

                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    isLoading={submitting}
                    leftIcon={<KeyRound className="w-4 h-4" />}
                  >
                    Send Reset Link
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/login" className="inline-flex items-center gap-1 hover:text-primary font-medium">
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
};
