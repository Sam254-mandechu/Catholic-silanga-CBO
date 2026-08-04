import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Banknote, CreditCard, Smartphone, Heart, CheckCircle,
  TrendingUp, Users,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts';
import { PageHeader } from '../components/common/PageHeader';
import { Loader } from '../components/common/Loader';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  getVerifiedContributions,
  getPaymentMethods,
} from '../services/supabaseData';
import type { Donation, PaymentMethod, PaymentMethodType } from '../types/database';

const methodIcon: Record<PaymentMethodType, React.ReactNode> = {
  bank: <Banknote className="w-5 h-5" />,
  paybill: <Banknote className="w-5 h-5" />,
  till: <Smartphone className="w-5 h-5" />,
  mpesa: <Smartphone className="w-5 h-5" />,
  mobile_money: <Smartphone className="w-5 h-5" />,
  card: <CreditCard className="w-5 h-5" />,
  cash: <Banknote className="w-5 h-5" />,
  other: <Heart className="w-5 h-5" />,
};

const pieColors = ['#a82524', '#f59e0b', '#15803d', '#6366f1', '#db2777', '#0891b2'];

const MethodCard: React.FC<{ method: PaymentMethod; idx: number }> = ({ method, idx }) => {
  const details = method.details ?? {};
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: idx * 0.05 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              {methodIcon[method.method]}
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold">{method.label}</h3>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {method.method.replace('_', ' ')}
              </p>
            </div>
          </div>
          <div className="space-y-1.5 text-sm">
            {Object.entries(details).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="font-mono font-semibold text-right break-all">{v}</span>
              </div>
            ))}
          </div>
          {method.instructions && (
            <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-3 italic">
              {method.instructions}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const ContributionsPage: React.FC = () => {
  const [contributions, setContributions] = useState<Donation[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [c, m] = await Promise.all([getVerifiedContributions(200), getPaymentMethods()]);
        if (mounted) {
          setContributions(c);
          setMethods(m.filter((mm) => mm.is_active));
        }
      } catch (err) {
        console.warn('Failed to load contributions', err);
        if (mounted) {
          setContributions([]);
          setMethods([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Stats
  const totalAmount = useMemo(
    () => contributions.reduce((s, c) => s + Number(c.amount || 0), 0),
    [contributions],
  );
  const uniqueDonors = useMemo(() => {
    const set = new Set<string>();
    contributions.forEach((c) => {
      if (c.donor_id) set.add(c.donor_id);
      else set.add(c.email);
    });
    return set.size;
  }, [contributions]);

  // Chart: by month
  const monthly = useMemo(() => {
    const m = new Map<string, number>();
    contributions.forEach((c) => {
      const month = c.created_at.slice(0, 7);
      m.set(month, (m.get(month) ?? 0) + Number(c.amount || 0));
    });
    return Array.from(m.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, total]) => ({ month, total }));
  }, [contributions]);

  // Chart: by purpose
  const byPurpose = useMemo(() => {
    const m = new Map<string, number>();
    contributions.forEach((c) => {
      m.set(c.purpose, (m.get(c.purpose) ?? 0) + Number(c.amount || 0));
    });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [contributions]);

  return (
    <>
      <PageHeader
        title="Contributions"
        subtitle="Support Our Mission"
        description="Verified contributions from members and partners, plus the payment methods you can use to send support."
      />

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          {/* Stats */}
          {!loading && contributions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES' }).format(totalAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total verified contributions</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gold-400/10 text-gold-700 flex items-center justify-center">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{contributions.length}</p>
                    <p className="text-xs text-muted-foreground">Contributions received</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{uniqueDonors}</p>
                    <p className="text-xs text-muted-foreground">Unique contributors</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Payment methods */}
          <div>
            <div className="text-center mb-8">
              <p className="text-sm font-semibold text-primary tracking-wider uppercase mb-2">
                Where to Send
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-3">
                Payment Methods
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Pick any of the methods below to send your contribution. After paying, submit a
                contribution record from your member dashboard — the administrator will verify it
                before it shows here.
              </p>
            </div>
            {loading ? (
              <Loader />
            ) : methods.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
                <Banknote className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No payment methods listed yet</h3>
                <p className="text-sm text-muted-foreground">
                  The administrator can add bank, M-PESA, paybill, till, or other methods in
                  the admin dashboard under Payment Methods.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {methods.map((m, idx) => (
                  <MethodCard key={m.id} method={m} idx={idx} />
                ))}
              </div>
            )}
          </div>

          {/* Charts */}
          {!loading && contributions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <Card className="lg:col-span-3">
                <CardContent className="p-6">
                  <h3 className="font-heading text-lg font-bold mb-4">Contributions over time</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.2)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="total" fill="#a82524" radius={[6, 6, 0, 0]} name="Amount" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardContent className="p-6">
                  <h3 className="font-heading text-lg font-bold mb-4">By purpose</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={byPurpose}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={(d: any) => `${d.name}`}
                      >
                        {byPurpose.map((_, i) => (
                          <Cell key={i} fill={pieColors[i % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 8,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent verified contributions */}
          <div>
            <div className="text-center mb-6">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-2">Recent Contributions</h2>
              <p className="text-muted-foreground text-sm">All contributions shown here have been verified by the administrator.</p>
            </div>
            {loading ? (
              <Loader />
            ) : contributions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
                <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No verified contributions yet</h3>
                <p className="text-sm text-muted-foreground">
                  Be the first! Once a contribution is submitted and verified, it will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contributions.slice(0, 12).map((c, idx) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <Card>
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold text-lg">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: c.currency || 'KES' }).format(Number(c.amount))}
                            </p>
                            <p className="text-xs text-muted-foreground">{c.purpose}</p>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        </div>
                        <p className="text-sm font-medium">{c.donor_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        {c.message && (
                          <p className="text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2 mt-2">
                            "{c.message}"
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* CTA to contribute (signed-in only) */}
          <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <CardContent className="p-8 text-center">
              <h3 className="font-heading text-2xl font-bold mb-2">Want to contribute?</h3>
              <p className="mb-4 opacity-90">
                Sign in as a member to submit a contribution record directly from your dashboard.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <a href="/login">
                  <Button variant="gold">Sign In</Button>
                </a>
                <a href="/register">
                  <Button variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                    Become a Member
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

        </div>
      </section>
    </>
  );
};
