// ─────────────────────────────────────────────────────────────
// WHITE LIONS ACADEMY — PDF Report Generator
// Uses jsPDF + jspdf-autotable (browser-compatible)
// Install: npm install jspdf jspdf-autotable
// ─────────────────────────────────────────────────────────────

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MonthlyReportData, ReportMatch } from './report-types';

// ── Brand Colors (from White Lions logo) ─────────────────────

const C = {
  NAVY:       [28, 43, 74]   as [number, number, number],  // #1C2B4A
  BLUE:       [37, 99, 235]  as [number, number, number],  // #2563EB
  GOLD:       [245, 158, 11] as [number, number, number],  // #F59E0B
  WHITE:      [255, 255, 255] as [number, number, number],
  LIGHT:      [240, 244, 255] as [number, number, number], // #F0F4FF
  LIGHT_GRAY: [248, 250, 252] as [number, number, number], // #F8FAFC
  MID_GRAY:   [226, 232, 240] as [number, number, number], // #E2E8F0
  TEXT_GRAY:  [100, 116, 139] as [number, number, number], // #64748B
  GREEN:      [16, 185, 129]  as [number, number, number], // #10B981 (perfect attendance)
  GREEN_BG:   [209, 250, 229] as [number, number, number], // #D1FAE5
  GREEN_DARK: [6, 95, 70]    as [number, number, number],  // #065F46
  BLUE_LIGHT: [239, 246, 255] as [number, number, number], // #EFF6FF
};

// ── Page constants ────────────────────────────────────────────

const PAGE_W = 210;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Helpers ───────────────────────────────────────────────────

function setFill(doc: jsPDF, rgb: [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}
function setDraw(doc: jsPDF, rgb: [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}
function setTextColor(doc: jsPDF, rgb: [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: undefined });
}

function resultLabel(r: ReportMatch['result']): string {
  if (r === 'victoria') return 'Victoria';
  if (r === 'derrota')  return 'Derrota';
  if (r === 'empate')   return 'Empate';
  return '—';
}

function resultColor(r: ReportMatch['result']): [number, number, number] {
  if (r === 'victoria') return [16, 185, 129];
  if (r === 'derrota')  return [239, 68, 68];
  if (r === 'empate')   return [234, 179, 8];
  return C.TEXT_GRAY;
}

// ── Section title with left accent bar ───────────────────────

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  setFill(doc, C.BLUE);
  doc.rect(MARGIN, y, 3, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setTextColor(doc, C.NAVY);
  doc.text(title.toUpperCase(), MARGIN + 7, y + 5.5);
  return y + 14;
}

// ── Check for page space, add page if needed ─────────────────

function checkPageBreak(doc: jsPDF, y: number, neededH: number): number {
  if (y + neededH > 272) {
    doc.addPage();
    return 18;
  }
  return y;
}

// ── Stat card ────────────────────────────────────────────────

function statCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  value: string,
  label: string,
  sub: string,
  highlight = false,
) {
  setFill(doc, highlight ? C.GREEN_BG : C.LIGHT_GRAY);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, 'F');

  if (highlight) {
    setDraw(doc, C.GREEN);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, w, h, 2.5, 2.5, 'S');
  }

  // Value (large)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  setTextColor(doc, highlight ? C.GREEN_DARK : C.NAVY);
  doc.text(value, x + w / 2, y + h * 0.48, { align: 'center' });

  // Label (small caps)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  setTextColor(doc, C.TEXT_GRAY);
  doc.text(label.toUpperCase(), x + w / 2, y + h * 0.72, { align: 'center' });

  // Sub (accent)
  if (sub) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setTextColor(doc, highlight ? C.GREEN : C.BLUE);
    doc.text(sub, x + w / 2, y + h * 0.9, { align: 'center' });
  }
}

// ── Main PDF generator ────────────────────────────────────────

export async function generateReportPDF(
  data: MonthlyReportData,
  logoDataUrl?: string, // base64 data URL of White Lions logo
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 0;

  // ════════════════════════════════════════════════════
  // HEADER — Navy background with logo + title
  // ════════════════════════════════════════════════════
  setFill(doc, C.NAVY);
  doc.rect(0, 0, PAGE_W, 46, 'F');

  // Logo
  const logoX = MARGIN;
  const logoY = 7;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'JPEG', logoX, logoY, 26, 26);
    } catch (e) {
      // Logo failed silently — continue without it
    }
  }

  // Text block beside logo
  const textX = logoDataUrl ? logoX + 30 : logoX;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setTextColor(doc, C.WHITE);
  doc.text('WHITE LIONS ACADEMY', textX, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setTextColor(doc, C.GOLD);
  doc.text(
    `REPORTE MENSUAL DE RENDIMIENTO  ·  ${data.period.month_name_upper} ${data.period.year}`,
    textX,
    26,
  );

  doc.setFontSize(7);
  setTextColor(doc, [160, 175, 200]);
  doc.text('whitelionsacademy.com  ·  Mexicali, Baja California', textX, 32);

  // Gold accent line under header
  setFill(doc, C.GOLD);
  doc.rect(0, 46, PAGE_W, 1.2, 'F');

  y = 54;

  // ════════════════════════════════════════════════════
  // PLAYER CARD
  // ════════════════════════════════════════════════════
  setFill(doc, C.LIGHT);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setTextColor(doc, C.NAVY);
  doc.text(data.player.full_name.toUpperCase(), MARGIN + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setTextColor(doc, C.TEXT_GRAY);
  const meta = [
    `Categoría: ${data.player.category_name}`,
    data.player.age ? `${data.player.age} años` : null,
    `${data.period.month_name} ${data.period.year}`,
  ]
    .filter(Boolean)
    .join('   ·   ');
  doc.text(meta, MARGIN + 6, y + 17);

  y += 30;

  // ════════════════════════════════════════════════════
  // ASISTENCIA — 3 stat cards
  // ════════════════════════════════════════════════════
  y = sectionTitle(doc, 'Asistencia del Mes', y);

  const cardW = (CONTENT_W - 8) / 3;
  const cardH = 26;

  const { attendance, stats } = data;

  statCard(
    doc,
    MARGIN,
    y,
    cardW,
    cardH,
    `${attendance.sessions_attended}/${attendance.sessions_total}`,
    'Entrenamientos',
    `${attendance.percentage}%`,
    attendance.is_perfect,
  );

  statCard(
    doc,
    MARGIN + cardW + 4,
    y,
    cardW,
    cardH,
    `${attendance.matches_attended}/${attendance.matches_total}`,
    'Partidos',
    attendance.matches_attended === attendance.matches_total && attendance.matches_total > 0
      ? '100%'
      : `${attendance.matches_percentage}%`,
    attendance.matches_attended === attendance.matches_total && attendance.matches_total > 0,
  );

  const goalSub =
    stats.total_assists > 0
      ? `${stats.total_assists} ${stats.total_assists === 1 ? 'asistencia' : 'asistencias'}`
      : stats.mvp_count > 0
      ? '👑 MVP'
      : '';

  statCard(
    doc,
    MARGIN + (cardW + 4) * 2,
    y,
    cardW,
    cardH,
    String(stats.total_goals),
    'Goles en el mes',
    goalSub,
    stats.total_goals >= 2,
  );

  y += cardH + 4;

  // Perfect attendance badge
  if (attendance.is_perfect && attendance.sessions_total >= 3) {
    setFill(doc, C.GREEN_BG);
    doc.roundedRect(MARGIN, y, CONTENT_W, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setTextColor(doc, C.GREEN_DARK);
    doc.text(
      `★  ASISTENCIA PERFECTA — ${data.period.month_name_upper} ${data.period.year}`,
      PAGE_W / 2,
      y + 6,
      { align: 'center' },
    );
    y += 14;
  } else {
    y += 6;
  }

  // ════════════════════════════════════════════════════
  // PARTIDOS DEL MES — Table
  // ════════════════════════════════════════════════════
  y = sectionTitle(doc, 'Partidos del Mes', y);

  if (data.matches.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    setTextColor(doc, C.TEXT_GRAY);
    doc.text('No se registraron partidos en este período.', MARGIN + 4, y);
    y += 12;
  } else {
    const tableRows = data.matches.map((m) => {
      const scoreStr =
        m.score_us !== undefined && m.score_rival !== undefined
          ? `${m.score_us}–${m.score_rival}`
          : '—';
      const mvpMark = m.is_mvp ? ' 👑' : '';
      const rendimiento = m.rating ? `${m.rating}${mvpMark}` : mvpMark || '—';
      return [
        formatDate(m.match_date),
        m.rival_name,
        scoreStr,
        resultLabel(m.result),
        rendimiento,
        m.goals > 0 ? String(m.goals) : '—',
        m.assists > 0 ? String(m.assists) : '—',
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Rival', 'Marcador', 'Resultado', 'Rendimiento', 'Goles', 'Asist.']],
      body: tableRows,
      margin: { left: MARGIN, right: MARGIN },
      theme: 'plain',
      headStyles: {
        fillColor: C.NAVY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: C.NAVY,
        cellPadding: 2.8,
      },
      alternateRowStyles: { fillColor: C.LIGHT_GRAY },
      columnStyles: {
        0: { cellWidth: 18 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 12, halign: 'center' },
      },
      // Color result column cells
      didDrawCell: (hookData: any) => {
        if (hookData.section === 'body' && hookData.column.index === 3) {
          const rowIdx = hookData.row.index;
          const match = data.matches[rowIdx];
          if (match) {
            const color = resultColor(match.result);
            doc.setTextColor(color[0], color[1], color[2]);
            doc.setFont('helvetica', 'bold');
          }
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ════════════════════════════════════════════════════
  // OBSERVACIONES DEL ENTRENADOR — per match notes
  // ════════════════════════════════════════════════════
  const matchesWithNotes = data.matches.filter(
    (m) => m.note && m.note.trim().length > 5,
  );

  if (matchesWithNotes.length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = sectionTitle(doc, 'Observaciones del Entrenador', y);

    for (const m of matchesWithNotes) {
      const noteText = m.note!;
      const noteLines = doc.splitTextToSize(noteText, CONTENT_W - 14);
      const blockH = noteLines.length * 4.8 + 13;

      y = checkPageBreak(doc, y, blockH + 4);

      // Note block background
      setFill(doc, C.LIGHT);
      doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 2, 2, 'F');

      // Left accent bar (blue)
      setFill(doc, C.BLUE);
      doc.roundedRect(MARGIN, y, 3, blockH, 1.5, 1.5, 'F');

      // Match label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      setTextColor(doc, C.BLUE);
      const matchLabel = `vs. ${m.rival_name}  ·  ${formatDate(m.match_date)}`;
      doc.text(matchLabel, MARGIN + 7, y + 7);

      // Note text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setTextColor(doc, C.NAVY);
      doc.text(noteLines, MARGIN + 7, y + 13);

      y += blockH + 5;
    }

    y += 2;
  }

  // ════════════════════════════════════════════════════
  // MENSAJE DEL CUERPO TÉCNICO — AI narrative
  // ════════════════════════════════════════════════════
  if (data.narrative && data.narrative.trim().length > 20) {
    y = checkPageBreak(doc, y, 30);
    y = sectionTitle(doc, 'Mensaje del Cuerpo Técnico', y);

    const narrativeLines = doc.splitTextToSize(data.narrative, CONTENT_W - 14);
    const blockH = narrativeLines.length * 5.2 + 14;

    y = checkPageBreak(doc, y, blockH);

    // Background
    setFill(doc, C.BLUE_LIGHT);
    doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 3, 3, 'F');
    setDraw(doc, C.BLUE);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 3, 3, 'S');

    // Left accent bar (gold for coach message)
    setFill(doc, C.GOLD);
    doc.rect(MARGIN, y, 3, blockH, 'F');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    setTextColor(doc, C.NAVY);
    doc.text(narrativeLines, MARGIN + 7, y + 10);

    // Signature
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setTextColor(doc, C.TEXT_GRAY);
    doc.text(
      `— Cuerpo Técnico White Lions Academy`,
      MARGIN + CONTENT_W - 4,
      y + blockH - 4,
      { align: 'right' },
    );

    y += blockH + 8;
  }

  // ════════════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════════════
  const footerY = 284;
  setFill(doc, C.NAVY);
  doc.rect(0, footerY, PAGE_W, 13, 'F');

  setFill(doc, C.GOLD);
  doc.rect(0, footerY, PAGE_W, 0.8, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setTextColor(doc, [160, 175, 200]);
  doc.text(
    'White Lions Academy  ·  Mexicali, Baja California  ·  whitelionsacademy.com',
    PAGE_W / 2,
    footerY + 5.5,
    { align: 'center' },
  );
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  setTextColor(doc, C.GOLD);
  doc.text(
    `Reporte generado por STRYK  ·  ${data.period.month_name} ${data.period.year}`,
    PAGE_W / 2,
    footerY + 10,
    { align: 'center' },
  );

  return doc.output('blob');
}

// ── Logo loader — converts logo file to base64 for jsPDF ─────

export async function loadLogoAsDataUrl(logoUrl: string): Promise<string | undefined> {
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}
