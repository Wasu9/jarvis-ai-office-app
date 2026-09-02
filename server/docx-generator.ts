import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  ShadingType,
  ImageRun,
  PageBreak,
  Math as DocxMath,
  MathRun,
  MathFraction,
  MathSuperScript,
  MathSubScript,
  MathRadical,
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
    marks?: number | string;
    solution?: string;
    diagramSvg?: string;
  }>;
  rawContent?: string;
}

type TextOptions = {
  bold?: boolean;
  size?: number;
  color?: string;
  hindi?: boolean;
  align?: any;
  after?: number;
  before?: number;
  keepNext?: boolean;
};

type MathComponent = any;

const GREEK: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', epsilon: 'ε',
  theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ',
  phi: 'φ', varphi: 'ϕ', omega: 'ω', Omega: 'Ω', kappa: 'κ', eta: 'η',
  zeta: 'ζ', nu: 'ν', xi: 'ξ', omicron: 'ο', chi: 'χ', psi: 'ψ',
};

function stripMathMarkers(text: string): string {
  return String(text || '')
    .replace(/\[\[MATH:([\s\S]*?)\]\]/g, '$1')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$\n]+)\$/g, '$1')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
    .replace(/\\\[([\s\S]*?)\\\]/g, '$1');
}

function cleanPlainText(text: string): string {
  let s = String(text || '');
  s = s.replace(/\bsvg\b/gi, '');
  s = stripMathMarkers(s);
  s = s.replace(/\\n/g, '\n');
  for (const [name, symbol] of Object.entries(GREEK)) {
    s = s.replace(new RegExp(`\\\\${name}\\b`, 'g'), symbol);
  }
  s = s
    .replace(/\\times/g, '×').replace(/\\cdot/g, '·').replace(/\\pm/g, '±')
    .replace(/\\mp/g, '∓').replace(/\\leq/g, '≤').replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠').replace(/\\propto/g, '∝').replace(/\\infty/g, '∞')
    .replace(/\\approx/g, '≈').replace(/\\rightarrow/g, '→').replace(/\\to/g, '→')
    .replace(/\\degree/g, '°').replace(/\\cdots/g, '…');
  s = s.replace(/\\(?:mathrm|text|mathbf|mathit|vec|overline)\{([^{}]+)\}/g, '$1');
  return s.replace(/[{}]/g, '').trim();
}

function readBalanced(source: string, start: number): { value: string; next: number } | null {
  if (source[start] !== '{') return null;
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return { value: source.slice(start + 1, i), next: i + 1 };
    }
  }
  return null;
}

function latexComponents(latex: string): MathComponent[] {
  const source = stripMathMarkers(String(latex || '').trim());
  const out: MathComponent[] = [];
  let buffer = '';

  const flush = () => {
    if (buffer) {
      out.push(new MathRun(cleanPlainText(buffer)));
      buffer = '';
    }
  };

  const attachScript = (kind: 'sup' | 'sub', value: string) => {
    const previous = out.pop();
    const base = previous || new MathRun('');
    const script = latexComponents(value);
    out.push(kind === 'sup'
      ? new MathSuperScript({ children: [base], superScript: script })
      : new MathSubScript({ children: [base], subScript: script }));
  };

  for (let i = 0; i < source.length;) {
    if (source.startsWith('\\frac', i)) {
      flush();
      let j = i + 5;
      while (/\s/.test(source[j] || '')) j++;
      const num = readBalanced(source, j);
      if (num) {
        j = num.next;
        while (/\s/.test(source[j] || '')) j++;
        const den = readBalanced(source, j);
        if (den) {
          out.push(new MathFraction({ numerator: latexComponents(num.value), denominator: latexComponents(den.value) }));
          i = den.next;
          continue;
        }
      }
      buffer += '\\frac';
      i += 5;
      continue;
    }

    if (source.startsWith('\\sqrt', i)) {
      flush();
      let j = i + 5;
      while (/\s/.test(source[j] || '')) j++;
      const body = readBalanced(source, j);
      if (body) {
        out.push(new MathRadical({ children: latexComponents(body.value) }));
        i = body.next;
        continue;
      }
      buffer += '√';
      i += 5;
      continue;
    }

    if (source[i] === '^' || source[i] === '_') {
      const kind = source[i] === '^' ? 'sup' : 'sub';
      let j = i + 1;
      let value = '';
      if (source[j] === '{') {
        const group = readBalanced(source, j);
        if (group) { value = group.value; j = group.next; }
      } else {
        value = source[j] || '';
        j++;
      }
      if (value) {
        flush();
        attachScript(kind, value);
        i = j;
        continue;
      }
    }

    if (source[i] === '\\') {
      const m = source.slice(i + 1).match(/^([A-Za-z]+)/);
      if (m) {
        const command = m[1];
        if (GREEK[command]) {
          flush();
          out.push(new MathRun(GREEK[command]));
          i += command.length + 1;
          continue;
        }
        const replacements: Record<string, string> = {
          times: '×', cdot: '·', pm: '±', mp: '∓', leq: '≤', geq: '≥', neq: '≠',
          propto: '∝', infty: '∞', approx: '≈', rightarrow: '→', to: '→', degree: '°',
          left: '', right: '', sin: 'sin', cos: 'cos', tan: 'tan', log: 'log', ln: 'ln',
        };
        if (command in replacements) {
          flush();
          if (replacements[command]) out.push(new MathRun(replacements[command]));
          i += command.length + 1;
          continue;
        }
      }
    }

    buffer += source[i];
    i++;
  }
  flush();
  return out.length ? out : [new MathRun('')];
}

function mathNode(latex: string): DocxMath {
  return new DocxMath({ children: latexComponents(latex) });
}

function hasMathMarker(text: string): boolean {
  return /\[\[MATH:[\s\S]*?\]\]|\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)/.test(text);
}

function richChildren(text: string, options: TextOptions = {}): Array<TextRun | DocxMath> {
  const source = String(text || '');
  if (!hasMathMarker(source)) {
    return [new TextRun({
      text: cleanPlainText(source), bold: options.bold, size: options.size,
      font: options.hindi ? 'Noto Sans Devanagari' : 'Aptos', color: options.color,
    })];
  }

  const out: Array<TextRun | DocxMath> = [];
  const pattern = /\[\[MATH:([\s\S]*?)\]\]|\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$|\\\(([\s\S]*?)\\\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(source))) {
    if (m.index > last) {
      out.push(new TextRun({
        text: cleanPlainText(source.slice(last, m.index)), bold: options.bold, size: options.size,
        font: options.hindi ? 'Noto Sans Devanagari' : 'Aptos', color: options.color,
      }));
    }
    out.push(mathNode(m[1] ?? m[2] ?? m[3] ?? m[4] ?? ''));
    last = m.index + m[0].length;
  }
  if (last < source.length) {
    out.push(new TextRun({
      text: cleanPlainText(source.slice(last)), bold: options.bold, size: options.size,
      font: options.hindi ? 'Noto Sans Devanagari' : 'Aptos', color: options.color,
    }));
  }
  return out.length ? out : [new TextRun({ text: '', size: options.size })];
}

function textParagraph(text: string, options: TextOptions = {}): Paragraph {
  return new Paragraph({
    alignment: options.align,
    keepNext: options.keepNext,
    spacing: { before: options.before ?? 0, after: options.after ?? 35, line: options.hindi ? 260 : 275 },
    children: richChildren(text, options),
  });
}

function cell(children: Paragraph[], width: number, fill?: string, borders?: any): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    borders,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children,
  });
}

const thinBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
};

async function svgToPng(svg: string): Promise<{ data: Buffer; width: number; height: number }> {
  const normalized = svg.trim().replace(/^```(?:svg|xml)?/i, '').replace(/```$/, '').trim();
  const meta = await sharp(Buffer.from(normalized, 'utf8')).metadata();
  const originalW = Math.max(1, Number(meta.width) || 560);
  const originalH = Math.max(1, Number(meta.height) || 280);
  const width = Math.max(180, Math.min(560, originalW));
  const height = Math.max(90, Math.round(originalH * (width / originalW)));
  const data = await sharp(Buffer.from(normalized, 'utf8')).resize({ width, withoutEnlargement: true }).png().toBuffer();
  return { data, width, height };
}

async function diagramParagraph(svg?: string): Promise<Paragraph | null> {
  if (!svg || !svg.trim() || /^\s*(svg)?\s*$/i.test(svg)) return null;
  try {
    const rendered = await svgToPng(svg);
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 70 },
      children: [new ImageRun({ type: 'png', data: rendered.data, transformation: { width: rendered.width, height: rendered.height } })],
    });
  } catch {
    return null;
  }
}

function fieldLabel(label: string, value?: string | number): Paragraph {
  return textParagraph(`${label}: ${value === undefined || value === '' ? '____________________________' : String(value)}`, { size: 19, after: 45 });
}

async function questionTable(q: NonNullable<DocxPaperData['questions']>[number], addHeader: boolean): Promise<Table> {
  const english: Paragraph[] = [textParagraph(`Q.${q.number}  ${q.textEn}`, { bold: true, size: 24, color: '0F172A', after: 55, keepNext: true })];
  const hindi: Paragraph[] = [textParagraph(q.textHi || '', { bold: true, size: 20, color: '334155', hindi: true, after: 55, keepNext: true })];

  const diagram = await diagramParagraph(q.diagramSvg);
  if (diagram) {
    english.push(diagram);
    const diagramHi = await diagramParagraph(q.diagramSvg);
    if (diagramHi) hindi.push(diagramHi);
  }

  const isNumerical = q.questionType === 'numerical';
  const en = q.optionsEn || [];
  const hi = q.optionsHi || [];
  if (!isNumerical) {
    for (let i = 0; i < 4; i++) {
      english.push(textParagraph(`(${i + 1}) ${en[i] || ''}`, { size: 24, after: 16 }));
      hindi.push(textParagraph(`(${i + 1}) ${hi[i] || ''}`, { size: 20, hindi: true, after: 16 }));
    }
  }

  const rows: TableRow[] = [];
  if (addHeader) {
    rows.push(new TableRow({
      cantSplit: true,
      children: [
        cell([textParagraph('ENGLISH', { bold: true, size: 16, color: 'FFFFFF', align: AlignmentType.CENTER, after: 0 })], 50, '164E63'),
        cell([textParagraph('हिन्दी', { bold: true, size: 15, color: 'FFFFFF', hindi: true, align: AlignmentType.CENTER, after: 0 })], 50, '164E63'),
      ],
    }));
  }
  rows.push(new TableRow({ cantSplit: true, children: [cell(english, 50, 'F8FAFC'), cell(hindi, 50, 'F8FAFC')] }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
    borders: { ...thinBorders, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' } },
  });
}

function coverTable(data: DocxPaperData): Table {
  const left = [
    fieldLabel('Class', data.className),
    fieldLabel('Subject', data.subject),
    fieldLabel('Exam', data.examType),
    fieldLabel('Date', data.date),
    fieldLabel('Duration', data.duration),
  ];
  const right = [
    fieldLabel('Maximum Marks', data.totalMarks),
    fieldLabel('Medium', data.medium || 'English + हिन्दी'),
    fieldLabel('Chapter', data.chapterName),
    fieldLabel('Syllabus', data.syllabus),
    fieldLabel('Question Count', data.questions?.length),
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ cantSplit: true, children: [cell(left, 50, 'F8FAFC', thinBorders), cell(right, 50, 'F8FAFC', thinBorders)] })],
    borders: thinBorders,
  });
}

function studentInfoTable(): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ cantSplit: true, children: [cell([textParagraph('STUDENT INFORMATION', { bold: true, size: 18, color: 'FFFFFF', align: AlignmentType.CENTER, after: 0 })], 100, '164E63')] }),
      new TableRow({ cantSplit: true, children: [cell([fieldLabel('Student Name')], 50, 'FFFFFF', thinBorders), cell([fieldLabel('Admission No.')], 50, 'FFFFFF', thinBorders)] }),
      new TableRow({ cantSplit: true, children: [cell([fieldLabel('Roll No.')], 50, 'FFFFFF', thinBorders), cell([fieldLabel('Section')], 50, 'FFFFFF', thinBorders)] }),
    ],
    borders: thinBorders,
  });
}

function instructionBlock(instructions: string[]): Paragraph[] {
  if (!instructions.length) return [];
  const out: Paragraph[] = [textParagraph('IMPORTANT INSTRUCTIONS / महत्वपूर्ण निर्देश', { bold: true, size: 20, color: '164E63', before: 80, after: 25, keepNext: true })];
  for (let i = 0; i < instructions.length; i++) {
    out.push(textParagraph(`${i + 1}. ${instructions[i]}`, { size: 19, after: 18 }));
  }
  return out;
}

export async function generateDocxBuffer(data: DocxPaperData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];
  const instituteName = data.instituteName || 'JARVIS AI OFFICE';
  const title = data.title || 'Bilingual Question Paper';
  const questions = data.questions || [];

  // PAGE 1 — proper exam cover/header. Do not silently replace source metadata with JARVIS defaults.
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: instituteName, bold: true, size: 34, color: '164E63', font: 'Aptos' })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 45 }, children: [new TextRun({ text: title, bold: true, size: 30, color: '0F172A', font: 'Aptos' })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 130 }, children: [new TextRun({ text: 'BILINGUAL QUESTION PAPER  •  ENGLISH + हिन्दी', bold: true, size: 18, color: '475569' })] }));
  children.push(coverTable(data));
  children.push(new Paragraph({ spacing: { before: 120, after: 20 }, children: [new PageBreak()] }));

  // Page 2 onward — student fields and source instructions.
  children.push(studentInfoTable());
  children.push(...instructionBlock(data.instructions || []));
  if (questions.length) {
    let previousSection = '';
    for (let index = 0; index < questions.length; index++) {
      const q = questions[index];
      if (q.sectionName && q.sectionName !== previousSection) {
        children.push(textParagraph(q.sectionName, { bold: true, size: 22, color: '164E63', align: AlignmentType.CENTER, before: 100, after: 35, keepNext: true }));
        previousSection = q.sectionName;
      }
      children.push(await questionTable(q, index === 0));
    }

    if (data.includeAnswerKey) {
      const keyed = questions.filter(q => q.correctOption);
      if (keyed.length) {
        children.push(textParagraph('ANSWER KEY / उत्तर कुंजी', { bold: true, size: 22, color: '164E63', align: AlignmentType.CENTER, before: 100, after: 30 }));
        const cols = Math.min(10, Math.max(1, keyed.length));
        const width = 100 / cols;
        for (let start = 0; start < keyed.length; start += cols) {
          const rowItems = keyed.slice(start, start + cols);
          children.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ cantSplit: true, children: rowItems.map(q => cell([textParagraph(`Q.${q.number}`, { bold: true, size: 15, align: AlignmentType.CENTER, after: 0 })], width, 'E2E8F0', thinBorders)) }),
              new TableRow({ cantSplit: true, children: rowItems.map(q => cell([textParagraph(String(q.correctOption || '-').replace(/^A$/i, '1').replace(/^B$/i, '2').replace(/^C$/i, '3').replace(/^D$/i, '4'), { bold: true, size: 19, color: '15803D', align: AlignmentType.CENTER, after: 0 })], width, 'FFFFFF', thinBorders)) }),
            ],
            borders: thinBorders,
          }));
        }
      }
    }

    if (data.includeSolutions) {
      const solved = questions.filter(q => q.solution);
      if (solved.length) {
        children.push(textParagraph('DETAILED SOLUTIONS / विस्तृत हल', { bold: true, size: 22, color: '164E63', align: AlignmentType.CENTER, before: 100, after: 30 }));
        for (const q of solved) {
          children.push(textParagraph(`Q.${q.number} Solution / हल:`, { bold: true, size: 20, color: '2563EB', after: 15, keepNext: true }));
          children.push(textParagraph(q.solution || '', { size: 20, after: 22 }));
        }
      }
    }
  } else if (data.rawContent) {
    for (const line of data.rawContent.split(/\r?\n/)) if (line.trim()) children.push(textParagraph(line, { size: 24, after: 20 }));
  }

  const doc = new Document({
    creator: 'JARVIS AI Office',
    title,
    styles: {
      default: {
        document: { run: { font: 'Aptos', size: 20 } },
      },
    },
    sections: [{ properties: { page: { margin: { top: 520, bottom: 520, left: 650, right: 650 } } }, children }],
  });
  return await Packer.toBuffer(doc);
}
