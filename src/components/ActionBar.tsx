import React, { useState } from 'react';
import {
  Copy,
  Check,
  FileDown,
  Printer,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Languages,
  QrCode,
  FileText,
} from 'lucide-react';
import { ExtractionResult } from '../types.ts';
import { exportDocumentToPdf } from '../utils/exportPdf.ts';

interface ActionBarProps {
  data: ExtractionResult;
  onReset: () => void;
  onScrollToSummary: () => void;
  onScrollToTranslate: () => void;
  onScrollToQr: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  data,
  onReset,
  onScrollToSummary,
  onScrollToTranslate,
  onScrollToQr,
}) => {
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // Compile formatted document string
  const compilePlainTextDocument = (): string => {
    const lines: string[] = [];
    lines.push(`DOCUMENT TITLE: ${data.pageTitle || 'Extracted Video Content'}`);
    lines.push(`SOURCE URL: ${data.sourceUrl}`);
    lines.push(`PLATFORM: ${data.sourcePlatform}`);
    lines.push(`ORIGINAL LANGUAGE: ${data.detectedLanguage}`);
    lines.push(`EXTRACTION DATE: ${new Date(data.extractedAt).toLocaleString()}`);
    lines.push('----------------------------------------\n');

    lines.push('SECTION 1 — TEXT BEFORE THE VIDEO:');
    lines.push(data.textBeforeVideo || 'No verifiable text before the video was available.');
    lines.push('\n----------------------------------------\n');

    lines.push('SECTION 2 — VIDEO TRANSCRIPT:');
    lines.push(`[Provenance: ${data.transcriptProvenance}]`);
    lines.push(
      data.transcript ||
        'A transcript could not be retrieved from this source. You can upload the video or audio, or provide a transcript for processing.'
    );
    lines.push('\n----------------------------------------\n');

    lines.push('SECTION 3 — TEXT AFTER THE VIDEO:');
    lines.push(data.textAfterVideo || 'Surrounding text following the video was unavailable on this page.');
    lines.push('\n----------------------------------------\n');

    if (data.summary) {
      lines.push(`SECTION 4 — SUMMARY (${data.summary.type.toUpperCase()}):`);
      lines.push(data.summary.content);
      lines.push('\n----------------------------------------\n');
    }

    if (data.translation) {
      lines.push(`SECTION 5 — TRANSLATION (${data.translation.targetLanguage}):`);
      lines.push(data.translation.content);
      lines.push('\n----------------------------------------\n');
    }

    lines.push('SECTION 6 — QR CODE:');
    lines.push(`Scan or open original source: ${data.sourceUrl}`);

    return lines.join('\n');
  };

  const compileMarkdownDocument = (): string => {
    const md: string[] = [];
    md.push(`# ${data.pageTitle || 'Extracted Video Content'}\n`);
    md.push(`**Source Platform:** ${data.sourcePlatform}  `);
    md.push(`**Source URL:** [${data.sourceUrl}](${data.sourceUrl})  `);
    md.push(`**Original Language:** ${data.detectedLanguage}  `);
    md.push(`**Extracted At:** ${new Date(data.extractedAt).toLocaleString()}  \n`);
    md.push('---\n');

    md.push('## SECTION 1 — TEXT BEFORE THE VIDEO\n');
    md.push(data.textBeforeVideo || '*No verifiable text before the video was available.*\n');
    md.push('---\n');

    md.push('## SECTION 2 — VIDEO TRANSCRIPT\n');
    md.push(`*Provenance: ${data.transcriptProvenance}*\n`);
    md.push(
      data.transcript
        ? `\`\`\`\n${data.transcript}\n\`\`\`\n`
        : '*A transcript could not be retrieved from this source. You can upload the video or audio, or provide a transcript for processing.*\n'
    );
    md.push('---\n');

    md.push('## SECTION 3 — TEXT AFTER THE VIDEO\n');
    md.push(data.textAfterVideo || '*Surrounding text following the video was unavailable on this page.*\n');
    md.push('---\n');

    if (data.summary) {
      md.push(`## SECTION 4 — SUMMARY (${data.summary.type.toUpperCase()})\n`);
      md.push(`${data.summary.content}\n`);
      md.push('---\n');
    }

    if (data.translation) {
      md.push(`## SECTION 5 — TRANSLATION (${data.translation.targetLanguage})\n`);
      md.push(`${data.translation.content}\n`);
      md.push('---\n');
    }

    md.push('## SECTION 6 — QR CODE\n');
    md.push(`Original video URL: [${data.sourceUrl}](${data.sourceUrl})\n`);

    return md.join('\n');
  };

  const handleCopyFull = async () => {
    try {
      const doc = compilePlainTextDocument();
      await navigator.clipboard.writeText(doc);
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    } catch (err) {
      console.error('Copy full failed:', err);
    }
  };

  const handleCopyTranscript = async () => {
    if (!data.transcript) return;
    try {
      await navigator.clipboard.writeText(data.transcript);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    } catch (err) {
      console.error('Copy transcript failed:', err);
    }
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportDocumentToPdf(data);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadTxt = () => {
    const text = compilePlainTextDocument();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(data.pageTitle || 'extracted-video').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    const md = compileMarkdownDocument();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(data.pageTitle || 'extracted-video').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm transition-colors sticky bottom-4 z-20 no-print">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Quick section navigation and triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onScrollToSummary}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Summarize</span>
          </button>

          <button
            type="button"
            onClick={onScrollToTranslate}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Translate</span>
          </button>

          <button
            type="button"
            onClick={onScrollToQr}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>
        </div>

        {/* Copy, Export & Print Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyFull}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Copy full organized document"
          >
            {copiedFull ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedFull ? 'Copied' : 'Copy Full Text'}</span>
          </button>

          {data.transcript && (
            <button
              type="button"
              onClick={handleCopyTranscript}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Copy transcript only"
            >
              {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTranscript ? 'Copied' : 'Copy Transcript'}</span>
            </button>
          )}

          {/* Export to PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs shadow-rose-600/20 transition-all disabled:opacity-50 cursor-pointer"
            title="Export complete document to PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? 'Exporting PDF...' : 'Export to PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Download document as text file"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>TXT</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Download document as Markdown file"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>MD</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Print document formatted"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <a
            href={data.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Open original video source"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Original</span>
          </a>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
            title="Start new extraction"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>
    </div>
  );
};
