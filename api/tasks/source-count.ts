import { aiRegistry } from '../../server/ai/provider.js';

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
        data: String(f.base64Data).replace(/^data:[^;]+;base64,/, ''),
      }));

    if (!inline.length) return res.status(400).json({ error: 'No readable source file was attached.' });

    const provider = aiRegistry.getProvider('gemini');
    const raw = await provider.generateText(
      `Inspect the attached source document and determine the ACTUAL number of numbered questions in it before any extraction begins. Count the questions that are really present in the document, not a standard exam size. IMPORTANT: never assume 180 questions, never assume NEET/JEE defaults, and never invent missing questions. Return the highest question number only when numbering is continuous from 1; otherwise return the actual count of question items. If the document has 75 questions, return questionCount 75. If it has 20, return 20. If it has 180, return 180. Also return the lastQuestionNumber you can verify from the source. Read the whole document as needed to make this determination.`,
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

    return res.status(200).json({ questionCount: count, lastQuestionNumber: last });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to detect source question count.' });
  }
}
