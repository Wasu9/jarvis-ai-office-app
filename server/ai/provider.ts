import { GoogleGenAI } from '@google/genai';
import { MarkItDown } from 'markitdown-ts';

export interface AICompletionOptions {
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: Record<string, any>;
  inlineFiles?: Array<{ mimeType: string; data: string }>;
  model?: string;
}

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  generateText(prompt: string, options?: AICompletionOptions): Promise<string>;
}

const DEFAULT_MODEL = 'gemini-3.7-flash';
const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
const MARKDOWN_CONTEXT_LIMIT = 160_000;
const markItDown = new MarkItDown();

function extensionForMime(mimeType: string): string {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.includes('pdf')) return '.pdf';
  if (mime.includes('wordprocessingml')) return '.docx';
  if (mime.includes('spreadsheetml')) return '.xlsx';
  if (mime.includes('presentationml')) return '.pptx';
  if (mime.includes('html')) return '.html';
  if (mime.includes('csv')) return '.csv';
  if (mime.includes('json')) return '.json';
  if (mime.includes('text/')) return '.txt';
  return '.bin';
}

function stripDataUrl(data: string): string {
  return String(data || '').replace(/^data:[^;]+;base64,/, '');
}

/**
 * Build a deterministic text companion for uploaded documents while retaining
 * the original inline file for Gemini visual understanding. This is especially
 * useful for scanned/complex PDFs where direct structured extraction can return
 * an empty question array even though the document contains readable text.
 */
async function buildDocumentContext(files?: Array<{ mimeType: string; data: string }>): Promise<string> {
  if (!files?.length) return '';
  const sections: string[] = [];
  for (const file of files) {
    try {
      const bytes = Buffer.from(stripDataUrl(file.data), 'base64');
      const result = await markItDown.convertBuffer(bytes, { file_extension: extensionForMime(file.mimeType) });
      const markdown = String(result?.markdown || '').trim();
      if (markdown) {
        sections.push(`DOCUMENT TEXT EXTRACT (${file.mimeType}):\n${markdown.slice(0, MARKDOWN_CONTEXT_LIMIT)}`);
      }
    } catch (error) {
      console.warn('[MarkItDown] Document context extraction failed; keeping original inline file.', error);
    }
  }
  return sections.join('\n\n--- DOCUMENT BREAK ---\n\n');
}

export class GeminiProvider implements AIProvider {
  name = 'Gemini 3.7 Flash';

  private getApiKey(): string | undefined {
    const key = process.env.GEMINI_API_KEY;
    return typeof key === 'string' && key.trim().length > 0 ? key.trim() : undefined;
  }

  private getClient(): GoogleGenAI | null {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'jarvis-ai-office' } } });
  }

  isAvailable(): boolean { return !!this.getApiKey(); }

  private classifyError(err: any): 'quota' | 'unavailable' | 'invalid' | 'other' {
    const message = String(err?.message || err || '').toLowerCase();
    const status = String(err?.status || err?.code || '').toLowerCase();
    if (status.includes('resource_exhausted') || message.includes('resource_exhausted') || message.includes('quota') || message.includes('rate limit')) return 'quota';
    if (status.includes('503') || message.includes('503') || message.includes('unavailable') || message.includes('high demand') || message.includes('temporarily')) return 'unavailable';
    if (status.includes('404') || status.includes('not_found') || message.includes('not found') || message.includes('no longer available') || message.includes('shut down') || message.includes('shutdown') || message.includes('retired')) return 'unavailable';
    if (status.includes('400') || message.includes('invalid argument')) return 'invalid';
    return 'other';
  }

  async generateText(prompt: string, options?: AICompletionOptions): Promise<string> {
    const client = this.getClient();
    if (!client) throw new Error('Gemini API key is not configured on the deployed server. Add GEMINI_API_KEY to Vercel Production and Preview, then redeploy.');

    const requestedModel = options?.model?.trim() || DEFAULT_MODEL;
    const models = [requestedModel, ...FALLBACK_MODELS].filter((m, i, arr) => arr.indexOf(m) === i);
    const contentsParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
    if (options?.inlineFiles?.length) for (const file of options.inlineFiles) contentsParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });

    // Give Gemini both representations: the original file for visual fidelity
    // and deterministic Markdown text for reliable question/metadata extraction.
    const documentContext = await buildDocumentContext(options?.inlineFiles);
    if (documentContext) {
      contentsParts.push({ text: `${documentContext}\n\nUse the document text above as an extraction aid, but treat the attached original document as authoritative for visual layout, diagrams, symbols and source fidelity.` });
    }
    contentsParts.push({ text: prompt });

    let lastError: any = null;
    for (const currentModel of models) {
      try {
        const config: Record<string, any> = {
          systemInstruction: options?.systemInstruction,
          responseMimeType: options?.responseMimeType,
          responseSchema: options?.responseSchema,
        };
        if (!currentModel.startsWith('gemini-3.')) config.temperature = options?.temperature ?? 0.35;

        const response = await client.models.generateContent({
          model: currentModel,
          contents: contentsParts.length === 1 && contentsParts[0].text ? contentsParts[0].text : { parts: contentsParts },
          config,
        });
        const outputText = response.text?.trim() || '';
        if (!outputText) throw new Error(`Gemini returned an empty response from ${currentModel}.`);
        return outputText;
      } catch (err: any) {
        lastError = err;
        const kind = this.classifyError(err);
        if (kind === 'quota' || kind === 'unavailable') continue;
        break;
      }
    }

    console.error('[GeminiProvider Error]', lastError);
    const kind = this.classifyError(lastError);
    if (kind === 'quota') throw new Error('Gemini quota is currently exhausted for the configured project/model. Wait for the quota window to reset or enable billing/increase the Gemini API quota, then retry JARVIS.');
    if (kind === 'unavailable') throw new Error('Gemini models are temporarily unavailable for this request. JARVIS tried the configured production fallback models; please retry in a moment.');
    if (kind === 'invalid') throw new Error(`Gemini rejected the request. ${lastError?.message || ''}`.trim());
    throw new Error(`Gemini could not complete the request. ${lastError?.message || String(lastError)}`.trim());
  }
}

class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private activeProviderKey = 'gemini';
  constructor() { this.register('gemini', new GeminiProvider()); }
  register(key: string, provider: AIProvider) { this.providers.set(key, provider); }
  getProvider(key?: string): AIProvider {
    const targetKey = key || this.activeProviderKey;
    const provider = this.providers.get(targetKey) || this.providers.get('gemini');
    if (!provider) throw new Error(`AI Provider '${targetKey}' not found.`);
    return provider;
  }
  listProviders() { return Array.from(this.providers.entries()).map(([key, p]) => ({ id: key, name: p.name, available: p.isAvailable() })); }
}

export const aiRegistry = new ProviderRegistry();
