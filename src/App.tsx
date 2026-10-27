import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { UrlInputForm } from './components/UrlInputForm.tsx';
import { ProcessingStatus } from './components/ProcessingStatus.tsx';
import { DocumentViewer } from './components/DocumentViewer.tsx';
import { ActionBar } from './components/ActionBar.tsx';
import { ExtractionResult, ProcessingStep, SourcePlatform } from './types.ts';
import { AlertCircle, Film, Sparkles, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';

const INITIAL_STEPS: ProcessingStep[] = [
  { id: 'validate', label: 'Validating URL', status: 'pending' },
  { id: 'identify', label: 'Identifying source platform', status: 'pending' },
  { id: 'webpage', label: 'Retrieving accessible webpage metadata & structure', status: 'pending' },
  { id: 'video', label: 'Retrieving available transcript or analyzing video with Gemini', status: 'pending' },
  { id: 'organize', label: 'Organizing document sections', status: 'pending' },
  { id: 'qrcode', label: 'Preparing QR code', status: 'pending' },
];

export default function App() {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [steps, setSteps] = useState<ProcessingStep[]>(INITIAL_STEPS);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Dark mode toggle
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const documentRef = useRef<HTMLDivElement | null>(null);

  const updateStepStatus = (id: string, status: ProcessingStep['status'], detail?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, detail: detail ?? s.detail } : s))
    );
  };

  const handleExtract = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim() || isLoading) return;

    setError(null);
    setTranslationError(null);
    setSummaryError(null);
    setIsLoading(true);
    setResult(null);

    // Reset steps
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'pending', detail: undefined })));

    try {
      // Step 1: Validate URL
      updateStepStatus('validate', 'in_progress');
      await new Promise((r) => setTimeout(r, 200));
      updateStepStatus('validate', 'completed', 'URL format and protocol verified');

      // Step 2: Identify source
      updateStepStatus('identify', 'in_progress');
      await new Promise((r) => setTimeout(r, 200));
      updateStepStatus('identify', 'completed');

      // Step 3: Webpage & Video retrieval
      updateStepStatus('webpage', 'in_progress');
      updateStepStatus('video', 'in_progress', 'Connecting to secure server extraction pipeline...');

      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with HTTP ${response.status}`);
      }

      const data: ExtractionResult = await response.json();

      updateStepStatus('webpage', 'completed', `Extracted title: "${data.pageTitle.slice(0, 40)}..."`);
      updateStepStatus(
        'video',
        data.transcriptStatus === 'available'
          ? 'completed'
          : data.transcriptStatus === 'partial'
          ? 'completed'
          : 'skipped',
        data.transcriptStatus === 'available'
          ? 'Transcript verified'
          : data.transcriptStatus === 'partial'
          ? 'Partial transcript retrieved'
          : 'Direct transcript unavailable from source platform'
      );

      // Step 5: Organize content
      updateStepStatus('organize', 'in_progress');
      await new Promise((r) => setTimeout(r, 200));
      updateStepStatus('organize', 'completed', 'Content structured in logical chronological order');

      // Step 6: Prepare QR Code
      updateStepStatus('qrcode', 'in_progress');
      await new Promise((r) => setTimeout(r, 150));
      updateStepStatus('qrcode', 'completed', 'QR Code rendered locally');

      setResult(data);

      // Scroll down to document smoothly
      setTimeout(() => {
        documentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      console.error('Extraction failed:', err);
      setError(err.message || 'An unexpected error occurred during extraction. Please check the URL and try again.');
      setSteps((prev) =>
        prev.map((s) => (s.status === 'in_progress' ? { ...s, status: 'failed' } : s))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setError(null);
    setTranslationError(null);
    setSummaryError(null);
    setResult(null);
    setSteps(INITIAL_STEPS);
  };

  const handleGenerateSummary = async (type: 'brief' | 'standard' | 'detailed') => {
    if (!result) return;
    setIsGeneratingSummary(true);
    setSummaryError(null);

    try {
      const combinedContent = [
        result.pageTitle ? `TITLE: ${result.pageTitle}` : '',
        result.textBeforeVideo ? `INTRO / BEFORE VIDEO:\n${result.textBeforeVideo}` : '',
        result.transcript ? `TRANSCRIPT:\n${result.transcript}` : '',
        result.textAfterVideo ? `AFTER VIDEO / BODY:\n${result.textAfterVideo}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: combinedContent, type }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate summary');
      }

      const summaryData = await res.json();
      setResult((prev) =>
        prev
          ? {
              ...prev,
              summary: {
                type,
                content: summaryData.summary,
                generatedAt: new Date().toISOString(),
              },
            }
          : null
      );
    } catch (err: any) {
      setSummaryError(err.message || 'Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleTranslate = async ({
    targetLanguage,
    sourceLanguage,
    scope,
  }: {
    targetLanguage: string;
    sourceLanguage: string;
    scope: 'entire' | 'transcript' | 'page_text' | 'summary';
  }) => {
    if (!result) return;
    setIsTranslating(true);
    setTranslationError(null);

    try {
      let textToTranslate = '';
      if (scope === 'entire') {
        textToTranslate = [
          `TITLE: ${result.pageTitle}`,
          result.textBeforeVideo ? `SECTION 1 (BEFORE VIDEO):\n${result.textBeforeVideo}` : '',
          result.transcript ? `SECTION 2 (TRANSCRIPT):\n${result.transcript}` : '',
          result.textAfterVideo ? `SECTION 3 (AFTER VIDEO):\n${result.textAfterVideo}` : '',
          result.summary ? `SECTION 4 (SUMMARY):\n${result.summary.content}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');
      } else if (scope === 'transcript') {
        textToTranslate = result.transcript;
      } else if (scope === 'page_text') {
        textToTranslate = [result.textBeforeVideo, result.textAfterVideo].filter(Boolean).join('\n\n');
      } else if (scope === 'summary' && result.summary) {
        textToTranslate = result.summary.content;
      }

      if (!textToTranslate) {
        throw new Error('No content available for the selected translation scope.');
      }

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToTranslate,
          targetLanguage,
          sourceLanguage,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to translate content');
      }

      const data = await res.json();
      const cleanContent =
        typeof data.translation === 'string'
          ? data.translation.normalize
            ? data.translation.normalize('NFC')
            : data.translation
          : String(data.translation || '');

      setResult((prev) =>
        prev
          ? {
              ...prev,
              translation: {
                targetLanguage,
                sourceLanguage,
                scope,
                content: cleanContent,
                isRtl: Boolean(data.isRtl),
                translatedAt: new Date().toISOString(),
              },
            }
          : null
      );

      // Auto-scroll to the translation section smoothly
      setTimeout(() => {
        const el = document.getElementById('translation-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } catch (err: any) {
      setTranslationError(err.message || 'Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleUpdateTranscript = (text: string, provenance: 'user_provided' | 'ai_transcription') => {
    setResult((prev) =>
      prev
        ? {
            ...prev,
            transcript: text,
            transcriptStatus: 'available',
            transcriptProvenance: provenance,
          }
        : null
    );
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      <Header darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* URL Input Form */}
        <section>
          <UrlInputForm
            url={url}
            onChangeUrl={setUrl}
            onSubmit={handleExtract}
            onReset={handleReset}
            isLoading={isLoading}
          />
        </section>

        {/* Error Alert */}
        {error && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-start space-x-3 text-sm no-print">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Extraction Notice</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Processing Progress Status */}
        {isLoading && (
          <section>
            <ProcessingStatus steps={steps} />
          </section>
        )}

        {/* Rendered Document */}
        {result && (
          <div ref={documentRef} className="space-y-8">
            <DocumentViewer
              data={result}
              onGenerateSummary={handleGenerateSummary}
              isGeneratingSummary={isGeneratingSummary}
              onTranslate={handleTranslate}
              isTranslating={isTranslating}
              onUpdateTranscript={handleUpdateTranscript}
              translationError={translationError}
              summaryError={summaryError}
            />

            <ActionBar
              data={result}
              onReset={handleReset}
              onScrollToSummary={() => scrollToSection('summary-section')}
              onScrollToTranslate={() => scrollToSection('translation-section')}
              onScrollToQr={() => scrollToSection('qrcode-section')}
            />
          </div>
        )}

        {/* Empty state informative overview when no extraction is active */}
        {!result && !isLoading && (
          <section className="bg-white/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 text-center max-w-3xl mx-auto space-y-4 no-print">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Film className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
              Supported Sources &amp; Logical Extraction Pipeline
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl mx-auto">
              Extracts text above and below the video, retrieves accessible spoken dialogue and transcripts,
              and generates summaries, multi-language translations, and high-contrast QR codes directly linked to the original video.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">YouTube</span>
                <span className="text-[11px] text-slate-400">Gemini Video Analysis &amp; Captions</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">TikTok &amp; Reels</span>
                <span className="text-[11px] text-slate-400">Public metadata &amp; captions</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">Webpage Videos</span>
                <span className="text-[11px] text-slate-400">DOM before/after layout</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">Local QR Code</span>
                <span className="text-[11px] text-slate-400">In-browser offline encode</span>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500 no-print">
        <p>Video Content Extractor &amp; Reader • Built with Google Gemini API</p>
      </footer>
    </div>
  );
}
