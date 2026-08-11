import React, { useMemo, useState } from 'react';
import {
  Plus, CheckCircle, XCircle, Pencil, Trash2, Save, Search,
  AlertTriangle, X,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Modal } from '../common/Modal';
import { toast } from '../../utils/toast';
import {
  adminVerifyDonation,
  recordDonationForMember,
  updateDonation,
  deleteDonation,
} from '../../services/supabaseData';
import type {
  Donation, Profile, PaymentMethod, DonationType,
} from '../../types/database';
import { DONATION_TYPE_LABEL, DONATION_TYPES } from '../../types/database';

const CURRENCY = 'KES';

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(n);
}
function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

interface Props {
  donations: Donation[];
  setDonations: (d: Donation[]) => void;
  members: Profile[];
  paymentMethods: PaymentMethod[];
  /** When true, the Delete action is shown. Pass false for non-admin contexts. */
  canDelete?: boolean;
  /** Optional page title override. */
  title?: string;
  /** When true, shows a "Filter by member" dropdown + search input. */
  showMemberFilter?: boolean;
}

// ----------------------------------------------------------------
// Empty form (used for both "add" and "edit" — edit pre-fills it)
// ----------------------------------------------------------------
interface FormState {
  donor_name: string;
  email: string;
  amount: number;
  currency: string;
  purpose: string;
  donation_type: DonationType;
  message: string;
  method_id: string;
  reference_code: string;
  member_id: string;
  status: 'pending' | 'completed' | 'failed';
  contribution_date: string;
  admin_note: string;
}

const EMPTY_FORM: FormState = {
  donor_name: '',
  email: '',
  amount: 0,
  currency: CURRENCY,
  purpose: 'General donation',
  donation_type: 'other',
  message: '',
  method_id: '',
  reference_code: '',
  member_id: '',
  status: 'completed',
  contribution_date: new Date().toISOString().slice(0, 10),
  admin_note: '',
};

export const DonationsTab: React.FC<Props> = ({
  donations, setDonations, members, paymentMethods,
  canDelete = true, title = 'Donations / Contributions',
  showMemberFilter = true,
}) => {
  const [filter, setFilter] = useState<'pending' | 'completed' | 'failed' | 'all'>('pending');
  const [memberFilter, setMemberFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [editing, setEditing] = useState<Donation | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Donation | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const methodById = useMemo(() => new Map(paymentMethods.map((p) => [p.id, p])), [paymentMethods]);

  const counts = useMemo(() => ({
    pending: donations.filter((d) => d.status === 'pending').length,
    completed: donations.filter((d) => d.status === 'completed').length,
    failed: donations.filter((d) => d.status === 'failed').length,
    all: donations.length,
  }), [donations]);

  // Combined filter: status + member + free-text search (donor name/email/ref)
  const filtered = useMemo(() => {
    let list = donations;
    if (filter !== 'all') list = list.filter((d) => d.status === filter);
    if (memberFilter) list = list.filter((d) => d.member_id === memberFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        [d.donor_name, d.email, d.reference_code, d.purpose, d.admin_note]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return list;
  }, [donations, filter, memberFilter, search]);

  const openAdd = () => {
    setEditing(null);
    setAdding(true);
    setForm(EMPTY_FORM);
  };
  const openEdit = (d: Donation) => {
    setAdding(false);
    setEditing(d);
    setForm({
      donor_name:   d.donor_name,
      email:         d.email,
      amount:        Number(d.amount),
      currency:      d.currency,
      purpose:       d.purpose,
      donation_type: d.donation_type,
      message:       d.message ?? '',
      method_id:     d.method_id ?? '',
      reference_code: d.reference_code ?? '',
      member_id:     d.member_id ?? '',
      status:        d.status,
      contribution_date: d.created_at.slice(0, 10),
      admin_note:    d.admin_note ?? '',
    });
  };
  const closeForm = () => {
    setEditing(null);
    setAdding(false);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.donor_name.trim() || !form.email.trim() || form.amount <= 0) {
      toast.error('Donor name, email, and amount are required');
      return;
    }
    if (!form.member_id) {
      toast.error('Linked member is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        // EDIT path
        const updated = await updateDonation(editing.id, {
          donor_name: form.donor_name.trim(),
          email: form.email.trim(),
          amount: form.amount,
          currency: form.currency,
          purpose: form.purpose.trim() || 'General donation',
          donation_type: form.donation_type,
          message: form.message.trim() || null,
          method_id: form.method_id || null,
          reference_code: form.reference_code.trim() || null,
          member_id: form.member_id,
          status: form.status,
          admin_note: form.admin_note.trim() || null,
        });
        setDonations(donations.map((x) => (x.id === updated.id ? updated : x)));
        toast.success(`Updated contribution — ${fmtMoney(updated.amount)}`);
      } else {
        // ADD path
        const created = await recordDonationForMember({
          member_id: form.member_id,
          donor_name: form.donor_name.trim(),
          email: form.email.trim(),
          amount: form.amount,
          currency: form.currency,
          purpose: form.purpose.trim() || 'General donation',
          donation_type: form.donation_type,
          message: form.message.trim() || null,
          method_id: form.method_id || null,
          reference_code: form.reference_code.trim() || null,
          status: form.status,
          contribution_date: form.contribution_date,
          notify_member: true,
        });
        setDonations([created, ...donations]);
        toast.success(`Recorded ${fmtMoney(created.amount)} for ${form.donor_name}`);
      }
      closeForm();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (d: Donation) => {
    setActing(d.id);
    try {
      const updated = await adminVerifyDonation(d.id, { status: 'completed' });
      setDonations(donations.map((x) => (x.id === d.id ? updated : x)));
      toast.success(`Verified ${d.donor_name} — ${fmtMoney(Number(d.amount))}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to verify contribution');
    } finally {
      setActing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    setActing(rejectingId);
    try {
      const updated = await adminVerifyDonation(rejectingId, {
        status: 'failed',
        admin_note: rejectNote || 'Rejected by treasurer',
      });
      setDonations(donations.map((x) => (x.id === rejectingId ? updated : x)));
      toast.success('Contribution rejected');
      setRejectingId(null);
      setRejectNote('');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to reject');
    } finally {
      setActing(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setActing(deleting.id);
    try {
      await deleteDonation(deleting.id);
      setDonations(donations.filter((x) => x.id !== deleting.id));
      toast.success('Contribution deleted');
      setDeleting(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete');
    } finally {
      setActing(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <div className="flex gap-2 items-center flex-wrap">
            <Button size="sm" onClick={openAdd} leftIcon={<Plus className="w-4 h-4" />}>
              Add contribution
            </Button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1 flex-wrap text-xs">
          {([
            { id: 'pending' as const, label: `Pending (${counts.pending})` },
            { id: 'completed' as const, label: `Verified (${counts.completed})` },
            { id: 'failed' as const, label: `Rejected (${counts.failed})` },
            { id: 'all' as const, label: `All (${counts.all})` },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                filter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/70'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Member filter + search */}
        {showMemberFilter && (
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search donor name, email, reference, purpose…"
                className="pl-9 pr-3 py-2 w-full rounded-md border border-input bg-background text-sm"
              />
            </div>
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm min-w-[180px]"
            >
              <option value="">All members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.display_name}</option>
              ))}
            </select>
            {(search || memberFilter) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setSearch(''); setMemberFilter(''); }}
                leftIcon={<X className="w-3 h-3" />}
              >
                Clear
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No contributions match your filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="py-2 font-semibold">Donor</th>
                  <th className="py-2 font-semibold">Amount</th>
                  <th className="py-2 font-semibold">Type</th>
                  <th className="py-2 font-semibold">Purpose</th>
                  <th className="py-2 font-semibold">Method</th>
                  <th className="py-2 font-semibold">Linked member</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2 font-semibold hidden md:table-cell">Date</th>
                  <th className="py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const m = d.member_id ? memberById.get(d.member_id) : undefined;
                  const pm = d.method_id ? methodById.get(d.method_id) : undefined;
                  return (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3">
                        <div className="font-medium">{d.donor_name}</div>
                        <div className="text-xs text-muted-foreground">{d.email}</div>
                      </td>
                      <td className="py-3 font-mono">{fmtMoney(Number(d.amount))}</td>
                      <td className="py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground font-semibold capitalize">
                          {DONATION_TYPE_LABEL[d.donation_type] ?? d.donation_type}
                        </span>
                      </td>
                      <td className="py-3">
                        <div>{d.purpose}</div>
                        {d.reference_code && (
                          <div className="text-xs text-muted-foreground">Ref: {d.reference_code}</div>
                        )}
                      </td>
                      <td className="py-3 text-xs">
                        {pm ? (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-foreground font-semibold">
                            {pm.label}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 text-xs">
                        {m ? (
                          <span className="text-foreground">{m.display_name}</span>
                        ) : (
                          <span className="text-muted-foreground">Not linked</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          d.status === 'completed' ? 'bg-success/15 text-success' :
                          d.status === 'pending' ? 'bg-gold-400/20 text-gold-700' :
                          'bg-destructive/15 text-destructive'
                        }`}>
                          {d.status}
                        </span>
                        {d.admin_note && (
                          <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate" title={d.admin_note}>
                            Note: {d.admin_note}
                          </div>
                        )}
                      </td>
                      <td className="py-3 hidden md:table-cell text-xs text-muted-foreground">
                        {fmtDate(d.created_at)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex gap-1 justify-end flex-wrap">
                          {d.status === 'pending' && (
                            <>
                              <Button size="sm" variant="primary" disabled={acting === d.id}
                                onClick={() => handleVerify(d)} leftIcon={<CheckCircle className="w-3.5 h-3.5" />}>
                                Verify
                              </Button>
                              <Button size="sm" variant="outline" disabled={acting === d.id}
                                onClick={() => { setRejectingId(d.id); setRejectNote(''); }}
                                leftIcon={<XCircle className="w-3.5 h-3.5" />}>
                                Reject
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" disabled={acting === d.id}
                            onClick={() => openEdit(d)} leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                            Edit
                          </Button>
                          {canDelete && (
                            <Button size="sm" variant="outline" disabled={acting === d.id}
                              onClick={() => setDeleting(d)}
                              leftIcon={<Trash2 className="w-3.5 h-3.5 text-destructive" />}>
                              Delete
                            </Button>
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

      {/* Reject modal */}
      {rejectingId && (
        <Modal onClose={() => setRejectingId(null)} title="Reject contribution">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Provide an optional reason. The donor will see this note on their dashboard.
            </p>
            <Textarea label="Reason (optional)" value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)} rows={3}
              placeholder="e.g. Reference number doesn't match our records" />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRejectingId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject}
                disabled={acting === rejectingId} isLoading={acting === rejectingId}
                leftIcon={<XCircle className="w-4 h-4" />}>
                Reject
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit modal */}
      {(editing || adding) && (
        <Modal
          onClose={closeForm}
          title={editing ? 'Edit contribution' : 'Add contribution'}
          wide
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {editing
                ? 'Update this contribution. The member\'s portal total will reflect the new value immediately.'
                : 'Record a contribution on behalf of a member. The member\'s portal total updates immediately.'}
            </p>

            <div>
              <label className="block text-sm font-medium mb-1.5">Linked member *</label>
              <select
                value={form.member_id}
                onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— select a member —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name} ({m.email}){m.hierarchy_role ? ` · ${m.hierarchy_role}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Donor name *" value={form.donor_name}
                onChange={(e) => setForm({ ...form, donor_name: e.target.value })}
                placeholder="e.g. John Mwangi" />
              <Input label="Donor email *" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="member@example.com" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Amount *" type="number" step="0.01" value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              <Input label="Currency" value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              <Input label="Contribution date" type="date" value={form.contribution_date}
                onChange={(e) => setForm({ ...form, contribution_date: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Type *</label>
                <select
                  value={form.donation_type}
                  onChange={(e) => setForm({ ...form, donation_type: e.target.value as DonationType })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {DONATION_TYPES.map((t) => (
                    <option key={t} value={t}>{DONATION_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>
              <Input label="Purpose" value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="e.g. Monthly tithe" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Payment method</label>
                <select
                  value={form.method_id}
                  onChange={(e) => setForm({ ...form, method_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— select method —</option>
                  {paymentMethods.filter((pm) => pm.is_active).map((pm) => (
                    <option key={pm.id} value={pm.id}>{pm.label}</option>
                  ))}
                </select>
              </div>
              <Input label="Reference / M-Pesa code (optional)" value={form.reference_code}
                onChange={(e) => setForm({ ...form, reference_code: e.target.value })}
                placeholder="e.g. SHK4ABCD1234" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Status *</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'pending' | 'completed' | 'failed' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="completed">Verified (counts toward total)</option>
                <option value="pending">Pending (awaiting verification)</option>
                <option value="failed">Rejected (does not count toward total)</option>
              </select>
            </div>

            <Textarea label="Message (optional)" rows={2} value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Any internal note" />

            {editing && (
              <Textarea label="Admin note (shown to member when rejected)" rows={2} value={form.admin_note}
                onChange={(e) => setForm({ ...form, admin_note: e.target.value })} />
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={closeForm} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                {editing ? 'Save changes' : 'Save contribution'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm modal */}
      {deleting && (
        <Modal
          onClose={() => setDeleting(null)}
          title="Delete contribution?"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">This action cannot be undone.</p>
                <p className="text-muted-foreground mt-1">
                  The contribution of <strong>{fmtMoney(Number(deleting.amount))}</strong> from{' '}
                  <strong>{deleting.donor_name}</strong> on {fmtDate(deleting.created_at)} will be
                  permanently deleted. The member's total will decrease accordingly.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                isLoading={acting === deleting.id}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Yes, delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};
