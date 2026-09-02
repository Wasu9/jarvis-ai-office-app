import { aiRegistry } from '../../server/ai/provider.js';
import { PDFParse } from 'pdf-parse';

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

/**
 * Deterministic first pass for text-based PDFs.
 * We only accept question numbers that appear at the beginning of a line and
 * form a continuous sequence starting at 1. This prevents MCQ option labels
 * such as (1), (2), (3), (4) from being mistaken for question numbers.
 */
function detectCountFromPdfText(text: string): { questionCount: number; lastQuestionNumber: number } | null {
  const candidates = new Set<number>();
  const patterns = [
    /^\s*(\d{1,3})\s*[.)]\s+/gm,
    /^\s*Q\.?\s*(\d{1,3})\s*[.)]\s+/gim,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
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
  if (last < 1) return null;
  return { questionCount: last, lastQuestionNumber: last };
}

async function tryDeterministicPdfCount(inline: Array<{ mimeType: string; data: string }>) {
  const pdfFiles = inline.filter(f => String(f.mimeType).toLowerCase().includes('pdf'));
  if (!pdfFiles.length) return null;

  for (const file of pdfFiles) {
    try {
      const parser = new PDFParse({ data: Buffer.from(file.data, 'base64') });
      try {
        const result = await parser.getText();
        const detected = detectCountFromPdfText(String(result?.text || ''));
        if (detected) return detected;
      } finally {
        await parser.destroy().catch(() => undefined);
      }
    } catch (error) {
      console.warn('[Source Count] deterministic PDF text pass unavailable; falling back to Gemini:', error);
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

    // NEVER let the model decide the count when the PDF text itself provides
    // an unambiguous 1..N question sequence. This is what prevents the old
    // 180-question hallucination on smaller JEE/NEET-style source papers.
    const deterministic = await tryDeterministicPdfCount(inline);
    if (deterministic) {
      return res.status(200).json({ ...deterministic, detectionMethod: 'pdf-text-sequence' });
    }

    // Scanned/image-only PDFs still need visual understanding. Gemini is the
    // fallback, but it is explicitly forbidden from assuming a standard paper size.
    const provider = aiRegistry.getProvider('gemini');
    const raw = await provider.generateText(
      `Inspect the attached source document and determine the ACTUAL number of numbered questions in it before any extraction begins. Count only question items that are really present in the document. Never assume 180 questions, never assume NEET/JEE defaults, and never invent missing questions. First identify the final numbered question printed in the document and use that only if numbering is continuous from 1; otherwise count the actual question items. Return the highest verified question number as lastQuestionNumber and the actual question count as questionCount.`,
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