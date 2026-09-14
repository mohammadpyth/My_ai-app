import type { Client, Case, Session, Payment } from '@/lib/supabase';

const formatDate = (date: string | null) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatCurrency = (amount: number) => `${Number(amount).toLocaleString('ar-EG')} ر.س`;

const statusLabels: Record<string, string> = {
  open: 'مفتوحة',
  closed: 'مغلقة',
  adjourned: 'مؤجلة',
};

const paymentMethodLabels: Record<string, string> = {
  cash: 'نقداً',
  transfer: 'تحويل بنكي',
  check: 'شيك',
  card: 'بطاقة',
};

const escapeHtml = (text: string | null): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

function getOfficeHeader(title: string): string {
  const now = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return `
    <div class="report-header">
      <div class="header-logo">
        <div class="logo-circle">⚖</div>
      </div>
      <div class="header-info">
        <h1>مكتب فتيان للمحاماة والاستشارات القانونية</h1>
        <p class="report-title">${escapeHtml(title)}</p>
        <p class="report-date">تاريخ التقرير: ${now}</p>
      </div>
    </div>
    <div class="header-divider"></div>
  `;
}

function getClientReportHTML(
  client: Client,
  cases: Case[],
  sessions: Session[],
  payments: Payment[]
): string {
  const totalFees = payments.reduce((sum, p) => sum + Number(p.total_fee), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.paid_amount), 0);
  const totalRemaining = totalFees - totalPaid;

  const casesRows = cases.length
    ? cases
        .map(
          (c) => `
      <tr>
        <td>${escapeHtml(c.case_number)}</td>
        <td>${escapeHtml(c.title)}</td>
        <td>${escapeHtml(c.case_type) || '—'}</td>
        <td>${escapeHtml(c.court) || '—'}</td>
        <td>${escapeHtml(c.opponent) || '—'}</td>
        <td><span class="status-badge status-${c.status}">${statusLabels[c.status]}</span></td>
      </tr>`
        )
        .join('')
    : '<tr><td colspan="6" class="empty-state">لا توجد قضايا لهذا العميل</td></tr>';

  const sessionsRows = sessions.length
    ? sessions
        .map(
          (s) => {
            const caseTitle = cases.find((c) => c.id === s.case_id)?.title || '—';
            return `
      <tr>
        <td>${escapeHtml(caseTitle)}</td>
        <td>${formatDate(s.session_date)}</td>
        <td>${s.session_time || '—'}</td>
        <td>${escapeHtml(s.location) || '—'}</td>
        <td>${s.attended ? '✓ تم الحضور' : 'لم يحضر'}</td>
      </tr>`;
          }
        )
        .join('')
    : '<tr><td colspan="5" class="empty-state">لا توجد جلسات</td></tr>';

  const paymentsRows = payments.length
    ? payments
        .map((p) => {
          const caseTitle = cases.find((c) => c.id === p.case_id)?.title || '—';
          const remaining = Number(p.total_fee) - Number(p.paid_amount);
          return `
      <tr>
        <td>${escapeHtml(caseTitle)}</td>
        <td>${formatCurrency(Number(p.total_fee))}</td>
        <td>${formatCurrency(Number(p.paid_amount))}</td>
        <td>${formatCurrency(remaining)}</td>
        <td>${formatDate(p.payment_date)}</td>
        <td>${p.payment_method ? paymentMethodLabels[p.payment_method] || p.payment_method : '—'}</td>
      </tr>`;
        })
        .join('')
    : '<tr><td colspan="6" class="empty-state">لا توجد سجلات مالية</td></tr>';

  return `
    ${getOfficeHeader(`تقرير العميل: ${client.name}`)}

    <div class="section">
      <h2 class="section-title">البيانات الشخصية</h2>
      <div class="info-grid">
        <div class="info-item"><span class="info-label">الاسم:</span> ${escapeHtml(client.name)}</div>
        <div class="info-item"><span class="info-label">الهاتف:</span> ${escapeHtml(client.phone) || '—'}</div>
        <div class="info-item"><span class="info-label">البريد الإلكتروني:</span> ${escapeHtml(client.email) || '—'}</div>
        <div class="info-item"><span class="info-label">الرقم القومي:</span> ${escapeHtml(client.national_id) || '—'}</div>
        <div class="info-item"><span class="info-label">العنوان:</span> ${escapeHtml(client.address) || '—'}</div>
        <div class="info-item"><span class="info-label">عميل منذ:</span> ${formatDate(client.created_at)}</div>
      </div>
      ${client.notes ? `<div class="info-item full"><span class="info-label">ملاحظات:</span> ${escapeHtml(client.notes)}</div>` : ''}
    </div>

    <div class="section">
      <h2 class="section-title">القضايا (${cases.length})</h2>
      <table class="report-table">
        <thead>
          <tr>
            <th>رقم القضية</th>
            <th>العنوان</th>
            <th>النوع</th>
            <th>المحكمة</th>
            <th>الخصم</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>${casesRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">الجلسات (${sessions.length})</h2>
      <table class="report-table">
        <thead>
          <tr>
            <th>القضية</th>
            <th>التاريخ</th>
            <th>الوقت</th>
            <th>المكان</th>
            <th>الحضور</th>
          </tr>
        </thead>
        <tbody>${sessionsRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">الحسابات المالية (${payments.length})</h2>
      <table class="report-table">
        <thead>
          <tr>
            <th>القضية</th>
            <th>الأتعاب</th>
            <th>المدفوع</th>
            <th>المتبقي</th>
            <th>تاريخ السداد</th>
            <th>طريقة الدفع</th>
          </tr>
        </thead>
        <tbody>${paymentsRows}</tbody>
      </table>
      <div class="financial-summary">
        <div class="summary-item">
          <span class="summary-label">إجمالي الأتعاب</span>
          <span class="summary-value">${formatCurrency(totalFees)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">إجمالي المدفوع</span>
          <span class="summary-value paid">${formatCurrency(totalPaid)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">إجمالي المتبقي</span>
          <span class="summary-value remaining">${formatCurrency(totalRemaining)}</span>
        </div>
      </div>
    </div>

    <div class="report-footer">
      <p>تم إنشاء هذا التقرير بواسطة نظام إدارة مكتب فتيان للمحاماة</p>
    </div>
  `;
}

function getComprehensiveReportHTML(
  clients: Client[],
  cases: Case[],
  sessions: Session[],
  payments: Payment[]
): string {
  const totalFees = payments.reduce((sum, p) => sum + Number(p.total_fee), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.paid_amount), 0);
  const totalRemaining = totalFees - totalPaid;
  const openCases = cases.filter((c) => c.status === 'open').length;
  const closedCases = cases.filter((c) => c.status === 'closed').length;
  const adjournedCases = cases.filter((c) => c.status === 'adjourned').length;

  const today = new Date().toISOString().split('T')[0];
  const upcomingSessions = sessions.filter((s) => s.session_date >= today).length;
  const pastSessions = sessions.filter((s) => s.session_date < today).length;

  // Clients with outstanding balances
  const clientsWithBalance = clients
    .map((client) => {
      const clientCases = cases.filter((c) => c.client_id === client.id);
      const clientCaseIds = clientCases.map((c) => c.id);
      const clientPayments = payments.filter((p) => clientCaseIds.includes(p.case_id));
      const fees = clientPayments.reduce((sum, p) => sum + Number(p.total_fee), 0);
      const paid = clientPayments.reduce((sum, p) => sum + Number(p.paid_amount), 0);
      const remaining = fees - paid;
      return { client, caseCount: clientCases.length, fees, paid, remaining };
    })
    .filter((item) => item.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  const clientsRows = clients.length
    ? clients
        .map((client) => {
          const clientCases = cases.filter((c) => c.client_id === client.id);
          const clientCaseIds = clientCases.map((c) => c.id);
          const clientPayments = payments.filter((p) => clientCaseIds.includes(p.case_id));
          const fees = clientPayments.reduce((sum, p) => sum + Number(p.total_fee), 0);
          const paid = clientPayments.reduce((sum, p) => sum + Number(p.paid_amount), 0);
          const remaining = fees - paid;
          return `
        <tr>
          <td>${escapeHtml(client.name)}</td>
          <td>${escapeHtml(client.phone) || '—'}</td>
          <td>${clientCases.length}</td>
          <td>${formatCurrency(fees)}</td>
          <td>${formatCurrency(paid)}</td>
          <td class="${remaining > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(remaining)}</td>
        </tr>`;
        })
        .join('')
    : '<tr><td colspan="6" class="empty-state">لا يوجد عملاء</td></tr>';

  const casesRows = cases.length
    ? cases
        .map((c) => {
          const clientName = clients.find((cl) => cl.id === c.client_id)?.name || '—';
          return `
        <tr>
          <td>${escapeHtml(c.case_number)}</td>
          <td>${escapeHtml(c.title)}</td>
          <td>${escapeHtml(clientName)}</td>
          <td>${escapeHtml(c.case_type) || '—'}</td>
          <td>${escapeHtml(c.court) || '—'}</td>
          <td><span class="status-badge status-${c.status}">${statusLabels[c.status]}</span></td>
        </tr>`;
        })
        .join('')
    : '<tr><td colspan="6" class="empty-state">لا يوجد قضايا</td></tr>';

  const overdueRows = clientsWithBalance.length
    ? clientsWithBalance
        .map(
          (item) => `
      <tr>
        <td>${escapeHtml(item.client.name)}</td>
        <td>${escapeHtml(item.client.phone) || '—'}</td>
        <td>${item.caseCount}</td>
        <td>${formatCurrency(item.fees)}</td>
        <td>${formatCurrency(item.paid)}</td>
        <td class="text-danger bold">${formatCurrency(item.remaining)}</td>
      </tr>`
        )
        .join('')
    : '<tr><td colspan="6" class="empty-state">لا توجد متأخرات</td></tr>';

  return `
    ${getOfficeHeader('التقرير الشامل - جميع العملاء والقضايا والمالية')}

    <div class="section">
      <h2 class="section-title">ملخص إحصائي</h2>
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-number">${clients.length}</div><div class="stat-label">إجمالي العملاء</div></div>
        <div class="stat-box"><div class="stat-number">${cases.length}</div><div class="stat-label">إجمالي القضايا</div></div>
        <div class="stat-box"><div class="stat-number">${openCases}</div><div class="stat-label">قضايا مفتوحة</div></div>
        <div class="stat-box"><div class="stat-number">${closedCases}</div><div class="stat-label">قضايا مغلقة</div></div>
        <div class="stat-box"><div class="stat-number">${upcomingSessions}</div><div class="stat-label">جلسات قادمة</div></div>
        <div class="stat-box"><div class="stat-number">${pastSessions}</div><div class="stat-label">جلسات سابقة</div></div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">الملخص المالي</h2>
      <div class="financial-summary">
        <div class="summary-item">
          <span class="summary-label">إجمالي الأتعاب</span>
          <span class="summary-value">${formatCurrency(totalFees)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">إجمالي المدفوع</span>
          <span class="summary-value paid">${formatCurrency(totalPaid)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">إجمالي المتبقي (المتأخرات)</span>
          <span class="summary-value remaining">${formatCurrency(totalRemaining)}</span>
        </div>
      </div>
    </div>

    <div class="section page-break">
      <h2 class="section-title">قائمة العملاء (${clients.length})</h2>
      <table class="report-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الهاتف</th>
            <th>عدد القضايا</th>
            <th>الأتعاب</th>
            <th>المدفوع</th>
            <th>المتبقي</th>
          </tr>
        </thead>
        <tbody>${clientsRows}</tbody>
      </table>
    </div>

    <div class="section page-break">
      <h2 class="section-title">قائمة القضايا (${cases.length})</h2>
      <table class="report-table">
        <thead>
          <tr>
            <th>رقم القضية</th>
            <th>العنوان</th>
            <th>العميل</th>
            <th>النوع</th>
            <th>المحكمة</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>${casesRows}</tbody>
      </table>
    </div>

    <div class="section page-break">
      <h2 class="section-title">المتأخرات المالية (${clientsWithBalance.length})</h2>
      <table class="report-table">
        <thead>
          <tr>
            <th>العميل</th>
            <th>الهاتف</th>
            <th>عدد القضايا</th>
            <th>الأتعاب</th>
            <th>المدفوع</th>
            <th>المتأخر</th>
          </tr>
        </thead>
        <tbody>${overdueRows}</tbody>
      </table>
    </div>

    <div class="report-footer">
      <p>تم إنشاء هذا التقرير بواسطة نظام إدارة مكتب فتيان للمحاماة</p>
    </div>
  `;
}

const printStyles = `
  <style>
    * { font-family: 'Tajawal', 'Cairo', Arial, sans-serif !important; box-sizing: border-box; }
    body { direction: rtl; margin: 0; padding: 20px; color: #1e293b; background: #fff; }
    .report-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
    .header-logo { flex-shrink: 0; }
    .logo-circle { width: 60px; height: 60px; background: #0369a1; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #fff; }
    .header-info h1 { font-size: 20px; margin: 0; color: #0c4a6e; font-weight: 700; }
    .report-title { font-size: 16px; color: #0369a1; margin: 4px 0; font-weight: 500; }
    .report-date { font-size: 12px; color: #64748b; margin: 0; }
    .header-divider { height: 3px; background: linear-gradient(to left, #0369a1, #0ea5e9, transparent); border-radius: 2px; margin-bottom: 24px; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 16px; font-weight: 700; color: #0c4a6e; border-bottom: 2px solid #e0f2fe; padding-bottom: 8px; margin: 0 0 16px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 24px; background: #f8fafc; border-radius: 8px; padding: 16px; }
    .info-item { font-size: 13px; }
    .info-item.full { grid-column: 1 / -1; margin-top: 4px; }
    .info-label { color: #64748b; font-weight: 500; margin-left: 4px; }
    .report-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .report-table thead tr { background: #f1f5f9; }
    .report-table th { text-align: right; padding: 10px 12px; font-weight: 600; color: #334155; border: 1px solid #e2e8f0; white-space: nowrap; }
    .report-table td { padding: 8px 12px; border: 1px solid #e2e8f0; color: #475569; }
    .report-table tbody tr:hover { background: #f8fafc; }
    .empty-state { text-align: center; color: #94a3b8; padding: 20px !important; }
    .status-badge { padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; white-space: nowrap; }
    .status-open { background: #dcfce7; color: #15803d; }
    .status-closed { background: #e2e8f0; color: #475569; }
    .status-adjourned { background: #fef3c7; color: #b45309; }
    .financial-summary { display: flex; gap: 16px; margin-top: 16px; }
    .summary-item { flex: 1; background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center; }
    .summary-label { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .summary-value { display: block; font-size: 18px; font-weight: 700; color: #0c4a6e; }
    .summary-value.paid { color: #15803d; }
    .summary-value.remaining { color: #dc2626; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
    .stat-number { font-size: 24px; font-weight: 700; color: #0369a1; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
    .text-danger { color: #dc2626; }
    .text-success { color: #15803d; }
    .bold { font-weight: 700; }
    .report-footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
    .page-break { page-break-before: auto; }
    @page { margin: 15mm; size: A4; }
    @media print { .page-break { page-break-before: always; } body { padding: 0; } }
  </style>
`;

function openPrintWindow(htmlContent: string) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير');
    return;
  }
  printWindow.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير - مكتب فتيان للمحاماة</title>${printStyles}</head><body>${htmlContent}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

export function printClientReport(
  client: Client,
  cases: Case[],
  sessions: Session[],
  payments: Payment[]
) {
  const html = getClientReportHTML(client, cases, sessions, payments);
  openPrintWindow(html);
}

export function printComprehensiveReport(
  clients: Client[],
  cases: Case[],
  sessions: Session[],
  payments: Payment[]
) {
  const html = getComprehensiveReportHTML(clients, cases, sessions, payments);
  openPrintWindow(html);
}
