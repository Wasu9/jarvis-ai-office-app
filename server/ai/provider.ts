import { GoogleGenAI } from '@google/genai';

export interface AICompletionOptions {
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  inlineFiles?: Array<{
    mimeType: string;
    data: string; // Base64
  }>;
  model?: string;
}

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  generateText(prompt: string, options?: AICompletionOptions): Promise<string>;
}

export class GeminiProvider implements AIProvider {
  name = 'Gemini 3.7 Flash';
  private client: GoogleGenAI | null = null;

  constructor() {
    this.initClient();
  }

  private initClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  isAvailable(): boolean {
    if (!this.client) {
      this.initClient();
    }
    return !!this.client && !!process.env.GEMINI_API_KEY;
  }

  async generateText(prompt: string, options?: AICompletionOptions): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error(
        'Gemini API key is not configured in process.env.GEMINI_API_KEY. Please ensure the API key is set.'
      );
    }

    const requestedModel = options?.model || 'gemini-3.7-flash';
    const fallbackModels = [requestedModel, 'gemini-2.5-flash', 'gemini-3.1-pro-preview'].filter(
      (m, idx, arr) => arr.indexOf(m) === idx
    );

    const contentsParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    // Add attached files if any (e.g. PDF, Images)
    if (options?.inlineFiles && options.inlineFiles.length > 0) {
      for (const file of options.inlineFiles) {
        contentsParts.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.data,
          },
        });
      }
    }

    // Add text prompt
    contentsParts.push({
      text: prompt,
    });

    let lastError: any = null;

    for (const currentModel of fallbackModels) {
      // Try up to 2 attempts per model with backoff
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await this.client!.models.generateContent({
            model: currentModel,
            contents: contentsParts.length === 1 && contentsParts[0].text ? contentsParts[0].text : { parts: contentsParts },
            config: {
              systemInstruction: options?.systemInstruction,
              temperature: options?.temperature ?? 0.4,
              responseMimeType: options?.responseMimeType,
            },
          });

          const outputText = response.text || '';
          return outputText;
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          const isRetryable =
            errMsg.includes('503') ||
            errMsg.includes('429') ||
            errMsg.includes('high demand') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('UNAVAILABLE');

          if (!isRetryable || (attempt === 2 && currentModel === fallbackModels[fallbackModels.length - 1])) {
            break;
          }

          // Small backoff before retry or fallback
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    console.error('[GeminiProvider Error]', lastError);
    throw new Error(`AI Provider Error (${requestedModel}): ${lastError?.message || String(lastError)}`);
  }
}

// Extensible AI Provider Registry
class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private activeProviderKey = 'gemini';

  constructor() {
    this.register('gemini', new GeminiProvider());
  }

  register(key: string, provider: AIProvider) {
    this.providers.set(key, provider);
  }

  getProvider(key?: string): AIProvider {
    const targetKey = key || this.activeProviderKey;
    const provider = this.providers.get(targetKey) || this.providers.get('gemini');
    if (!provider) {
      throw new Error(`AI Provider '${targetKey}' not found.`);
    }
    return provider;
  }

  listProviders() {
    return Array.from(this.providers.entries()).map(([key, p]) => ({
      id: key,
      name: p.name,
      available: p.isAvailable(),
    }));
  }
}

export const aiRegistry = new ProviderRegistry();
