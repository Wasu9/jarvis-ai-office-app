import { aiRegistry } from '../../server/ai/provider.js';
import { convertFileToMarkdown } from '../../server/document-markdown.js';
import { extractText, getDocumentProxy } from 'unpdf';

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } };

const COUNT_SCHEMA = {
  type: 'OBJECT',
  properties: { questionCount: { type: 'INTEGER' }, lastQuestionNumber: { type: 'INTEGER' } },
  required: ['questionCount', 'lastQuestionNumber'],
};

type CountResult = { questionCount: number; lastQuestionNumber: number };
type InlineFile = { mimeType: string; data: string; name?: string; textPreview?: string };

function stripDataUrl(value: string): string { return String(value || '').replace(/^data:[^;]+;base64,/, ''); }
function normalizeText(text: string): string { return String(text || '').replace(/\r/g, '\n').replace(/[\u00a0\u2000-\u200b]/g, ' ').replace(/\uFEFF/g, '').replace(/\n{3,}/g, '\n\n'); }
function validCount(count: number, last: number): CountResult | null { return Number.isInteger(count) && count >= 1 && count <= 1000 && Number.isInteger(last) && last >= 1 && last <= 1000 ? { questionCount: count, lastQuestionNumber: last } : null; }

function extractJson(text: string): any {
  const cleaned = String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const a = cleaned.indexOf('{'), b = cleaned.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(cleaned.slice(a, b + 1)); } catch {} }
  throw new Error('JARVIS could not read the source question count.');
}

function parseCountText(text: string): CountResult | null {
  const normalized = normalizeText(text);
  const jsonMatch = normalized.match(/\{[\s\S]{0,500}?"questionCount"\s*:\s*(\d{1,4})[\s\S]{0,300}?"lastQuestionNumber"\s*:\s*(\d{1,4})[\s\S]{0,100}?\}/i);
  if (jsonMatch) { const parsed = validCount(Number(jsonMatch[1]), Number(jsonMatch[2])); if (parsed) return parsed; }
  const ranges = [
    /(?:questions?|प्रश्न)\s*(?:number|nos?\.?|from)?\s*(\d{1,4})\s*(?:to|through|–|—|-)\s*(\d{1,4})/i,
    /(?:\bQ(?:uestion)?\s*\.?\s*)?(\d{1,4})\s*(?:to|through|–|—|-)\s*(\d{1,4})\s*(?:questions?|प्रश्न)/i,
  ];
  for (const re of ranges) { const m = normalized.match(re); if (m && Number(m[1]) === 1) { const end = Number(m[2]); const parsed = validCount(end, end); if (parsed) return parsed; } }
  const countMatch = normalized.match(/(?:question\s*count|total\s*(?:number\s*of\s*)?questions?|number\s*of\s*questions?)\s*[:=\-]?\s*(\d{1,4})/i);
  const lastMatch = normalized.match(/(?:last\s*question(?:\s*number)?|final\s*question(?:\s*number)?|last\s*(?:printed\s*)?number)\s*[:=\-]?\s*(\d{1,4})/i);
  return validCount(countMatch ? Number(countMatch[1]) : 0, lastMatch ? Number(lastMatch[1]) : (countMatch ? Number(countMatch[1]) : 0));
}

function detectCountFromQuestionSequence(text: string): CountResult | null {
  const normalized = normalizeText(text), candidates = new Set<number>();
  const patterns = [
    /\bQ(?:uestion)?\s*\.?\s*(\d{1,4})\s*[.)\-:]?/gi,
    /\bQuestion\s*(?:No\.?\s*)?(\d{1,4})\s*[.)\-:]?/gi,
    /(?:^|\s)(\d{1,4})\s*[.)\-:]\s+/gm,
  ];
  for (const pattern of patterns) { let match: RegExpExecArray | null; while ((match = pattern.exec(normalized)) !== null) { const n = Number(match[1]); if (Number.isInteger(n) && n >= 1 && n <= 1000) candidates.add(n); } }
  if (!candidates.has(1)) return null;
  let last = 0; for (let n = 1; n <= 1000; n += 1) { if (!candidates.has(n)) break; last = n; }
  return last > 0 ? { questionCount: last, lastQuestionNumber: last } : null;
}

function detectCountFromSectionRanges(text: string): CountResult | null {
  const normalized = normalizeText(text), ranges: Array<{ start: number; end: number; count: number }> = [];
  const patterns = [
    /(?:\(|\[)?\s*(\d{1,3})\s*(?:to|-)\s*(\d{1,3})\s*(?:\)|\])?\s*(?:[\u2013\u2014-]\s*)?(?:This section contains|Section contains)\s*(\d{1,3})\s*questions/gi,
    /(?:This section contains|Section contains)\s*(\d{1,3})\s*questions[\s\S]{0,120}?(?:\(|\[)?\s*(\d{1,3})\s*(?:to|-)\s*(\d{1,3})\s*(?:\)|\])?/gi,
  ];
  for (const re of patterns) { let match: RegExpExecArray | null; while ((match = re.exec(normalized)) !== null) { const first = Number(match[1]), second = Number(match[2]), third = Number(match[3]); const start = re === patterns[0] ? first : second, end = re === patterns[0] ? second : third, count = re === patterns[0] ? third : first; if (start >= 1 && end >= start && count === end - start + 1) ranges.push({ start, end, count }); } }
  if (!ranges.length) return null;
  ranges.sort((a, b) => a.start - b.start); let expected = 1, last = 0;
  for (const range of ranges) { if (range.start !== expected) break; expected = range.end + 1; last = range.end; }
  return last > 0 ? { questionCount: last, lastQuestionNumber: last } : null;
}

async function enrichForCount(files: any[]): Promise<InlineFile[]> {
  return Promise.all(files.map(async (file: any) => {
    const base: InlineFile = { mimeType: file.type || 'application/pdf', data: stripDataUrl(file.base64Data || ''), name: file.name, textPreview: typeof file.textPreview === 'string' ? file.textPreview : undefined };
    if (base.textPreview?.trim() || !file.base64Data) return base;
    try { const markdown = await convertFileToMarkdown(file); if (markdown) return { ...base, textPreview: markdown.slice(0, 120_000) }; }
    catch (error) { console.warn(`[MarkItDown] Source-count conversion failed for ${file.name}; continuing with PDF text/vision.`, error); }
    return base;
  }));
}

async function extractDeterministicText(inline: InlineFile[]): Promise<string> {
  const parts: string[] = [];
  for (const file of inline) {
    if (file.textPreview?.trim()) parts.push(file.textPreview.trim());
    if (String(file.mimeType).toLowerCase().includes('pdf') && file.data) {
      try {
        const bytes = new Uint8Array(Buffer.from(file.data, 'base64'));
        const pdf = await getDocumentProxy(bytes);
        const result: any = await extractText(pdf, { mergePages: false });
        const value: any = result?.text;
        if (Array.isArray(value)) parts.push(value.map(String).join('\n'));
        else if (value != null) { const text = String(value).trim(); if (text) parts.push(text); }
      } catch (error) { console.warn('[Source Count] unpdf text extraction failed:', error); }
    }
  }
  return parts.join('\n\n');
}

async function askCountFromText(provider: any, extractedText: string, model: string): Promise<CountResult | null> {
  if (!extractedText.trim()) return null;
  const textForAI = extractedText.length > 180_000 ? `${extractedText.slice(0, 90_000)}\n\n[...middle omitted...]\n\n${extractedText.slice(-90_000)}` : extractedText;
  try {
    const raw = await provider.generateText(`Determine the ACTUAL number of numbered questions in the source text below. The document may contain MCQ option numbers, page numbers, section numbers and marks; ignore those. Find the real question sequence beginning at Q1 and identify the final question number. Do not assume 180 or any exam default. Return ONLY JSON: {"questionCount": number, "lastQuestionNumber": number}.\n\nSOURCE TEXT:\n${textForAI}`, { model, responseMimeType: 'application/json', responseSchema: COUNT_SCHEMA, inlineFiles: [] });
    try { const data = extractJson(raw); const parsed = validCount(Number(data?.questionCount), Number(data?.lastQuestionNumber)); if (parsed) return parsed; } catch {}
    return parseCountText(raw);
  } catch (error) { console.warn('[Source Count] text-only Gemini count failed:', error); return null; }
}

async function askCountFromVision(provider: any, inline: InlineFile[], model: string): Promise<CountResult | null> {
  const visualFiles = inline.filter(f => f.data && f.mimeType.toLowerCase().includes('pdf')); if (!visualFiles.length) return null;
  try {
    const raw = await provider.generateText('Inspect the attached original PDF visually. Determine the ACTUAL final printed question number and total number of real numbered questions. Ignore option labels, page numbers, section numbers and marks. Verify the sequence starts at Q1. Never assume 180. Return ONLY JSON: {"questionCount": number, "lastQuestionNumber": number}.', { model, responseMimeType: 'application/json', responseSchema: COUNT_SCHEMA, inlineFiles: visualFiles.map(f => ({ mimeType: f.mimeType, data: f.data })), skipDocumentContext: true });
    try { const data = extractJson(raw); const parsed = validCount(Number(data?.questionCount), Number(data?.lastQuestionNumber)); if (parsed) return parsed; } catch {}
    return parseCountText(raw);
  } catch (error) { console.error('[Source Count] visual Gemini count failed:', error); return null; }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  try {
    const files = Array.isArray(req.body?.attachedFiles) ? req.body.attachedFiles : [];
    if (!files.length) return res.status(400).json({ error: 'No readable source file was attached.' });
    const inline = await enrichForCount(files);
    if (!inline.some(f => f.data || f.textPreview?.trim())) return res.status(400).json({ error: 'The uploaded source contains neither readable text nor file bytes.' });
    const extractedText = await extractDeterministicText(inline);
    const bySections = detectCountFromSectionRanges(extractedText); if (bySections) return res.status(200).json({ ...bySections, detectionMethod: 'document-text-structure' });
    const bySequence = detectCountFromQuestionSequence(extractedText); if (bySequence) return res.status(200).json({ ...bySequence, detectionMethod: 'document-text-sequence' });
    const provider = aiRegistry.getProvider('gemini'), model = req.body?.model || 'gemini-3.7-flash';
    const fromText = await askCountFromText(provider, extractedText, model); if (fromText) return res.status(200).json({ ...fromText, detectionMethod: 'gemini-text-fallback' });
    const fromVision = await askCountFromVision(provider, inline, model); if (fromVision) return res.status(200).json({ ...fromVision, detectionMethod: 'gemini-visual-fallback' });
    return res.status(422).json({ error: 'JARVIS could not verify the source question count after checking the extracted document text and the original PDF. The document was received, but the final question number could not be proven safely.', code: 'SOURCE_COUNT_UNRESOLVED' });
  } catch (err: any) {
    console.error('[Source Count Error]', err);
    return res.status(500).json({ error: err?.message || 'Failed to detect source question count.' });
  }
}
