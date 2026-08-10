import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Banknote, TrendingUp, TrendingDown, Heart, Receipt,
  CheckCircle, Users, BarChart3, AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts';
import { PageHeader } from '../components/common/PageHeader';
import { Loader } from '../components/common/Loader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  getVerifiedContributions,
  getExpenses,
  getFinancialReports,
  getFineStats,
  listFinancialRecordSummaries,
} from '../services/supabaseData';
import type {
  Donation, Expense, FinancialReport, FineStats,
  FinancialRecordSummary,
} from '../types/database';

const CURRENCY = 'KES';

const PIE_COLORS = ['#a82524', '#f59e0b', '#15803d', '#6366f1', '#db2777', '#0891b2', '#7c3aed', '#0d9488'];

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: CURRENCY, maximumFractionDigits: 0,
  }).format(n);
}
function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

interface MonthBucket {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
}

function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export const FinanceOverviewPage: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [fineStats, setFineStats] = useState<FineStats | null>(null);
  const [records, setRecords] = useState<FinancialRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [d, e, r, fs, rec] = await Promise.all([
          getVerifiedContributions(500),
          getExpenses().catch(() => [] as Expense[]),
          getFinancialReports().catch(() => [] as FinancialReport[]),
          getFineStats().catch(() => null),
          listFinancialRecordSummaries(false).catch(() => [] as FinancialRecordSummary[]),
        ]);
        if (mounted) {
          setDonations(d);
          setExpenses(e);
          setReports(r.filter((x) => x.status === 'approved'));
          setFineStats(fs);
          setRecords(rec);
        }
      } catch (err) {
        console.warn('Finance overview load failed', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Totals (verified contributions + approved expenses only)
  const totalIncome = useMemo(
    () => donations.reduce((s, d) => s + Number(d.amount), 0),
    [donations]
  );
  const approvedExpenses = useMemo(
    () => expenses.filter((e) => !!e.approved_at),
    [expenses]
  );
  const totalExpenses = useMemo(
    () => approvedExpenses.reduce((s, e) => s + Number(e.amount), 0),
    [approvedExpenses]
  );
  const netPosition = totalIncome - totalExpenses;
  const uniqueDonors = useMemo(
    () => new Set(donations.map((d) => d.email)).size,
    [donations]
  );

  // 12-month trend
  const monthly = useMemo<MonthBucket[]>(() => {
    const months = lastNMonths(12);
    const map = new Map<string, MonthBucket>(months.map((m) => [m, { month: m, income: 0, expenses: 0 }]));
    donations.forEach((d) => {
      const k = d.created_at.slice(0, 7);
      const bucket = map.get(k);
      if (bucket) bucket.income += Number(d.amount);
    });
    approvedExpenses.forEach((e) => {
      const k = (e.expense_date ?? '').slice(0, 7);
      const bucket = map.get(k);
      if (bucket) bucket.expenses += Number(e.amount);
    });
    return Array.from(map.values()).map((b) => ({
      ...b,
      month: b.month.slice(5) + '/' + b.month.slice(2, 4), // MM/YY
    }));
  }, [donations, approvedExpenses]);

  // Expense categories breakdown
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    approvedExpenses.forEach((e) => {
      m.set(e.category, (m.get(e.category) ?? 0) + Number(e.amount));
    });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [approvedExpenses]);

  // Recent verified contributions (last 10)
  const recentContributions = useMemo(
    () => [...donations].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 10),
    [donations]
  );

  if (loading) {
    return (
      <>
        <PageHeader
          title="Finance Overview"
          subtitle="Transparency"
          description="How contributions are received, allocated, and stewarded for the mission of our community."
        />
        <div className="container mx-auto px-4 py-12">
          <Loader />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Finance Overview"
        subtitle="Transparency"
        description="How contributions are received, allocated, and stewarded for the mission of our community."
      />

      <section className="py-12 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="Total income (verified)"
              value={fmtMoney(totalIncome)}
              icon={Heart}
              tone="success"
            />
            <SummaryCard
              label="Total expenses (approved)"
              value={fmtMoney(totalExpenses)}
              icon={Receipt}
              tone="destructive"
            />
            <SummaryCard
              label="Net position"
              value={fmtMoney(netPosition)}
              icon={netPosition >= 0 ? TrendingUp : TrendingDown}
              tone={netPosition >= 0 ? 'success' : 'destructive'}
              subtitle={netPosition >= 0 ? 'Surplus' : 'Deficit'}
            />
            <SummaryCard
              label="Unique donors"
              value={String(uniqueDonors)}
              icon={Users}
              tone="primary"
            />
          </div>

          {/* Trend chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Income vs Expenses — last 12 months
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={monthly}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#15803d" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#15803d" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a82524" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#a82524" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.2)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: any) => fmtMoney(Number(v))}
                      contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="income" name="Income" stroke="#15803d" fill="url(#incomeGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#a82524" fill="url(#expenseGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Category breakdown + recent contributions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary" />
                    Expenses by category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {byCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No approved expenses recorded yet.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={byCategory}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }: any) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {byCategory.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-700" />
                    Recent verified contributions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentContributions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No verified contributions yet.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {recentContributions.map((d) => (
                        <li key={d.id} className="flex items-start justify-between gap-3 pb-3 border-b last:border-0 last:pb-0">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{d.donor_name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {d.purpose}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {fmtDate(d.created_at)}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-mono font-semibold">
                              {fmtMoney(Number(d.amount))}
                            </div>
                            <div className="text-xs text-success inline-flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> verified
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Fines summary */}
          {fineStats && (fineStats.paid_count > 0 || fineStats.unpaid_count > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-gold-700" />
                    Fines summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="rounded-lg bg-success/10 p-4">
                      <div className="text-2xl font-bold text-success">{fmtMoney(Number(fineStats.total_collected))}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                        Collected
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {fineStats.paid_count} {fineStats.paid_count === 1 ? 'fine' : 'fines'} paid
                      </div>
                    </div>
                    <div className="rounded-lg bg-destructive/10 p-4">
                      <div className="text-2xl font-bold text-destructive">{fmtMoney(Number(fineStats.total_outstanding))}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                        Outstanding
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {fineStats.unpaid_count} {fineStats.unpaid_count === 1 ? 'fine' : 'fines'} unpaid
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted p-4">
                      <div className="text-2xl font-bold text-muted-foreground">{fmtMoney(Number(fineStats.total_waived))}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                        Waived
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {fineStats.waived_count} {fineStats.waived_count === 1 ? 'fine' : 'fines'} waived
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Collected fines count as income. Outstanding fines are receivables, not income yet.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Published financial reports */}
          {reports.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-primary" />
                    Published financial reports ({reports.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {reports.map((r) => (
                      <li key={r.id} className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">
                              {fmtDate(r.period_start)} → {fmtDate(r.period_end)}
                            </div>
                            {r.notes && (
                              <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {r.notes}
                              </div>
                            )}
                            <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Income: </span>
                                <span className="font-mono text-success">{fmtMoney(Number(r.total_income))}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Expenses: </span>
                                <span className="font-mono text-destructive">{fmtMoney(Number(r.total_expenses))}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Net: </span>
                                <span className="font-mono">{fmtMoney(Number(r.closing_balance))}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-success inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 flex-shrink-0">
                            <CheckCircle className="w-3 h-3" /> approved
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Published financial records — Treasurer-published snapshots */}
          {records.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-primary" />
                    Published financial records ({records.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    Treasurer-published snapshots of activity over a date range. Click any record to see the full breakdown.
                  </p>
                  <ul className="divide-y">
                    {records.map((r) => (
                      <li key={r.id}>
                        <a
                          href={`/finance/${r.id}`}
                          className="flex items-center justify-between gap-3 py-3 px-2 -mx-2 rounded hover:bg-muted/30 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{r.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {fmtDate(r.period_start)} → {fmtDate(r.period_end)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 text-right">
                            <div className="hidden sm:block">
                              <div className="text-xs text-muted-foreground">Net</div>
                              <div className={`font-mono font-semibold ${r.net_position >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {fmtMoney(Number(r.net_position))}
                              </div>
                            </div>
                            <span className="text-primary text-sm">View →</span>
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Note */}
          <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto pt-4">
            All figures reflect contributions verified by the Treasurer and expenses approved by the Admin.
            Pending and rejected items are excluded. Collected fines are included in total income; outstanding
            fines are receivables shown separately. Updates publish automatically when the Treasurer verifies
            a contribution.
          </p>
        </div>
      </section>
    </>
  );
};

// ============================================================

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'success' | 'destructive' | 'primary';
  subtitle?: string;
}

const TONE_CLASSES: Record<SummaryCardProps['tone'], { bg: string; text: string }> = {
  success: { bg: 'bg-success/10', text: 'text-success' },
  destructive: { bg: 'bg-destructive/10', text: 'text-destructive' },
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
};

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, icon: Icon, tone, subtitle }) => {
  const t = TONE_CLASSES[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <Card className="h-full">
        <CardContent className="p-5">
          <div className={`inline-flex w-10 h-10 rounded-lg ${t.bg} ${t.text} items-center justify-center mb-3`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {label}
          </div>
          <div className={`text-2xl font-bold font-mono ${t.text} mt-1`}>
            {value}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default FinanceOverviewPage;