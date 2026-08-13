import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../i18n/translations';
import { Language } from '../../types';

export interface ReportExportData {
  title: string;
  familyName: string;
  periodLabel: string;
  currencySymbol: string;
  lang: Language;
  headers: string[];
  rows: (string | number)[][];
  summaryCards?: { label: string; value: string }[];
}

export function generatePdfReport(data: ReportExportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(data.familyName.toUpperCase(), 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240); // Slate-200
  doc.text(data.title, 14, 20);

  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString()} | Period: ${data.periodLabel}`, pageWidth - 14, 20, {
    align: 'right',
  });

  let currentY = 36;

  // Summary Cards
  if (data.summaryCards && data.summaryCards.length > 0) {
    const cardWidth = (pageWidth - 28 - (data.summaryCards.length - 1) * 4) / data.summaryCards.length;
    
    data.summaryCards.forEach((card, idx) => {
      const x = 14 + idx * (cardWidth + 4);
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.roundedRect(x, currentY, cardWidth, 16, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(card.label.toUpperCase(), x + 4, currentY + 6);

      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text(card.value, x + 4, currentY + 13);
    });

    currentY += 22;
  }

  // Data Table
  autoTable(doc, {
    startY: currentY,
    head: [data.headers],
    body: data.rows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85], // Slate-700
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    margin: { left: 14, right: 14 },
  });

  // Footer & Page Numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(
      `Family Accounting System • Confidentially Prepared • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      288,
      { align: 'center' }
    );
  }

  doc.save(`${data.title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}
