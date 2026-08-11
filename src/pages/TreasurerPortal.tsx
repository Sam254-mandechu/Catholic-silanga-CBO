import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Banknote, ClipboardList, Heart, BarChart3, LogOut,
  Plus, Trash2, Save, CheckCircle, Eye, Receipt,
  AlertCircle, Users, CreditCard,
  Sparkles, Pencil, Search, Send,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/toast';

import {
  listAllDonations,
  getExpenses, createExpense, approveExpense, deleteExpense,
  getFinancialReports,
  submitFinancialReport, approveFinancialReport,
  getPaymentMethods, upsertPaymentMethod, deletePaymentMethod,
  getFines,
  listFinancialRecordSummaries,
} from '../services/supabaseData';
import { listApprovedMembersByHierarchy } from '../services/supabaseAuth';
import { supabase } from '../config/supabaseClient';
import { RecordsTab } from '../components/treasurer/RecordsTab';
import { FinesTab } from '../components/fines/FinesTab';
import { DonationsTab } from '../components/donations/DonationsTab';
import type {
  Donation, Expense, ExpenseCategory, FinancialReport,
  PaymentMethod, PaymentMethodType, Fine,
  Profile, FinancialRecordSummary,
} from '../types/database';

type Tab =
  | 'overview' | 'donations' | 'expenses' | 'reports' | 'analytics'
  | 'fines' | 'payment-methods' | 'members' | 'records';

const PIE_COLORS = ['#a82524', '#f59e0b', '#15803d', '#6366f1', '#db2777', '#0891b2', '#7c3aed', '#0d9488'];
const CURRENCY = 'KES';

const PAYMENT_METHOD_TYPES: { value: PaymentMethodType; label: string }[] = [
  { value: 'bank', label: 'Bank transfer' },
  { value: 'paybill', label: 'Paybill' },
  { value: 'till', label: 'Till number' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(n);
}
function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

// ============================================================
// MAIN PAGE
// ============================================================
export const TreasurerPortal: React.FC = () => {
  const navigate = useNavigate();
  const { profile, logout, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  // Data
  const [donations, setDonations] = useState<Donation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [records, setRecords] = useState<FinancialRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [d, e, r, pm, fn, mb, rec] = await Promise.all([
          listAllDonations(500),
          getExpenses(),
          getFinancialReports(),
          getPaymentMethods(),
          getFines().catch(() => [] as Fine[]),
          listApprovedMembersByHierarchy().catch(() => [] as Profile[]),
          listFinancialRecordSummaries(true).catch(() => [] as FinancialRecordSummary[]),
        ]);
        if (!mounted) return;
        setDonations(d);
        setExpenses(e);
        setReports(r);
        setPaymentMethods(pm);
        setFines(fn);
        setMembers(mb);
        setRecords(rec);
      } catch (err) {
        console.warn('Treasurer data load failed', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Derived
  const completedDonations = useMemo(() => donations.filter((d) => d.status === 'completed'), [donations]);
  const totalIncome = useMemo(() => completedDonations.reduce((s, d) => s + Number(d.amount), 0), [completedDonations]);
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const approvedExpenses = useMemo(() => expenses.filter((e) => !!e.approved_at), [expenses]);
  const paidFines = useMemo(() => fines.filter((f) => f.status === 'paid'), [fines]);
  const unpaidFines = useMemo(() => fines.filter((f) => f.status === 'unpaid'), [fines]);
  const finesCollected = useMemo(() => paidFines.reduce((s, f) => s + Number(f.amount), 0), [paidFines]);
  const finesOutstanding = useMemo(() => unpaidFines.reduce((s, f) => s + Number(f.amount), 0), [unpaidFines]);

  // Monthly trends (last 12 months) — income + expenses + paid fines
  const monthly = useMemo(() => {
    const map = new Map<string, { income: number; expenses: number }>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, { income: 0, expenses: 0 });
    }
    completedDonations.forEach((d) => {
      const k = d.created_at.slice(0, 7);
      const m = map.get(k);
      if (m) m.income += Number(d.amount);
    });
    paidFines.forEach((f) => {
      if (!f.paid_at) return;
      const k = f.paid_at.slice(0, 7);
      const m = map.get(k);
      if (m) m.income += Number(f.amount);
    });
    expenses.forEach((e) => {
      const k = e.expense_date.slice(0, 7);
      const m = map.get(k);
      if (m) m.expenses += Number(e.amount);
    });
    return Array.from(map.entries()).map(([month, v]) => ({
      month: month.slice(5) + '/' + month.slice(2, 4),
      ...v,
    }));
  }, [completedDonations, paidFines, expenses]);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'donations', label: 'Donations', icon: Heart },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'fines', label: 'Fines', icon: AlertCircle },
    { id: 'records', label: 'Create Record', icon: Sparkles },
    { id: 'payment-methods', label: 'Payment Methods', icon: CreditCard },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'reports', label: 'Reports', icon: ClipboardList },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <section className="min-h-screen pt-24 pb-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold-400/10 rounded-full mb-2">
              <Banknote className="w-4 h-4 text-gold-700" />
              <span className="text-xs font-semibold text-gold-700 uppercase tracking-wider">
                Treasurer Portal
              </span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold">
              {profile?.display_name ?? 'Treasurer'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Track income, expenses, fines, payment methods, and generate financial reports.
            </p>
          </div>
          <Button variant="destructive" onClick={handleLogout} leftIcon={<LogOut className="w-4 h-4" />}>
            Logout
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <Card className="lg:sticky lg:top-24">
              <CardContent className="p-3">
                <nav className="space-y-1">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                        tab === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/5'
                      }`}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          <main className="lg:col-span-3 space-y-6">
            {loading && tab === 'overview' && (
              <div className="text-center py-12 text-muted-foreground">Loading…</div>
            )}

            {tab === 'overview' && !loading && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Total income" value={fmtMoney(totalIncome + finesCollected)} icon={Heart} color="text-success" />
                  <StatCard label="Total expenses" value={fmtMoney(totalExpenses)} icon={Receipt} color="text-destructive" />
                  <StatCard label="Net position" value={fmtMoney(totalIncome + finesCollected - totalExpenses)}
                    icon={BarChart3}
                    color={totalIncome + finesCollected - totalExpenses >= 0 ? 'text-success' : 'text-destructive'} />
                  <StatCard label="Fines collected / outstanding" value={`${fmtMoney(finesCollected)} / ${fmtMoney(finesOutstanding)}`}
                    icon={AlertCircle} color="text-gold-700" />
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Income (incl. fines) vs Expenses — last 12 months</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.2)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => fmtMoney(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="income" name="Income (donations + paid fines)" fill="#15803d" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="expenses" name="Expenses" fill="#a82524" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}

            {tab === 'donations' && (
              <DonationsTab
                donations={donations}
                setDonations={setDonations}
                members={members}
                paymentMethods={paymentMethods}
                canDelete={isAdmin()}
                title="Donations / Contributions"
              />
            )}
            {tab === 'expenses' && (
              <ExpensesTab
                expenses={expenses}
                setExpenses={setExpenses}
                isAdmin={isAdmin()}
              />
            )}
            {tab === 'fines' && (
              <FinesTab fines={fines} setFines={setFines} members={members} />
            )}
            {tab === 'records' && (
              <RecordsTab records={records} setRecords={setRecords} />
            )}
            {tab === 'payment-methods' && (
              <PaymentMethodsTab
                methods={paymentMethods}
                setMethods={setPaymentMethods}
              />
            )}
            {tab === 'members' && (
              <MembersTab members={members} />
            )}
            {tab === 'reports' && (
              <ReportsTab
                reports={reports}
                setReports={setReports}
                isAdmin={isAdmin()}
              />
            )}
            {tab === 'analytics' && (
              <AnalyticsTab
                monthly={monthly}
                totalIncome={totalIncome + finesCollected}
                totalExpenses={totalExpenses}
                approvedExpenses={approvedExpenses}
                expenses={expenses}
              />
            )}
          </main>
        </div>
      </div>
    </section>
  );
};

// ============================================================
// STAT CARD
// ============================================================
const StatCard: React.FC<{
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = ({ label, value, icon: Icon, color }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
            <div className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value}</div>
          </div>
          <Icon className={`w-6 h-6 flex-shrink-0 ${color}`} />
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// ============================================================
// DONATIONS TAB — extracted to src/components/donations/DonationsTab.tsx
// (used by both TreasurerPortal and AdminDashboard for full CRUD)
// ============================================================

// ============================================================
// EXPENSES TAB

const ExpensesTab: React.FC<{
  expenses: Expense[];
  setExpenses: (e: Expense[]) => void;
  isAdmin: boolean;
}> = ({ expenses, setExpenses, isAdmin }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', amount: 0, category: 'operations' as ExpenseCategory,
    description: '', vendor: '', receipt_url: '', currency: CURRENCY,
    expense_date: new Date().toISOString().slice(0, 10),
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) { toast.error('Amount must be positive'); return; }
    try {
      const created = await createExpense({
        title: form.title, amount: form.amount, category: form.category,
        description: form.description || null, vendor: form.vendor || null,
        receipt_url: form.receipt_url || null, currency: form.currency, expense_date: form.expense_date,
      });
      setExpenses([created, ...expenses]);
      toast.success('Expense recorded (pending admin approval)');
      setShowForm(false);
      setForm({
        title: '', amount: 0, category: 'operations',
        description: '', vendor: '', receipt_url: '', currency: CURRENCY,
        expense_date: new Date().toISOString().slice(0, 10),
      });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to record expense');
    }
  };

  const handleApprove = async (e: Expense) => {
    try {
      const updated = await approveExpense(e.id);
      setExpenses(expenses.map((x) => (x.id === updated.id ? updated : x)));
      toast.success('Expense approved');
    } catch (err: any) { toast.error(err?.message ?? 'Failed'); }
  };

  const handleDelete = async (e: Expense) => {
    if (!confirm(`Delete expense "${e.title}"?`)) return;
    try {
      await deleteExpense(e.id);
      setExpenses(expenses.filter((x) => x.id !== e.id));
      toast.success('Deleted');
    } catch (err: any) { toast.error(err?.message ?? 'Failed'); }
  };

  const total = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-2">
        <CardTitle>Expenses ({expenses.length}) — Total {fmtMoney(total)}</CardTitle>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Expense'}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleSave} className="space-y-3 border-b pb-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Title *" required value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              <Input label="Vendor" value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Amount *" required type="number" step="0.01" value={form.amount || ''}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
              <div>
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <select value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="operations">Operations</option>
                  <option value="events">Events</option>
                  <option value="charity">Charity</option>
                  <option value="utilities">Utilities</option>
                  <option value="salaries">Salaries</option>
                  <option value="supplies">Supplies</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Input label="Date *" required type="date" value={form.expense_date}
                onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} />
            </div>
            <Textarea label="Description" rows={2} value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <Input label="Receipt URL (optional)" value={form.receipt_url}
              onChange={(e) => setForm((f) => ({ ...f, receipt_url: e.target.value }))} />
            <Button type="submit" leftIcon={<Save className="w-4 h-4" />}>Record</Button>
          </form>
        )}

        {expenses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No expenses recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="py-2 font-semibold">Title</th>
                  <th className="py-2 font-semibold">Amount</th>
                  <th className="py-2 font-semibold hidden sm:table-cell">Category</th>
                  <th className="py-2 font-semibold hidden sm:table-cell">Date</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3">
                      <div className="font-medium">{e.title}</div>
                      {e.vendor && <div className="text-xs text-muted-foreground">{e.vendor}</div>}
                    </td>
                    <td className="py-3 font-mono">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: e.currency }).format(Number(e.amount))}
                    </td>
                    <td className="py-3 hidden sm:table-cell capitalize">{e.category}</td>
                    <td className="py-3 hidden sm:table-cell text-xs text-muted-foreground">{fmtDate(e.expense_date)}</td>
                    <td className="py-3">
                      {e.approved_at ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success font-semibold">Approved</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gold-400/20 text-gold-700 font-semibold">Pending</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {isAdmin && !e.approved_at && (
                          <button onClick={() => handleApprove(e)}
                            className="p-1.5 rounded hover:bg-success/10 text-success"
                            aria-label="Approve" title="Approve">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(e)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                          aria-label="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================
// PAYMENT METHODS TAB
// ============================================================
const PaymentMethodsTab: React.FC<{
  methods: PaymentMethod[];
  setMethods: (m: PaymentMethod[]) => void;
}> = ({ methods, setMethods }) => {
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    method: 'mpesa' as PaymentMethodType,
    label: '',
    details: {} as Record<string, string>,
    instructions: '',
    is_active: true,
    display_order: 0,
  });
  const [detailsRaw, setDetailsRaw] = useState('');

  const resetForm = () => {
    setForm({ method: 'mpesa', label: '', details: {}, instructions: '', is_active: true, display_order: 0 });
    setDetailsRaw('');
  };

  const openCreate = () => { resetForm(); setCreating(true); };

  const openEdit = (m: PaymentMethod) => {
    setForm({
      method: m.method,
      label: m.label,
      details: m.details ?? {},
      instructions: m.instructions ?? '',
      is_active: m.is_active,
      display_order: m.display_order,
    });
    setDetailsRaw(JSON.stringify(m.details ?? {}, null, 2));
    setEditing(m);
  };

  const handleSave = async () => {
    if (!form.label.trim()) { toast.error('Label is required'); return; }
    let detailsObj: Record<string, string> = {};
    if (detailsRaw.trim()) {
      try {
        const parsed = JSON.parse(detailsRaw);
        if (typeof parsed !== 'object' || Array.isArray(parsed)) {
          toast.error('Details must be a JSON object'); return;
        }
        detailsObj = parsed as Record<string, string>;
      } catch {
        toast.error('Details must be valid JSON'); return;
      }
    }
    try {
      const payload = {
        ...(editing?.id ? { id: editing.id } : {}),
        method: form.method,
        label: form.label.trim(),
        details: detailsObj,
        instructions: form.instructions.trim() || null,
        is_active: form.is_active,
        display_order: form.display_order,
      };
      const saved = await upsertPaymentMethod(payload);
      if (editing) {
        setMethods(methods.map((m) => (m.id === saved.id ? saved : m)));
        toast.success('Updated');
        setEditing(null);
      } else {
        setMethods([saved, ...methods]);
        toast.success('Created');
        setCreating(false);
      }
      resetForm();
    } catch (err: any) {
      toast.error(err?.message ?? 'Save failed');
    }
  };

  const handleDelete = async (m: PaymentMethod) => {
    if (!confirm(`Delete payment method "${m.label}"?`)) return;
    try {
      await deletePaymentMethod(m.id);
      setMethods(methods.filter((x) => x.id !== m.id));
      toast.success('Deleted');
    } catch (err: any) { toast.error(err?.message ?? 'Failed'); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle>Payment Methods ({methods.length})</CardTitle>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          New method
        </Button>
      </CardHeader>
      <CardContent>
        {methods.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No payment methods yet. Click "New method" to add one (e.g. M-Pesa paybill).
          </p>
        ) : (
          <div className="space-y-2">
            {methods.sort((a, b) => a.display_order - b.display_order).map((m) => (
              <div key={m.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{m.label}</p>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {m.method}
                    </span>
                    {!m.is_active && (
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        inactive
                      </span>
                    )}
                  </div>
                  {m.instructions && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.instructions}</p>
                  )}
                  {Object.keys(m.details ?? {}).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono line-clamp-1">
                      {Object.entries(m.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => openEdit(m)} leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(m)} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {(creating || editing) && (
        <Modal onClose={() => { setCreating(false); setEditing(null); }}
          title={editing ? `Edit: ${editing.label}` : 'New payment method'} wide>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Type</label>
                <select value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethodType })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {PAYMENT_METHOD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <Input label="Label *" value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. M-Pesa Paybill 247247" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Details (JSON object)</label>
              <textarea value={detailsRaw} onChange={(e) => setDetailsRaw(e.target.value)}
                rows={5}
                placeholder={'{"paybill": "247247", "account": "Catholic Silanga"}'}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
              <p className="text-xs text-muted-foreground mt-1">
                Key/value pairs shown to donors on the public /contributions page (e.g. paybill number, account name).
              </p>
            </div>
            <Textarea label="Instructions" rows={2} value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="e.g. Use your member code as the account name" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Display order" type="number" value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
              <label className="flex items-center gap-2 text-sm self-end pb-2">
                <input type="checkbox" checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded" />
                Active (visible on public /contributions)
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
              <Button onClick={handleSave} leftIcon={<Save className="w-4 h-4" />}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};

// ============================================================
// MEMBERS TAB
// ============================================================
const MembersTab: React.FC<{ members: Profile[] }> = ({ members }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.display_name, m.email, m.phone, m.hierarchy_role, m.bio]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [members, search]);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> Members ({members.length})
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, role…"
            className="pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm w-full sm:w-72" />
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No active members loaded.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No members match "{search}".
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((m) => (
              <button key={m.id} onClick={() => setSelected(m)}
                className="text-left rounded-lg border p-3 hover:shadow-md transition-shadow bg-card">
                <p className="font-semibold">{m.display_name}</p>
                {m.hierarchy_role && <p className="text-xs text-primary mt-0.5">{m.hierarchy_role}</p>}
                <p className="text-xs text-muted-foreground truncate mt-1">{m.email}</p>
                {m.phone && <p className="text-xs text-muted-foreground">{m.phone}</p>}
              </button>
            ))}
          </div>
        )}
      </CardContent>

      {selected && (
        <Modal title={selected.display_name} onClose={() => setSelected(null)}>
          <div className="space-y-3 text-sm">
            {selected.photo_url && (
              <img src={selected.photo_url} alt={selected.display_name}
                className="w-24 h-24 rounded-full object-cover mx-auto" />
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Hierarchy position</p>
              <p>{selected.hierarchy_role ?? 'Member'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Email</p>
              <a href={`mailto:${selected.email}`} className="text-primary hover:underline">
                {selected.email}
              </a>
            </div>
            {selected.phone && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Phone</p>
                <a href={`tel:${selected.phone.replace(/\s/g, '')}`} className="text-primary hover:underline">
                  {selected.phone}
                </a>
              </div>
            )}
            {selected.address && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Address</p>
                <p className="whitespace-pre-line">{selected.address}</p>
              </div>
            )}
            {selected.bio && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Bio</p>
                <p className="whitespace-pre-line">{selected.bio}</p>
              </div>
            )}
            <div className="pt-2 border-t flex gap-2 justify-end">
              {selected.email && (
                <Button size="sm" variant="outline" leftIcon={<Send className="w-3 h-3" />}
                  onClick={() => window.location.href = `mailto:${selected.email}`}>
                  Email
                </Button>
              )}
              {selected.phone && (
                <Button size="sm" variant="primary"
                  onClick={() => window.location.href = `tel:${selected.phone!.replace(/\s/g, '')}`}>
                  Call
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};

// ============================================================
// REPORTS TAB — preview before submit
// ============================================================
const ReportsTab: React.FC<{
  reports: FinancialReport[];
  setReports: (r: FinancialReport[]) => void;
  isAdmin: boolean;
}> = ({ reports, setReports, isAdmin }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [preview, setPreview] = useState<null | {
    opening_balance: number; income_from_donations: number; income_from_fines: number;
    total_income: number; total_expenses: number; closing_balance: number;
    donation_count: number; fine_count: number; expense_count: number;
  }>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<FinancialReport | null>(null);

  const handlePreview = async () => {
    try {
      const { data, error } = await supabase.rpc('get_financial_summary_preview', {
        p_period_start: form.period_start,
        p_period_end: form.period_end,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { toast.error('No data for this period'); return; }
      setPreview({
        opening_balance: Number(row.opening_balance ?? 0),
        income_from_donations: Number(row.income_from_donations ?? 0),
        income_from_fines: Number(row.income_from_fines ?? 0),
        total_income: Number(row.total_income ?? 0),
        total_expenses: Number(row.total_expenses ?? 0),
        closing_balance: Number(row.closing_balance ?? 0),
        donation_count: Number(row.donation_count ?? 0),
        fine_count: Number(row.fine_count ?? 0),
        expense_count: Number(row.expense_count ?? 0),
      });
    } catch (err: any) {
      toast.error(err?.message ?? 'Preview failed');
    }
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      const created = await submitFinancialReport(form.period_start, form.period_end, form.notes);
      setReports([created, ...reports]);
      toast.success('Report generated and saved');
      setShowForm(false);
      setPreview(null);
      setForm({
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        period_end: new Date().toISOString().slice(0, 10),
        notes: '',
      });
    } catch (err: any) {
      toast.error(err?.message ?? 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (r: FinancialReport) => {
    try {
      const updated = await approveFinancialReport(r.id);
      setReports(reports.map((x) => (x.id === updated.id ? updated : x)));
      toast.success('Report approved');
    } catch (err: any) { toast.error(err?.message ?? 'Failed'); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-2">
        <CardTitle>Financial Reports ({reports.length})</CardTitle>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => { setShowForm(!showForm); setPreview(null); }}>
          {showForm ? 'Cancel' : 'Generate Report'}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="space-y-3 border-b pb-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Period start *" required type="date" value={form.period_start}
                onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))} />
              <Input label="Period end *" required type="date" value={form.period_end}
                onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))} />
            </div>
            <Textarea label="Notes (optional)" rows={2} value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <Button onClick={handlePreview} leftIcon={<BarChart3 className="w-4 h-4" />}>
                Preview summary
              </Button>
            </div>

            {preview && (
              <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 space-y-3 mt-2">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Preview — confirm or revisit
                </p>
                <p className="text-xs text-muted-foreground">
                  Saving will create a financial report with these exact numbers. Paid fines are included in total income.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <PreviewStat label="Opening balance" value={fmtMoney(preview.opening_balance)} />
                  <PreviewStat label="Income from donations" value={`${fmtMoney(preview.income_from_donations)} (${preview.donation_count})`} />
                  <PreviewStat label="Income from paid fines" value={`${fmtMoney(preview.income_from_fines)} (${preview.fine_count})`} />
                  <PreviewStat label="Total income" value={fmtMoney(preview.total_income)} tone="success" />
                  <PreviewStat label="Total expenses" value={`${fmtMoney(preview.total_expenses)} (${preview.expense_count})`} tone="destructive" />
                  <PreviewStat label="Closing balance" value={fmtMoney(preview.closing_balance)} tone={preview.closing_balance >= 0 ? 'success' : 'destructive'} bold />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => setPreview(null)}>Revisit</Button>
                  <Button onClick={handleConfirmSubmit} isLoading={submitting}
                    disabled={submitting} leftIcon={<CheckCircle className="w-4 h-4" />}>
                    Confirm and save report
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {reports.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No reports yet. Generate one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-bold">{fmtDate(r.period_start)} → {fmtDate(r.period_end)}</h4>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'approved' ? 'bg-success/15 text-success' :
                        r.status === 'submitted' ? 'bg-gold-400/20 text-gold-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Income</p>
                        <p className="font-mono text-success">{fmtMoney(Number(r.total_income))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Expenses</p>
                        <p className="font-mono text-destructive">{fmtMoney(Number(r.total_expenses))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Net</p>
                        <p className="font-mono">{fmtMoney(Number(r.closing_balance))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Opening</p>
                        <p className="font-mono">{fmtMoney(Number(r.opening_balance))}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" leftIcon={<Eye className="w-3 h-3" />}
                      onClick={() => setViewing(r)}>
                      View
                    </Button>
                    {isAdmin && r.status !== 'approved' && (
                      <Button size="sm" leftIcon={<CheckCircle className="w-3 h-3" />}
                        onClick={() => handleApprove(r)}>
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {viewing && (
        <Modal title={`Report · ${fmtDate(viewing.period_start)} → ${fmtDate(viewing.period_end)}`}
          onClose={() => setViewing(null)} wide>
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Opening balance</p>
                <p className="font-mono text-lg">{fmtMoney(Number(viewing.opening_balance))}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total income</p>
                <p className="font-mono text-lg text-success">{fmtMoney(Number(viewing.total_income))}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total expenses</p>
                <p className="font-mono text-lg text-destructive">{fmtMoney(Number(viewing.total_expenses))}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Closing balance</p>
                <p className="font-mono text-lg">{fmtMoney(Number(viewing.closing_balance))}</p>
              </div>
            </div>
            {viewing.notes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Notes</p>
                <p className="text-sm whitespace-pre-line">{viewing.notes}</p>
              </div>
            )}
            <div className="text-xs text-muted-foreground border-t pt-2">
              Prepared: {fmtDate(viewing.created_at)} • Status: {viewing.status}
              {viewing.approved_at && ` • Approved: ${fmtDate(viewing.approved_at)}`}
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};

// Small helper for the preview stats
const PreviewStat: React.FC<{ label: string; value: string; tone?: 'success' | 'destructive'; bold?: boolean }> = ({ label, value, tone, bold }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`font-mono ${bold ? 'text-base font-bold' : ''} ${
      tone === 'success' ? 'text-success' :
      tone === 'destructive' ? 'text-destructive' : ''
    }`}>{value}</p>
  </div>
);

// ============================================================
// ANALYTICS TAB
// ============================================================
const AnalyticsTab: React.FC<{
  monthly: Array<{ month: string; income: number; expenses: number }>;
  totalIncome: number;
  totalExpenses: number;
  approvedExpenses: Expense[];
  expenses: Expense[];
}> = ({ monthly, totalIncome, totalExpenses, approvedExpenses, expenses }) => {
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    approvedExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [approvedExpenses]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Income (incl. paid fines) vs Expenses — last 12 months</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.2)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmtMoney(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Income (donations + paid fines)" fill="#15803d" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#a82524" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Expenses by category</CardTitle></CardHeader>
        <CardContent>
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved expenses yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtMoney(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Total income (incl. fines)" value={fmtMoney(totalIncome)} icon={Heart} color="text-success" />
            <StatCard label="Total expenses" value={fmtMoney(totalExpenses)} icon={Receipt} color="text-destructive" />
            <StatCard label="Total expense records" value={String(expenses.length)} icon={Receipt} color="text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================

export default TreasurerPortal;
