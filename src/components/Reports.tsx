import { useState, useEffect } from 'react';
import { FileText, Printer, Users, Briefcase, Wallet, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client, Case, Session, Payment } from '@/lib/supabase';
import { printComprehensiveReport } from '@/lib/reports';

export default function Reports() {
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    const [clientsRes, casesRes, sessionsRes, paymentsRes] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('cases').select('*').order('created_at', { ascending: false }),
      supabase.from('sessions').select('*').order('session_date', { ascending: false }),
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
    ]);
    setClients((clientsRes.data || []) as Client[]);
    setCases((casesRes.data || []) as Case[]);
    setSessions((sessionsRes.data || []) as Session[]);
    setPayments((paymentsRes.data || []) as Payment[]);
    setLoading(false);
  };

  const handlePrintComprehensive = () => {
    setPrinting(true);
    setTimeout(() => {
      printComprehensiveReport(clients, cases, sessions, payments);
      setPrinting(false);
    }, 100);
  };

  const totalFees = payments.reduce((sum, p) => sum + Number(p.total_fee), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.paid_amount), 0);
  const totalRemaining = totalFees - totalPaid;

  const clientsWithOverdue = clients.filter((client) => {
    const clientCases = cases.filter((c) => c.client_id === client.id);
    const clientCaseIds = clientCases.map((c) => c.id);
    const clientPayments = payments.filter((p) => clientCaseIds.includes(p.case_id));
    const fees = clientPayments.reduce((sum, p) => sum + Number(p.total_fee), 0);
    const paid = clientPayments.reduce((sum, p) => sum + Number(p.paid_amount), 0);
    return fees - paid > 0;
  });

  const reportCards = [
    {
      title: 'تقرير شامل',
      description: 'تقرير كامل بجميع العملاء والقضايا والجوانب المالية والمتأخرات',
      icon: FileText,
      color: 'sky',
      action: handlePrintComprehensive,
      disabled: clients.length === 0,
    },
  ];

  const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
    sky: { bg: 'from-sky-50 to-sky-100', icon: 'bg-sky-600', border: 'border-sky-200' },
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
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card text-center">
          <Users size={24} className="mx-auto text-sky-600 mb-2" />
          <p className="text-2xl font-bold text-slate-800">{clients.length}</p>
          <p className="text-xs text-slate-500">عميل</p>
        </div>
        <div className="stat-card text-center">
          <Briefcase size={24} className="mx-auto text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-slate-800">{cases.length}</p>
          <p className="text-xs text-slate-500">قضية</p>
        </div>
        <div className="stat-card text-center">
          <Wallet size={24} className="mx-auto text-amber-600 mb-2" />
          <p className="text-2xl font-bold text-slate-800">
            {totalRemaining.toLocaleString('ar-EG')}
          </p>
          <p className="text-xs text-slate-500">متبقي (ر.س)</p>
        </div>
        <div className="stat-card text-center">
          <AlertCircle size={24} className="mx-auto text-rose-600 mb-2" />
          <p className="text-2xl font-bold text-slate-800">{clientsWithOverdue.length}</p>
          <p className="text-xs text-slate-500">عملاء بمتأخرات</p>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportCards.map((card) => {
          const Icon = card.icon;
          const colors = colorMap[card.color];
          return (
            <button
              key={card.title}
              onClick={card.action}
              disabled={card.disabled || printing}
              className={`stat-card text-right bg-gradient-to-bl ${colors.bg} ${colors.border} border-2 hover:shadow-lg hover:scale-[1.02] cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed group`}
            >
              <div
                className={`w-14 h-14 ${colors.icon} rounded-xl flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform`}
              >
                <Icon size={26} className="text-white" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">{card.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{card.description}</p>
              <div className="mt-4 flex items-center gap-2 text-sky-700 font-medium text-sm">
                {printing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    جاري التحضير...
                  </>
                ) : (
                  <>
                    <Printer size={16} />
                    طباعة التقرير
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {clients.length === 0 && (
        <div className="card text-center py-16">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">لا توجد بيانات لإنشاء تقارير</p>
          <p className="text-sm text-slate-400 mt-1">أضف عملاء وقضايا أولاً لإنشاء التقارير</p>
        </div>
      )}

      {/* Info */}
      <div className="card bg-sky-50 border-sky-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Printer size={20} className="text-white" />
          </div>
          <div>
            <h4 className="font-bold text-sky-900 mb-1">طباعة التقارير</h4>
            <p className="text-sm text-sky-700 leading-relaxed">
              عند الضغط على طباعة، سيتم فتح نافذة معاينة التقرير بصيغة PDF جاهزة للطباعة أو الحفظ.
              يمكنك حفظ التقرير كملف PDF من خلال اختيار "حفظ كـ PDF" في نافذة الطباعة.
              تقرير العميل الفردي متاح من صفحة تفاصيل كل عميل.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
