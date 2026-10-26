import React, { useState } from 'react';
import { Sparkles, RotateCw, CheckCircle, FileText, ChevronDown } from 'lucide-react';
import { SummaryData } from '../types.ts';

interface SummarySectionProps {
  summary?: SummaryData;
  onGenerateSummary: (type: 'brief' | 'standard' | 'detailed') => Promise<void>;
  isGenerating: boolean;
  contentAvailable: boolean;
  error?: string | null;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  summary,
  onGenerateSummary,
  isGenerating,
  contentAvailable,
  error,
}) => {
  const [selectedType, setSelectedType] = useState<'brief' | 'standard' | 'detailed'>('standard');
  const [isOpen, setIsOpen] = useState<boolean>(true);

  const handleSummarize = () => {
    onGenerateSummary(selectedType);
  };

  return (
    <div
      id="summary-section"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors document-card scroll-mt-20"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              SECTION 4 — SUMMARY
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              AI-Generated Text
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Factual synthesis derived strictly from accessible video dialogue and surrounding content.
          </p>
        </div>

        {/* Length selector & summarize action */}
        <div className="flex flex-wrap items-center gap-2 no-print">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setSelectedType('brief')}
              disabled={isGenerating}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                selectedType === 'brief'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Brief (3–5 sentences)
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('standard')}
              disabled={isGenerating}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                selectedType === 'standard'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Standard (Bullets)
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('detailed')}
              disabled={isGenerating}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                selectedType === 'detailed'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Detailed (Headings)
            </button>
          </div>

          <button
            type="button"
            onClick={handleSummarize}
            disabled={isGenerating || !contentAvailable}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-medium shadow-xs shadow-purple-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Summarizing...</span>
              </>
            ) : summary ? (
              <>
                <RotateCw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Summarize</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={handleSummarize}
            className="font-semibold underline hover:no-underline ml-3 flex-shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* In-progress Loading State */}
      {isGenerating && (
        <div className="py-6 px-4 flex flex-col items-center justify-center space-y-2 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-dashed border-purple-200 dark:border-purple-800 text-center mb-4">
          <div className="w-5 h-5 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Generating {selectedType} summary with Gemini...
          </p>
        </div>
      )}

      {/* Summary Content Body */}
      {summary ? (
        <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800">
          {summary.content}
        </div>
      ) : (
        <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
          <p>Click "Summarize" above to generate a brief, standard, or detailed summary of the extracted content.</p>
        </div>
      )}
    </div>
  );
};
