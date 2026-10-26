import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Globe,
  Tag,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { ExtractionResult, SummaryData, TranslationData } from '../types.ts';
import { QrCodeCard } from './QrCodeCard.tsx';
import { SummarySection } from './SummarySection.tsx';
import { TranslationSection } from './TranslationSection.tsx';
import { TranscriptFallback } from './TranscriptFallback.tsx';

interface DocumentViewerProps {
  data: ExtractionResult;
  onGenerateSummary: (type: 'brief' | 'standard' | 'detailed') => Promise<void>;
  isGeneratingSummary: boolean;
  onTranslate: (params: {
    targetLanguage: string;
    sourceLanguage: string;
    scope: 'entire' | 'transcript' | 'page_text' | 'summary';
  }) => Promise<void>;
  isTranslating: boolean;
  onUpdateTranscript: (text: string, provenance: 'user_provided' | 'ai_transcription') => void;
  translationError?: string | null;
  summaryError?: string | null;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  data,
  onGenerateSummary,
  isGeneratingSummary,
  onTranslate,
  isTranslating,
  onUpdateTranscript,
  translationError,
  summaryError,
}) => {
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  const formattedDate = new Date(data.extractedAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCopyTranscript = async () => {
    if (!data.transcript) return;
    try {
      await navigator.clipboard.writeText(data.transcript);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    } catch (err) {
      console.error('Failed to copy transcript:', err);
    }
  };

  const isLongTranscript = data.transcript && data.transcript.length > 800;
  const displayedTranscript =
    isLongTranscript && !isTranscriptExpanded
      ? data.transcript.slice(0, 800) + '...'
      : data.transcript;

  return (
    <article className="w-full space-y-6 text-slate-800 dark:text-slate-100">
      {/* DOCUMENT HEADER & SOURCE INFORMATION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-colors document-card">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
              {data.sourcePlatform}
            </span>
            {data.embeddedVideoType && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {data.embeddedVideoType}
              </span>
            )}
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                data.transcriptStatus === 'available'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : data.transcriptStatus === 'partial'
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {data.transcriptStatus === 'available'
                ? 'Transcript Verified'
                : data.transcriptStatus === 'partial'
                ? 'Partial Transcript'
                : 'Transcript Unavailable'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {data.pageTitle || 'Extracted Video Content'}
          </h2>
          {data.author && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              By <span className="font-medium text-slate-700 dark:text-slate-300">{data.author}</span>
            </p>
          )}
        </div>

        {/* Source Information Metadata Grid */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Source Information
          </h4>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <dt className="text-slate-400 dark:text-slate-500 font-medium">Original URL</dt>
              <dd className="mt-1 font-mono text-slate-700 dark:text-slate-200 truncate">
                <a
                  href={data.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <span className="truncate">{data.sourceUrl}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </dd>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <dt className="text-slate-400 dark:text-slate-500 font-medium">Platform</dt>
              <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                {data.sourcePlatform}
              </dd>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <dt className="text-slate-400 dark:text-slate-500 font-medium">Original Language</dt>
              <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                {data.detectedLanguage || 'English'}
              </dd>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <dt className="text-slate-400 dark:text-slate-500 font-medium">Extraction Date &amp; Time</dt>
              <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                {formattedDate}
              </dd>
            </div>
          </dl>
        </div>

        {/* Warnings or Platform notice */}
        {data.extractionWarnings && data.extractionWarnings.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <div className="flex items-center space-x-1.5 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Platform Extraction Notice</span>
            </div>
            {data.extractionWarnings.map((w, idx) => (
              <p key={idx} className="pl-5 text-amber-700 dark:text-amber-400">
                • {w}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 1 — TEXT BEFORE THE VIDEO */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-colors document-card">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              SECTION 1 — TEXT BEFORE THE VIDEO
            </h3>
            {data.textBeforeVideo && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Extracted Source Text
              </span>
            )}
          </div>
        </div>

        {data.textBeforeVideo ? (
          <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
            {data.textBeforeVideo}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic py-2">
            No verifiable text before the video was available.
          </p>
        )}
      </section>

      {/* SECTION 2 — VIDEO TRANSCRIPT */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-colors document-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              SECTION 2 — VIDEO TRANSCRIPT
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                data.transcriptProvenance === 'official_caption'
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : data.transcriptProvenance === 'ai_transcription'
                  ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                  : data.transcriptProvenance === 'user_provided'
                  ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
            >
              {data.transcriptProvenance === 'official_caption'
                ? 'Official Caption Track'
                : data.transcriptProvenance === 'ai_transcription'
                ? 'AI Video Transcription (Gemini 3.8 Flash)'
                : data.transcriptProvenance === 'user_provided'
                ? 'User Provided Transcript'
                : 'Unavailable'}
            </span>
          </div>

          {data.transcript && (
            <button
              type="button"
              onClick={handleCopyTranscript}
              className="inline-flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 no-print cursor-pointer"
            >
              {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTranscript ? 'Copied Transcript' : 'Copy Transcript'}</span>
            </button>
          )}
        </div>

        {data.transcript ? (
          <div>
            <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line font-mono bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {displayedTranscript}
            </div>

            {isLongTranscript && (
              <div className="mt-3 text-center no-print">
                <button
                  type="button"
                  onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <span>{isTranscriptExpanded ? 'Show less' : 'Show full transcript'}</span>
                  {isTranscriptExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 italic">
              A transcript could not be retrieved from this source. You can upload the video or audio, or provide a transcript for processing.
            </p>
            {/* Interactive Fallback Upload & Paste */}
            <TranscriptFallback onSetUserTranscript={onUpdateTranscript} />
          </div>
        )}
      </section>

      {/* SECTION 3 — TEXT AFTER THE VIDEO */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-colors document-card">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              SECTION 3 — TEXT AFTER THE VIDEO
            </h3>
            {data.textAfterVideo && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Extracted Source Text
              </span>
            )}
          </div>
        </div>

        {data.textAfterVideo ? (
          <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
            {data.textAfterVideo}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic py-2">
            Surrounding text following the video was unavailable on this page.
          </p>
        )}
      </section>

      {/* SECTION 4 — SUMMARY */}
      <SummarySection
        summary={data.summary}
        onGenerateSummary={onGenerateSummary}
        isGenerating={isGeneratingSummary}
        contentAvailable={Boolean(data.transcript || data.textBeforeVideo || data.textAfterVideo)}
        error={summaryError}
      />

      {/* SECTION 5 — TRANSLATION */}
      <TranslationSection
        translation={data.translation}
        detectedLanguage={data.detectedLanguage}
        onTranslate={onTranslate}
        isTranslating={isTranslating}
        hasSummary={Boolean(data.summary)}
        hasTranscript={Boolean(data.transcript)}
        error={translationError}
      />

      {/* SECTION 6 — QR CODE */}
      <QrCodeCard sourceUrl={data.sourceUrl} />
    </article>
  );
};
