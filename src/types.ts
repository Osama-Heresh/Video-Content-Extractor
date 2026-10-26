export type SourcePlatform = 'YouTube' | 'TikTok' | 'Instagram' | 'Facebook' | 'Webpage' | 'Other';

export interface TranscriptSegment {
  timestamp?: string;
  speaker?: string;
  text: string;
}

export interface SummaryData {
  type: 'brief' | 'standard' | 'detailed';
  content: string;
  generatedAt: string;
}

export interface TranslationData {
  targetLanguage: string;
  sourceLanguage?: string;
  scope: 'entire' | 'transcript' | 'page_text' | 'summary';
  content: string;
  isRtl: boolean;
  translatedAt: string;
}

export interface ExtractionResult {
  sourceUrl: string;
  sourcePlatform: SourcePlatform;
  pageTitle: string;
  detectedLanguage: string;
  author?: string;
  publishDate?: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  hasEmbeddedVideo: boolean;
  embeddedVideoType?: string;

  // Section 1: Text appearing above or before the video
  textBeforeVideo: string;
  textBeforeVideoStatus: 'extracted' | 'unavailable';

  // Section 2: Video transcript
  transcript: string;
  transcriptStatus: 'available' | 'partial' | 'unavailable';
  transcriptProvenance: 'official_caption' | 'ai_transcription' | 'author_narration' | 'user_provided' | 'unavailable';
  transcriptSegments?: TranscriptSegment[];
  visualDescription?: string;

  // Section 3: Text appearing below or after the video
  textAfterVideo: string;
  textAfterVideoStatus: 'extracted' | 'unavailable';

  // Section 4: Summary (optional, user requested)
  summary?: SummaryData;

  // Section 5: Translation (optional, user requested)
  translation?: TranslationData;

  // Metadata & Diagnostics
  extractionWarnings: string[];
  extractedAt: string;
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  detail?: string;
}
