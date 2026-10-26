import * as cheerio from 'cheerio';
import { safeFetchHtml, validateSafeUrl } from './security.ts';
import { analyzeYouTubeWithGemini } from './gemini.ts';
import type { ExtractionResult, SourcePlatform, TranscriptSegment } from '../src/types.ts';

export function detectPlatform(urlString: string): SourcePlatform {
  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase();

    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      return 'YouTube';
    }
    if (host.includes('tiktok.com')) {
      return 'TikTok';
    }
    if (host.includes('instagram.com')) {
      return 'Instagram';
    }
    if (host.includes('facebook.com') || host.includes('fb.watch') || host.includes('fb.com')) {
      return 'Facebook';
    }
    return 'Webpage';
  } catch {
    return 'Other';
  }
}

export function extractYouTubeId(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.slice(1).split('?')[0].split('/')[0] || null;
    }
    if (url.pathname.startsWith('/shorts/')) {
      return url.pathname.split('/shorts/')[1].split('/')[0].split('?')[0] || null;
    }
    if (url.pathname.startsWith('/embed/')) {
      return url.pathname.split('/embed/')[1].split('/')[0].split('?')[0] || null;
    }
    return url.searchParams.get('v');
  } catch {
    return null;
  }
}

/**
 * Extracts YouTube video content and analyzes spoken dialogue using Gemini.
 */
async function extractYouTube(url: string): Promise<ExtractionResult> {
  const warnings: string[] = [];
  const videoId = extractYouTubeId(url);
  const normalizedUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;

  let pageTitle = 'Extracted Video Content';
  let author = '';
  let thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined;
  let oembedDescription = '';

  // 1. Fetch public oEmbed metadata
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`;
    const oembedRes = await safeFetchHtml(oembedUrl, { timeoutMs: 8000 });
    if (oembedRes.ok && oembedRes.text) {
      const data = JSON.parse(oembedRes.text);
      if (data.title) pageTitle = data.title;
      if (data.author_name) author = data.author_name;
      if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
    }
  } catch (err: any) {
    warnings.push(`YouTube oEmbed metadata retrieval: ${err.message || 'unavailable'}`);
  }

  // 2. Fetch watch page HTML safely for description / metadata
  let pageDescription = '';
  try {
    const pageRes = await safeFetchHtml(normalizedUrl, { timeoutMs: 10000 });
    if (pageRes.ok && pageRes.text) {
      const $ = cheerio.load(pageRes.text);
      const desc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content');
      if (desc) pageDescription = desc.trim();
      const metaTitle = $('meta[property="og:title"]').attr('content') || $('title').text();
      if (metaTitle && pageTitle === 'Extracted Video Content') {
        pageTitle = metaTitle.replace(/ - YouTube$/, '').trim();
      }
    }
  } catch (err: any) {
    // Watch page fetch error is non-fatal
  }

  // 3. Gemini video understanding analysis
  let geminiResult = {
    transcript: '',
    transcriptStatus: 'unavailable' as 'available' | 'partial' | 'unavailable',
    detectedLanguage: 'English',
    subject: '',
    visualDescription: '',
    segments: undefined as TranscriptSegment[] | undefined,
  };

  try {
    const analysis = await analyzeYouTubeWithGemini(normalizedUrl, {
      title: pageTitle,
      author,
      description: pageDescription,
    });
    geminiResult = {
      transcript: analysis.transcript,
      transcriptStatus: analysis.transcriptStatus,
      detectedLanguage: analysis.detectedLanguage || 'English',
      subject: analysis.subject || '',
      visualDescription: analysis.visualDescription || '',
      segments: analysis.segments,
    };
  } catch (err: any) {
    warnings.push(`Gemini video analysis: ${err.message || 'Error executing video understanding'}`);
  }

  // Build Text Before Video
  const beforeParts: string[] = [];
  if (pageTitle && pageTitle !== 'Extracted Video Content') {
    beforeParts.push(`Headline / Video Title: ${pageTitle}`);
  }
  if (author) {
    beforeParts.push(`Channel / Creator: ${author}`);
  }
  if (geminiResult.subject) {
    beforeParts.push(`Subject & Topic: ${geminiResult.subject}`);
  }
  const textBeforeVideo = beforeParts.join('\n\n');

  // Build Text After Video
  const afterParts: string[] = [];
  if (pageDescription) {
    afterParts.push(`Original Video Description:\n${pageDescription}`);
  }
  if (geminiResult.visualDescription) {
    afterParts.push(`Visual Context & Demonstration Notes:\n${geminiResult.visualDescription}`);
  }
  const textAfterVideo = afterParts.join('\n\n');

  return {
    sourceUrl: url,
    sourcePlatform: 'YouTube',
    pageTitle,
    author,
    detectedLanguage: geminiResult.detectedLanguage || 'English',
    thumbnailUrl,
    hasEmbeddedVideo: true,
    embeddedVideoType: 'YouTube Video',
    textBeforeVideo: textBeforeVideo || '',
    textBeforeVideoStatus: textBeforeVideo ? 'extracted' : 'unavailable',
    transcript: geminiResult.transcript || '',
    transcriptStatus: geminiResult.transcriptStatus,
    transcriptProvenance: geminiResult.transcript ? 'ai_transcription' : 'unavailable',
    transcriptSegments: geminiResult.segments,
    visualDescription: geminiResult.visualDescription,
    textAfterVideo: textAfterVideo || '',
    textAfterVideoStatus: textAfterVideo ? 'extracted' : 'unavailable',
    extractionWarnings: warnings,
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Extracts public social media post content (TikTok, Instagram, Facebook).
 */
async function extractSocialMedia(url: string, platform: 'TikTok' | 'Instagram' | 'Facebook'): Promise<ExtractionResult> {
  const warnings: string[] = [];
  let pageTitle = `${platform} Video`;
  let author = '';
  let ogDescription = '';
  let ogVideo = '';
  let thumbnailUrl = '';
  let detectedLanguage = 'English';

  // For TikTok, check public oEmbed API first
  if (platform === 'TikTok') {
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const oembedRes = await safeFetchHtml(oembedUrl, { timeoutMs: 8000 });
      if (oembedRes.ok && oembedRes.text) {
        const data = JSON.parse(oembedRes.text);
        if (data.title) {
          pageTitle = data.title;
          ogDescription = data.title;
        }
        if (data.author_name) author = data.author_name;
        if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
      }
    } catch {
      // Continue to HTML fetch
    }
  }

  // Safe fetch page HTML
  const fetchResult = await safeFetchHtml(url, { timeoutMs: 12000 });
  if (fetchResult.ok && fetchResult.text) {
    const $ = cheerio.load(fetchResult.text);

    const titleCandidate =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text().trim();
    if (titleCandidate && (!pageTitle || pageTitle.endsWith('Video'))) {
      pageTitle = titleCandidate;
    }

    const descCandidate =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content');
    if (descCandidate) {
      ogDescription = descCandidate.trim();
    }

    const videoCandidate =
      $('meta[property="og:video"]').attr('content') ||
      $('meta[property="og:video:url"]').attr('content') ||
      $('meta[property="og:video:secure_url"]').attr('content');
    if (videoCandidate) ogVideo = videoCandidate;

    const imgCandidate =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content');
    if (imgCandidate && !thumbnailUrl) thumbnailUrl = imgCandidate;

    const authorCandidate =
      $('meta[name="author"]').attr('content') ||
      $('meta[property="og:article:author"]').attr('content');
    if (authorCandidate && !author) author = authorCandidate;
  } else {
    warnings.push(`Direct HTML retrieval: ${fetchResult.error || `HTTP ${fetchResult.status}`}`);
  }

  // Text before the video is the post headline, creator name, and caption
  const beforeParts: string[] = [];
  if (author) beforeParts.push(`Creator / Account: ${author}`);
  if (pageTitle && !pageTitle.toLowerCase().includes('log in') && !pageTitle.toLowerCase().includes('watch')) {
    beforeParts.push(`Post Headline / Title: ${pageTitle}`);
  }
  if (ogDescription && !ogDescription.toLowerCase().includes('log in to see')) {
    beforeParts.push(`Caption / Post Content:\n${ogDescription}`);
  }
  const textBeforeVideo = beforeParts.join('\n\n');

  // Text after video: platform note, tags or metadata
  const textAfterVideo = `Platform: ${platform}\nOriginal Post URL: ${url}\nNote: Extracted from publicly accessible page metadata.`;

  // Transparent transcript handling per prompt requirement 4.B & 14:
  // "Never pretend that a social-media URL alone guarantees access to the video's audio, captions, or surrounding text.
  // If extraction is blocked, ask the user to upload the video or an audio file, or paste an available transcript."
  return {
    sourceUrl: url,
    sourcePlatform: platform,
    pageTitle: pageTitle || `${platform} Post`,
    author,
    detectedLanguage,
    thumbnailUrl,
    mediaUrl: ogVideo,
    hasEmbeddedVideo: true,
    embeddedVideoType: `${platform} Video Embed`,
    textBeforeVideo: textBeforeVideo || '',
    textBeforeVideoStatus: textBeforeVideo ? 'extracted' : 'unavailable',
    transcript: '',
    transcriptStatus: 'unavailable',
    transcriptProvenance: 'unavailable',
    textAfterVideo,
    textAfterVideoStatus: 'extracted',
    extractionWarnings: [
      ...warnings,
      `${platform} audio stream is protected by platform authentication controls. You can upload an audio/video recording or paste a transcript below.`,
    ],
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Extracts public HTML webpages containing embedded videos.
 * Identifies DOM elements before and after the video.
 */
async function extractWebpage(url: string): Promise<ExtractionResult> {
  const warnings: string[] = [];
  const fetchResult = await safeFetchHtml(url, { timeoutMs: 15000 });

  if (!fetchResult.ok || !fetchResult.text) {
    throw new Error(`Unable to access webpage: ${fetchResult.error || `HTTP status ${fetchResult.status}`}`);
  }

  const $ = cheerio.load(fetchResult.text);

  // Remove scripts, styles, navigation, footer, comments, ads
  $('script, style, noscript, nav, footer, header, aside, form, .ad, .advertisement, .social-share, .cookie-banner').remove();

  // Extract meta information
  const pageTitle =
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    'Extracted Webpage Content';

  const author =
    $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content') ||
    $('[rel="author"]').first().text().trim() ||
    undefined;

  const publishDate =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time').first().attr('datetime') ||
    undefined;

  const thumbnailUrl =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    undefined;

  const langAttr = $('html').attr('lang');
  const detectedLanguage = langAttr ? langAttr.split('-')[0].toUpperCase() : 'English';

  // Find video elements in document
  const videoElements = $('video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"], iframe[src*="embed"], [data-video-url]');
  const hasEmbeddedVideo = videoElements.length > 0;
  let embeddedVideoType = '';
  let embeddedYoutubeUrl: string | null = null;

  if (hasEmbeddedVideo) {
    const firstVideo = videoElements.first();
    const tagName = firstVideo.prop('tagName')?.toLowerCase();
    const src = firstVideo.attr('src') || firstVideo.find('source').attr('src') || firstVideo.attr('data-video-url') || '';

    if (tagName === 'video') {
      embeddedVideoType = 'HTML5 <video> element';
    } else if (src.includes('youtube') || src.includes('youtu.be')) {
      embeddedVideoType = 'Embedded YouTube Player';
      const ytId = extractYouTubeId(src);
      if (ytId) {
        embeddedYoutubeUrl = `https://www.youtube.com/watch?v=${ytId}`;
      }
    } else if (src.includes('vimeo')) {
      embeddedVideoType = 'Embedded Vimeo Player';
    } else {
      embeddedVideoType = `Embedded Video (${tagName || 'media'})`;
    }
  } else {
    warnings.push('No direct <video> or embed iframe detected in page structure; parsed as standard article document.');
  }

  // Locate main container
  const mainContainer = $('article, main, [role="main"], .post-content, .entry-content, .article-body, body').first();

  let textBeforeVideo = '';
  let textAfterVideo = '';
  let transcript = '';
  let transcriptStatus: 'available' | 'partial' | 'unavailable' = 'unavailable';
  let transcriptProvenance: 'official_caption' | 'ai_transcription' | 'author_narration' | 'unavailable' = 'unavailable';

  // If there's an embedded YouTube video, attempt Gemini transcription on it!
  if (embeddedYoutubeUrl) {
    try {
      const ytAnalysis = await analyzeYouTubeWithGemini(embeddedYoutubeUrl, {
        title: pageTitle,
        description: $('meta[name="description"]').attr('content'),
      });
      if (ytAnalysis.transcript) {
        transcript = ytAnalysis.transcript;
        transcriptStatus = ytAnalysis.transcriptStatus;
        transcriptProvenance = 'ai_transcription';
      }
    } catch (err: any) {
      warnings.push(`Embedded YouTube video analysis: ${err.message || 'unavailable'}`);
    }
  }

  if (hasEmbeddedVideo) {
    const videoNode = videoElements.first();
    const beforeParagraphs: string[] = [];
    const afterParagraphs: string[] = [];

    // Check headings before video
    const h1Text = $('h1').first().text().trim();
    if (h1Text && h1Text !== pageTitle) {
      beforeParagraphs.push(h1Text);
    }

    // Traverse all direct or nested paragraphs, headings, blockquotes inside main container
    let passedVideo = false;

    mainContainer.find('p, h2, h3, h4, blockquote, li').each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      if (!text || text.length < 5) return;

      // Check if this element comes before or after the video
      // In Cheerio, we compare node index or containment
      if (!passedVideo) {
        const containsVideo = $el.find(videoNode).length > 0 || $el.is(videoNode);
        if (containsVideo) {
          passedVideo = true;
          return;
        }
        // Check if next siblings contain video
        const laterHasVideo = $el.nextAll().find(videoNode).length > 0 || $el.nextAll().is(videoNode);
        if (laterHasVideo) {
          beforeParagraphs.push(text);
        } else {
          // If already past video in DOM order
          afterParagraphs.push(text);
        }
      } else {
        afterParagraphs.push(text);
      }
    });

    textBeforeVideo = beforeParagraphs.slice(0, 15).join('\n\n');
    textAfterVideo = afterParagraphs.slice(0, 30).join('\n\n');
  } else {
    // No video element: extract intro paragraphs as before and body as after
    const allParagraphs: string[] = [];
    mainContainer.find('p, h2, h3').each((_, el) => {
      const t = $(el).text().trim();
      if (t && t.length > 10) allParagraphs.push(t);
    });

    if (allParagraphs.length > 0) {
      textBeforeVideo = allParagraphs.slice(0, 2).join('\n\n');
      textAfterVideo = allParagraphs.slice(2).join('\n\n');
    }
  }

  return {
    sourceUrl: url,
    sourcePlatform: 'Webpage',
    pageTitle,
    author,
    publishDate,
    detectedLanguage,
    thumbnailUrl,
    hasEmbeddedVideo,
    embeddedVideoType,
    textBeforeVideo: textBeforeVideo || '',
    textBeforeVideoStatus: textBeforeVideo ? 'extracted' : 'unavailable',
    transcript,
    transcriptStatus,
    transcriptProvenance,
    textAfterVideo: textAfterVideo || '',
    textAfterVideoStatus: textAfterVideo ? 'extracted' : 'unavailable',
    extractionWarnings: warnings,
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Main source-aware extraction entry point.
 */
export async function extractContentFromUrl(rawUrl: string): Promise<ExtractionResult> {
  const validation = await validateSafeUrl(rawUrl);
  if (validation.error || !validation.safeUrl) {
    throw new Error(validation.error || 'Invalid URL supplied.');
  }

  const normalizedUrl = validation.safeUrl.toString();
  const platform = detectPlatform(normalizedUrl);

  switch (platform) {
    case 'YouTube':
      return await extractYouTube(normalizedUrl);
    case 'TikTok':
    case 'Instagram':
    case 'Facebook':
      return await extractSocialMedia(normalizedUrl, platform);
    case 'Webpage':
    default:
      return await extractWebpage(normalizedUrl);
  }
}
