import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { ExtractionResult } from '../types.ts';

export async function exportDocumentToPdf(data: ExtractionResult): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
      return true;
    }
    return false;
  };

  // Header / Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 24, 33);
  const titleLines = doc.splitTextToSize(data.pageTitle || 'Extracted Video Content', contentWidth);
  doc.text(titleLines, margin, cursorY);
  cursorY += titleLines.length * 22 + 8;

  // Metadata block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  const metaItems = [
    `Source Platform: ${data.sourcePlatform}`,
    `Original Language: ${data.detectedLanguage || 'English'}`,
    `Extraction Date: ${new Date(data.extractedAt).toLocaleString()}`,
    `Source URL: ${data.sourceUrl}`,
  ];

  metaItems.forEach((item) => {
    const lines = doc.splitTextToSize(item, contentWidth);
    doc.text(lines, margin, cursorY);
    cursorY += lines.length * 13;
  });

  cursorY += 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 18;

  // Section helper
  const renderSection = (title: string, badge: string, content: string, isMono = false) => {
    checkPageBreak(50);

    // Section title & badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(title.toUpperCase(), margin, cursorY);

    if (badge) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(99, 102, 241);
      doc.text(`[${badge}]`, margin + doc.getTextWidth(title.toUpperCase()) + 8, cursorY);
    }
    cursorY += 15;

    // Body content
    doc.setFont(isMono ? 'courier' : 'helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);

    const paragraphs = content.split('\n');
    paragraphs.forEach((p) => {
      const trimmed = p.trim();
      if (!trimmed) {
        cursorY += 6;
        return;
      }
      const lines = doc.splitTextToSize(trimmed, contentWidth);
      checkPageBreak(lines.length * 13 + 6);
      doc.text(lines, margin, cursorY);
      cursorY += lines.length * 13 + 4;
    });

    cursorY += 12;
    checkPageBreak(20);
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 16;
  };

  // Section 1: Text Before Video
  renderSection(
    'Section 1 — Text Before the Video',
    data.textBeforeVideo ? 'Extracted Source Text' : '',
    data.textBeforeVideo || 'No verifiable text before the video was available.'
  );

  // Section 2: Video Transcript
  renderSection(
    'Section 2 — Video Transcript',
    data.transcriptProvenance === 'official_caption'
      ? 'Official Caption Track'
      : data.transcriptProvenance === 'ai_transcription'
      ? 'AI Video Transcription (Gemini)'
      : data.transcriptProvenance === 'user_provided'
      ? 'User Provided Transcript'
      : 'Unavailable',
    data.transcript ||
      'A transcript could not be retrieved from this source. You can upload the video or audio, or provide a transcript for processing.',
    Boolean(data.transcript)
  );

  // Section 3: Text After Video
  renderSection(
    'Section 3 — Text After the Video',
    data.textAfterVideo ? 'Extracted Source Text' : '',
    data.textAfterVideo || 'Surrounding text following the video was unavailable on this page.'
  );

  // Section 4: Summary (if generated)
  if (data.summary) {
    renderSection(
      `Section 4 — Summary (${data.summary.type.toUpperCase()})`,
      'AI-Generated Text',
      data.summary.content
    );
  }

  // Section 5: Translation (if generated)
  if (data.translation) {
    renderSection(
      `Section 5 — Translation (${data.translation.targetLanguage})`,
      'AI-Generated Translation',
      data.translation.content
    );
  }

  // Section 6: QR Code
  checkPageBreak(160);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text('SECTION 6 — QR CODE', margin, cursorY);
  cursorY += 15;

  try {
    const qrDataUrl = await QRCode.toDataURL(data.sourceUrl, {
      margin: 2,
      width: 140,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    doc.addImage(qrDataUrl, 'PNG', margin, cursorY, 100, 100);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Scan to open the original video:', margin + 115, cursorY + 30);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(99, 102, 241);
    const urlLines = doc.splitTextToSize(data.sourceUrl, contentWidth - 115);
    doc.text(urlLines, margin + 115, cursorY + 45);

    cursorY += 115;
  } catch (err) {
    console.error('Failed to add QR code to PDF:', err);
  }

  // Add Page Numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Video Content Extractor & Reader • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 20,
      { align: 'center' }
    );
  }

  const cleanFilename = (data.pageTitle || 'extracted-video')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .slice(0, 50);

  doc.save(`${cleanFilename}.pdf`);
}
