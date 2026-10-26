import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { extractContentFromUrl } from './server/extractor.ts';
import { summarizeContent, translateContent, transcribeMediaWithGemini } from './server/gemini.ts';
import { validateSafeUrl } from './server/security.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parser with 50mb limit for audio/video uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health and status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Primary extraction endpoint
app.post('/api/extract', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'A valid URL string is required.' });
      return;
    }

    const trimmedUrl = url.trim();
    const validation = await validateSafeUrl(trimmedUrl);
    if (validation.error || !validation.safeUrl) {
      res.status(400).json({ error: validation.error || 'Invalid destination URL.' });
      return;
    }

    const result = await extractContentFromUrl(trimmedUrl);
    res.json(result);
  } catch (err: any) {
    console.error('Extraction error:', err);
    res.status(500).json({
      error: err.message || 'An unexpected error occurred during content extraction.',
    });
  }
});

// Summarize endpoint
app.post('/api/summarize', async (req, res) => {
  try {
    const { text, type = 'standard' } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text content is required for summarization.' });
      return;
    }

    const validTypes = ['brief', 'standard', 'detailed'];
    const summaryType = validTypes.includes(type) ? type : 'standard';

    const summary = await summarizeContent(text, summaryType as any);
    res.json({ summary, type: summaryType });
  } catch (err: any) {
    console.error('Summarize error:', err);
    res.status(500).json({
      error: err.message || 'Failed to generate summary.',
    });
  }
});

// Translate endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text content is required for translation.' });
      return;
    }
    if (!targetLanguage || typeof targetLanguage !== 'string') {
      res.status(400).json({ error: 'Target language must be specified.' });
      return;
    }

    const result = await translateContent(text, targetLanguage, sourceLanguage);
    res.json(result);
  } catch (err: any) {
    console.error('Translate error:', err);
    res.status(500).json({
      error: err.message || 'Failed to translate content.',
    });
  }
});

// Transcribe uploaded media endpoint (fallback when platform blocks video stream)
app.post('/api/transcribe-upload', async (req, res) => {
  try {
    const { base64Data, mimeType, fileName } = req.body;
    if (!base64Data || !mimeType) {
      res.status(400).json({ error: 'base64Data and mimeType are required for transcription.' });
      return;
    }

    const result = await transcribeMediaWithGemini(base64Data, mimeType, fileName);
    res.json(result);
  } catch (err: any) {
    console.error('Transcribe media error:', err);
    res.status(500).json({
      error: err.message || 'Media transcription failed.',
    });
  }
});

// Development vs Production serving
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (${isDev ? 'development' : 'production'})`);
  });
}

startServer();
