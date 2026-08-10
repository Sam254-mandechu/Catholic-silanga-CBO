import React, { useMemo, useState } from 'react';
import {
  Plus, CheckCircle, XCircle, AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Modal } from '../common/Modal';
import { toast } from '../../utils/toast';
import { supabase } from '../../config/supabaseClient';

import type { Fine, FineStatus, Profile } from '../../types/database';

const CURRENCY = 'KES';

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(n);
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

/**
 * Shared Fines tab — used by TreasurerPortal AND ModeratorPortal.
 * Backend contract: `record_fine`, `mark_fine_paid`, `waive_fine` RPCs.
 * Permissions enforced server-side by `can_issue_fines()` —
 * admin + treasurer + moderator can use this UI.
 */
export const FinesTab: React.FC<{
  fines: Fine[];
  setFines: (f: Fine[]) => void;
  members: Profile[];
}> = ({ fines, setFines, members }) => {
  const [filter, setFilter] = useState<FineStatus | 'all'>('all');
  const [issuing, setIssuing] = useState(false);
  const [form, setForm] = useState({
    member_id: '', amount: 0, currency: CURRENCY, reason: '',
    due_date: '', notes: '',
  });
  const [acting, setActing] = useState<string | null>(null);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const counts = useMemo(() => ({
    unpaid: fines.filter((f) => f.status === 'unpaid').length,
    paid: fines.filter((f) => f.status === 'paid').length,
    waived: fines.filter((f) => f.status === 'waived').length,
  }), [fines]);

  const filtered = useMemo(() => {
    const sorted = filter === 'all'
      ? [...fines]
      : fines.filter((f) => f.status === filter);
    return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [fines, filter]);

  const resetForm = () => setForm({
    member_id: '', amount: 0, currency: CURRENCY, reason: '',
    due_date: '', notes: '',
  });

  const handleIssue = async () => {
    if (!form.member_id || form.amount <= 0 || !form.reason.trim()) {
      toast.error('Member, amount, and reason are required');
      return;
    }
    if (form.reason.trim().length < 3) {
      toast.error('Reason must be at least 3 characters');
      return;
    }
    try {
      const { data, error } = await supabase.rpc('record_fine', {
        p_member_id: form.member_id,
        p_amount: form.amount,
        p_reason: form.reason.trim(),
        p_due_date: form.due_date || null,
        p_notes: form.notes.trim() || null,
      });
      if (error) throw error;
      setFines([data as Fine, ...fines]);
      toast.success('Fine issued — member notified');
      setIssuing(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to issue fine');
    }
  };

  const handleMarkPaid = async (f: Fine) => {
    setActing(f.id);
    try {
      const { data, error } = await supabase.rpc('mark_fine_paid', { p_fine_id: f.id });
      if (error) throw error;
      setFines(fines.map((x) => (x.id === f.id ? (data as Fine) : x)));
      toast.success('Marked as paid');
    } catch (err: any) { toast.error(err?.message ?? 'Failed'); }
    finally { setActing(null); }
  };

  const handleWaive = async (f: Fine) => {
    const reason = window.prompt('Reason for waiving (optional):') ?? '';
    setActing(f.id);
    try {
      const { data, error } = await supabase.rpc('waive_fine', { p_fine_id: f.id, p_reason: reason || null });
      if (error) throw error;
      setFines(fines.map((x) => (x.id === f.id ? (data as Fine) : x)));
      toast.success('Fine waived');
    } catch (err: any) { toast.error(err?.message ?? 'Failed'); }
    finally { setActing(null); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col gap-2">
          <CardTitle>Fines ({fines.length})</CardTitle>
          <div className="flex gap-1 flex-wrap text-xs">
            {([
              { id: 'unpaid' as const, label: `Unpaid (${counts.unpaid})` },
              { id: 'paid' as const, label: `Paid (${counts.paid})` },
              { id: 'waived' as const, label: `Waived (${counts.waived})` },
              { id: 'all' as const, label: `All (${fines.length})` },
            ] as const).map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                  filter === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => { resetForm(); setIssuing(true); }}>
          Issue fine
        </Button>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No fines.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="py-2 font-semibold">Member</th>
                  <th className="py-2 font-semibold">Amount</th>
                  <th className="py-2 font-semibold">Reason</th>
                  <th className="py-2 font-semibold hidden sm:table-cell">Due</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2 font-semibold hidden md:table-cell">Issued</th>
                  <th className="py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const m = memberById.get(f.member_id);
                  return (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3">
                        <div className="font-medium">{m?.display_name ?? 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{m?.email ?? f.member_id.slice(0, 8)}</div>
                      </td>
                      <td className="py-3 font-mono">{fmtMoney(Number(f.amount))}</td>
                      <td className="py-3">
                        <div>{f.reason}</div>
                        {f.notes && <div className="text-xs text-muted-foreground line-clamp-1">{f.notes}</div>}
                      </td>
                      <td className="py-3 hidden sm:table-cell text-xs text-muted-foreground">
                        {fmtDate(f.due_date)}
                      </td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          f.status === 'paid' ? 'bg-success/15 text-success' :
                          f.status === 'waived' ? 'bg-muted text-muted-foreground' :
                          'bg-destructive/15 text-destructive'
                        }`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="py-3 hidden md:table-cell text-xs text-muted-foreground">
                        {fmtDate(f.created_at)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          {f.status === 'unpaid' && (
                            <>
                              <Button size="sm" variant="primary" disabled={acting === f.id}
                                onClick={() => handleMarkPaid(f)}
                                leftIcon={<CheckCircle className="w-3.5 h-3.5" />}>
                                Mark paid
                              </Button>
                              <Button size="sm" variant="outline" disabled={acting === f.id}
                                onClick={() => handleWaive(f)}
                                leftIcon={<XCircle className="w-3.5 h-3.5" />}>
                                Waive
                              </Button>
                            </>
                          )}
                          {f.status === 'paid' && f.paid_at && (
                            <span className="text-xs text-muted-foreground self-center">
                              paid {fmtDate(f.paid_at)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {issuing && (
        <Modal onClose={() => setIssuing(false)} title="Issue fine" wide>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The member will be notified immediately. Reason is required (min 3 chars).
            </p>
            <div>
              <label className="block text-sm font-medium mb-1.5">Member *</label>
              <select value={form.member_id}
                onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">— select a member —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name} ({m.email}) {m.hierarchy_role ? `· ${m.hierarchy_role}` : ''}
                  </option>
                ))}
              </select>
              {members.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No active members loaded — make sure members have status='active'.
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Amount *" type="number" step="0.01" value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              <Input label="Currency" value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              <Input label="Due date (optional)" type="date" value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <Textarea label="Reason *" rows={2} value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Missed Sunday service without notice" />
            <Textarea label="Internal notes (optional, not shown to member)" rows={2}
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIssuing(false)}>Cancel</Button>
              <Button onClick={handleIssue} leftIcon={<AlertCircle className="w-4 h-4" />}>
                Issue fine & notify member
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};

export default FinesTab;
