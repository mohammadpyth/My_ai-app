import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Briefcase, Gavel, Wallet, Download, Menu, X, Scale, FileText, LogOut } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import Clients from '@/components/Clients';
import Cases from '@/components/Cases';
import Sessions from '@/components/Sessions';
import Finances from '@/components/Finances';
import Backup from '@/components/Backup';
import Reports from '@/components/Reports';

type Tab = 'dashboard' | 'clients' | 'cases' | 'sessions' | 'finances' | 'reports' | 'backup';

const navItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'clients', label: 'العملاء', icon: Users },
  { id: 'cases', label: 'القضايا', icon: Briefcase },
  { id: 'sessions', label: 'الجلسات', icon: Gavel },
  { id: 'finances', label: 'الشئون المالية', icon: Wallet },
  { id: 'reports', label: 'التقارير', icon: FileText },
  { id: 'backup', label: 'النسخ الاحتياطي', icon: Download },
];

function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [upcomingCount, setUpcomingCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setAuthChecked(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthChecked(true);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchUpcomingSessions();
      const interval = setInterval(fetchUpcomingSessions, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUpcomingSessions = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('session_date', today);
    setUpcomingCount(count || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleNavigate = (tab: Tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onAuth={setUser} />;
  }

  const userName =
    (user.user_metadata as { full_name?: string } | null)?.full_name ||
    user.email?.split('@')[0] ||
    'مستخدم';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-gradient-to-b from-slate-900 to-slate-800 fixed inset-y-0 right-0 shadow-xl z-30">
        <SidebarContent
          activeTab={activeTab}
          onNavigate={handleNavigate}
          upcomingCount={upcomingCount}
          userName={userName}
          userEmail={user.email || ''}
          onLogout={handleLogout}
        />
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 right-0 w-72 bg-gradient-to-b from-slate-900 to-slate-800 shadow-xl z-50 lg:hidden slide-in">
            <SidebarContent
              activeTab={activeTab}
              onNavigate={handleNavigate}
              upcomingCount={upcomingCount}
              userName={userName}
              userEmail={user.email || ''}
              onLogout={handleLogout}
            />
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:mr-72 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Menu size={22} className="text-slate-700" />
              </button>
              <h1 className="text-lg font-bold text-slate-800">
                {navItems.find((item) => item.id === activeTab)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {upcomingCount > 0 && (
                <div className="flex items-center gap-2 bg-sky-50 text-sky-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                  <Gavel size={16} />
                  <span>{upcomingCount} جلسة قادمة</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                <Scale size={18} className="text-sky-600" />
                <span className="text-sm font-medium text-slate-700 hidden sm:inline">فتيان للمحاماة</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto fade-in" key={activeTab}>
            {activeTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
            {activeTab === 'clients' && <Clients />}
            {activeTab === 'cases' && <Cases />}
            {activeTab === 'sessions' && <Sessions />}
            {activeTab === 'finances' && <Finances />}
            {activeTab === 'reports' && <Reports />}
            {activeTab === 'backup' && <Backup />}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  activeTab,
  onNavigate,
  upcomingCount,
  userName,
  userEmail,
  onLogout,
}: {
  activeTab: Tab;
  onNavigate: (tab: Tab) => void;
  upcomingCount: number;
  userName: string;
  userEmail: string;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-sky-600 rounded-xl flex items-center justify-center shadow-lg">
            <Scale size={26} className="text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base leading-tight">مكتب فتيان</h2>
            <p className="text-slate-400 text-xs">للمحاماة والاستشارات القانونية</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} className={isActive ? '' : 'group-hover:scale-110 transition-transform'} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              {item.id === 'sessions' && upcomingCount > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-sky-500/20 text-sky-300'
                  }`}
                >
                  {upcomingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-9 h-9 bg-sky-600/30 rounded-full flex items-center justify-center text-sky-300 font-bold text-sm flex-shrink-0">
            {userName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">{userName}</p>
            <p className="text-slate-400 text-xs truncate" dir="ltr">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 transition-colors text-sm font-medium"
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
        <p className="text-slate-500 text-xs text-center mt-3">جميع البيانات متزامنة عبر الأجهزة</p>
      </div>
    </>
  );
}

export default App;
