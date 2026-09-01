import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, BorderStyle, WidthType, ShadingType, ImageRun } from 'docx';

export interface DocxPaperData {
  title: string; instituteName?: string; subject?: string; examType?: string; duration?: string; totalMarks?: string | number;
  instructions?: string[]; includeAnswerKey?: boolean; includeSolutions?: boolean;
  questions?: Array<{ number: number|string; textEn: string; textHi?: string; optionsEn?: string[]; optionsHi?: string[]; correctOption?: string; marks?: number|string; solution?: string; diagramSvg?: string }>;
  rawContent?: string;
}

const SUPER:Record<string,string>={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾'};
const SUB:Record<string,string>={'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','=':'₌','(':'₍',')':'₎'};
const GREEK:Record<string,string>={alpha:'α',beta:'β',gamma:'γ',delta:'δ',Delta:'Δ',epsilon:'ε',theta:'θ',lambda:'λ',mu:'μ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',phi:'φ',varphi:'ϕ',omega:'ω',Omega:'Ω'};
const SVG_FALLBACK_PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');

function convertMathToUnicode(input:string):string{
  let s=String(input||'');
  s=s.replace(/\\(alpha|beta|gamma|delta|Delta|epsilon|theta|lambda|mu|pi|rho|sigma|tau|phi|varphi|omega|Omega)\b/g,(_,g)=>GREEK[g]);
  s=s.replace(/\\times/g,'×').replace(/\\cdot/g,'·').replace(/\\pm/g,'±').replace(/\\mp/g,'∓').replace(/\\leq/g,'≤').replace(/\\geq/g,'≥').replace(/\\neq/g,'≠').replace(/\\propto/g,'∝').replace(/\\infty/g,'∞').replace(/\\approx/g,'≈').replace(/\\rightarrow/g,'→').replace(/\\to/g,'→').replace(/\\degree/g,'°');
  s=s.replace(/\\sqrt\{([^{}]+)\}/g,'√($1)').replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g,'($1)/($2)');
  s=s.replace(/\^\{([^{}]+)\}/g,(_,x)=>[...x].map(c=>SUPER[c]||c).join('')).replace(/_\{([^{}]+)\}/g,(_,x)=>[...x].map(c=>SUB[c]||c).join(''));
  s=s.replace(/\^([0-9A-Za-z+\-=()])/g,(_,x)=>SUPER[x]||x).replace(/_([0-9A-Za-z+\-=()])/g,(_,x)=>SUB[x]||x);
  s=s.replace(/\\(mathrm|text|mathbf|mathit|vec|overline)\{([^{}]+)\}/g,'$2');
  return s.replace(/[{}]/g,'');
}
function cleanText(text:string):string{
  let s=String(text||'');
  s=s.replace(/\bsvg\b/gi,'').replace(/\$\$([\s\S]*?)\$\$/g,'$1').replace(/\$([^$\n]+)\$/g,'$1');
  s=s.replace(/\\\(([\s\S]*?)\\\)/g,'$1').replace(/\\\[([\s\S]*?)\\\]/g,'$1');
  s=s.replace(/\\n/g,'\n').trim();
  return convertMathToUnicode(s);
}
function makeRuns(text:string,options:{bold?:boolean;size?:number;color?:string;hindi?:boolean}={}):TextRun[]{return [new TextRun({text:cleanText(text),bold:options.bold,size:options.size||19,color:options.color,font:options.hindi?'Noto Sans Devanagari':'Aptos'})];}
function textParagraph(text:string,options:{bold?:boolean;size?:number;color?:string;hindi?:boolean;align?:any;after?:number;before?:number;keepNext?:boolean}={}){return new Paragraph({alignment:options.align,keepNext:options.keepNext,spacing:{before:options.before??0,after:options.after??35,line:options.hindi?255:245},children:makeRuns(text,options)});}
function cell(children:Paragraph[],width:number,fill?:string){return new TableCell({width:{size:width,type:WidthType.PERCENTAGE},shading:fill?{fill,type:ShadingType.CLEAR}:undefined,margins:{top:45,bottom:45,left:90,right:90},children});}

function questionTable(q:NonNullable<DocxPaperData['questions']>[number], addHeader:boolean):Table{
  const english:Paragraph[]=[textParagraph(`Q.${q.number}  ${q.textEn}`,{bold:true,size:19,color:'0F172A',after:45,keepNext:true})];
  const hindi:Paragraph[]=[textParagraph(q.textHi||'',{bold:true,size:19,color:'334155',hindi:true,after:45,keepNext:true})];
  const en=q.optionsEn||[],hi=q.optionsHi||[];
  for(let i=0;i<4;i++){
    const letter=String.fromCharCode(65+i);
    english.push(textParagraph(`(${letter}) ${en[i]||''}`,{size:17,after:18}));
    hindi.push(textParagraph(`(${letter}) ${hi[i]||''}`,{size:17,hindi:true,after:18}));
  }
  const rows:TableRow[]=[];
  if(addHeader) rows.push(new TableRow({cantSplit:true,children:[cell([textParagraph('ENGLISH',{bold:true,size:15,color:'FFFFFF',align:AlignmentType.CENTER,after:0})],50,'164E63'),cell([textParagraph('हिन्दी',{bold:true,size:15,color:'FFFFFF',hindi:true,align:AlignmentType.CENTER,after:0})],50,'164E63')]}));
  rows.push(new TableRow({cantSplit:true,children:[cell(english,50,'F8FAFC'),cell(hindi,50,'F8FAFC')]}));
  if(q.diagramSvg && !/^\s*(svg)?\s*$/i.test(q.diagramSvg)){
    try{
      const svg=q.diagramSvg.trim().replace(/^```(?:svg|xml)?/i,'').replace(/```$/,'').trim();
      const image=new ImageRun({type:'svg',data:Buffer.from(svg,'utf8'),fallback:{type:'png',data:SVG_FALLBACK_PNG},transformation:{width:420,height:230}});
      rows.push(new TableRow({cantSplit:true,children:[new TableCell({columnSpan:2,margins:{top:60,bottom:60,left:80,right:80},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[image]})]})]}));
    }catch{}
  }
  return new Table({width:{size:100,type:WidthType.PERCENTAGE},rows,borders:{top:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},bottom:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},left:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},right:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},insideHorizontal:{style:BorderStyle.SINGLE,size:2,color:'E2E8F0'},insideVertical:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'}}});
}

export async function generateDocxBuffer(data:DocxPaperData):Promise<Buffer>{
  const children:(Paragraph|Table)[]=[];
  const instituteName=data.instituteName||'JARVIS AI OFFICE';
  const title=data.title||'Bilingual Document';
  const questions=data.questions||[];
  children.push(textParagraph(instituteName,{bold:true,size:27,color:'164E63',align:AlignmentType.CENTER,after:20}));
  children.push(textParagraph(title,{bold:true,size:22,color:'0F172A',align:AlignmentType.CENTER,after:35}));
  if(questions.length){
    const metaParts=[data.examType&&`Exam: ${data.examType}`,data.subject&&`Subject: ${data.subject}`,data.duration&&`Time: ${data.duration}`,data.totalMarks!==undefined&&`Maximum Marks: ${String(data.totalMarks)}`].filter(Boolean);
    if(metaParts.length) children.push(textParagraph(metaParts.join('   ·   '),{size:15,color:'475569',align:AlignmentType.CENTER,after:55}));
    if(data.instructions?.length){children.push(textParagraph('GENERAL INSTRUCTIONS / सामान्य निर्देश:',{bold:true,size:17,color:'334155',after:25,keepNext:true}));for(const instruction of data.instructions)children.push(textParagraph(instruction,{size:15,color:'475569',after:18}));}
    questions.forEach((q,index)=>{children.push(questionTable(q,index===0));});
    if(data.includeAnswerKey){const keyed=questions.filter(q=>q.correctOption);if(keyed.length){children.push(textParagraph('ANSWER KEY / उत्तर कुंजी',{bold:true,size:21,color:'164E63',align:AlignmentType.CENTER,before:90,after:30}));const width=100/Math.min(10,keyed.length);children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({cantSplit:true,children:keyed.map(q=>cell([textParagraph(`Q.${q.number}`,{bold:true,size:14,align:AlignmentType.CENTER,after:0})],width,'E2E8F0'))}),new TableRow({cantSplit:true,children:keyed.map(q=>cell([textParagraph(q.correctOption||'-',{bold:true,size:17,color:'15803D',align:AlignmentType.CENTER,after:0})],width))})]}));}}
    if(data.includeSolutions){const solved=questions.filter(q=>q.solution);if(solved.length){children.push(textParagraph('DETAILED SOLUTIONS / विस्तृत हल',{bold:true,size:21,color:'164E63',align:AlignmentType.CENTER,before:90,after:30}));for(const q of solved){children.push(textParagraph(`Q.${q.number} Solution / हल:`,{bold:true,size:17,color:'2563EB',after:18,keepNext:true}));children.push(textParagraph(q.solution||'',{size:15,after:25}));}}}
  } else if(data.rawContent){for(const line of data.rawContent.split(/\r?\n/))if(line.trim())children.push(textParagraph(line,{size:17,after:25}));}
  const doc=new Document({creator:'JARVIS AI Office',title,sections:[{properties:{page:{margin:{top:560,bottom:560,left:650,right:650}}},children}]});
  return await Packer.toBuffer(doc);
}
