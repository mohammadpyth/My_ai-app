import { useState, useEffect } from 'react';
import { Users, Briefcase, Gavel, Wallet, TrendingUp, Calendar, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client, Case, Session, Payment } from '@/lib/supabase';

type Tab = 'dashboard' | 'clients' | 'cases' | 'sessions' | 'finances' | 'reports' | 'backup';

export default function Dashboard({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const [stats, setStats] = useState({
    clients: 0,
    cases: 0,
    openCases: 0,
    sessions: 0,
    upcomingSessions: 0,
    totalFees: 0,
    totalPaid: 0,
    totalRemaining: 0,
  });
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<(Session & { case?: Case })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const [clientsRes, casesRes, openCasesRes, sessionsRes, upcomingRes, paymentsRes] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('cases').select('*', { count: 'exact', head: true }),
      supabase.from('cases').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('sessions').select('*', { count: 'exact', head: true }),
      supabase
        .from('sessions')
        .select('*, case:cases(*)')
        .gte('session_date', today)
        .order('session_date', { ascending: true })
        .limit(5),
      supabase.from('payments').select('*'),
    ]);

    const recentClientsRes = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    const payments = (paymentsRes.data || []) as Payment[];
    const totalFees = payments.reduce((sum, p) => sum + Number(p.total_fee), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.paid_amount), 0);

    setStats({
      clients: clientsRes.count || 0,
      cases: casesRes.count || 0,
      openCases: openCasesRes.count || 0,
      sessions: sessionsRes.count || 0,
      upcomingSessions: upcomingRes.count || 0,
      totalFees,
      totalPaid,
      totalRemaining: totalFees - totalPaid,
    });
    setRecentClients((recentClientsRes.data || []) as Client[]);
    setUpcomingSessions((upcomingRes.data || []) as (Session & { case?: Case })[]);
    setLoading(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const statCards = [
    {
      label: 'إجمالي العملاء',
      value: stats.clients,
      icon: Users,
      color: 'sky',
      tab: 'clients' as Tab,
    },
    {
      label: 'إجمالي القضايا',
      value: stats.cases,
      sub: `${stats.openCases} قضية مفتوحة`,
      icon: Briefcase,
      color: 'emerald',
      tab: 'cases' as Tab,
    },
    {
      label: 'الجلسات القادمة',
      value: stats.upcomingSessions,
      sub: `من ${stats.sessions} جلسة`,
      icon: Gavel,
      color: 'amber',
      tab: 'sessions' as Tab,
    },
    {
      label: 'المتبقي المستحق',
      value: `${stats.totalRemaining.toLocaleString('ar-EG')} ر.س`,
      sub: `مدفوع: ${stats.totalPaid.toLocaleString('ar-EG')} ر.س`,
      icon: Wallet,
      color: 'rose',
      tab: 'finances' as Tab,
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    sky: { bg: 'from-sky-50 to-sky-100', text: 'text-sky-700', iconBg: 'bg-sky-600' },
    emerald: { bg: 'from-emerald-50 to-emerald-100', text: 'text-emerald-700', iconBg: 'bg-emerald-600' },
    amber: { bg: 'from-amber-50 to-amber-100', text: 'text-amber-700', iconBg: 'bg-amber-500' },
    rose: { bg: 'from-rose-50 to-rose-100', text: 'text-rose-700', iconBg: 'bg-rose-600' },
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
      {/* Welcome Banner */}
      <div className="bg-gradient-to-l from-slate-900 to-slate-800 rounded-2xl p-8 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <ScalePattern />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-2">مرحباً بك في مكتب فتيان للمحاماة</h2>
          <p className="text-slate-300 text-sm">نظام إدارة متكامل للعملاء والقضايا والشئون المالية</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-slate-300 text-xs">آخر تحديث</span>
              <p className="text-white text-sm font-medium">{formatDate(new Date().toISOString())}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const colors = colorMap[card.color];
          return (
            <button
              key={card.label}
              onClick={() => onNavigate(card.tab)}
              className={`stat-card text-right bg-gradient-to-bl ${colors.bg} border-0 hover:scale-[1.02] cursor-pointer group`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 ${colors.iconBg} rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
              <p className={`text-2xl font-bold ${colors.text}`}>{card.value}</p>
              <p className="text-slate-600 text-sm mt-1">{card.label}</p>
              {card.sub && <p className="text-slate-500 text-xs mt-0.5">{card.sub}</p>}
            </button>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={20} className="text-sky-600" />
              الجلسات القادمة
            </h3>
            <button
              onClick={() => onNavigate('sessions')}
              className="text-sky-600 text-sm font-medium hover:text-sky-700 flex items-center gap-1 transition-colors"
            >
              عرض الكل
              <ArrowLeft size={14} />
            </button>
          </div>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Gavel size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">لا توجد جلسات قادمة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((session) => {
                const daysUntil = Math.ceil(
                  (new Date(session.session_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                          daysUntil <= 3 ? 'bg-rose-500 pulse-ring' : daysUntil <= 7 ? 'bg-amber-500' : 'bg-sky-500'
                        }`}
                      >
                        {daysUntil === 0 ? 'اليوم' : daysUntil <= 1 ? 'غداً' : `${daysUntil}ي`}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {session.case?.title || 'قضية'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(session.session_date)}
                          {session.session_time ? ` - ${session.session_time}` : ''}
                        </p>
                      </div>
                    </div>
                    {session.location && (
                      <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">
                        {session.location}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Clients */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users size={20} className="text-sky-600" />
              أحدث العملاء
            </h3>
            <button
              onClick={() => onNavigate('clients')}
              className="text-sky-600 text-sm font-medium hover:text-sky-700 flex items-center gap-1 transition-colors"
            >
              عرض الكل
              <ArrowLeft size={14} />
            </button>
          </div>
          {recentClients.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">لا يوجد عملاء بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-bold text-sm">
                    {client.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{client.name}</p>
                    <p className="text-xs text-slate-500">{client.phone || 'لا يوجد هاتف'}</p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(client.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="card">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-sky-600" />
          الملخص المالي
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-emerald-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{stats.totalFees.toLocaleString('ar-EG')}</p>
            <p className="text-sm text-emerald-600 mt-1">إجمالي الأتعاب (ر.س)</p>
          </div>
          <div className="bg-sky-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-sky-700">{stats.totalPaid.toLocaleString('ar-EG')}</p>
            <p className="text-sm text-sky-600 mt-1">إجمالي المدفوع (ر.س)</p>
          </div>
          <div className="bg-rose-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-rose-700">{stats.totalRemaining.toLocaleString('ar-EG')}</p>
            <p className="text-sm text-rose-600 mt-1">إجمالي المتبقي (ر.س)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScalePattern() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M200 20L200 180M150 50L250 50M120 100L280 100M100 150L300 150" stroke="white" strokeWidth="1" />
      <circle cx="200" cy="40" r="8" fill="white" />
      <rect x="180" y="180" width="40" height="4" fill="white" rx="2" />
    </svg>
  );
}
