import React, { useState } from 'react';
import { Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';

interface TranscriptFallbackProps {
  onSetUserTranscript: (text: string, provenance: 'user_provided' | 'ai_transcription') => void;
}

export const TranscriptFallback: React.FC<TranscriptFallbackProps> = ({ onSetUserTranscript }) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleApplyPasted = () => {
    if (!pastedText.trim()) return;
    onSetUserTranscript(pastedText.trim(), 'user_provided');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      // Check file size (limit 25MB for browser upload)
      if (file.size > 25 * 1024 * 1024) {
        throw new Error('File size exceeds 25MB limit. Please upload a smaller audio or video file.');
      }

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      const res = await fetch('/api/transcribe-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          mimeType: file.type || 'audio/mp3',
          fileName: file.name,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      if (!data.transcript) {
        throw new Error('No spoken dialogue could be recognized in the media file.');
      }

      onSetUserTranscript(data.transcript, 'ai_transcription');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to transcribe uploaded media file.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mt-4 p-5 rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 no-print">
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
          Provide Transcript or Media:
        </span>
        <div className="inline-flex rounded-lg border border-amber-200 dark:border-amber-800 p-0.5 bg-white dark:bg-slate-900 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Paste Transcript
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Upload Audio / Video
          </button>
        </div>
      </div>

      {activeTab === 'paste' ? (
        <div className="space-y-3">
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste dialogue, closed captions, or transcription notes here..."
            rows={4}
            className="w-full p-3 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={handleApplyPasted}
            disabled={!pastedText.trim()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Provided Transcript</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-amber-300 dark:border-amber-800 rounded-xl bg-white/60 dark:bg-slate-900/60 text-center">
            {isUploading ? (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Transcribing media with Gemini API...
                </p>
              </div>
            ) : (
              <>
                <Upload className="w-7 h-7 text-amber-600 dark:text-amber-400 mb-2" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Upload MP3, WAV, M4A, WebM, or MP4 (Max 25MB)
                </p>
                <label className="inline-flex items-center px-3 py-1.5 mt-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium cursor-pointer transition-colors">
                  <span>Browse Media File</span>
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>
          {uploadError && (
            <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
