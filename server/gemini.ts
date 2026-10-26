import { GoogleGenAI, Type } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

export async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: any,
  maxRetries = 2
): Promise<any> {
  const modelsToTry = [params.model || 'gemini-3.8-flash', 'gemini-flash-latest'];
  for (const modelName of modelsToTry) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        return await ai.models.generateContent({ ...params, model: modelName });
      } catch (err: any) {
        attempt++;
        const isTransient =
          err?.status === 503 ||
          err?.message?.includes('503') ||
          err?.message?.includes('high demand') ||
          err?.message?.includes('RESOURCE_EXHAUSTED');
        if (isTransient) {
          if (attempt <= maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
            continue;
          }
          // Break inner loop to try fallback model
          break;
        }
        throw err;
      }
    }
  }
}

export interface VideoAnalysisResult {
  title?: string;
  subject?: string;
  detectedLanguage?: string;
  transcript: string;
  transcriptStatus: 'available' | 'partial' | 'unavailable';
  visualDescription?: string;
  speakers?: string[];
  segments?: Array<{ timestamp?: string; speaker?: string; text: string }>;
  rawAnalysis?: string;
}

/**
 * Analyzes a YouTube video using Gemini API video-understanding capability.
 */
export async function analyzeYouTubeWithGemini(
  youtubeUrl: string,
  metadata?: { title?: string; author?: string; description?: string }
): Promise<VideoAnalysisResult> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please set it in Settings > Secrets.');
  }

  const promptText = `
You are analyzing the video at this public YouTube URL: ${youtubeUrl}
${metadata?.title ? `Known Title: "${metadata.title}"` : ''}
${metadata?.author ? `Channel/Author: "${metadata.author}"` : ''}
${metadata?.description ? `Provided Description:\n${metadata.description.slice(0, 800)}` : ''}

CRITICAL INSTRUCTIONS:
1. Identify the video's subject and main topic.
2. Transcribe the audible speech faithfully when available, maintaining the original spoken language.
3. Include timestamps (e.g. [00:12], [01:45]) when discernible and helpful.
4. Identify speakers ONLY when clearly evident or introduced; do not invent speaker identities.
5. If there is visual narration, text on screen, or key demonstrations that cannot be represented as speech, describe them clearly.
6. If the audio is music only, silent, inaudible, or contains no speech, state that accurately.
7. Return your response as a valid JSON object matching the requested schema.
`;

  try {
    // Attempt official Gemini video understanding using fileData URI
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.8-flash',
      contents: [
        {
          fileData: {
            fileUri: youtubeUrl,
            mimeType: 'video/mp4',
          },
        },
        { text: promptText },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Subject or extracted title of video' },
            subject: { type: Type.STRING, description: 'Brief statement of main subject' },
            detectedLanguage: { type: Type.STRING, description: 'Primary spoken language of the video' },
            transcript: {
              type: Type.STRING,
              description: 'The transcribed spoken dialogue and audible speech with timestamps',
            },
            transcriptStatus: {
              type: Type.STRING,
              description: 'Whether transcript is available, partial, or unavailable',
            },
            visualDescription: {
              type: Type.STRING,
              description: 'Visual description of non-speech elements, on-screen text, or visuals',
            },
            speakers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Identified speakers if known',
            },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestamp: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                  text: { type: Type.STRING },
                },
                required: ['text'],
              },
            },
          },
          required: ['transcript', 'transcriptStatus'],
        },
      },
    });

    const text = response.text?.trim() || '';
    if (text) {
      try {
        const parsed = JSON.parse(text);
        return {
          title: parsed.title || metadata?.title,
          subject: parsed.subject,
          detectedLanguage: parsed.detectedLanguage || 'English',
          transcript: parsed.transcript || '',
          transcriptStatus:
            parsed.transcriptStatus === 'available' || parsed.transcriptStatus === 'partial'
              ? parsed.transcriptStatus
              : parsed.transcript ? 'available' : 'unavailable',
          visualDescription: parsed.visualDescription,
          speakers: parsed.speakers,
          segments: parsed.segments,
        };
      } catch {
        // Fallback parse if JSON had wrapping
        return {
          title: metadata?.title,
          transcript: text,
          transcriptStatus: text.length > 30 ? 'available' : 'unavailable',
        };
      }
    }
  } catch (err: any) {
    console.warn('Gemini direct video understanding with fileData error:', err.message);

    // Fallback: Gemini multimodal text inquiry with URL Context or metadata
    try {
      const fallbackPrompt = `
Analyze this YouTube video URL: ${youtubeUrl}
${metadata?.title ? `Video Title: "${metadata.title}"` : ''}
${metadata?.description ? `Video Description:\n${metadata.description}` : ''}

Task:
1. Based on the video and its publicly accessible information, provide the full transcript or dialogue transcription if known.
2. If exact verbatim audio is not accessible through this API method, provide a detailed spoken-word reconstruction and author narration based on the video's public content.
3. Maintain original language. Include timestamps if identifiable.
4. Identify subject and detected language.

Return a JSON with:
{
  "subject": "...",
  "detectedLanguage": "...",
  "transcript": "...",
  "transcriptStatus": "available" | "partial" | "unavailable",
  "visualDescription": "..."
}
`;

      const fallbackResponse = await generateContentWithRetry(ai, {
        model: 'gemini-3.8-flash',
        contents: fallbackPrompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const fallbackText = fallbackResponse.text?.trim() || '';
      if (fallbackText) {
        const parsed = JSON.parse(fallbackText);
        return {
          title: metadata?.title,
          subject: parsed.subject,
          detectedLanguage: parsed.detectedLanguage || 'English',
          transcript: parsed.transcript || '',
          transcriptStatus: parsed.transcriptStatus || (parsed.transcript ? 'partial' : 'unavailable'),
          visualDescription: parsed.visualDescription,
        };
      }
    } catch (fallbackErr: any) {
      console.error('Gemini fallback video analysis error:', fallbackErr.message);
    }
  }

  return {
    title: metadata?.title,
    transcript: '',
    transcriptStatus: 'unavailable',
    visualDescription: 'Direct video audio transcription could not be retrieved from this source.',
  };
}

/**
 * Transcribes an uploaded audio or video buffer using Gemini.
 */
export async function transcribeMediaWithGemini(
  base64Data: string,
  mimeType: string,
  fileName?: string
): Promise<{ transcript: string; detectedLanguage: string; status: 'available' | 'partial' | 'unavailable' }> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3.8-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        {
          text: `
Please transcribe all audible speech in this media file accurately.
Preserve the original spoken language.
Include timestamps (e.g. [00:15]) at natural speech boundaries and paragraph breaks.
Indicate speaker turns if multiple voices are audible.
If there are non-speech audio events (music, applause, silence), note them in brackets.
At the end, on a new line, add:
[Detected Language: <Language Name>]
`,
        },
      ],
    },
  });

  const fullText = response.text?.trim() || '';
  const langMatch = fullText.match(/\[Detected Language:\s*([^\]]+)\]/i);
  const detectedLanguage = langMatch ? langMatch[1].trim() : 'Unknown';
  const cleanTranscript = fullText.replace(/\[Detected Language:\s*[^\]]+\]/i, '').trim();

  return {
    transcript: cleanTranscript,
    detectedLanguage,
    status: cleanTranscript.length > 20 ? 'available' : 'unavailable',
  };
}

/**
 * Generates a summary with strict factual adherence.
 */
export async function summarizeContent(
  content: string,
  type: 'brief' | 'standard' | 'detailed'
): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  let lengthInstruction = '';
  if (type === 'brief') {
    lengthInstruction = 'Produce a concise summary in approximately 3 to 5 clear sentences.';
  } else if (type === 'standard') {
    lengthInstruction = 'Produce a standard summary featuring 5 to 10 structured bullet points highlighting the main key takeaways.';
  } else {
    lengthInstruction = 'Produce a detailed summary organized by thematic section headings, key figures, dates, arguments, and conclusions.';
  }

  const prompt = `
You are summarizing extracted video and article content.

Summary Type: ${type.toUpperCase()}
Instruction: ${lengthInstruction}

CRITICAL RULES:
- Base the summary strictly and exclusively on the text provided below.
- Preserve original meaning and tone without hallucinating outside claims.
- Capture significant names, dates, figures, and conclusions.
- If information is missing or uncertain, explicitly state it.
- Clearly distinguish between verified transcript data and surrounding commentary.

CONTENT TO SUMMARIZE:
${content}
`;

  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3.8-flash',
    contents: prompt,
  });

  return response.text?.trim() || 'Summary could not be generated.';
}

/**
 * Translates content into the requested language with RTL awareness for Arabic and Urdu.
 */
export async function translateContent(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<{ translation: string; isRtl: boolean }> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const isRtl = /^(arabic|ar|urdu|ur|hebrew|he|persian|fa)$/i.test(targetLanguage.trim());

  const prompt = `
You are a professional translator.
Translate the following extracted video document content into: ${targetLanguage}.
${sourceLanguage ? `Original Language: ${sourceLanguage}` : ''}

RULES:
- Preserve all section headings, paragraph boundaries, bullet lists, and layout structures.
- Preserve timestamps (e.g. [00:15], [02:30]), speaker labels, technical identifiers, and URLs verbatim without altering them.
- Translate natural prose, dialogue, and titles accurately and fluently.
- Maintain the original distinction between source extracted text and notes.
- Do NOT add commentary, explanations, or extraneous remarks outside the translation itself.

CONTENT TO TRANSLATE:
${text}
`;

  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3.8-flash',
    contents: prompt,
  });

  return {
    translation: response.text?.trim() || 'Translation failed.',
    isRtl,
  };
}
