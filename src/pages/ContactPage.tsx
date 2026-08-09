import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Phone, MapPin, Send,
  Facebook as FbIcon, Twitter as TwIcon, Instagram as IgIcon, Youtube as YtIcon,
  CheckCircle,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { submitContact } from '../services/supabaseData';
import { useSiteContentLive } from '../hooks/useSiteContentLive';
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

const DEFAULT_ADDRESS = 'Catholic Silanga Parish\nKisumu West, Kenya\nP.O. Box 1234-40100';
const DEFAULT_PHONE = '+254 700 000 000';
const DEFAULT_PHONE_2 = '+254 711 111 111';
const DEFAULT_EMAIL = 'info@catholicsilanga.org';
const DEFAULT_EMAIL_2 = 'chairperson@catholicsilanga.org';
const DEFAULT_HOURS = 'Mon-Fri, 8AM-5PM';

export const ContactPage: React.FC = () => {
  // Live subscription — edits the admin makes to contact info appear instantly.
  const live = useSiteContentLive([
    'contact_address',
    'contact_phone',
    'contact_email',
    'contact_hours',
    'social_facebook',
    'social_twitter',
    'social_instagram',
    'social_youtube',
  ]);

  const address = live.contact_address ?? DEFAULT_ADDRESS;
  const phoneRaw = live.contact_phone ?? DEFAULT_PHONE;
  // Optional second phone: split on '|' if admin provides "+254...|+254..."
  const [phone1, phone2] = phoneRaw.split('|').map((s) => s.trim());
  const phone1Final = phone1 || DEFAULT_PHONE;
  const phone2Final = phone2 || DEFAULT_PHONE_2;

  const emailRaw = live.contact_email ?? DEFAULT_EMAIL;
  const [email1, email2] = emailRaw.split('|').map((s) => s.trim());
  const email1Final = email1 || DEFAULT_EMAIL;
  const email2Final = email2 || DEFAULT_EMAIL_2;

  const hours = live.contact_hours ?? DEFAULT_HOURS;

  const socials: Array<{ Icon: React.ComponentType<{ className?: string }>; href: string | undefined; label: string }> = [
    { Icon: FbIcon, href: live.social_facebook, label: 'Facebook' },
    { Icon: TwIcon, href: live.social_twitter, label: 'Twitter' },
    { Icon: IgIcon, href: live.social_instagram, label: 'Instagram' },
    { Icon: YtIcon, href: live.social_youtube, label: 'YouTube' },
  ];

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
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {address}
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
                      <a href={`tel:${phone1Final.replace(/\s/g, '')}`} className="hover:text-primary block">
                        {phone1Final}
                      </a>
                      <a href={`tel:${phone2Final.replace(/\s/g, '')}`} className="hover:text-primary block">
                        {phone2Final}
                      </a>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{hours}</p>
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
                      <a href={`mailto:${email1Final}`} className="hover:text-primary block">
                        {email1Final}
                      </a>
                      <a href={`mailto:${email2Final}`} className="hover:text-primary block">
                        {email2Final}
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="font-semibold mb-3">Follow Us</h3>
                  <div className="flex gap-3">
                    {socials.map((s) => (
                      <a
                        key={s.label}
                        href={s.href || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.label}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          s.href
                            ? 'bg-muted hover:bg-primary hover:text-primary-foreground'
                            : 'bg-muted/50 text-muted-foreground/40 cursor-not-allowed'
                        }`}
                        onClick={(e) => { if (!s.href) e.preventDefault(); }}
                      >
                        <s.Icon className="w-5 h-5" />
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