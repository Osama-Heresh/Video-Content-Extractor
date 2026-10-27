import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { ExtractionResult } from '../types.ts';

/**
 * Exports the structured extraction document to PDF with full multi-language Unicode
 * support (including Arabic RTL ligatures, Urdu, Chinese, etc.) and embedded QR code.
 */
export async function exportDocumentToPdf(data: ExtractionResult): Promise<void> {
  // Generate QR code data URL
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(data.sourceUrl, {
      margin: 2,
      width: 200,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  } catch (err) {
    console.error('QR code generation failed for PDF:', err);
  }

  // Create an offscreen printable container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', 'Noto Sans Arabic', Tahoma, Arial, sans-serif";
  container.style.padding = '40px 48px';
  container.style.boxSizing = 'border-box';
  container.style.lineHeight = '1.6';

  const isRtlTranslation = Boolean(data.translation?.isRtl);

  container.innerHTML = `
    <div style="margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
      <div style="display: flex; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; border: 1px solid #c7d2fe;">
          ${escapeHtml(data.sourcePlatform)}
        </span>
        ${
          data.embeddedVideoType
            ? `<span style="font-size: 10px; font-weight: 600; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px;">
                ${escapeHtml(data.embeddedVideoType)}
              </span>`
            : ''
        }
        <span style="font-size: 10px; font-weight: 600; background: ${
          data.transcriptStatus === 'available' ? '#ecfdf5' : '#f8fafc'
        }; color: ${
    data.transcriptStatus === 'available' ? '#047857' : '#64748b'
  }; padding: 2px 8px; border-radius: 4px; border: 1px solid ${
    data.transcriptStatus === 'available' ? '#a7f3d0' : '#e2e8f0'
  };">
          ${
            data.transcriptStatus === 'available'
              ? 'Transcript Verified'
              : data.transcriptStatus === 'partial'
              ? 'Partial Transcript'
              : 'Transcript Unavailable'
          }
        </span>
      </div>

      <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; line-height: 1.3;">
        ${escapeHtml(data.pageTitle || 'Extracted Video Content')}
      </h1>

      ${
        data.author
          ? `<p style="font-size: 12px; color: #64748b; margin: 0 0 14px 0;">By <strong style="color: #334155;">${escapeHtml(
              data.author
            )}</strong></p>`
          : ''
      }

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; font-size: 11px; color: #475569; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
        <div><strong>Original URL:</strong> <span style="word-break: break-all; color: #4f46e5;">${escapeHtml(
          data.sourceUrl
        )}</span></div>
        <div><strong>Platform:</strong> ${escapeHtml(data.sourcePlatform)}</div>
        <div><strong>Original Language:</strong> ${escapeHtml(data.detectedLanguage || 'English')}</div>
        <div><strong>Extraction Date:</strong> ${new Date(data.extractedAt).toLocaleString()}</div>
      </div>
    </div>

    <!-- SECTION 1 -->
    <div style="margin-bottom: 26px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; background: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 12px;">
        <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 0;">
          SECTION 1 — TEXT BEFORE THE VIDEO
        </h3>
        ${
          data.textBeforeVideo
            ? `<span style="font-size: 9px; font-weight: 700; background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">
                Extracted Source Text
              </span>`
            : ''
        }
      </div>
      <div style="font-size: 12.5px; color: #1e293b; white-space: pre-line; line-height: 1.6;">
        ${escapeHtml(data.textBeforeVideo || 'No verifiable text before the video was available.')}
      </div>
    </div>

    <!-- SECTION 2 -->
    <div style="margin-bottom: 26px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; background: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 12px;">
        <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 0;">
          SECTION 2 — VIDEO TRANSCRIPT
        </h3>
        <span style="font-size: 9px; font-weight: 700; background: #eef2ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; border: 1px solid #c7d2fe;">
          ${
            data.transcriptProvenance === 'official_caption'
              ? 'Official Caption Track'
              : data.transcriptProvenance === 'ai_transcription'
              ? 'AI Video Transcription (Gemini)'
              : data.transcriptProvenance === 'user_provided'
              ? 'User Provided Transcript'
              : 'Unavailable'
          }
        </span>
      </div>
      <div style="font-size: 12px; color: #1e293b; font-family: monospace; background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; white-space: pre-line; line-height: 1.65;">
        ${escapeHtml(
          data.transcript ||
            'A transcript could not be retrieved from this source. You can upload the video or audio, or provide a transcript for processing.'
        )}
      </div>
    </div>

    <!-- SECTION 3 -->
    <div style="margin-bottom: 26px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; background: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 12px;">
        <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 0;">
          SECTION 3 — TEXT AFTER THE VIDEO
        </h3>
        ${
          data.textAfterVideo
            ? `<span style="font-size: 9px; font-weight: 700; background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">
                Extracted Source Text
              </span>`
            : ''
        }
      </div>
      <div style="font-size: 12.5px; color: #1e293b; white-space: pre-line; line-height: 1.6;">
        ${escapeHtml(data.textAfterVideo || 'Surrounding text following the video was unavailable on this page.')}
      </div>
    </div>

    <!-- SECTION 4 (SUMMARY) -->
    ${
      data.summary
        ? `
      <div style="margin-bottom: 26px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 12px;">
          <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 0;">
            SECTION 4 — SUMMARY (${escapeHtml(data.summary.type.toUpperCase())})
          </h3>
          <span style="font-size: 9px; font-weight: 700; background: #faf5ff; color: #7e22ce; padding: 2px 6px; border-radius: 4px; border: 1px solid #e9d5ff;">
            AI-Generated Summary
          </span>
        </div>
        <div style="font-size: 12.5px; color: #1e293b; white-space: pre-line; line-height: 1.6; background: #faf5ff; border: 1px solid #f3e8ff; padding: 14px; border-radius: 6px;">
          ${escapeHtml(data.summary.content)}
        </div>
      </div>
    `
        : ''
    }

    <!-- SECTION 5 (TRANSLATION with Unicode and RTL support) -->
    ${
      data.translation
        ? `
      <div style="margin-bottom: 26px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 12px;">
          <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 0;">
            SECTION 5 — TRANSLATION (${escapeHtml(data.translation.targetLanguage)})
          </h3>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${
              isRtlTranslation
                ? `<span style="font-size: 9px; font-weight: 700; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; border: 1px solid #fde68a;">
                    RTL
                  </span>`
                : ''
            }
            <span style="font-size: 9px; font-weight: 700; background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; border: 1px solid #bfdbfe;">
              AI-Generated Translation
            </span>
          </div>
        </div>
        <div
          dir="${isRtlTranslation ? 'rtl' : 'ltr'}"
          style="font-size: 13px; color: #1e293b; white-space: pre-line; line-height: 1.7; text-align: ${
            isRtlTranslation ? 'right' : 'left'
          }; background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; font-family: ${
            isRtlTranslation
              ? "'Noto Sans Arabic', Tahoma, Arial, sans-serif"
              : 'inherit'
          };"
        >
          ${escapeHtml(data.translation.content)}
        </div>
      </div>
    `
        : ''
    }

    <!-- SECTION 6 (QR CODE) -->
    <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; background: #ffffff;">
      <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 0 0 12px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
        SECTION 6 — QR CODE
      </h3>
      <div style="display: flex; align-items: center; gap: 20px;">
        ${
          qrDataUrl
            ? `<div style="padding: 6px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;">
                <img src="${qrDataUrl}" width="120" height="120" style="display: block;" alt="QR Code" />
              </div>`
            : ''
        }
        <div style="font-size: 12px; color: #475569;">
          <p style="font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">Scan to open the original video.</p>
          <p style="font-size: 11px; margin: 0 0 8px 0;">Point your mobile camera at this code to open the exact source directly.</p>
          <p style="font-family: monospace; font-size: 10.5px; color: #4f46e5; word-break: break-all; margin: 0;">${escapeHtml(
            data.sourceUrl
          )}</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Render offscreen container to canvas with 2x retina scale for high-res crisp text
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        if (clonedDoc.documentElement) {
          clonedDoc.documentElement.style.backgroundColor = '#ffffff';
          clonedDoc.documentElement.style.color = '#0f172a';
        }
        if (clonedDoc.body) {
          clonedDoc.body.style.backgroundColor = '#ffffff';
          clonedDoc.body.style.color = '#0f172a';
        }
      },
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = 210; // A4 width in mm
    const pdfHeight = 297; // A4 height in mm

    // Calculate height of one A4 page in canvas pixels
    const pageCanvasHeight = Math.floor(canvas.width * (pdfHeight / pdfWidth));
    const totalPages = Math.ceil(canvas.height / pageCanvasHeight);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        doc.addPage();
      }

      const sourceY = page * pageCanvasHeight;
      const sourceH = Math.min(pageCanvasHeight, canvas.height - sourceY);

      // Create a slice canvas for this specific page
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = pageCanvasHeight;
      const sliceCtx = sliceCanvas.getContext('2d');

      if (sliceCtx) {
        // Pure white background
        sliceCtx.fillStyle = '#ffffff';
        sliceCtx.fillRect(0, 0, sliceCanvas.width, pageCanvasHeight);

        // Draw the slice from the source canvas
        sliceCtx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceH,
          0,
          0,
          canvas.width,
          sourceH
        );

        // Stamp page number footer directly onto canvas slice
        sliceCtx.font = '22px system-ui, sans-serif';
        sliceCtx.fillStyle = '#94a3b8';
        sliceCtx.textAlign = 'center';
        sliceCtx.fillText(
          `Video Content Extractor & Reader • Page ${page + 1} of ${totalPages}`,
          canvas.width / 2,
          pageCanvasHeight - 30
        );

        const sliceDataUrl = sliceCanvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(sliceDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }
    }

    const cleanFilename = (data.pageTitle || 'extracted-video')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .slice(0, 50);

    doc.save(`${cleanFilename}.pdf`);
  } catch (err) {
    console.error('PDF generation error:', err);
    throw err;
  } finally {
    document.body.removeChild(container);
  }
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
