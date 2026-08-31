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
} from 'docx';

export interface DocxPaperData {
  title: string;
  instituteName?: string;
  subject?: string;
  examType?: string;
  duration?: string;
  totalMarks?: string | number;
  instructions?: string[];
  questions?: Array<{
    number: number | string;
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

const SUPER: Record<string, string> = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾'};
const SUB: Record<string, string> = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','=':'₌','(':'₍',')':'₎'};
const GREEK: Record<string, string> = {alpha:'α',beta:'β',gamma:'γ',delta:'δ',Delta:'Δ',epsilon:'ε',theta:'θ',lambda:'λ',mu:'μ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',phi:'φ',varphi:'ϕ',omega:'ω',Omega:'Ω'};
const SVG_FALLBACK_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

function convertMathToUnicode(input: string): string {
  let s = input;
  s = s.replace(/\\(alpha|beta|gamma|delta|Delta|epsilon|theta|lambda|mu|pi|rho|sigma|tau|phi|varphi|omega|Omega)\b/g, (_, g) => GREEK[g]);
  s = s.replace(/\\times/g,'×').replace(/\\cdot/g,'·').replace(/\\pm/g,'±').replace(/\\leq/g,'≤').replace(/\\geq/g,'≥').replace(/\\neq/g,'≠').replace(/\\propto/g,'∝').replace(/\\infty/g,'∞').replace(/\\sqrt\{([^{}]+)\}/g,'√($1)');
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g,'$1/$2');
  s = s.replace(/\^\{([^{}]+)\}/g,(_,x)=>[...x].map(c=>SUPER[c]||c).join(''));
  s = s.replace(/_\{([^{}]+)\}/g,(_,x)=>[...x].map(c=>SUB[c]||c).join(''));
  s = s.replace(/\^([0-9+\-=()])/g,(_,x)=>SUPER[x]||x).replace(/_([0-9+\-=()])/g,(_,x)=>SUB[x]||x);
  s = s.replace(/\\(mathrm|text|mathbf|vec)\{([^{}]+)\}/g,'$2').replace(/[{}]/g,'');
  return s;
}

function cleanText(text: string): string {
  return (text || '').replace(/\$\$([^$]+)\$\$/g,'$1').replace(/\$([^$]+)\$/g,'$1').replace(/\\\((.*?)\\\)/g,'$1').replace(/\\\[(.*?)\\\]/gs,'$1').replace(/\\n/g,'\n').trim();
}

function makeRuns(text: string, options: { bold?: boolean; size?: number; color?: string; hindi?: boolean } = {}): TextRun[] {
  const cleaned = cleanText(text);
  const mathPattern = /(\$\$[^$]+\$\$|\$[^$]+\$|\\\([^\)]+\\\)|\\\[[\s\S]*?\\\])/g;
  return cleaned.split(mathPattern).filter(Boolean).map((part) => {
    const isMath = part.startsWith('$') || part.startsWith('\\(') || part.startsWith('\\[');
    const value = isMath ? convertMathToUnicode(part.replace(/^\$\$?|\$\$?$|^\\\(|\\\)$|^\\\[|\\\]$/g,'')) : part;
    return new TextRun({ text:value, bold:options.bold, size:options.size||20, color:options.color, font:isMath?'Cambria Math':options.hindi?'Noto Sans Devanagari':'Aptos' });
  });
}

function textParagraph(text: string, options: { bold?: boolean; size?: number; color?: string; hindi?: boolean; align?: any } = {}) {
  return new Paragraph({ alignment:options.align, spacing:{after:60}, children:makeRuns(text,options) });
}

function cell(children: Paragraph[], width: number, fill?: string) {
  return new TableCell({ width:{size:width,type:WidthType.PERCENTAGE}, shading:fill?{fill,type:ShadingType.CLEAR}:undefined, margins:{top:100,bottom:100,left:120,right:120}, children });
}

function questionTable(q: NonNullable<DocxPaperData['questions']>[number]): Table {
  const english: Paragraph[] = [textParagraph(q.textEn,{bold:true,size:21,color:'0F172A'})];
  const hindi: Paragraph[] = [textParagraph(q.textHi||'',{bold:true,size:21,color:'334155',hindi:true})];
  const optionsEn=q.optionsEn||[], optionsHi=q.optionsHi||[];
  for(let i=0;i<Math.max(optionsEn.length,optionsHi.length);i++){
    const letter=String.fromCharCode(65+i);
    if(optionsEn[i]) english.push(textParagraph(`(${letter}) ${optionsEn[i]}`,{size:19}));
    if(optionsHi[i]) hindi.push(textParagraph(`(${letter}) ${optionsHi[i]}`,{size:19,hindi:true}));
  }
  const rows: TableRow[] = [
    new TableRow({children:[cell([textParagraph('ENGLISH',{bold:true,size:17,color:'FFFFFF',align:AlignmentType.CENTER})],50,'1E3A8A'),cell([textParagraph('हिन्दी',{bold:true,size:17,color:'FFFFFF',hindi:true,align:AlignmentType.CENTER})],50,'1E3A8A')]}),
    new TableRow({children:[cell(english,50,'F8FAFC'),cell(hindi,50,'F8FAFC')]}),
  ];
  if(q.diagramSvg){
    try{
      const image=new ImageRun({type:'svg',data:Buffer.from(q.diagramSvg,'utf8'),fallback:{type:'png',data:SVG_FALLBACK_PNG},transformation:{width:420,height:230}});
      rows.push(new TableRow({children:[new TableCell({columnSpan:2,children:[new Paragraph({alignment:AlignmentType.CENTER,children:[image]})]})]}));
    }catch{}
  }
  return new Table({width:{size:100,type:WidthType.PERCENTAGE},rows,borders:{top:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},bottom:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},left:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},right:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},insideHorizontal:{style:BorderStyle.SINGLE,size:2,color:'E2E8F0'},insideVertical:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'}}});
}

export async function generateDocxBuffer(data: DocxPaperData): Promise<Buffer> {
  const children:(Paragraph|Table)[]=[];
  const instituteName=data.instituteName||'JARVIS ACADEMY';
  const title=data.title||'NEET / JEE Practice Assessment';
  const questions=data.questions||[];
  children.push(textParagraph(instituteName.toUpperCase(),{bold:true,size:32,color:'1E3A8A',align:AlignmentType.CENTER}));
  children.push(textParagraph(title,{bold:true,size:26,color:'0F172A',align:AlignmentType.CENTER}));

  if(questions.length){
    children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({children:[cell([textParagraph(`Target Exam: ${data.examType||'NEET / JEE'}`,{bold:true,size:18}),textParagraph(`Subject: ${data.subject||'All Subjects'}`,{size:18})],50,'F1F5F9'),cell([textParagraph(`Time Allowed: ${data.duration||'60 Mins'}`,{bold:true,size:18}),textParagraph(`Maximum Marks: ${String(data.totalMarks||questions.length*4)}`,{size:18})],50,'F1F5F9')]})]}));
    children.push(textParagraph('GENERAL INSTRUCTIONS / सामान्य निर्देश:',{bold:true,size:20,color:'334155'}));
    const instructions=data.instructions?.length?data.instructions:['1. All questions are compulsory. Each correct answer carries +4 marks.','2. For each incorrect answer, 1 mark will be deducted (-1 negative marking).','3. Read both English and Hindi versions carefully before answering.'];
    for(const instruction of instructions) children.push(textParagraph(instruction,{size:18,color:'475569'}));
    for(const q of questions){children.push(textParagraph(`Q.${q.number}`,{bold:true,size:22,color:'1E293B'}));children.push(questionTable(q));children.push(new Paragraph({spacing:{after:120},children:[]}));}
    const keyed=questions.filter(q=>q.correctOption);
    if(keyed.length){
      children.push(textParagraph('ANSWER KEY / उत्तर कुंजी',{bold:true,size:24,color:'1E3A8A',align:AlignmentType.CENTER}));
      const width=100/Math.min(10,keyed.length);
      children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({children:keyed.map(q=>cell([textParagraph(`Q.${q.number}`,{bold:true,size:17,align:AlignmentType.CENTER})],width,'E2E8F0'))}),new TableRow({children:keyed.map(q=>cell([textParagraph(q.correctOption||'-',{bold:true,size:20,color:'15803D',align:AlignmentType.CENTER})],width))})]}));
    }
    const solved=questions.filter(q=>q.solution);
    if(solved.length){
      children.push(textParagraph('DETAILED SOLUTIONS / विस्तृत हल',{bold:true,size:22,color:'1E3A8A',align:AlignmentType.CENTER}));
      for(const q of solved){children.push(textParagraph(`Q.${q.number} Solution / हल:`,{bold:true,size:19,color:'2563EB'}));children.push(textParagraph(q.solution||'',{size:18}));}
    }
  }else if(data.rawContent){for(const line of data.rawContent.split(/\r?\n/))if(line.trim())children.push(textParagraph(line,{size:20}));}

  const doc=new Document({creator:'JARVIS AI Office',title,sections:[{properties:{page:{margin:{top:720,bottom:720,left:720,right:720}}},children}]});
  return await Packer.toBuffer(doc);
}
