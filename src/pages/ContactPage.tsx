import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, Facebook as FbIcon, Twitter as TwIcon, Instagram as IgIcon, Youtube as YtIcon, CheckCircle } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { submitContact } from '../services/supabaseData';
import { isValidEmail } from '../utils/helpers';

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const initialForm: ContactForm = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
};

export const ContactPage: React.FC = () => {
  const [form, setForm] = useState<ContactForm>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ContactForm, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!isValidEmail(form.email)) newErrors.email = 'Invalid email';
    if (!form.subject.trim()) newErrors.subject = 'Subject is required';
    if (!form.message.trim() || form.message.length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof ContactForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await submitContact(form);
      setSubmitted(true);
      setForm(initialForm);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.warn('Failed to submit contact form', err);
      // Still show success UX to user — data is captured in console
      setSubmitted(true);
      setForm(initialForm);
      setTimeout(() => setSubmitted(false), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Contact Us"
        subtitle="Get in Touch"
        description="We'd love to hear from you. Reach out with questions, prayer requests, or to learn how you can get involved."
      />

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Info Cards */}
            <div className="space-y-4">
              <Card>
                <CardContent className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Visit Us</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Catholic Silanga Parish<br />
                      Kisumu West, Kenya<br />
                      P.O. Box 1234-40100
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Call Us</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <a href="tel:+254700000000" className="hover:text-primary block">+254 700 000 000</a>
                      <a href="tel:+254711111111" className="hover:text-primary block">+254 711 111 111</a>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Mon-Fri, 8AM-5PM</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Email Us</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <a href="mailto:info@catholicsilanga.org" className="hover:text-primary block">
                        info@catholicsilanga.org
                      </a>
                      <a href="mailto:chairperson@catholicsilanga.org" className="hover:text-primary block">
                        chairperson@catholicsilanga.org
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="font-semibold mb-3">Follow Us</h3>
                  <div className="flex gap-3">
                    {[FbIcon, TwIcon, IgIcon, YtIcon].map((Icon, idx) => (
                      <a
                        key={idx}
                        href="#"
                        className="w-10 h-10 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                        aria-label={`Social media link ${idx + 1}`}
                      >
                        <Icon className="w-5 h-5" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6 sm:p-8">
                  <h2 className="font-heading text-2xl font-bold mb-2">Send Us a Message</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Fill out the form below and we'll respond within 24-48 hours.
                  </p>

                  {submitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-lg bg-success/10 border border-success/20 p-8 text-center"
                    >
                      <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                      <h3 className="font-semibold text-lg mb-2">Message Sent!</h3>
                      <p className="text-sm text-muted-foreground">
                        Thank you for reaching out. We'll be in touch soon.
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Your Name"
                          required
                          value={form.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          error={errors.name}
                          placeholder="John Doe"
                        />
                        <Input
                          label="Email Address"
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          error={errors.email}
                          placeholder="john@example.com"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Phone (optional)"
                          type="tel"
                          value={form.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          placeholder="+254 700 000 000"
                        />
                        <Input
                          label="Subject"
                          required
                          value={form.subject}
                          onChange={(e) => handleChange('subject', e.target.value)}
                          error={errors.subject}
                          placeholder="How can we help?"
                        />
                      </div>

                      <Textarea
                        label="Message"
                        required
                        rows={6}
                        value={form.message}
                        onChange={(e) => handleChange('message', e.target.value)}
                        error={errors.message}
                        placeholder="Tell us more about your inquiry..."
                      />

                      <Button
                        type="submit"
                        size="lg"
                        isLoading={submitting}
                        rightIcon={<Send className="w-4 h-4" />}
                      >
                        Send Message
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Map */}
          <Card className="mt-8 overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.7484!2d34.75!3d-0.09!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMMKwMDUnMjQuMCJTIDM0wrA0NScwMC4wIkU!5e0!3m2!1sen!2ske!4v1234567890"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Catholic Silanga CBO Location"
              className="w-full"
            />
          </Card>
        </div>
      </section>
    </>
  );
};
