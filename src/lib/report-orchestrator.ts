// ─────────────────────────────────────────────────────────────
// WHITE LIONS ACADEMY — Report Orchestrator
// Coordinates: fetch → narrative → PDF → upload → email trigger
// ─────────────────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client';
import { fetchPlayerMonthData } from './report-data';
import { generateNarrative } from './narrative-generator';
import { generateReportPDF, loadLogoAsDataUrl } from './pdf-generator';
import { transformAllNotes } from './note-transformer';
import type { MonthlyReportData, GenerationProgress } from './report-types';

// ── Config ────────────────────────────────────────────────────

// Logo path inside bucket 'email-assets'
const LOGO_BUCKET = 'email-assets';
const LOGO_STORAGE_PATH = 'white-lions-logo.jpg';
const REPORTS_BUCKET = 'monthly-reports';

// ── Upload PDF to Supabase Storage ────────────────────────────

async function uploadPDF(
  blob: Blob,
  playerId: string,
  month: number,
  year: number,
  organizationId: string,
): Promise<string | null> {
  const path = `${organizationId}/${year}/${String(month).padStart(2, '0')}/${playerId}.pdf`;

  const { error } = await supabase.storage
    .from(REPORTS_BUCKET)
    .upload(path, blob, {
      contentType: 'application/pdf',
      upsert: true, // overwrite if regenerating
    });

  if (error) {
    console.error('[Report] PDF upload failed:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(REPORTS_BUCKET)
    .getPublicUrl(path);

  return urlData.publicUrl ?? null;
}

// ── Save report record to DB ──────────────────────────────────

async function saveReportRecord(
  data: MonthlyReportData,
  pdfUrl: string,
  userId: string,
  organizationId: string,
  status: 'generated' | 'sent' | 'failed' = 'generated',
): Promise<string | null> {
  const { data: record, error } = await supabase
    .from('player_monthly_reports')
    .upsert(
      {
        organization_id: organizationId,
        player_id: data.player.id,
        month: data.period.month,
        year: data.period.year,
        category_id: data.player.category_id || null,
        status,
        pdf_url: pdfUrl,
        ai_summary: data.narrative ?? null,
        report_data: data as any,
        sent_to_email: data.player.parent_email || null,
        created_by: userId,
      },
      {
        onConflict: 'player_id,month,year',
      },
    )
    .select('id')
    .single();

  if (error) {
    console.error('[Report] DB save failed:', error);
    return null;
  }

  return record?.id ?? null;
}

// ── Trigger email via Edge Function ──────────────────────────

async function sendReportEmail(
  reportId: string,
  data: MonthlyReportData,
  pdfUrl: string,
): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-report-email', {
      body: {
        reportId,
        playerName: data.player.full_name,
        firstName: data.player.first_name,
        lastName: data.player.last_name,
        parentEmail: data.player.parent_email,
        monthName: data.period.month_name,
        year: data.period.year,
        pdfUrl,
      },
    });

    if (error) {
      console.error('[Report] Email send failed:', error);
      return false;
    }

    // Mark as sent in DB
    await supabase
      .from('player_monthly_reports')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', reportId);

    return true;
  } catch (e) {
    console.error('[Report] Email invoke error:', e);
    return false;
  }
}

// ── Single player report pipeline ────────────────────────────

export async function generateAndSendPlayerReport(
  playerId: string,
  month: number,
  year: number,
  organizationId: string,
  userId: string,
  logoDataUrl?: string,
): Promise<{ success: boolean; reason?: string; pdfUrl?: string }> {
  // Step 1: Fetch data
  let reportData = await fetchPlayerMonthData(playerId, month, year, organizationId);
  if (!reportData) {
    return { success: false, reason: 'No se encontraron datos del jugador' };
  }

  const hasEmail = !!reportData.player.parent_email;

  // Step 2: Generate narrative
  reportData.narrative = generateNarrative(reportData);

  // Step 2.5: Transform raw coach notes into family-friendly messages
  reportData = transformAllNotes(reportData);

  // Step 3: Generate PDF
  let pdfBlob: Blob;
  try {
    pdfBlob = await generateReportPDF(reportData, logoDataUrl);
  } catch (e) {
    console.error('[Report] PDF generation error:', e);
    return { success: false, reason: 'Error generando el PDF' };
  }

  // Step 4: Upload PDF
  const pdfUrl = await uploadPDF(pdfBlob, playerId, month, year, organizationId);
  if (!pdfUrl) {
    console.error('[Report] uploadPDF returned null — aborting send. Player:', playerId, 'Period:', `${year}-${month}`);
    // Persist a 'failed' record so the UI reflects the failure instead of silently
    // marking the report as sent without a PDF.
    await supabase
      .from('player_monthly_reports')
      .upsert(
        {
          organization_id: organizationId,
          player_id: playerId,
          month,
          year,
          category_id: reportData.player.category_id || null,
          status: 'failed',
          pdf_url: null,
          sent_to_email: reportData.player.parent_email || null,
          created_by: userId,
        },
        { onConflict: 'player_id,month,year' },
      );
    return { success: false, reason: 'Error subiendo el PDF' };
  }

  // Step 5: Save DB record (status depends on whether we'll send email)
  const initialStatus = hasEmail ? 'generated' : 'generated';
  const reportId = await saveReportRecord(reportData, pdfUrl, userId, organizationId, initialStatus);
  if (!reportId) {
    return { success: false, reason: 'Error guardando el registro' };
  }

  // Step 6: Send email — only if we have a parent email
  if (!hasEmail) {
    return { success: false, reason: 'Sin correo del padre — PDF generado, queda en historial para reenvío', pdfUrl };
  }

  const emailSent = await sendReportEmail(reportId, reportData, pdfUrl);
  if (!emailSent) {
    return { success: false, reason: 'PDF generado pero error enviando email', pdfUrl };
  }

  return { success: true, pdfUrl };
}

// ── Batch pipeline for a full category ───────────────────────

export async function generateCategoryReports(
  playerIds: string[],
  month: number,
  year: number,
  organizationId: string,
  userId: string,
  onProgress: (progress: GenerationProgress) => void,
): Promise<void> {
  // Load logo once for all reports
  const logoUrl = supabase.storage
    .from(LOGO_BUCKET)
    .getPublicUrl(LOGO_STORAGE_PATH).data.publicUrl;
  const logoDataUrl = await loadLogoAsDataUrl(logoUrl);

  const progress: GenerationProgress = {
    total: playerIds.length,
    current: 0,
    current_player_name: '',
    status: 'running',
    results: { ok: [], failed: [] },
  };

  onProgress({ ...progress });

  for (const playerId of playerIds) {
    // Get player name for display
    const { data: p } = await supabase
      .from('players')
      .select('full_name')
      .eq('id', playerId)
      .single();

    progress.current += 1;
    progress.current_player_name = p?.full_name ?? playerId;
    onProgress({ ...progress });

    const result = await generateAndSendPlayerReport(
      playerId,
      month,
      year,
      organizationId,
      userId,
      logoDataUrl,
    );

    if (result.success) {
      progress.results.ok.push(p?.full_name ?? playerId);
    } else {
      progress.results.failed.push({
        name: p?.full_name ?? playerId,
        reason: result.reason ?? 'Error desconocido',
      });
    }

    onProgress({ ...progress });
  }

  progress.status = 'done';
  onProgress({ ...progress });
}
