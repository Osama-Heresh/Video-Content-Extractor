import React, { useState, useEffect } from 'react';
import { Languages, RotateCw, Globe2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { TranslationData } from '../types.ts';

const STANDARD_LANGUAGES = [
  'Arabic',
  'English',
  'French',
  'Spanish',
  'German',
  'Turkish',
  'Urdu',
  'Hindi',
  'Chinese',
];

interface TranslationSectionProps {
  translation?: TranslationData;
  detectedLanguage?: string;
  onTranslate: (params: {
    targetLanguage: string;
    sourceLanguage: string;
    scope: 'entire' | 'transcript' | 'page_text' | 'summary';
  }) => Promise<void>;
  isTranslating: boolean;
  hasSummary: boolean;
  hasTranscript: boolean;
  error?: string | null;
}

export const TranslationSection: React.FC<TranslationSectionProps> = ({
  translation,
  detectedLanguage = 'English',
  onTranslate,
  isTranslating,
  hasSummary,
  hasTranscript,
  error,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Spanish');
  const [customLanguage, setCustomLanguage] = useState<string>('');
  const [sourceLanguage, setSourceLanguage] = useState<string>(detectedLanguage);
  const [scope, setScope] = useState<'entire' | 'transcript' | 'page_text' | 'summary'>('entire');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (detectedLanguage) {
      setSourceLanguage(detectedLanguage);
    }
  }, [detectedLanguage]);

  // Adjust scope if current selected scope is no longer available
  useEffect(() => {
    if (scope === 'transcript' && !hasTranscript) {
      setScope('entire');
    }
    if (scope === 'summary' && !hasSummary) {
      setScope('entire');
    }
  }, [hasTranscript, hasSummary, scope]);

  const effectiveTarget = selectedLanguage === 'Other' ? customLanguage.trim() : selectedLanguage;

  const handleTranslateClick = () => {
    if (!effectiveTarget || isTranslating) return;
    onTranslate({
      targetLanguage: effectiveTarget,
      sourceLanguage: sourceLanguage || detectedLanguage || 'English',
      scope,
    });
  };

  const handleCopyTranslation = async () => {
    if (!translation?.content) return;
    try {
      await navigator.clipboard.writeText(translation.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div
      id="translation-section"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors document-card scroll-mt-20"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              SECTION 5 — TRANSLATION
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              AI-Generated Translation
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Preserves headings, timestamps, and numbers in a separate view without altering original extracted text.
          </p>
        </div>

        {/* Translation controls */}
        <div className="flex flex-wrap items-center gap-2 no-print">
          {/* Target Language dropdown */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={isTranslating}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            {STANDARD_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
            <option value="Other">Other Language...</option>
          </select>

          {selectedLanguage === 'Other' && (
            <input
              type="text"
              value={customLanguage}
              onChange={(e) => setCustomLanguage(e.target.value)}
              placeholder="e.g. Japanese"
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 w-28 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          )}

          {/* Scope selector */}
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
            disabled={isTranslating}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="entire">Entire Document</option>
            {hasTranscript && <option value="transcript">Transcript Only</option>}
            <option value="page_text">Page Text Only</option>
            {hasSummary && <option value="summary">Summary Only</option>}
          </select>

          <button
            type="button"
            onClick={handleTranslateClick}
            disabled={isTranslating || !effectiveTarget}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium shadow-xs shadow-blue-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Translating...</span>
              </>
            ) : translation ? (
              <>
                <RotateCw className="w-3.5 h-3.5" />
                <span>Re-translate</span>
              </>
            ) : (
              <>
                <Languages className="w-3.5 h-3.5" />
                <span>Translate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleTranslateClick}
            className="font-semibold underline hover:no-underline ml-3 flex-shrink-0 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* In-progress Loading State */}
      {isTranslating && (
        <div className="py-8 px-4 flex flex-col items-center justify-center space-y-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-dashed border-blue-200 dark:border-blue-800 text-center">
          <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Translating into {effectiveTarget}...
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gemini is translating while preserving formatting, headings, and timestamps.
            </p>
          </div>
        </div>
      )}

      {/* Translation Content */}
      {!isTranslating && translation && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Language: {translation.targetLanguage}
              </span>
              <span>•</span>
              <span className="capitalize">Scope: {translation.scope.replace('_', ' ')}</span>
              {translation.isRtl && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
                  RTL
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyTranslation}
              className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center space-x-1 no-print cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : null}
              <span>{copied ? 'Copied' : 'Copy Translation'}</span>
            </button>
          </div>

          <div
            dir={translation.isRtl ? 'rtl' : 'ltr'}
            className={`prose prose-slate dark:prose-invert max-w-none text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 ${
              translation.isRtl ? 'text-right [font-family:"Noto_Sans_Arabic",Tahoma,Segoe_UI,system-ui,sans-serif]' : 'text-left'
            }`}
          >
            {translation.content}
          </div>
        </div>
      )}

      {!isTranslating && !translation && (
        <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
          <p>Click "Translate" above to translate the document or specific section into your chosen language.</p>
        </div>
      )}
    </div>
  );
};
