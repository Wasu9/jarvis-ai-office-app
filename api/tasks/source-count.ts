import { aiRegistry } from '../../server/ai/provider.js';
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

/** Prefer explicit section ranges printed by the source PDF. This avoids
 * confusing MCQ option labels such as (1), (2), (3), (4) with questions. */
function detectCountFromSectionRanges(text: string): { questionCount: number; lastQuestionNumber: number } | null {
  const normalized = text
    .replace(/\r/g, '\n')
    .replace(/[\u00a0\u2000-\u200b]/g, ' ');

  const ranges: Array<{ start: number; end: number; count: number }> = [];
  const re = /\(\s*(\d{1,3})\s*(?:to|-)\s*(\d{1,3})\s*\)\s*(?:[\s\S]{0,160}?)?This section contains\s*(\d{1,3})\s*questions/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(normalized)) !== null) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    const count = Number(match[3]);
    if (start >= 1 && end >= start && count === end - start + 1) {
      ranges.push({ start, end, count });
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

/** Fallback for PDFs that do not print section ranges. */
function detectCountFromQuestionSequence(text: string): { questionCount: number; lastQuestionNumber: number } | null {
  const normalized = text
    .replace(/\r/g, '\n')
    .replace(/[\u00a0\u2000-\u200b]/g, ' ');

  const candidates = new Set<number>();
  const patterns = [
    /^\s*(\d{1,3})\s*[.)]\s+/gm,
    /^\s*Q\.?\s*(\d{1,3})\s*[.)]\s+/gim,
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

async function tryDeterministicPdfCount(inline: Array<{ mimeType: string; data: string }>) {
  const pdfFiles = inline.filter(f => String(f.mimeType).toLowerCase().includes('pdf'));
  if (!pdfFiles.length) return null;

  for (const file of pdfFiles) {
    try {
      const bytes = new Uint8Array(Buffer.from(file.data, 'base64'));
      const pdf = await getDocumentProxy(bytes);
      const result = await extractText(pdf, { mergePages: true });
      const text = String(result.text || '');

      const bySections = detectCountFromSectionRanges(text);
      if (bySections) {
        console.info(`[Source Count] explicit PDF section ranges detected ${bySections.questionCount} questions across ${result.totalPages} pages`);
        return bySections;
      }

      const bySequence = detectCountFromQuestionSequence(text);
      if (bySequence) {
        console.info(`[Source Count] deterministic PDF question sequence detected ${bySequence.questionCount} questions across ${result.totalPages} pages`);
        return bySequence;
      }
    } catch (error) {
      console.warn('[Source Count] unpdf deterministic pass failed; using visual fallback:', error);
    }
  }

  return null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const files = Array.isArray(req.body?.attachedFiles) ? req.body.attachedFiles : [];
    const inline = files
      .filter((f: any) => !!f?.base64Data)
      .map((f: any) => ({
        mimeType: f.type || 'application/pdf',
        data: stripDataUrl(f.base64Data),
      }));

    if (!inline.length) return res.status(400).json({ error: 'No readable source file was attached.' });

    const deterministic = await tryDeterministicPdfCount(inline);
    if (deterministic) {
      return res.status(200).json({ ...deterministic, detectionMethod: 'pdf-structure' });
    }

    const provider = aiRegistry.getProvider('gemini');
    const raw = await provider.generateText(
      `Inspect the attached source document and determine the ACTUAL number of numbered questions in it before any extraction begins. Count only question items that are really present. Never assume 180 questions and never use a NEET/JEE default. Identify the final numbered question printed in the document and verify the sequence from question 1. Return questionCount and lastQuestionNumber only after visually checking the source.`,
      {
        model: req.body?.model || 'gemini-3.7-flash',
        responseMimeType: 'application/json',
        responseSchema: COUNT_SCHEMA,
        inlineFiles: inline,
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

    return res.status(200).json({ questionCount: count, lastQuestionNumber: last, detectionMethod: 'gemini-visual-fallback' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to detect source question count.' });
  }
}