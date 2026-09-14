import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Gavel, Calendar, Clock, MapPin, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Session, Case } from '@/lib/supabase';
import { Modal } from './Clients';

export default function Sessions() {
  const [sessions, setSessions] = useState<(Session & { case?: Case })[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [form, setForm] = useState({
    case_id: '',
    session_date: '',
    session_time: '',
    location: '',
    notes: '',
    attended: false,
  });

  useEffect(() => {
    fetchSessions();
    fetchCases();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sessions')
      .select('*, case:cases(*)')
      .order('session_date', { ascending: true });
    setSessions((data || []) as (Session & { case?: Case })[]);
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
      ...form,
      session_time: form.session_time || null,
      location: form.location || null,
      notes: form.notes || null,
    };
    if (editingSession) {
      await supabase.from('sessions').update(payload).eq('id', editingSession.id);
    } else {
      await supabase.from('sessions').insert(payload);
    }
    setShowModal(false);
    setEditingSession(null);
    resetForm();
    fetchSessions();
  };

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    setForm({
      case_id: session.case_id,
      session_date: session.session_date,
      session_time: session.session_time || '',
      location: session.location || '',
      notes: session.notes || '',
      attended: session.attended,
    });
    setShowModal(true);
  };

  const handleDelete = async (session: Session) => {
    if (!confirm('هل أنت متأكد من حذف هذه الجلسة؟')) return;
    await supabase.from('sessions').delete().eq('id', session.id);
    fetchSessions();
  };

  const toggleAttended = async (session: Session) => {
    await supabase.from('sessions').update({ attended: !session.attended }).eq('id', session.id);
    fetchSessions();
  };

  const resetForm = () => {
    setForm({ case_id: '', session_date: '', session_time: '', location: '', notes: '', attended: false });
  };

  const today = new Date().toISOString().split('T')[0];

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'upcoming') return s.session_date >= today;
    if (filter === 'past') return s.session_date < today;
    return true;
  });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  const getDaysUntil = (date: string) =>
    Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const upcomingCount = sessions.filter((s) => s.session_date >= today).length;
  const nextWeekCount = sessions.filter((s) => {
    const days = getDaysUntil(s.session_date);
    return days >= 0 && days <= 7;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center">
              <Calendar size={22} className="text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{upcomingCount}</p>
              <p className="text-sm text-slate-500">جلسات قادمة</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Bell size={22} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{nextWeekCount}</p>
              <p className="text-sm text-slate-500">جلسات هذا الأسبوع</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={22} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {sessions.filter((s) => s.attended).length}
              </p>
              <p className="text-sm text-slate-500">جلسات تم حضورها</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <FilterButton active={filter === 'upcoming'} onClick={() => setFilter('upcoming')}>
            القادمة
          </FilterButton>
          <FilterButton active={filter === 'past'} onClick={() => setFilter('past')}>
            السابقة
          </FilterButton>
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            الكل
          </FilterButton>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingSession(null);
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus size={20} />
          إضافة جلسة
        </button>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="card text-center py-16">
          <Gavel size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">لا توجد جلسات في هذه الفئة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const daysUntil = getDaysUntil(session.session_date);
            const isUpcoming = daysUntil >= 0;
            const isPast = daysUntil < 0;

            return (
              <div
                key={session.id}
                className={`card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 group ${
                  isUpcoming && daysUntil <= 3 ? 'border-r-4 border-r-rose-500' : ''
                } ${isUpcoming && daysUntil > 3 && daysUntil <= 7 ? 'border-r-4 border-r-amber-500' : ''}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Date Badge */}
                  <div
                    className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center text-white font-bold flex-shrink-0 ${
                      isPast
                        ? 'bg-slate-400'
                        : daysUntil <= 3
                          ? 'bg-rose-500'
                          : daysUntil <= 7
                            ? 'bg-amber-500'
                            : 'bg-sky-600'
                    }`}
                  >
                    <span className="text-xs">
                      {new Date(session.session_date).toLocaleDateString('ar-EG', { month: 'short' })}
                    </span>
                    <span className="text-xl leading-none">
                      {new Date(session.session_date).getDate()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-base">
                      {session.case?.title || 'قضية'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(session.session_date)}
                      </span>
                      {session.session_time && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {session.session_time}
                        </span>
                      )}
                      {session.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {session.location}
                        </span>
                      )}
                    </div>
                    {session.notes && (
                      <p className="text-xs text-slate-500 mt-1 truncate">{session.notes}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isUpcoming && (
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        daysUntil === 0
                          ? 'bg-rose-100 text-rose-700'
                          : daysUntil <= 3
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {daysUntil === 0
                        ? 'اليوم'
                        : daysUntil === 1
                          ? 'غداً'
                          : `بعد ${daysUntil} يوم`}
                    </span>
                  )}
                  <button
                    onClick={() => toggleAttended(session)}
                    className={`p-2 rounded-lg transition-colors ${
                      session.attended
                        ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    title={session.attended ? 'تم الحضور' : 'تحديد كحاضر'}
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(session)}
                      className="p-2 hover:bg-sky-50 rounded-lg text-slate-500 hover:text-sky-600 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(session)}
                      className="p-2 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notification Banner */}
      {upcomingCount > 0 && (
        <div className="bg-gradient-to-l from-sky-50 to-sky-100 border border-sky-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bell size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-sky-800">
              لديك {upcomingCount} جلسة قادمة
              {nextWeekCount > 0 && `، منها ${nextWeekCount} جلسة خلال هذا الأسبوع`}
            </p>
            <p className="text-xs text-sky-600 mt-0.5">تأكد من الاستعداد للجلسات القريبة</p>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editingSession ? 'تعديل جلسة' : 'إضافة جلسة جديدة'} onClose={() => setShowModal(false)}>
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
                <label className="label-field">تاريخ الجلسة *</label>
                <input
                  type="date"
                  required
                  value={form.session_date}
                  onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">وقت الجلسة</label>
                <input
                  type="time"
                  value={form.session_time}
                  onChange={(e) => setForm({ ...form, session_time: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="label-field">المكان</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input-field"
                placeholder="اسم المحكمة أو المكان"
              />
            </div>
            <div>
              <label className="label-field">ملاحظات</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-field min-h-[80px] resize-y"
                placeholder="ملاحظات حول الجلسة"
              />
            </div>
            {editingSession && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.attended}
                  onChange={(e) => setForm({ ...form, attended: e.target.checked })}
                  className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-700">تم الحضور</span>
              </label>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                {editingSession ? 'حفظ التعديلات' : 'إضافة'}
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

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-sky-600 text-white shadow-sm'
          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}
