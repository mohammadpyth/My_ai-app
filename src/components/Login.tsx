import { useState, useEffect } from 'react';
import { Scale, Mail, Lock, User, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function Login({ onAuth }: { onAuth: (user: SupabaseUser) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (err) throw err;
        if (data.user) {
          onAuth(data.user);
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (data.user) {
          onAuth(data.user);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      if (msg.includes('Invalid login credentials')) {
        setError('بيانات الدخول غير صحيحة');
      } else if (msg.includes('User already registered')) {
        setError('هذا البريد الإلكتروني مسجل بالفعل');
      } else if (msg.includes('Password should be at least')) {
        setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      } else if (msg.includes('Unable to validate email')) {
        setError('البريد الإلكتروني غير صالح');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 flex items-center justify-center p-4">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-sky-600 rounded-2xl shadow-2xl mb-4">
            <Scale size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">مكتب فتيان للمحاماة</h1>
          <p className="text-slate-400 text-sm mt-1">والاستشارات القانونية</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 fade-in">
          {/* Tab Switch */}
          <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === 'signin'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LogIn size={16} />
              تسجيل الدخول
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserPlus size={16} />
              حساب جديد
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label-field">الاسم الكامل</label>
                <div className="relative">
                  <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field pr-10"
                    placeholder="اسم المحامي أو الموظف"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="label-field">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pr-10"
                  placeholder="email@example.com"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="label-field">كلمة المرور</label>
              <div className="relative">
                <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center gap-2 fade-in">
                <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-base py-3 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  جاري المعالجة...
                </>
              ) : mode === 'signin' ? (
                <>
                  <LogIn size={20} />
                  دخول
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  إنشاء حساب
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            {mode === 'signin'
              ? 'الدخول مخصص للمحامين والموظفين المعتمدين بالمكتب'
              : 'إنشاء حساب جديد للموظفين المعتمدين بالمكتب'}
          </p>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          جميع البيانات محمية وسرية — مكتب فتيان للمحاماة 2026
        </p>
      </div>
    </div>
  );
}
