import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Eye, Send, Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/common/Modal';
import { toast } from '../../utils/toast';
import {
  previewFinancialSummary,
  createFinancialRecordSummary,
} from '../../services/supabaseData';
import type {
  FinancialRecordSummary, FinancialRecordPreview,
} from '../../types/database';

const CURRENCY = 'KES';

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(n);
}
function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

interface Props {
  records: FinancialRecordSummary[];
  setRecords: (r: FinancialRecordSummary[]) => void;
}

export const RecordsTab: React.FC<Props> = ({ records, setRecords }) => {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [periodStart, setPeriodStart] = useState(firstOfMonth);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [cats, setCats] = useState({
    donations: true,
    expenses: true,
    fines_paid: true,
    fines_unpaid: false,
    fines_waived: false,
  });
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<FinancialRecordPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const doPreview = async () => {
    setPreviewLoading(true);
    try {
      const result = await previewFinancialSummary({
        period_start: periodStart,
        period_end: periodEnd,
        include_donations: cats.donations,
        include_expenses: cats.expenses,
        include_fines_paid: cats.fines_paid,
        include_fines_unpaid: cats.fines_unpaid,
        include_fines_waived: cats.fines_waived,
      });
      setPreview(result);
    } catch (err: any) {
      toast.error(err?.message ?? 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const doPublish = async () => {
    if (!preview) return;
    if (title.trim().length < 3) {
      toast.error('Title must be at least 3 characters');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createFinancialRecordSummary({
        title: title.trim(),
        period_start: periodStart,
        period_end: periodEnd,
        include_donations: cats.donations,
        include_expenses: cats.expenses,
        include_fines_paid: cats.fines_paid,
        include_fines_unpaid: cats.fines_unpaid,
        include_fines_waived: cats.fines_waived,
        publish: true,
        notes: notes.trim() || null,
      });
      setRecords([created, ...records]);
      toast.success('Record published — visible at /finance');
      setConfirmOpen(false);
      setTitle('');
      setNotes('');
      setPreview(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to publish record');
    } finally {
      setSubmitting(false);
    }
  };

  const catList: Array<{ key: keyof typeof cats; label: string; hint: string }> = [
    { key: 'donations',     label: 'Verified donations',  hint: 'Counted as income' },
    { key: 'expenses',      label: 'Approved expenses',   hint: 'Counted as outflow' },
    { key: 'fines_paid',    label: 'Fines paid',          hint: 'Counted as income' },
    { key: 'fines_unpaid',  label: 'Fines outstanding',   hint: 'Receivables — not income' },
    { key: 'fines_waived',  label: 'Fines waived',        hint: 'Not counted in totals' },
  ];

  const sortedRecords = useMemo(
    () => [...records].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ),
    [records],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Create financial record
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pick a date range and the transaction types to include. Click
            <strong> Preview</strong> to see the totals, then <strong>Create record</strong>
            {' '}— you'll get a confirmation dialog showing exactly what will go public.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1.5">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 2026 Quarterly Report"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Period start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Period end</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium mb-2">Include these categories</p>
            <div className="space-y-1">
              {catList.map((c) => (
                <label key={c.key} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/30">
                  <input
                    type="checkbox"
                    checked={cats[c.key]}
                    onChange={(e) => setCats({ ...cats, [c.key]: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-sm">{c.label}</span>
                  <span className="text-xs text-muted-foreground">— {c.hint}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Notes (optional, shown publicly)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Any context for the public — what this period covers, etc."
            />
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="secondary"
              onClick={doPreview}
              isLoading={previewLoading}
              leftIcon={<Eye className="w-4 h-4" />}
            >
              Preview
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!preview}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Create record…
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Preview — {fmtDate(periodStart)} → {fmtDate(periodEnd)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">
                <div className="rounded-lg bg-success/10 p-3">
                  <div className="text-xl font-bold text-success">
                    {fmtMoney(preview.total_income)}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Income
                  </div>
                </div>
                <div className="rounded-lg bg-destructive/10 p-3">
                  <div className="text-xl font-bold text-destructive">
                    {fmtMoney(preview.total_expenses)}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Expenses
                  </div>
                </div>
                <div className="rounded-lg bg-primary/10 p-3">
                  <div className="text-xl font-bold text-primary">
                    {fmtMoney(preview.total_fines_unpaid)}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Outstanding fines
                  </div>
                </div>
                <div className={`rounded-lg p-3 ${preview.net_position >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                  <div className={`text-xl font-bold ${preview.net_position >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {fmtMoney(preview.net_position)}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Net position
                  </div>
                </div>
              </div>
              {preview.lines.length > 0 ? (
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
                                      {preview.lines.map((l: FinancialRecordPreview['lines'][number], i: number) => (
                                        <tr key={i} className="border-b last:border-0">
                                          <td className="py-2">{l.label}</td>
                                          <td className="py-2 text-right font-mono">{fmtMoney(Number(l.amount))}</td>
                                          <td className="py-2 text-right">{l.count}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No transactions matched the selected filters in this date range.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Records ({records.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No financial records yet — create one above.
            </p>
          ) : (
            <div className="space-y-2">
              {sortedRecords.map((r) => (
                <div key={r.id} className="rounded-lg border p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(r.period_start)} → {fmtDate(r.period_end)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      r.status === 'published'
                        ? 'bg-success/15 text-success'
                        : 'bg-gold-400/20 text-gold-700'
                    }`}>
                      {r.status}
                    </span>
                    <span className="font-mono text-sm font-semibold">
                      {fmtMoney(Number(r.net_position))}
                    </span>
                    <a
                      href={`/finance/${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {confirmOpen && preview && (
        <Modal
          onClose={() => setConfirmOpen(false)}
          title="Recheck before publishing"
          wide
        >
          <div className="space-y-3">
            <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 space-y-2">
              <p className="font-semibold text-sm">You are about to publish:</p>
              <p className="text-sm">
                <strong>{title.trim() || '(no title)'}</strong> —{' '}
                {fmtDate(periodStart)} → {fmtDate(periodEnd)}
              </p>
              <p className="text-xs text-muted-foreground">
                This will be visible publicly at{' '}
                <code>/finance/[id]</code> and listed on{' '}
                <code>/finance</code>. The numbers are snapshotted — they will not
                change even if the underlying transactions are edited later.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">
              <div className="rounded-lg bg-success/10 p-3">
                <div className="text-xl font-bold text-success">{fmtMoney(preview.total_income)}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Income</div>
              </div>
              <div className="rounded-lg bg-destructive/10 p-3">
                <div className="text-xl font-bold text-destructive">{fmtMoney(preview.total_expenses)}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Expenses</div>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <div className="text-xl font-bold text-primary">{fmtMoney(preview.total_fines_unpaid)}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Outstanding fines</div>
              </div>
              <div className={`rounded-lg p-3 ${preview.net_position >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <div className={`text-xl font-bold ${preview.net_position >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {fmtMoney(preview.net_position)}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Net</div>
              </div>
            </div>

            {preview.lines.length > 0 && (
              <ul className="text-xs space-y-1 border-t pt-2">
                {preview.lines.map((l: FinancialRecordPreview['lines'][number], i: number) => (
                  <li key={i} className="flex justify-between">
                    <span>{l.label}</span>
                    <span className="font-mono">
                      {fmtMoney(Number(l.amount))} · {l.count} {l.count === 1 ? 'entry' : 'entries'}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Revisit
              </Button>
              <Button
                onClick={doPublish}
                isLoading={submitting}
                disabled={title.trim().length < 3}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Confirm and publish
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};