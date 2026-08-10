import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, ArrowLeft, Banknote, Printer,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Loader } from '../components/common/Loader';
import { Button } from '../components/ui/Button';
import { getFinancialRecordSummary } from '../services/supabaseData';
import type { FinancialRecordSummary } from '../types/database';

const CURRENCY = 'KES';

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 }).format(n);
}
function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

export const FinancialRecordDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<FinancialRecordSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) { setNotFound(true); setLoading(false); return; }
      try {
        const result = await getFinancialRecordSummary(id);
        if (!mounted) return;
        if (!result || result.status !== 'published') setNotFound(true);
        else setData(result);
      } catch (err) {
        console.warn('Failed to load financial record', err);
        if (mounted) setNotFound(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <>
        <PageHeader
          title="Financial record"
          subtitle="Published snapshot"
          description="Loading…"
        />
        <div className="container mx-auto px-4 py-12">
          <Loader />
        </div>
      </>
    );
  }

  if (notFound || !data) {
    return (
      <>
        <PageHeader
          title="Record not available"
          subtitle="404"
          description="This record has not been published, or it does not exist."
        />
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="max-w-xl mx-auto">
              <CardContent className="p-10 text-center">
                <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-heading text-xl font-bold mb-2">
                  Record not published
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  The Treasurer has not yet published a record with this id.
                </p>
                <Button
                  variant="outline"
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                  onClick={() => navigate('/finance')}
                >
                  Back to Finance Overview
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </>
    );
  }

  const lines = data.lines ?? [];
  const lineEntries = lines as Array<{
    category: string; label: string; amount: number; count: number;
  }>;

  return (
    <>
      <PageHeader
        title={data.title}
        subtitle="Published financial record"
        description="Official Treasurer-published snapshot of activity for the period below."
      />

      <section className="py-12 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl space-y-6">

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('/finance')}
            >
              Back to Finance
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => window.print()}
            >
              Print
            </Button>
          </div>

          {/* Header card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-success/15 text-success">
                    Published
                  </span>
                </div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-2">
                  {data.title}
                </h1>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {fmtDate(data.period_start)} → {fmtDate(data.period_end)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    Published {fmtDate(data.published_at ?? data.created_at)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Summary cards */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryStat label="Income" value={fmtMoney(Number(data.total_income))} tone="success" icon="up" />
              <SummaryStat label="Expenses" value={fmtMoney(Number(data.total_expenses))} tone="destructive" icon="down" />
              <SummaryStat label="Outstanding fines" value={fmtMoney(Number(data.total_fines_unpaid))} tone="primary" icon="neutral" />
              <SummaryStat
                label="Net position"
                value={fmtMoney(Number(data.net_position))}
                tone={Number(data.net_position) >= 0 ? 'success' : 'destructive'}
                icon={Number(data.net_position) >= 0 ? 'up' : 'down'}
              />
            </div>
          </motion.div>

          {/* Per-category breakdown */}
          {lineEntries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Breakdown by category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr className="text-left">
                          <th className="py-2 font-semibold">Category</th>
                          <th className="py-2 font-semibold text-right">Amount</th>
                          <th className="py-2 font-semibold text-right">Entries</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineEntries.map((l, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2">{l.label}</td>
                            <td className="py-2 text-right font-mono">{fmtMoney(Number(l.amount))}</td>
                            <td className="py-2 text-right">{l.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Detail cards for fines (paid / unpaid / waived) */}
          {(data.fines_paid_count > 0 || data.fines_unpaid_count > 0 || data.fines_waived_count > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Fines detail</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div>
                      <div className="text-2xl font-bold text-success">
                        {fmtMoney(Number(data.total_fines_paid))}
                      </div>
                      <div className="text-xs text-muted-foreground">{data.fines_paid_count} paid</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {fmtMoney(Number(data.total_fines_unpaid))}
                      </div>
                      <div className="text-xs text-muted-foreground">{data.fines_unpaid_count} outstanding</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-muted-foreground">
                        {fmtMoney(Number(data.total_fines_waived))}
                      </div>
                      <div className="text-xs text-muted-foreground">{data.fines_waived_count} waived</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Notes (if any) */}
          {data.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{data.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Sign-off */}
          <Card>
            <CardContent className="p-4 text-xs text-muted-foreground text-center">
              Published on {fmtDate(data.published_at ?? data.created_at)}.
              Figures are snapshotted at time of publication — they will not
              change even if the underlying transactions are later edited.
              {' '}Verified contributions, approved expenses, and fines
              recorded during this period.
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};

interface SummaryStatProps {
  label: string;
  value: string;
  tone: 'success' | 'destructive' | 'primary';
  icon: 'up' | 'down' | 'neutral';
}

const TONE_CLASSES: Record<SummaryStatProps['tone'], { bg: string; text: string }> = {
  success: { bg: 'bg-success/10', text: 'text-success' },
  destructive: { bg: 'bg-destructive/10', text: 'text-destructive' },
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
};

const SummaryStat: React.FC<SummaryStatProps> = ({ label, value, tone, icon }) => {
  const t = TONE_CLASSES[tone];
  const Icon = icon === 'up' ? TrendingUp : icon === 'down' ? TrendingDown : Banknote;
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`inline-flex w-9 h-9 rounded-lg ${t.bg} ${t.text} items-center justify-center mb-2`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </div>
        <div className={`text-2xl font-bold font-mono ${t.text} mt-1`}>{value}</div>
      </CardContent>
    </Card>
  );
};

export default FinancialRecordDetailPage;