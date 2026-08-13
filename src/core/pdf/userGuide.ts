import jsPDF from 'jspdf';

export function downloadUserGuidePdf(): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Cover Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('FAMILY ACCOUNTING SYSTEM', 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(129, 140, 248); // Indigo-400
  doc.text('User Guide & Operating Manual (English & Bangla)', 14, 30);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text('Offline-First Architecture • Double-Entry Ledger • Multi-Device Sync', 14, 38);

  let y = 55;

  const sections = [
    {
      title: '1. Overview & Offline Operations',
      body: 'The application operates 100% offline using IndexedDB storage. Internet connection is required only when synchronizing data across multiple family devices. The database starts completely empty and requires no hard-coded configuration.',
    },
    {
      title: '2. Dynamic Family Members & Accounts',
      body: 'Navigate to "Members & Accounts" to add family members (Self, Spouse, Children, etc.) and create accounts (Cash, Bank Accounts, Family Funds, and Personal Savings). Custom dynamic categories can be added under "Categories".',
    },
    {
      title: '3. Allocation Rules & Percentage Split Engine',
      body: 'Configure dynamic accounting rules in "Allocation Rules". Rules automatically split incoming income or outgoing expenses across multiple member accounts using exact percentages (e.g. 60% Member A, 40% Member B) summing to 100%.',
    },
    {
      title: '4. Recording Transactions & Vouchers',
      body: 'Click "New Transaction" to log income or expenses. Select an active Allocation Rule to auto-split funds, or pick direct source/destination accounts. You can also upload or snap receipt photos for visual voucher proof.',
    },
    {
      title: '5. Financial Statements & PDF Export',
      body: 'Access the "Reports" section to view Income & Expense Statements, Balance Sheets (Assets = Liabilities + Equity), and Receipts & Payments reports. All reports support Gregorian & Bangla Hijri date filters and client-side PDF downloads.',
    },
    {
      title: '6. Backup, Security PIN & Data Integrity',
      body: 'In "Backup & Sync", export encrypted JSON backups for safekeeping. Set up a security PIN in "Settings" to protect sensitive family financial data on shared devices.',
    },
  ];

  sections.forEach((sec) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(sec.title, 14, y);

    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate-600

    const splitText = doc.splitTextToSize(sec.body, pageWidth - 28);
    doc.text(splitText, 14, y);

    y += splitText.length * 5 + 6;
  });

  // Footer
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Family Accounting Management • User Guide • Page ${i} of ${totalPages}`, pageWidth / 2, 288, {
      align: 'center',
    });
  }

  doc.save('Family_Accounting_User_Guide.pdf');
}
