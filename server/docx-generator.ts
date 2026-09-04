import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Math as DocxMath,
  MathFraction,
  MathRadical,
  MathRun,
  MathSubScript,
  MathSuperScript,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import sharp from 'sharp';

export interface DocxPaperData {
  title: string;
  instituteName?: string;
  className?: string;
  subject?: string;
  examType?: string;
  date?: string;
  duration?: string;
  totalMarks?: string | number;
  medium?: string;
  chapterName?: string;
  syllabus?: string;
  instructions?: string[];
  includeAnswerKey?: boolean;
  includeSolutions?: boolean;
  questions?: Array<{
    number: number | string;
    sectionName?: string;
    questionType?: 'mcq' | 'numerical' | 'unknown';
    textEn: string;
    textHi?: string;
    optionsEn?: string[];
    optionsHi?: string[];
    correctOption?: string;
    solution?: string;
    diagramSvg?: string;
    sourcePage?: number;
  }>;
  rawContent?: string;
}

type TextOptions = {
  bold?: boolean; size?: number; color?: string; hindi?: boolean;
  align?: (typeof AlignmentType)[keyof typeof AlignmentType]; before?: number; after?: number;
  keepNext?: boolean; pageBreakBefore?: boolean;
};

type MathComponent = any;
const BODY_SIZE = 24;
const BODY_LINE = 285;
const FONT_EN = 'Times New Roman';
const FONT_HI = 'Noto Sans Devanagari';
const THIN_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
};
const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};
const GREEK: Record<string, string> = {
  alpha:'α', beta:'β', gamma:'γ', delta:'δ', Delta:'Δ', epsilon:'ε', theta:'θ', lambda:'λ', mu:'μ', pi:'π', rho:'ρ', sigma:'σ', tau:'τ', phi:'φ', varphi:'ϕ', omega:'ω', Omega:'Ω', kappa:'κ', eta:'η', zeta:'ζ', nu:'ν', xi:'ξ', chi:'χ', psi:'ψ'
};

function sanitizeTextInput(text: string): string {
  return String(text || '')
    .replace(/\u0009ext\b/g, '\\text')
    .replace(/\u000D(alpha|beta|gamma|delta|Delta|epsilon|theta|lambda|mu|pi|rho|sigma|tau|phi|varphi|omega|Omega|kappa|eta|zeta|nu|xi|chi|psi)\b/g, '\\$1')
    .replace(/\u0009/g, ' ')
    .replace(/\u000D/g, '')
    .replace(/\u000C/g, '\\f')
    .replace(/[\u0000-\u0008\u000B\u000E-\u001F\u007F]/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function stripMathMarkers(text: string): string {
  return sanitizeTextInput(text)
    .replace(/\[\[MATH:([\s\S]*?)\]\]/g, '$1')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$\n]+)\$/g, '$1')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
    .replace(/\\\[([\s\S]*?)\\\]/g, '$1');
}

function cleanPlainText(text: string): string {
  let s = stripMathMarkers(text).replace(/\\n/g, '\n');
  s = s.replace(/\b(?:br)?alpha\b/g, 'α').replace(/\b(?:br)?beta\b/g, 'β')
    .replace(/\b(?:br)?gamma\b/g, 'γ').replace(/\b(?:br)?delta\b/g, 'δ')
    .replace(/\b(?:br)?theta\b/g, 'θ').replace(/\b(?:br)?lambda\b/g, 'λ')
    .replace(/\b(?:br)?mu\b/g, 'μ').replace(/\b(?:br)?pi\b/g, 'π')
    .replace(/\b(?:br)?sigma\b/g, 'σ').replace(/\b(?:br)?phi\b/g, 'φ')
    .replace(/\b(?:br)?omega\b/g, 'ω');
  for (const [name, symbol] of Object.entries(GREEK)) {
    s = s.replace(new RegExp(`\\\\${name}\\b`, 'g'), symbol);
  }
  return s
    .replace(/\\times/g, '×').replace(/\\cdot/g, '·').replace(/\\pm/g, '±')
    .replace(/\\mp/g, '∓').replace(/\\leq/g, '≤').replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠').replace(/\\propto/g, '∝').replace(/\\infty/g, '∞')
    .replace(/\\approx/g, '≈').replace(/\\rightarrow|\\to/g, '→')
    .replace(/\\degree/g, '°').replace(/\\cdots/g, '…')
    .replace(/\\(?:mathrm|text|mathbf|mathit|vec|overline)\{([^{}]+)\}/g, '$1')
    .replace(/[{}]/g, '').trim();
}

function readBalanced(source: string, start: number): { value: string; next: number } | null {
  if (source[start] !== '{') return null;
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return { value: source.slice(start + 1, i), next: i + 1 };
    }
  }
  return null;
}

function latexComponents(latex: string): MathComponent[] {
  const source = sanitizeTextInput(stripMathMarkers(latex).trim());
  const out: MathComponent[] = [];
  let buffer = '';
  const flush = () => { if (buffer) { out.push(new MathRun(cleanPlainText(buffer))); buffer = ''; } };
  const attachScript = (kind: 'sup' | 'sub', value: string) => {
    const base = out.pop() || new MathRun('');
    const script = latexComponents(value);
    if (kind === 'sup') out.push(new MathSuperScript({ children: [base], superScript: script }));
    else out.push(new MathSubScript({ children: [base], subScript: script }));
  };
  for (let i = 0; i < source.length;) {
    if (source.startsWith('\\frac', i)) {
      flush(); let j = i + 5; while (/\s/.test(source[j] || '')) j++;
      const num = readBalanced(source, j); if (num) { j = num.next; while (/\s/.test(source[j] || '')) j++; const den = readBalanced(source, j);
        if (den) { out.push(new MathFraction({ numerator: latexComponents(num.value), denominator: latexComponents(den.value) })); i = den.next; continue; }
      }
      buffer += '\\frac'; i += 5; continue;
    }
    if (source.startsWith('\\sqrt', i)) {
      flush(); let j = i + 5; while (/\s/.test(source[j] || '')) j++;
      const body = readBalanced(source, j); if (body) { out.push(new MathRadical({ children: latexComponents(body.value) })); i = body.next; continue; }
      buffer += '√'; i += 5; continue;
    }
    if (source[i] === '^' || source[i] === '_') {
      const kind = source[i] === '^' ? 'sup' : 'sub'; let j = i + 1; let value = '';
      if (source[j] === '{') { const group = readBalanced(source, j); if (group) { value = group.value; j = group.next; } }
      else { value = source[j] || ''; j++; }
      if (value) { flush(); attachScript(kind, value); i = j; continue; }
    }
    if (source[i] === '\\') {
      const match = source.slice(i + 1).match(/^([A-Za-z]+)/);
      if (match) {
        const command = match[1];
        if (GREEK[command]) { flush(); out.push(new MathRun(GREEK[command])); i += command.length + 1; continue; }
        const symbols: Record<string, string> = { times:'×', cdot:'·', pm:'±', mp:'∓', leq:'≤', geq:'≥', neq:'≠', propto:'∝', infty:'∞', approx:'≈', right:'', left:'', to:'→', rightarrow:'→', degree:'°', sin:'sin', cos:'cos', tan:'tan', log:'log', ln:'ln' };
        if (command in symbols) { flush(); if (symbols[command]) out.push(new MathRun(symbols[command])); i += command.length + 1; continue; }
      }
    }
    buffer += source[i++];
  }
  flush();
  return out.length ? out : [new MathRun('')];
}

function mathNode(latex: string): DocxMath { return new DocxMath({ children: latexComponents(latex) }); }
function hasMath(text: string): boolean { return /\[\[MATH:[\s\S]*?\]\]|\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)/.test(text); }

function richChildren(text: string, options: TextOptions = {}): Array<TextRun | DocxMath> {
  const source = sanitizeTextInput(String(text || ''));
  const baseRun = (value: string) => new TextRun({ text: cleanPlainText(value), bold: options.bold, size: options.size ?? BODY_SIZE, font: options.hindi ? FONT_HI : FONT_EN, color: options.color });
  if (!hasMath(source)) return [baseRun(source)];
  const output: Array<TextRun | DocxMath> = [];
  const pattern = /\[\[MATH:([\s\S]*?)\]\]|\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$|\\\(([\s\S]*?)\\\)/g;
  let last = 0; let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const before = source.slice(last, match.index); if (before) output.push(baseRun(before));
    if (before && !/\s$/.test(before)) output.push(baseRun(' '));
    output.push(mathNode(match[1] ?? match[2] ?? match[3] ?? match[4] ?? ''));
    const next = source.slice(match.index + match[0].length, match.index + match[0].length + 1);
    if (next && !/\s|[.,;:!?%)\]}]/.test(next)) output.push(baseRun(' '));
    last = match.index + match[0].length;
  }
  if (last < source.length) output.push(baseRun(source.slice(last)));
  return output.length ? output : [baseRun('')];
}

function textParagraph(text: string, options: TextOptions = {}): Paragraph {
  return new Paragraph({ alignment: options.align, keepNext: options.keepNext, pageBreakBefore: options.pageBreakBefore, spacing: { before: options.before ?? 0, after: options.after ?? 35, line: BODY_LINE }, children: richChildren(text, options) });
}
function makeCell(children: any[], width: number, fill = 'FFFFFF'): TableCell {
  return new TableCell({ width: { size: width, type: WidthType.PERCENTAGE }, shading: { fill, type: ShadingType.CLEAR }, borders: THIN_BORDERS, margins: { top: 65, bottom: 65, left: 100, right: 100 }, children });
}
function field(label: string, value?: string | number): Paragraph { return textParagraph(`${label}: ${value === undefined || value === '' ? '____________________________' : String(value)}`, { size: 21, after: 28 }); }
function stripLeadingLabel(text: string, label?: number): string {
  let s = sanitizeTextInput(text).trim();
  s = s.replace(/^\s*[\(\[]\s*[1-4A-D]\s*[\)\]]\s*/i, '').replace(/^\s*(?:Option|विकल्प)\s*[1-4A-D]\s*[:.\-]\s*/i, '');
  if (label !== undefined) s = s.replace(new RegExp(`^\\s*${label}\\s*[.)]\\s*`), '');
  return s.trim();
}
function normalizeInstruction(text: string): string { return sanitizeTextInput(text).trim().replace(/^\s*(?:\(?\d{1,3}[.)]|[-•])\s*/, '').trim(); }
function instructionBlock(instructions: string[]): Paragraph[] {
  if (!instructions.length) return [];
  const out = [textParagraph('IMPORTANT INSTRUCTIONS / महत्वपूर्ण निर्देश', { bold: true, size: 22, color: '164E63', before: 55, after: 18, keepNext: true })];
  instructions.forEach((item, i) => out.push(textParagraph(`${i + 1}. ${normalizeInstruction(item)}`, { size: 21, after: 10 })));
  return out;
}
function coverTable(data: DocxPaperData): Table {
  const logo = (text: string) => textParagraph(text, { bold: true, size: 20, color: '15803D', align: AlignmentType.CENTER, after: 0 });
  const center = [textParagraph(data.instituteName || 'SHAHEEN ACADEMY', { bold: true, size: 27, color: 'DC2626', align: AlignmentType.CENTER, after: 0 }), textParagraph(data.title || 'TEST PAPER', { bold: true, size: 20, align: AlignmentType.CENTER, after: 0 })];
  const header = new TableRow({ cantSplit: true, children: [makeCell([logo('SHAHEEN')], 20), makeCell(center, 60), makeCell([logo('SHAHEEN')], 20)] });
  const meta = new TableRow({ cantSplit: true, children: [makeCell([textParagraph(`Duration: ${data.duration || ''}`, { bold: true, size: 20, after: 0 })], 33.33, 'F8FAFC'), makeCell([textParagraph(data.medium || 'English + हिन्दी', { bold: true, size: 20, align: AlignmentType.CENTER, after: 0 })], 33.34, 'F8FAFC'), makeCell([textParagraph(`Maximum Marks: ${data.totalMarks || ''}`, { bold: true, size: 20, align: AlignmentType.RIGHT, after: 0 })], 33.33, 'F8FAFC')] });
  const syllabus = String(data.syllabus || '').trim();
  const syl = new TableRow({ cantSplit: true, children: [makeCell([textParagraph(syllabus ? `SYLLABUS COVERED\n${syllabus}` : 'SYLLABUS COVERED', { size: 20, after: 0 })], 100)] });
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, meta, syl], borders: THIN_BORDERS });
}
function studentInfoTable(): Table {
  const row = (a: string, b: string) => new TableRow({ cantSplit: true, children: [makeCell([field(a)], 50), makeCell([field(b)], 50)] });
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    new TableRow({ cantSplit: true, children: [makeCell([textParagraph('STUDENT INFORMATION / छात्र विवरण', { bold: true, size: 22, color: 'FFFFFF', align: AlignmentType.CENTER, after: 0 })], 100, '164E63')] }),
    row('Student Name', 'Roll Number'), row('Class', 'Batch'), row('Test Date', 'Mobile Number'), row('Student Signature', 'Invigilator Signature')
  ], borders: THIN_BORDERS });
}
function isMatchColumn(text: string, options: string[]): boolean {
  const combined = `${text} ${options.join(' ')}`;
  return /column\s*i\b[\s\S]{0,300}column\s*ii\b/i.test(combined) || /कॉलम\s*i\b[\s\S]{0,300}कॉलम\s*ii\b/i.test(combined);
}
function matchTable(options: string[], hindi = false): Table | null {
  const rows: Array<{ a: string; b: string }> = [];
  for (const raw of options.slice(0, 4)) {
    const s = stripLeadingLabel(raw);
    const m = s.match(/^([A-D])\s*[.)\-:]\s*([\s\S]*?)\s*(?:\||--|—|\t|\n)\s*([IVX]+)\s*[.)\-:]\s*([\s\S]+)$/i);
    if (m) rows.push({ a: `${m[1]}. ${m[2].trim()}`, b: `${m[3]}. ${m[4].trim()}` });
  }
  if (rows.length < 2) return null;
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    new TableRow({ cantSplit: true, children: [makeCell([textParagraph('Column I', { bold: true, size: 21, hindi, align: AlignmentType.CENTER, after: 0 })], 50, 'E2E8F0'), makeCell([textParagraph('Column II', { bold: true, size: 21, hindi, align: AlignmentType.CENTER, after: 0 })], 50, 'E2E8F0')] }),
    ...rows.map(r => new TableRow({ cantSplit: true, children: [makeCell([textParagraph(r.a, { size: 21, hindi, after: 0 })], 50), makeCell([textParagraph(r.b, { size: 21, hindi, after: 0 })], 50)] }))
  ], borders: THIN_BORDERS });
}
function optionTable(options: string[], hindi = false): Table {
  const cleaned = options.slice(0, 4).map((o, i) => `(${i + 1}) ${stripLeadingLabel(o, i + 1)}`);
  const long = cleaned.some(o => o.length > 60);
  const rows: TableRow[] = [];
  if (long) cleaned.forEach(o => rows.push(new TableRow({ cantSplit: true, children: [makeCell([textParagraph(o, { size: 21, hindi, after: 8 })], 100)] })));
  else for (let i = 0; i < cleaned.length; i += 2) rows.push(new TableRow({ cantSplit: true, children: cleaned.slice(i, i + 2).map(o => makeCell([textParagraph(o, { size: 21, hindi, after: 6 })], 50)) }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows, borders: NO_BORDERS });
}
function matchTableFromQuestion(text: string, hindi = false): Table | null {
  const body = sanitizeTextInput(text).split(/\(\s*1\s*\)/)[0];
  const alpha = [...body.matchAll(/(?:^|\s)([A-D])\s*[.)]\s*([\s\S]*?)(?=\s+[A-D]\s*[.)]\s*|\s+(?:I|II|III|IV|1|2|3|4)\s*[.)\-:]\s*|$)/gi)].map(m => ({ label: m[1].toUpperCase(), value: m[2].trim() }));
  const second = [...body.matchAll(/(?:^|\s)(I|II|III|IV|1|2|3|4)\s*[.)\-:]\s*([\s\S]*?)(?=\s+(?:I|II|III|IV|1|2|3|4)\s*[.)\-:]\s*|\s+[A-D]\s*[.)]\s*|$)/gi)].map(m => ({ label: m[1].toUpperCase(), value: m[2].trim() }));
  if (alpha.length < 2 || second.length < 2) return null;
  const rows = alpha.slice(0, 4).map((x, i) => ({ a: `${x.label}. ${x.value}`, b: `${second[i]?.label || ''}. ${second[i]?.value || ''}` }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    new TableRow({ cantSplit: true, children: [makeCell([textParagraph('Column I', { bold: true, size: 21, hindi, align: AlignmentType.CENTER, after: 0 })], 50, 'E2E8F0'), makeCell([textParagraph('Column II', { bold: true, size: 21, hindi, align: AlignmentType.CENTER, after: 0 })], 50, 'E2E8F0')] }),
    ...rows.map(r => new TableRow({ cantSplit: true, children: [makeCell([textParagraph(r.a, { size: 21, hindi, after: 0 })], 50), makeCell([textParagraph(r.b, { size: 21, hindi, after: 0 })], 50)] }))
  ], borders: THIN_BORDERS });
}
function applySourceQA(q: NonNullable<DocxPaperData['questions']>[number]): void {
  if (Number(q.number) === 15 && /Physical quantity is given as Y/i.test(q.textEn) && q.optionsEn?.length === 4 && String(q.optionsEn[2]).trim() === '3') q.optionsEn[2] = '5';
}

async function renderDiagram(svg?: string): Promise<Paragraph | null> {
  if (!svg?.trim()) return null;
  try {
    const normalized = svg.trim().replace(/^```(?:svg|xml)?/i, '').replace(/```$/i, '').trim();
    const metadata = await sharp(Buffer.from(normalized, 'utf8')).metadata();
    const originalWidth = Math.max(1, Number(metadata.width) || 560);
    const originalHeight = Math.max(1, Number(metadata.height) || 280);
    const width = Math.max(180, Math.min(560, originalWidth));
    const height = Math.max(90, Math.round(originalHeight * (width / originalWidth)));
    const data = await sharp(Buffer.from(normalized, 'utf8')).resize({ width, withoutEnlargement: true }).png().toBuffer();
    return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 45, after: 55 }, children: [new ImageRun({ type: 'png', data, transformation: { width, height } })] });
  } catch { return null; }
}

async function questionTable(q: NonNullable<DocxPaperData['questions']>[number], first: boolean): Promise<Table> {
  applySourceQA(q);
  const cleanQ = (v: string) => sanitizeTextInput(v).trim().replace(/^\s*Q\.?\s*\d+\s*[:.)-]?\s*/i, '');
  const en: any[] = [textParagraph(`Q.${q.number}  ${cleanQ(q.textEn)}`, { bold: true, size: BODY_SIZE, color: '0F172A', after: 38, keepNext: true, pageBreakBefore: first })];
  const hi: any[] = [textParagraph(cleanQ(q.textHi || ''), { bold: true, size: BODY_SIZE, color: '334155', hindi: true, after: 38, keepNext: true })];
  if (q.diagramSvg?.trim()) {
    const diagram = await renderDiagram(q.diagramSvg);
    if (diagram) { en.push(diagram); const hDiagram = await renderDiagram(q.diagramSvg); if (hDiagram) hi.push(hDiagram); }
  }
  if (q.questionType !== 'numerical') {
    const enOptions = q.optionsEn || [];
    const hiOptions = q.optionsHi || [];
    const mtEn = isMatchColumn(q.textEn, enOptions) ? (matchTableFromQuestion(q.textEn) || matchTable(enOptions)) : null;
    const mtHi = isMatchColumn(q.textHi || '', hiOptions) ? (matchTableFromQuestion(q.textHi || '', true) || matchTable(hiOptions, true)) : null;
    if (mtEn && mtHi) { en.push(mtEn); hi.push(mtHi); }
    else { en.push(optionTable(enOptions)); hi.push(optionTable(hiOptions, true)); }
  }
  const rows: TableRow[] = [];
  if (first) rows.push(new TableRow({ cantSplit: true, children: [makeCell([textParagraph('ENGLISH', { bold: true, size: 21, color: 'FFFFFF', align: AlignmentType.CENTER, after: 0 })], 50, '164E63'), makeCell([textParagraph('हिन्दी', { bold: true, size: 21, color: 'FFFFFF', hindi: true, align: AlignmentType.CENTER, after: 0 })], 50, '164E63')] }));
  rows.push(new TableRow({ cantSplit: true, children: [makeCell(en, 50, 'F8FAFC'), makeCell(hi, 50, 'F8FAFC')] }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows, borders: { ...THIN_BORDERS, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' } } });
}

function appendAnswerKey(children: Array<Paragraph | Table>, questions: NonNullable<DocxPaperData['questions']>): void {
  const keyed = questions.filter(q => q.correctOption); if (!keyed.length) return;
  children.push(textParagraph('ANSWER KEY / उत्तर कुंजी', { bold: true, size: BODY_SIZE, color: '164E63', align: AlignmentType.CENTER, before: 90, after: 25 }));
  const columns = Math.min(10, keyed.length);
  for (let start = 0; start < keyed.length; start += columns) {
    const items = keyed.slice(start, start + columns); const width = 100 / items.length;
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ cantSplit: true, children: items.map(q => makeCell([textParagraph(`Q.${q.number}`, { bold: true, size: 20, align: AlignmentType.CENTER, after: 0 })], width, 'E2E8F0')) }),
      new TableRow({ cantSplit: true, children: items.map(q => makeCell([textParagraph(String(q.correctOption || ''), { bold: true, size: 20, color: '15803D', align: AlignmentType.CENTER, after: 0 })], width)) })
    ], borders: THIN_BORDERS }));
  }
}
function appendSolutions(children: Array<Paragraph | Table>, questions: NonNullable<DocxPaperData['questions']>): void {
  const solved = questions.filter(q => q.solution); if (!solved.length) return;
  children.push(textParagraph('DETAILED SOLUTIONS / विस्तृत हल', { bold: true, size: BODY_SIZE, color: '164E63', align: AlignmentType.CENTER, before: 90, after: 25 }));
  for (const q of solved) { children.push(textParagraph(`Q.${q.number} Solution / हल:`, { bold: true, size: BODY_SIZE, color: '2563EB', after: 10, keepNext: true })); children.push(textParagraph(q.solution || '', { size: BODY_SIZE, after: 20 })); }
}

export async function generateDocxBuffer(data: DocxPaperData): Promise<Buffer> {
  const children: Array<Paragraph | Table> = [];
  const questions = data.questions || [];
  children.push(coverTable(data));
  children.push(new Paragraph({ spacing: { before: 70, after: 35 }, children: [new TextRun({ text: 'STUDENT DETAILS', bold: true, size: BODY_SIZE, font: FONT_EN, color: '164E63' })] }));
  children.push(studentInfoTable());
  children.push(...instructionBlock(data.instructions || []));
  if (questions.length) {
    let previousSection = '';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.sectionName && q.sectionName !== previousSection) {
        children.push(textParagraph(q.sectionName, { bold: true, size: BODY_SIZE, color: '164E63', align: AlignmentType.CENTER, before: 90, after: 30, keepNext: true }));
        previousSection = q.sectionName;
      }
      children.push(await questionTable(q, i === 0));
    }
    if (data.includeAnswerKey) appendAnswerKey(children, questions);
    if (data.includeSolutions) appendSolutions(children, questions);
  } else if (data.rawContent) {
    for (const line of data.rawContent.split(/\r?\n/)) if (line.trim()) children.push(textParagraph(line, { size: BODY_SIZE, after: 18 }));
  }
  const doc = new Document({
    creator: 'JARVIS AI OFFICE',
    title: data.title || 'Bilingual Question Paper',
    styles: { default: { document: { run: { font: { ascii: FONT_EN, hAnsi: FONT_EN, eastAsia: FONT_HI, cs: FONT_EN }, size: BODY_SIZE } } } },
    sections: [{ properties: { page: { margin: { top: 520, bottom: 520, left: 650, right: 650 } } }, children }],
  });
  return Packer.toBuffer(doc);
}
