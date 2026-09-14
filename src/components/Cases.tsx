import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Briefcase, Gavel, Wallet, Calendar, X, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Case, Client, Session, Payment } from '@/lib/supabase';
import { Modal } from './Clients';

const caseTypes = [
  'مدني',
  'جنائي',
  'تجاري',
  'أحوال شخصية',
  'إداري',
  'عقاري',
  'عمل',
  'أخرى',
];

const statusOptions: { value: Case['status']; label: string; color: string }[] = [
  { value: 'open', label: 'مفتوحة', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'adjourned', label: 'مؤجلة', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'closed', label: 'مغلقة', color: 'bg-slate-200 text-slate-600 border-slate-300' },
];

export default function Cases() {
  const [cases, setCases] = useState<(Case & { client?: Client })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [selectedCase, setSelectedCase] = useState<(Case & { client?: Client }) | null>(null);
  const [caseSessions, setCaseSessions] = useState<Session[]>([]);
  const [casePayments, setCasePayments] = useState<Payment[]>([]);
  const [form, setForm] = useState({
    client_id: '',
    case_number: '',
    title: '',
    court: '',
    case_type: '',
    opponent: '',
    description: '',
    status: 'open' as Case['status'],
    filed_date: '',
  });

  useEffect(() => {
    fetchCases();
    fetchClients();
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cases')
      .select('*, client:clients(*)')
      .order('created_at', { ascending: false });
    setCases((data || []) as (Case & { client?: Client })[]);
    setLoading(false);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    setClients((data || []) as Client[]);
  };

  const fetchCaseDetails = async (caseId: string) => {
    const [sessionsRes, paymentsRes] = await Promise.all([
      supabase.from('sessions').select('*').eq('case_id', caseId).order('session_date', { ascending: true }),
      supabase.from('payments').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
    ]);
    setCaseSessions((sessionsRes.data || []) as Session[]);
    setCasePayments((paymentsRes.data || []) as Payment[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCase) {
      await supabase.from('cases').update(form).eq('id', editingCase.id);
    } else {
      await supabase.from('cases').insert(form);
    }
    setShowModal(false);
    setEditingCase(null);
    resetForm();
    fetchCases();
  };

  const handleEdit = (caseItem: Case) => {
    setEditingCase(caseItem);
    setForm({
      client_id: caseItem.client_id,
      case_number: caseItem.case_number,
      title: caseItem.title,
      court: caseItem.court || '',
      case_type: caseItem.case_type || '',
      opponent: caseItem.opponent || '',
      description: caseItem.description || '',
      status: caseItem.status,
      filed_date: caseItem.filed_date || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (caseItem: Case) => {
    if (!confirm(`هل أنت متأكد من حذف القضية "${caseItem.title}"؟`)) return;
    await supabase.from('cases').delete().eq('id', caseItem.id);
    fetchCases();
  };

  const handleViewDetails = (caseItem: Case & { client?: Client }) => {
    setSelectedCase(caseItem);
    fetchCaseDetails(caseItem.id);
  };

  const resetForm = () => {
    setForm({
      client_id: '',
      case_number: '',
      title: '',
      court: '',
      case_type: '',
      opponent: '',
      description: '',
      status: 'open',
      filed_date: '',
    });
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.title.includes(search) ||
      c.case_number.includes(search) ||
      (c.opponent || '').includes(search) ||
      (c.client?.name || '').includes(search);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusLabel = (status: string) => statusOptions.find((s) => s.value === status)?.label || status;
  const statusColor = (status: string) => statusOptions.find((s) => s.value === status)?.color || '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-1 gap-3 max-w-2xl">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بعنوان القضية أو الرقم أو الخصم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pr-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field max-w-[140px]"
          >
            <option value="all">كل الحالات</option>
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingCase(null);
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus size={20} />
          إضافة قضية
        </button>
      </div>

      {/* Cases Table */}
      {filteredCases.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">
            {search || statusFilter !== 'all' ? 'لا توجد نتائج مطابقة' : 'لم يتم إضافة أي قضايا بعد'}
          </p>
          {clients.length === 0 && !search && (
            <p className="text-sm text-amber-600 mt-2">يجب إضافة عميل أولاً قبل إضافة القضايا</p>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-right p-4 font-semibold text-slate-700">عنوان القضية</th>
                  <th className="text-right p-4 font-semibold text-slate-700 hidden md:table-cell">العميل</th>
                  <th className="text-right p-4 font-semibold text-slate-700 hidden lg:table-cell">رقم القضية</th>
                  <th className="text-right p-4 font-semibold text-slate-700 hidden lg:table-cell">النوع</th>
                  <th className="text-right p-4 font-semibold text-slate-700">الحالة</th>
                  <th className="text-center p-4 font-semibold text-slate-700">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => handleViewDetails(c)}
                  >
                    <td className="p-4">
                      <p className="font-medium text-slate-800">{c.title}</p>
                      <p className="text-xs text-slate-500 md:hidden">{c.client?.name}</p>
                    </td>
                    <td className="p-4 text-slate-600 hidden md:table-cell">{c.client?.name || '—'}</td>
                    <td className="p-4 text-slate-600 hidden lg:table-cell">{c.case_number}</td>
                    <td className="p-4 text-slate-600 hidden lg:table-cell">{c.case_type || '—'}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColor(c.status)}`}>
                        {statusLabel(c.status)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(c);
                          }}
                          className="p-1.5 hover:bg-sky-50 rounded text-slate-500 hover:text-sky-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(c);
                          }}
                          className="p-1.5 hover:bg-red-50 rounded text-slate-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editingCase ? 'تعديل قضية' : 'إضافة قضية جديدة'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-field">العميل *</label>
              <select
                required
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="input-field"
              >
                <option value="">اختر العميل</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">عنوان القضية *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-field"
                  placeholder="عنوان القضية"
                />
              </div>
              <div>
                <label className="label-field">رقم القضية *</label>
                <input
                  type="text"
                  required
                  value={form.case_number}
                  onChange={(e) => setForm({ ...form, case_number: e.target.value })}
                  className="input-field"
                  placeholder="رقم القضية"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">المحكمة</label>
                <input
                  type="text"
                  value={form.court}
                  onChange={(e) => setForm({ ...form, court: e.target.value })}
                  className="input-field"
                  placeholder="اسم المحكمة"
                />
              </div>
              <div>
                <label className="label-field">نوع القضية</label>
                <select
                  value={form.case_type}
                  onChange={(e) => setForm({ ...form, case_type: e.target.value })}
                  className="input-field"
                >
                  <option value="">اختر النوع</option>
                  {caseTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">الخصم</label>
                <input
                  type="text"
                  value={form.opponent}
                  onChange={(e) => setForm({ ...form, opponent: e.target.value })}
                  className="input-field"
                  placeholder="اسم الخصم"
                />
              </div>
              <div>
                <label className="label-field">تاريخ رفع الدعوى</label>
                <input
                  type="date"
                  value={form.filed_date}
                  onChange={(e) => setForm({ ...form, filed_date: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="label-field">الحالة</label>
              <div className="flex gap-2">
                {statusOptions.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm({ ...form, status: s.value })}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      form.status === s.value
                        ? s.color + ' ring-2 ring-offset-1 ring-sky-300'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label-field">وصف القضية</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field min-h-[80px] resize-y"
                placeholder="تفاصيل القضية"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                {editingCase ? 'حفظ التعديلات' : 'إضافة'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                إلغاء
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Case Details Modal */}
      {selectedCase && (
        <Modal title="تفاصيل القضية" onClose={() => setSelectedCase(null)} large>
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedCase.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    رقم: {selectedCase.case_number} | {selectedCase.case_type || 'غير محدد'}
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium border ${statusColor(selectedCase.status)}`}>
                  {statusLabel(selectedCase.status)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-sky-500" />
                  <span className="text-slate-500">العميل:</span>
                  <span className="text-slate-700 font-medium">{selectedCase.client?.name}</span>
                </div>
                {selectedCase.court && (
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} className="text-sky-500" />
                    <span className="text-slate-500">المحكمة:</span>
                    <span className="text-slate-700 font-medium">{selectedCase.court}</span>
                  </div>
                )}
                {selectedCase.opponent && (
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-rose-500" />
                    <span className="text-slate-500">الخصم:</span>
                    <span className="text-slate-700 font-medium">{selectedCase.opponent}</span>
                  </div>
                )}
                {selectedCase.filed_date && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-sky-500" />
                    <span className="text-slate-500">تاريخ الرفع:</span>
                    <span className="text-slate-700 font-medium">
                      {new Date(selectedCase.filed_date).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                )}
              </div>
              {selectedCase.description && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">الوصف</p>
                  <p className="text-sm text-slate-700">{selectedCase.description}</p>
                </div>
              )}
            </div>

            {/* Sessions */}
            <div>
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Gavel size={18} className="text-sky-600" />
                الجلسات ({caseSessions.length})
              </h4>
              {caseSessions.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">لا توجد جلسات لهذه القضية</p>
              ) : (
                <div className="space-y-2">
                  {caseSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center text-sky-700">
                          <Calendar size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {new Date(s.session_date).toLocaleDateString('ar-EG')}
                            {s.session_time && ` - ${s.session_time}`}
                          </p>
                          {s.location && <p className="text-xs text-slate-500">{s.location}</p>}
                        </div>
                      </div>
                      {s.notes && <span className="text-xs text-slate-500">{s.notes}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payments */}
            <div>
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Wallet size={18} className="text-sky-600" />
                الأتعاب المالية ({casePayments.length})
              </h4>
              {casePayments.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">لا توجد سجلات مالية لهذه القضية</p>
              ) : (
                <div className="space-y-2">
                  {casePayments.map((p) => {
                    const remaining = Number(p.total_fee) - Number(p.paid_amount);
                    return (
                      <div key={p.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-800">
                            الأتعاب: {Number(p.total_fee).toLocaleString('ar-EG')} ر.س
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              remaining > 0
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {remaining > 0
                              ? `متبقي: ${remaining.toLocaleString('ar-EG')} ر.س`
                              : 'مدفوع بالكامل'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                          <span>مدفوع: {Number(p.paid_amount).toLocaleString('ar-EG')} ر.س</span>
                          {p.payment_date && (
                            <span>تاريخ السداد: {new Date(p.payment_date).toLocaleDateString('ar-EG')}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
