import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Wallet, TrendingUp, TrendingDown, DollarSign, CreditCard, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Payment, Case } from '@/lib/supabase';
import { Modal } from './Clients';

export default function Finances() {
  const [payments, setPayments] = useState<(Payment & { case?: Case })[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState({
    case_id: '',
    total_fee: '',
    paid_amount: '',
    payment_date: '',
    payment_method: '',
    notes: '',
  });

  useEffect(() => {
    fetchPayments();
    fetchCases();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('payments')
      .select('*, case:cases(*)')
      .order('created_at', { ascending: false });
    setPayments((data || []) as (Payment & { case?: Case })[]);
    setLoading(false);
  };

  const fetchCases = async () => {
    const { data } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });
    setCases((data || []) as Case[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      case_id: form.case_id,
      total_fee: parseFloat(form.total_fee) || 0,
      paid_amount: parseFloat(form.paid_amount) || 0,
      payment_date: form.payment_date || null,
      payment_method: form.payment_method || null,
      notes: form.notes || null,
    };
    if (editingPayment) {
      await supabase.from('payments').update(payload).eq('id', editingPayment.id);
    } else {
      await supabase.from('payments').insert(payload);
    }
    setShowModal(false);
    setEditingPayment(null);
    resetForm();
    fetchPayments();
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setForm({
      case_id: payment.case_id,
      total_fee: String(payment.total_fee),
      paid_amount: String(payment.paid_amount),
      payment_date: payment.payment_date || '',
      payment_method: payment.payment_method || '',
      notes: payment.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (payment: Payment) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل المالي؟')) return;
    await supabase.from('payments').delete().eq('id', payment.id);
    fetchPayments();
  };

  const resetForm = () => {
    setForm({ case_id: '', total_fee: '', paid_amount: '', payment_date: '', payment_method: '', notes: '' });
  };

  const totalFees = payments.reduce((sum, p) => sum + Number(p.total_fee), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.paid_amount), 0);
  const totalRemaining = totalFees - totalPaid;

  const filteredPayments = payments.filter((p) => {
    const caseTitle = p.case?.title || '';
    const caseNumber = p.case?.case_number || '';
    const matchesSearch = caseTitle.includes(search) || caseNumber.includes(search);

    const remaining = Number(p.total_fee) - Number(p.paid_amount);
    let matchesStatus = true;
    if (statusFilter === 'paid') matchesStatus = remaining <= 0;
    else if (statusFilter === 'partial') matchesStatus = Number(p.paid_amount) > 0 && remaining > 0;
    else if (statusFilter === 'unpaid') matchesStatus = Number(p.paid_amount) <= 0;

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => `${Number(amount).toLocaleString('ar-EG')} ر.س`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card bg-gradient-to-bl from-emerald-50 to-emerald-100 border-0">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
              <DollarSign size={22} className="text-white" />
            </div>
            <TrendingUp size={20} className="text-emerald-600 opacity-50" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalFees)}</p>
          <p className="text-sm text-emerald-600 mt-1">إجمالي الأتعاب</p>
        </div>
        <div className="stat-card bg-gradient-to-bl from-sky-50 to-sky-100 border-0">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-sky-600 rounded-xl flex items-center justify-center shadow-sm">
              <CreditCard size={22} className="text-white" />
            </div>
            <TrendingUp size={20} className="text-sky-600 opacity-50" />
          </div>
          <p className="text-2xl font-bold text-sky-700">{formatCurrency(totalPaid)}</p>
          <p className="text-sm text-sky-600 mt-1">إجمالي المدفوع</p>
        </div>
        <div className="stat-card bg-gradient-to-bl from-rose-50 to-rose-100 border-0">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-rose-600 rounded-xl flex items-center justify-center shadow-sm">
              <Wallet size={22} className="text-white" />
            </div>
            <TrendingDown size={20} className="text-rose-600 opacity-50" />
          </div>
          <p className="text-2xl font-bold text-rose-700">{formatCurrency(totalRemaining)}</p>
          <p className="text-sm text-rose-600 mt-1">إجمالي المتبقي</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-1 gap-3 max-w-2xl">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالقضية..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pr-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="input-field max-w-[140px]"
          >
            <option value="all">كل الحالات</option>
            <option value="paid">مدفوع بالكامل</option>
            <option value="partial">مدفوع جزئياً</option>
            <option value="unpaid">غير مدفوع</option>
          </select>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingPayment(null);
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus size={20} />
          إضافة سجل مالي
        </button>
      </div>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <div className="card text-center py-16">
          <Wallet size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">
            {search || statusFilter !== 'all' ? 'لا توجد نتائج مطابقة' : 'لم يتم إضافة أي سجلات مالية بعد'}
          </p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-right p-4 font-semibold text-slate-700">القضية</th>
                  <th className="text-right p-4 font-semibold text-slate-700 hidden md:table-cell">الأتعاب</th>
                  <th className="text-right p-4 font-semibold text-slate-700 hidden lg:table-cell">المدفوع</th>
                  <th className="text-right p-4 font-semibold text-slate-700 hidden lg:table-cell">تاريخ السداد</th>
                  <th className="text-right p-4 font-semibold text-slate-700">المتبقي</th>
                  <th className="text-center p-4 font-semibold text-slate-700">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => {
                  const remaining = Number(p.total_fee) - Number(p.paid_amount);
                  const isPaid = remaining <= 0;
                  const isPartial = Number(p.paid_amount) > 0 && remaining > 0;

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors group"
                    >
                      <td className="p-4">
                        <p className="font-medium text-slate-800">{p.case?.title || '—'}</p>
                        <p className="text-xs text-slate-500">{p.case?.case_number}</p>
                        <p className="text-xs text-slate-500 md:hidden mt-1">
                          {formatCurrency(Number(p.total_fee))}
                        </p>
                      </td>
                      <td className="p-4 text-slate-700 font-medium hidden md:table-cell">
                        {formatCurrency(Number(p.total_fee))}
                      </td>
                      <td className="p-4 text-sky-700 font-medium hidden lg:table-cell">
                        {formatCurrency(Number(p.paid_amount))}
                      </td>
                      <td className="p-4 text-slate-600 hidden lg:table-cell">
                        {p.payment_date
                          ? new Date(p.payment_date).toLocaleDateString('ar-EG')
                          : '—'}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-700'
                              : isPartial
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {isPaid ? 'مدفوع بالكامل' : formatCurrency(remaining)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-1.5 hover:bg-sky-50 rounded text-slate-500 hover:text-sky-600 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 hover:bg-red-50 rounded text-slate-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editingPayment ? 'تعديل سجل مالي' : 'إضافة سجل مالي'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-field">القضية *</label>
              <select
                required
                value={form.case_id}
                onChange={(e) => setForm({ ...form, case_id: e.target.value })}
                className="input-field"
              >
                <option value="">اختر القضية</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} - {c.case_number}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">إجمالي الأتعاب (ر.س) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.total_fee}
                  onChange={(e) => setForm({ ...form, total_fee: e.target.value })}
                  className="input-field"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="label-field">المبلغ المدفوع (ر.س)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.paid_amount}
                  onChange={(e) => setForm({ ...form, paid_amount: e.target.value })}
                  className="input-field"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">تاريخ السداد</label>
                <input
                  type="date"
                  value={form.payment_date}
                  onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">طريقة الدفع</label>
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  className="input-field"
                >
                  <option value="">اختر الطريقة</option>
                  <option value="cash">نقداً</option>
                  <option value="transfer">تحويل بنكي</option>
                  <option value="check">شيك</option>
                  <option value="card">بطاقة</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label-field">ملاحظات</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-field min-h-[80px] resize-y"
                placeholder="ملاحظات إضافية"
              />
            </div>
            {form.total_fee && form.paid_amount && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <span className="text-slate-500">المبلغ المتبقي: </span>
                <span className="font-bold text-rose-700">
                  {formatCurrency(
                    Math.max(0, parseFloat(form.total_fee) - parseFloat(form.paid_amount || '0'))
                  )}
                </span>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                {editingPayment ? 'حفظ التعديلات' : 'إضافة'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                إلغاء
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
