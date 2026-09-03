import { aiRegistry } from '../../server/ai/provider.js';
import { convertFileToMarkdown } from '../../server/document-markdown.js';
import { extractText, getDocumentProxy } from 'unpdf';

export const config = {
  api: {
    bodyParser: { sizeLimit: '50mb' },
  },
};

const COUNT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questionCount: { type: 'INTEGER' },
    lastQuestionNumber: { type: 'INTEGER' },
  },
  required: ['questionCount', 'lastQuestionNumber'],
};

function extractJson(text: string): any {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const a = cleaned.indexOf('{');
  const b = cleaned.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(cleaned.slice(a, b + 1));
  throw new Error('JARVIS could not read the source question count.');
}

function stripDataUrl(value: string): string {
  return String(value || '').replace(/^data:[^;]+;base64,/, '');
}

type CountResult = { questionCount: number; lastQuestionNumber: number };

function normalizeText(text: string): string {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[\u00a0\u2000-\u200b]/g, ' ')
    .replace(/\uFEFF/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

/** Prefer explicit section ranges printed by the source PDF. This avoids
 * confusing MCQ option labels such as (1), (2), (3), (4) with questions. */
function detectCountFromSectionRanges(text: string): CountResult | null {
  const normalized = normalizeText(text);
  const ranges: Array<{ start: number; end: number; count: number }> = [];
  const patterns = [
    /(?:\(|\[)?\s*(\d{1,3})\s*(?:to|-)\s*(\d{1,3})\s*(?:\)|\])?\s*(?:[\u2013\u2014-]\s*)?(?:This section contains|Section contains)\s*(\d{1,3})\s*questions/gi,
    /(?:This section contains|Section contains)\s*(\d{1,3})\s*questions[\s\S]{0,120}?(?:\(|\[)?\s*(\d{1,3})\s*(?:to|-)\s*(\d{1,3})\s*(?:\)|\])?/gi,
  ];

  for (const re of patterns) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(normalized)) !== null) {
      const first = Number(match[1]);
      const second = Number(match[2]);
      const third = Number(match[3]);
      const start = re === patterns[0] ? first : second;
      const end = re === patterns[0] ? second : third;
      const count = re === patterns[0] ? third : first;
      if (start >= 1 && end >= start && count === end - start + 1) ranges.push({ start, end, count });
    }
  }

  if (!ranges.length) return null;
  ranges.sort((a, b) => a.start - b.start);
  let expected = 1;
  let last = 0;
  for (const range of ranges) {
    if (range.start !== expected) break;
    expected = range.end + 1;
    last = range.end;
  }
  return last > 0 ? { questionCount: last, lastQuestionNumber: last } : null;
}

/** Count a contiguous question-number sequence. Markdown conversion often
 * changes PDF layout, so accept both "1."/"1)" and "Q.1"/"Q1" forms. */
function detectCountFromQuestionSequence(text: string): CountResult | null {
  const normalized = normalizeText(text);
  const candidates = new Set<number>();
  const patterns = [
    /^\s*(\d{1,3})\s*[.)]\s+\S/gm,
    /^\s*Q\.?\s*(\d{1,3})\s*[.)\-:]\s*\S/gim,
    /^\s*Question\s*(\d{1,3})\s*[.)\-:]\s*\S/gim,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(normalized)) !== null) {
      const n = Number(match[1]);
      if (Number.isInteger(n) && n >= 1 && n <= 1000) candidates.add(n);
    }
  }
  if (!candidates.has(1)) return null;
  let last = 0;
  for (let n = 1; n <= 1000; n += 1) {
    if (!candidates.has(n)) break;
    last = n;
  }
  return last > 0 ? { questionCount: last, lastQuestionNumber: last } : null;
}

async function extractDeterministicText(inline: Array<{ mimeType: string; data: string; name?: string; textPreview?: string }>): Promise<string> {
  const parts: string[] = [];
  for (const file of inline) {
    if (file.textPreview?.trim()) parts.push(file.textPreview.trim());
    if (String(file.mimeType).toLowerCase().includes('pdf')) {
      try {
        const bytes = new Uint8Array(Buffer.from(file.data, 'base64'));
        const pdf = await getDocumentProxy(bytes);
        const result = await extractText(pdf, { mergePages: true });
        if (result.text?.trim()) parts.push(String(result.text).trim());
      } catch (error) {
        console.warn('[Source Count] unpdf text extraction failed:', error);
      }
    }
  }
  return parts.join('\n\n');
}

async function enrichForCount(files: any[]): Promise<Array<{ mimeType: string; data: string; name?: string; textPreview?: string }>> {
  return Promise.all(files.map(async (file: any) => {
    const base = {
      mimeType: file.type || 'application/pdf',
      data: stripDataUrl(file.base64Data),
      name: file.name,
      textPreview: typeof file.textPreview === 'string' ? file.textPreview : undefined,
    };
    if (base.textPreview?.trim() || !file.base64Data) return base;
    try {
      const markdown = await convertFileToMarkdown(file);
      if (markdown) return { ...base, textPreview: markdown.slice(0, 120_000) };
    } catch (error) {
      console.warn(`[MarkItDown] Source-count conversion failed for ${file.name}; continuing with PDF text/vision.`, error);
    }
    return base;
  }));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const files = Array.isArray(req.body?.attachedFiles) ? req.body.attachedFiles : [];
    if (!files.length) return res.status(400).json({ error: 'No readable source file was attached.' });

    // The source-count endpoint is intentionally independent of the main task
    // executor. Enrich here too, because the UI asks for the exact source count
    // before TaskRunner starts. Previously MarkItDown was only applied later,
    // so a PDF that unpdf could not sequence would fail before AI extraction.
    const inline = await enrichForCount(files.filter((f: any) => !!f?.base64Data));
    if (!inline.length) return res.status(400).json({ error: 'No readable source file was attached.' });

    const extractedText = await extractDeterministicText(inline);
    const bySections = detectCountFromSectionRanges(extractedText);
    if (bySections) {
      console.info(`[Source Count] explicit section ranges detected ${bySections.questionCount} questions`);
      return res.status(200).json({ ...bySections, detectionMethod: 'document-text-structure' });
    }

    const bySequence = detectCountFromQuestionSequence(extractedText);
    if (bySequence) {
      console.info(`[Source Count] deterministic question sequence detected ${bySequence.questionCount} questions`);
      return res.status(200).json({ ...bySequence, detectionMethod: 'document-text-sequence' });
    }

    const provider = aiRegistry.getProvider('gemini');
    // Give Gemini both the original visual document and extracted text. The
    // text is bounded from both ends so the final printed question remains
    // available even for long papers.
    const textForAI = extractedText.length > 120_000
      ? `${extractedText.slice(0, 60_000)}\n\n[...middle omitted...]\n\n${extractedText.slice(-60_000)}`
      : extractedText;

    const raw = await provider.generateText(
      `Determine the ACTUAL number of numbered questions in the attached source document before any extraction begins. Count only question items that are really present. Never assume 180 questions and never use a NEET/JEE default. Identify the final numbered question printed in the document and verify the sequence from question 1. The document may be scanned, so inspect the original PDF visually. An extracted Markdown/text representation is also supplied below as an aid; it is not permission to invent or alter source content.\n\nEXTRACTED DOCUMENT TEXT:\n${textForAI}\n\nReturn questionCount and lastQuestionNumber only after checking the actual source.`,
      {
        model: req.body?.model || 'gemini-3.7-flash',
        responseMimeType: 'application/json',
        responseSchema: COUNT_SCHEMA,
        inlineFiles: inline.map(f => ({ mimeType: f.mimeType, data: f.data })),
      },
    );

    const data = extractJson(raw);
    const count = Number(data?.questionCount);
    const last = Number(data?.lastQuestionNumber);
    if (!Number.isInteger(count) || count < 1 || count > 1000) {
      throw new Error(`Invalid source question count returned by AI: ${String(data?.questionCount)}`);
    }
    if (!Number.isInteger(last) || last < 1 || last > 1000) {
      throw new Error(`Invalid last question number returned by AI: ${String(data?.lastQuestionNumber)}`);
    }

    return res.status(200).json({ questionCount: count, lastQuestionNumber: last, detectionMethod: 'gemini-visual-plus-markdown-fallback' });
  } catch (err: any) {
    console.error('[Source Count Error]', err);
    return res.status(500).json({ error: err?.message || 'Failed to detect source question count.' });
  }
}
