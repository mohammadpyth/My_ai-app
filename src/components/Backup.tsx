import { useState } from 'react';
import { Download, Upload, Database, CheckCircle2, AlertCircle, FileJson } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client, Case, Session, Payment } from '@/lib/supabase';

export default function Backup() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const [clientsRes, casesRes, sessionsRes, paymentsRes] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('cases').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('payments').select('*'),
      ]);

      const backup = {
        metadata: {
          office: 'مكتب فتيان للمحاماة والاستشارات القانونية',
          exportDate: new Date().toISOString(),
          version: '1.0',
          counts: {
            clients: (clientsRes.data || []).length,
            cases: (casesRes.data || []).length,
            sessions: (sessionsRes.data || []).length,
            payments: (paymentsRes.data || []).length,
          },
        },
        clients: clientsRes.data || [],
        cases: casesRes.data || [],
        sessions: sessionsRes.data || [],
        payments: paymentsRes.data || [],
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `backup-fitiyan-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastBackup(new Date().toLocaleString('ar-EG'));
      setMessage({
        type: 'success',
        text: `تم تصدير النسخة الاحتياطية بنجاح. تشمل: ${backup.metadata.counts.clients} عميل، ${backup.metadata.counts.cases} قضية، ${backup.metadata.counts.sessions} جلسة، ${backup.metadata.counts.payments} سجل مالي.`,
      });
    } catch {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء التصدير. يرجى المحاولة مرة أخرى.' });
    }
    setExporting(false);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('استيراد البيانات سيحل محل البيانات الحالية. هل أنت متأكد؟')) {
      event.target.value = '';
      return;
    }

    setImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.clients || !backup.cases || !backup.sessions || !backup.payments) {
        throw new Error('ملف غير صالح');
      }

      // Clear existing data
      await Promise.all([
        supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('cases').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);

      // Insert in order (clients → cases → sessions/payments)
      const clients = backup.clients as Client[];
      const cases = backup.cases as Case[];
      const sessions = backup.sessions as Session[];
      const payments = backup.payments as Payment[];

      if (clients.length > 0) {
        const { error: err1 } = await supabase.from('clients').insert(clients);
        if (err1) throw err1;
      }
      if (cases.length > 0) {
        const { error: err2 } = await supabase.from('cases').insert(cases);
        if (err2) throw err2;
      }
      if (sessions.length > 0) {
        const { error: err3 } = await supabase.from('sessions').insert(sessions);
        if (err3) throw err3;
      }
      if (payments.length > 0) {
        const { error: err4 } = await supabase.from('payments').insert(payments);
        if (err4) throw err4;
      }

      setMessage({
        type: 'success',
        text: `تم استيراد البيانات بنجاح: ${clients.length} عميل، ${cases.length} قضية، ${sessions.length} جلسة، ${payments.length} سجل مالي.`,
      });
    } catch {
      setMessage({ type: 'error', text: 'فشل استيراد البيانات. تأكد من صحة الملف.' });
    }
    setImporting(false);
    event.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Info Banner */}
      <div className="bg-gradient-to-l from-sky-50 to-sky-100 border border-sky-200 rounded-xl p-5 flex items-start gap-4">
        <div className="w-12 h-12 bg-sky-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Database size={24} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sky-900 mb-1">المزامنة والنسخ الاحتياطي</h3>
          <p className="text-sm text-sky-700">
            جميع بياناتك محفوظة على السحابة ومتزامنة تلقائياً عبر جميع الأجهزة. يمكنك أيضاً تصدير نسخة
            احتياطية كملف للاحتفاظ بها محلياً، أو استيرادها لاستعادة البيانات.
          </p>
        </div>
      </div>

      {/* Export Section */}
      <div className="card">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download size={24} className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg">تصدير نسخة احتياطية</h3>
            <p className="text-sm text-slate-500 mt-1">
              احفظ نسخة كاملة من جميع البيانات (العملاء، القضايا، الجلسات، السجلات المالية) كملف JSON
              على جهازك.
            </p>
          </div>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-primary w-full sm:w-auto">
          {exporting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              جاري التصدير...
            </>
          ) : (
            <>
              <Download size={20} />
              تصدير البيانات
            </>
          )}
        </button>
        {lastBackup && (
          <p className="text-xs text-slate-400 mt-3">آخر نسخة تم تصديرها: {lastBackup}</p>
        )}
      </div>

      {/* Import Section */}
      <div className="card">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Upload size={24} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg">استيراد نسخة احتياطية</h3>
            <p className="text-sm text-slate-500 mt-1">
              استعد البيانات من ملف نسخة احتياطية. سيتم استبدال جميع البيانات الحالية بالبيانات المستوردة.
            </p>
          </div>
        </div>
        <label className={`btn-primary w-full sm:w-auto cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
          {importing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              جاري الاستيراد...
            </>
          ) : (
            <>
              <Upload size={20} />
              استيراد البيانات
            </>
          )}
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl p-4 flex items-start gap-3 fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-rose-50 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={20} className="text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
            {message.text}
          </p>
        </div>
      )}

      {/* File Format Info */}
      <div className="card bg-slate-50">
        <div className="flex items-center gap-3 mb-3">
          <FileJson size={20} className="text-slate-500" />
          <h4 className="font-medium text-slate-700">معلومات حول ملف النسخة الاحتياطية</h4>
        </div>
        <ul className="text-sm text-slate-500 space-y-2 list-disc list-inside">
          <li>الملف بتنسيق JSON يحتوي على جميع البيانات</li>
          <li>يمكن حفظ عدة نسخ باختلاف التواريخ</li>
          <li>البيانات السحابية متزامنة دائماً عبر الأجهزة</li>
          <li>يُنصح بعمل نسخة احتياطية دورية للحفاظ على البيانات</li>
        </ul>
      </div>
    </div>
  );
}
