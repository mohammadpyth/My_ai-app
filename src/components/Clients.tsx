import { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, MapPin, Edit2, Trash2, User, Briefcase, X, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client, Case, Session, Payment } from '@/lib/supabase';
import { printClientReport } from '@/lib/reports';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [clientSessions, setClientSessions] = useState<Session[]>([]);
  const [clientPayments, setClientPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    national_id: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    setClients((data || []) as Client[]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      await supabase.from('clients').update(form).eq('id', editingClient.id);
    } else {
      await supabase.from('clients').insert(form);
    }
    setShowModal(false);
    setEditingClient(null);
    resetForm();
    fetchClients();
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      national_id: client.national_id || '',
      address: client.address || '',
      notes: client.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`هل أنت متأكد من حذف العميل "${client.name}"؟ سيتم حذف جميع القضايا والبيانات المرتبطة به.`)) return;
    await supabase.from('clients').delete().eq('id', client.id);
    fetchClients();
  };

  const handleViewDetails = async (client: Client) => {
    setSelectedClient(client);
    const [casesRes, sessionsRes, paymentsRes] = await Promise.all([
      supabase.from('cases').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabase.from('sessions').select('*, case:cases(*)').in('case_id',
        (await supabase.from('cases').select('id').eq('client_id', client.id)).data?.map((c: { id: string }) => c.id) || []
      ).order('session_date', { ascending: true }),
      supabase.from('payments').select('*, case:cases(*)').in('case_id',
        (await supabase.from('cases').select('id').eq('client_id', client.id)).data?.map((c: { id: string }) => c.id) || []
      ).order('created_at', { ascending: false }),
    ]);
    setCases((casesRes.data || []) as Case[]);
    setClientSessions((sessionsRes.data || []) as Session[]);
    setClientPayments((paymentsRes.data || []) as Payment[]);
  };

  const handlePrintClient = () => {
    if (selectedClient) {
      printClientReport(selectedClient, cases, clientSessions, clientPayments);
    }
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', national_id: '', address: '', notes: '' });
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.includes(search) ||
      (c.phone || '').includes(search) ||
      (c.email || '').includes(search) ||
      (c.national_id || '').includes(search)
  );

  const statusLabels: Record<string, string> = {
    open: 'مفتوحة',
    closed: 'مغلقة',
    adjourned: 'مؤجلة',
  };

  const statusColors: Record<string, string> = {
    open: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-slate-200 text-slate-600',
    adjourned: 'bg-amber-100 text-amber-700',
  };

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
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف أو الرقم القومي..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pr-10"
          />
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingClient(null);
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus size={20} />
          إضافة عميل
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-sky-700">{clients.length}</p>
          <p className="text-sm text-slate-600 mt-1">إجمالي العملاء</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-emerald-700">
            {clients.filter((c) => c.phone).length}
          </p>
          <p className="text-sm text-slate-600 mt-1">عملاء بهاتف</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-amber-700">
            {clients.filter((c) => c.email).length}
          </p>
          <p className="text-sm text-slate-600 mt-1">عملاء ببريد إلكتروني</p>
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="card text-center py-16">
          <User size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">
            {search ? 'لا توجد نتائج مطابقة' : 'لم يتم إضافة أي عملاء بعد'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="card hover:shadow-lg cursor-pointer group"
              onClick={() => handleViewDetails(client)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-sky-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {client.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{client.name}</h3>
                    <p className="text-xs text-slate-500">
                      {new Date(client.created_at).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(client);
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-sky-600 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(client);
                    }}
                    className="p-1.5 hover:bg-red-50 rounded text-slate-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                {client.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} className="text-sky-500" />
                    <span dir="ltr">{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail size={14} className="text-sky-500" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin size={14} className="text-sky-500" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editingClient ? 'تعديل عميل' : 'إضافة عميل جديد'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-field">اسم العميل *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                placeholder="الاسم الكامل"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">رقم الهاتف</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="label-field">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field"
                  placeholder="email@example.com"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="label-field">الرقم القومي</label>
              <input
                type="text"
                value={form.national_id}
                onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                className="input-field"
                placeholder="رقم الهوية"
                dir="ltr"
              />
            </div>
            <div>
              <label className="label-field">العنوان</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input-field"
                placeholder="العنوان بالتفصيل"
              />
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
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                {editingClient ? 'حفظ التعديلات' : 'إضافة'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                إلغاء
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Client Details Modal */}
      {selectedClient && (
        <Modal title="تفاصيل العميل" onClose={() => setSelectedClient(null)} large>
          <div className="space-y-6">
            {/* Client Info */}
            <div className="bg-slate-50 rounded-xl p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-sky-700 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedClient.name}</h3>
                  <p className="text-sm text-slate-500">
                    عميل منذ {new Date(selectedClient.created_at).toLocaleDateString('ar-EG')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {selectedClient.phone && (
                  <InfoRow icon={<Phone size={16} />} label="الهاتف" value={selectedClient.phone} ltr />
                )}
                {selectedClient.email && (
                  <InfoRow icon={<Mail size={16} />} label="البريد" value={selectedClient.email} ltr />
                )}
                {selectedClient.national_id && (
                  <InfoRow icon={<User size={16} />} label="الرقم القومي" value={selectedClient.national_id} ltr />
                )}
                {selectedClient.address && (
                  <InfoRow icon={<MapPin size={16} />} label="العنوان" value={selectedClient.address} />
                )}
              </div>
              {selectedClient.notes && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">ملاحظات</p>
                  <p className="text-sm text-slate-700">{selectedClient.notes}</p>
                </div>
              )}
            </div>

            {/* Print Report Button */}
            <button onClick={handlePrintClient} className="btn-primary w-full">
              <Printer size={18} />
              طباعة تقرير هذا العميل (PDF)
            </button>

            {/* Client Cases */}
            <div>
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Briefcase size={18} className="text-sky-600" />
                القضايا ({cases.length})
              </h4>
              {cases.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">لا توجد قضايا لهذا العميل</p>
              ) : (
                <div className="space-y-2">
                  {cases.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{c.title}</p>
                        <p className="text-xs text-slate-500">
                          رقم القضية: {c.case_number}
                          {c.court && ` | ${c.court}`}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[c.status]}`}
                      >
                        {statusLabels[c.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  ltr,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sky-500">{icon}</span>
      <span className="text-slate-500 text-xs">{label}:</span>
      <span className="text-slate-700 font-medium" dir={ltr ? 'ltr' : undefined}>
        {value}
      </span>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  large,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  large?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 fade-in">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${large ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
