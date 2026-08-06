import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Banknote, ClipboardList, Heart, BarChart3, LogOut,
  Plus, Trash2, Save, CheckCircle, Eye, Receipt,
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
  getRecentDonations,
  getExpenses, createExpense, approveExpense, deleteExpense,
  getFinancialReports,
  submitFinancialReport, approveFinancialReport,
} from '../services/supabaseData';
import type {
  Donation, Expense, ExpenseCategory, FinancialReport,
} from '../types/database';

type Tab = 'overview' | 'donations' | 'expenses' | 'reports' | 'analytics';

const PIE_COLORS = ['#a82524', '#f59e0b', '#15803d', '#6366f1', '#db2777', '#0891b2', '#7c3aed', '#0d9488'];
const CURRENCY = 'KES';

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(n);
}
function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

// ============================================================
export const TreasurerPortal: React.FC = () => {
  const navigate = useNavigate();
  const { profile, logout, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  // Data
  const [donations, setDonations] = useState<Donation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [d, e, r] = await Promise.all([
          getRecentDonations(200),
          getExpenses(),
          getFinancialReports(),
        ]);
        if (!mounted) return;
        setDonations(d);
        setExpenses(e);
        setReports(r);
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
  const netPosition = totalIncome - totalExpenses;
  const approvedExpenses = useMemo(() => expenses.filter((e) => !!e.approved_at), [expenses]);

  // Monthly trends (last 12 months)
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
    expenses.forEach((e) => {
      const k = e.expense_date.slice(0, 7);
      const m = map.get(k);
      if (m) m.expenses += Number(e.amount);
    });
    return Array.from(map.entries()).map(([month, v]) => ({ month, ...v }));
  }, [completedDonations, expenses]);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'donations', label: 'Donations', icon: Heart },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
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
              Track income, expenses, and generate financial reports.
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
                  <StatCard label="Total income" value={fmtMoney(totalIncome)} icon={Heart} color="text-success" />
                  <StatCard label="Total expenses" value={fmtMoney(totalExpenses)} icon={Receipt} color="text-destructive" />
                  <StatCard label="Net position" value={fmtMoney(netPosition)} icon={BarChart3}
                    color={netPosition >= 0 ? 'text-success' : 'text-destructive'} />
                  <StatCard label="Donations (verified)" value={completedDonations.length} icon={Heart} color="text-pink-700" />
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Income vs Expenses — last 12 months</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.2)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => fmtMoney(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="income" name="Income" fill="#15803d" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="expenses" name="Expenses" fill="#a82524" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}

            {tab === 'donations' && (
              <DonationsTab donations={donations} />
            )}
            {tab === 'expenses' && (
              <ExpensesTab
                expenses={expenses}
                setExpenses={setExpenses}
                isAdmin={isAdmin()}
              />
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
                totalIncome={totalIncome}
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
const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = ({ label, value, icon: Icon, color }) => (
  <Card>
    <CardContent className="p-5">
      <Icon className={`w-7 h-7 ${color} mb-2`} />
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </CardContent>
  </Card>
);

// ============================================================
const DonationsTab: React.FC<{ donations: Donation[] }> = ({ donations }) => {
  if (donations.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No donations recorded yet.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Donations ({donations.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="py-2 font-semibold">Donor</th>
                <th className="py-2 font-semibold">Amount</th>
                <th className="py-2 font-semibold">Purpose</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 font-semibold hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3">
                    <div className="font-medium">{d.donor_name}</div>
                    <div className="text-xs text-muted-foreground">{d.email}</div>
                  </td>
                  <td className="py-3 font-mono">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: d.currency }).format(Number(d.amount))}
                  </td>
                  <td className="py-3">{d.purpose}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      d.status === 'completed' ? 'bg-success/15 text-success' :
                      d.status === 'pending' ? 'bg-gold-400/20 text-gold-700' :
                      'bg-destructive/15 text-destructive'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3 hidden sm:table-cell text-xs text-muted-foreground">
                    {fmtDate(d.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================
const ExpensesTab: React.FC<{
  expenses: Expense[];
  setExpenses: (e: Expense[]) => void;
  isAdmin: boolean;
}> = ({ expenses, setExpenses, isAdmin }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    amount: number;
    category: ExpenseCategory;
    description: string;
    vendor: string;
    receipt_url: string;
    currency: string;
    expense_date: string;
  }>({
    title: '',
    amount: 0,
    category: 'operations',
    description: '',
    vendor: '',
    receipt_url: '',
    currency: CURRENCY,
    expense_date: new Date().toISOString().slice(0, 10),
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) {
      toast.error('Amount must be positive');
      return;
    }
    try {
      const created = await createExpense({
        title: form.title,
        amount: form.amount,
        category: form.category,
        description: form.description || null,
        vendor: form.vendor || null,
        receipt_url: form.receipt_url || null,
        currency: form.currency,
        expense_date: form.expense_date,
      });
      setExpenses([created, ...expenses]);
      toast.success('Expense recorded');
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
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    }
  };

  const handleDelete = async (e: Expense) => {
    if (!confirm(`Delete expense "${e.title}"?`)) return;
    try {
      await deleteExpense(e.id);
      setExpenses(expenses.filter((x) => x.id !== e.id));
      toast.success('Deleted');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    }
  };

  const total = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-2">
        <CardTitle>
          Expenses ({expenses.length}) — Total {fmtMoney(total)}
        </CardTitle>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowForm(!showForm)}>
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
              <Input label="Amount *" required type="number" step="0.01" value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
              <div>
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
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
                        <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success font-semibold">
                          Approved
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gold-400/20 text-gold-700 font-semibold">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {isAdmin && !e.approved_at && (
                          <button
                            onClick={() => handleApprove(e)}
                            className="p-1.5 rounded hover:bg-success/10 text-success"
                            aria-label="Approve"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(e)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                          aria-label="Delete"
                        >
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
  const [viewing, setViewing] = useState<FinancialReport | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await submitFinancialReport(form.period_start, form.period_end, form.notes);
      setReports([created, ...reports]);
      toast.success('Report generated');
      setShowForm(false);
      setForm({
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        period_end: new Date().toISOString().slice(0, 10),
        notes: '',
      });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    }
  };

  const handleApprove = async (r: FinancialReport) => {
    try {
      const updated = await approveFinancialReport(r.id);
      setReports(reports.map((x) => (x.id === updated.id ? updated : x)));
      toast.success('Report approved');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center flex-wrap gap-2">
        <CardTitle>Financial Reports ({reports.length})</CardTitle>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Generate Report'}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleGenerate} className="space-y-3 border-b pb-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Period start *" required type="date" value={form.period_start}
                onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))} />
              <Input label="Period end *" required type="date" value={form.period_end}
                onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))} />
            </div>
            <Textarea label="Notes (optional)" rows={2} value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            <Button type="submit" leftIcon={<Save className="w-4 h-4" />}>Generate</Button>
          </form>
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
        <CardHeader><CardTitle>Income vs Expenses — last 12 months</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.2)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmtMoney(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Income" fill="#15803d" radius={[6, 6, 0, 0]} />
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
            <StatCard label="Total income" value={fmtMoney(totalIncome)} icon={Heart} color="text-success" />
            <StatCard label="Total expenses" value={fmtMoney(totalExpenses)} icon={Receipt} color="text-destructive" />
            <StatCard label="Total expense records" value={expenses.length} icon={Receipt} color="text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TreasurerPortal;