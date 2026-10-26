import React, { useState } from 'react';
import { Search, RotateCcw, Link2, AlertCircle, PlayCircle, Globe, Video } from 'lucide-react';

interface UrlInputFormProps {
  url: string;
  onChangeUrl: (val: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onReset: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const UrlInputForm: React.FC<UrlInputFormProps> = ({
  url,
  onChangeUrl,
  onSubmit,
  onReset,
  isLoading,
  disabled,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setValidationError('Please enter a video or webpage URL.');
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setValidationError(`Invalid protocol "${parsed.protocol}". Only HTTP and HTTPS URLs are supported.`);
        return;
      }
    } catch {
      setValidationError('Please enter a valid HTTP or HTTPS URL (e.g. https://www.youtube.com/watch?v=...)');
      return;
    }

    onSubmit(e);
  };

  const handleSelectSample = (sampleUrl: string) => {
    setValidationError(null);
    onChangeUrl(sampleUrl);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-7 no-print transition-colors">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="video-url-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Video or Webpage URL
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-4 text-slate-400 pointer-events-none">
              <Link2 className="w-5 h-5" />
            </div>
            <input
              id="video-url-input"
              type="text"
              value={url}
              onChange={(e) => {
                onChangeUrl(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Paste a YouTube, Facebook, Instagram, TikTok, or webpage video URL here..."
              disabled={isLoading || disabled}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm sm:text-base font-normal shadow-inner"
            />
          </div>
          {validationError && (
            <div className="flex items-center space-x-1.5 mt-2 text-rose-600 dark:text-rose-400 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isLoading || disabled}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium rounded-xl shadow-sm shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Extract Content</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={isLoading || (!url && !disabled)}
            className="inline-flex items-center justify-center space-x-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Reset URL input and document"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>

        {/* Sample URLs for quick test */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium mr-1">Quick Samples:</span>
          <button
            type="button"
            onClick={() => handleSelectSample('https://www.youtube.com/watch?v=jNQXAC9IVRw')}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <PlayCircle className="w-3.5 h-3.5 text-red-500" />
            <span>YouTube First Video</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectSample('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <PlayCircle className="w-3.5 h-3.5 text-red-500" />
            <span>Music Video / Lyrics Guard</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectSample('https://en.wikipedia.org/wiki/Web_video')}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>Public Webpage</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectSample('https://www.tiktok.com/@tiktok/video/7106594312292453678')}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <Video className="w-3.5 h-3.5 text-pink-500" />
            <span>TikTok Video</span>
          </button>
        </div>
      </form>
    </div>
  );
};
