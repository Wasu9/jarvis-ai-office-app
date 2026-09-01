import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, BorderStyle, WidthType, ShadingType, ImageRun, Math as DocxMath, MathRun, MathFraction, MathSuperScript } from 'docx';
import sharp from 'sharp';

export interface DocxPaperData {
  title: string; instituteName?: string; subject?: string; examType?: string; duration?: string; totalMarks?: string | number;
  instructions?: string[]; includeAnswerKey?: boolean; includeSolutions?: boolean;
  questions?: Array<{ number: number|string; textEn: string; textHi?: string; optionsEn?: string[]; optionsHi?: string[]; correctOption?: string; marks?: number|string; solution?: string; diagramSvg?: string }>;
  rawContent?: string;
}

type TextOptions={bold?:boolean;size?:number;color?:string;hindi?:boolean;align?:any;after?:number;before?:number;keepNext?:boolean};
const SUPER:Record<string,string>={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾'};
const GREEK:Record<string,string>={alpha:'α',beta:'β',gamma:'γ',delta:'δ',Delta:'Δ',epsilon:'ε',theta:'θ',lambda:'λ',mu:'μ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',phi:'φ',varphi:'ϕ',omega:'ω',Omega:'Ω'};

function cleanText(text:string):string{
  let s=String(text||'');
  s=s.replace(/\bsvg\b/gi,'').replace(/\$\$([\s\S]*?)\$\$/g,'$1').replace(/\$([^$\n]+)\$/g,'$1');
  s=s.replace(/\\\(([\s\S]*?)\\\)/g,'$1').replace(/\\\[([\s\S]*?)\\\]/g,'$1');
  s=s.replace(/\\n/g,'\n');
  s=s.replace(/\\(alpha|beta|gamma|delta|Delta|epsilon|theta|lambda|mu|pi|rho|sigma|tau|phi|varphi|omega|Omega)\b/g,(_,g)=>GREEK[g]);
  s=s.replace(/\\times/g,'×').replace(/\\cdot/g,'·').replace(/\\pm/g,'±').replace(/\\mp/g,'∓').replace(/\\leq/g,'≤').replace(/\\geq/g,'≥').replace(/\\neq/g,'≠').replace(/\\propto/g,'∝').replace(/\\infty/g,'∞').replace(/\\approx/g,'≈').replace(/\\rightarrow/g,'→').replace(/\\to/g,'→').replace(/\\degree/g,'°');
  s=s.replace(/\\(mathrm|text|mathbf|mathit|vec|overline)\{([^{}]+)\}/g,'$2');
  return s.replace(/[{}]/g,'').trim();
}

function mathText(value:string){return new MathRun(cleanText(value));}
function mathSuper(base:string,exp:string){return new MathSuperScript({children:[mathText(base)],superScript:[mathText(exp)]});}

/** Convert common PDF/LaTeX fraction notation into editable native Word OMML. */
function richChildren(text:string,options:TextOptions):Array<TextRun|DocxMath>{
  const source=String(text||'');
  const children:Array<TextRun|DocxMath>=[];
  const fraction=/\\frac\{([^{}]+)\}\{([^{}]+)\}|\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g;
  let last=0; let match:RegExpExecArray|null;
  while((match=fraction.exec(source))){
    if(match.index>last) children.push(new TextRun({text:cleanText(source.slice(last,match.index)),bold:options.bold,size:options.size,font:options.hindi?'Noto Sans Devanagari':'Aptos',color:options.color}));
    const numerator=match[1]??match[3]??''; const denominator=match[2]??match[4]??'';
    children.push(new DocxMath({children:[new MathFraction({numerator:[mathText(numerator)],denominator:[mathText(denominator)]})]}));
    last=match.index+match[0].length;
  }
  if(last<source.length) children.push(new TextRun({text:cleanText(source.slice(last)),bold:options.bold,size:options.size,font:options.hindi?'Noto Sans Devanagari':'Aptos',color:options.color}));
  if(children.length===0){
    const value=cleanText(source);
    const power=/^([A-Za-zα-ωΑ-Ω]+)\^\{?([0-9A-Za-z+\-=]+)\}?$/.exec(value);
    if(power) return [new DocxMath({children:[mathSuper(power[1],power[2])]})];
    return [new TextRun({text:value,bold:options.bold,size:options.size,font:options.hindi?'Noto Sans Devanagari':'Aptos',color:options.color})];
  }
  return children;
}

function textParagraph(text:string,options:TextOptions={}):Paragraph{
  return new Paragraph({alignment:options.align,keepNext:options.keepNext,spacing:{before:options.before??0,after:options.after??35,line:options.hindi?260:275},children:richChildren(text,options)});
}
function cell(children:Paragraph[],width:number,fill?:string){return new TableCell({width:{size:width,type:WidthType.PERCENTAGE},shading:fill?{fill,type:ShadingType.CLEAR}:undefined,margins:{top:55,bottom:55,left:100,right:100},children});}

async function svgToPng(svg:string):Promise<{data:Buffer;width:number;height:number}> {
  const normalized=svg.trim().replace(/^```(?:svg|xml)?/i,'').replace(/```$/,'').trim();
  const meta=await sharp(Buffer.from(normalized,'utf8')).metadata();
  const width=Math.max(160,Math.min(720,Number(meta.width)||560));
  const height=Math.max(100,Math.min(420,Number(meta.height)||280));
  const data=await sharp(Buffer.from(normalized,'utf8')).resize({width,withoutEnlargement:false}).png().toBuffer();
  return {data,width,height:Math.round(height*(width/(Number(meta.width)||width)))};
}

async function diagramParagraph(svg?:string):Promise<Paragraph|null>{
  if(!svg||!svg.trim()||/^\s*(svg)?\s*$/i.test(svg)) return null;
  try{
    const rendered=await svgToPng(svg);
    return new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:70,after:70},children:[new ImageRun({type:'png',data:rendered.data,transformation:{width:rendered.width,height:rendered.height}})]});
  }catch{return null;}
}

function questionTable(q:NonNullable<DocxPaperData['questions']>[number],addHeader:boolean):Table{
  const english:Paragraph[]=[textParagraph(`Q.${q.number}  ${q.textEn}`,{bold:true,size:24,color:'0F172A',after:55,keepNext:true})];
  const hindi:Paragraph[]=[textParagraph(q.textHi||'',{bold:true,size:20,color:'334155',hindi:true,after:55,keepNext:true})];
  const en=q.optionsEn||[],hi=q.optionsHi||[];
  for(let i=0;i<4;i++){
    english.push(textParagraph(`(${i+1}) ${en[i]||''}`,{size:24,after:20}));
    hindi.push(textParagraph(`(${i+1}) ${hi[i]||''}`,{size:20,hindi:true,after:20}));
  }
  const rows:TableRow[]=[];
  if(addHeader) rows.push(new TableRow({cantSplit:true,children:[cell([textParagraph('ENGLISH',{bold:true,size:16,color:'FFFFFF',align:AlignmentType.CENTER,after:0})],50,'164E63'),cell([textParagraph('हिन्दी',{bold:true,size:15,color:'FFFFFF',hindi:true,align:AlignmentType.CENTER,after:0})],50,'164E63')]}));
  rows.push(new TableRow({cantSplit:true,children:[cell(english,50,'F8FAFC'),cell(hindi,50,'F8FAFC')]}));
  return new Table({width:{size:100,type:WidthType.PERCENTAGE},rows,borders:{top:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},bottom:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},left:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},right:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'},insideHorizontal:{style:BorderStyle.SINGLE,size:2,color:'E2E8F0'},insideVertical:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'}}});
}

export async function generateDocxBuffer(data:DocxPaperData):Promise<Buffer>{
  const children:(Paragraph|Table)[]=[];
  const instituteName=data.instituteName||'JARVIS AI OFFICE';
  const title=data.title||'Bilingual Document';
  const questions=data.questions||[];
  children.push(textParagraph(instituteName,{bold:true,size:28,color:'164E63',align:AlignmentType.CENTER,after:20}));
  children.push(textParagraph(title,{bold:true,size:24,color:'0F172A',align:AlignmentType.CENTER,after:40}));
  if(questions.length){
    const metaParts=[data.examType&&`Exam: ${data.examType}`,data.subject&&`Subject: ${data.subject}`,data.duration&&`Time: ${data.duration}`,data.totalMarks!==undefined&&`Maximum Marks: ${String(data.totalMarks)}`].filter(Boolean);
    if(metaParts.length) children.push(textParagraph(metaParts.join('   ·   '),{size:18,color:'475569',align:AlignmentType.CENTER,after:65}));
    if(data.instructions?.length){children.push(textParagraph('GENERAL INSTRUCTIONS / सामान्य निर्देश:',{bold:true,size:20,color:'334155',after:25,keepNext:true}));for(const instruction of data.instructions)children.push(textParagraph(instruction,{size:20,color:'475569',after:20}));}
    for(let index=0;index<questions.length;index++){
      const q=questions[index];
      children.push(questionTable(q,index===0));
      const diagram=await diagramParagraph(q.diagramSvg);
      if(diagram) children.push(diagram);
    }
    if(data.includeAnswerKey){const keyed=questions.filter(q=>q.correctOption);if(keyed.length){children.push(textParagraph('ANSWER KEY / उत्तर कुंजी',{bold:true,size:22,color:'164E63',align:AlignmentType.CENTER,before:100,after:35}));const width=100/Math.min(10,keyed.length);children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({cantSplit:true,children:keyed.map(q=>cell([textParagraph(`Q.${q.number}`,{bold:true,size:16,align:AlignmentType.CENTER,after:0})],width,'E2E8F0'))}),new TableRow({cantSplit:true,children:keyed.map(q=>cell([textParagraph(String(q.correctOption||'-').replace(/^A$/i,'1').replace(/^B$/i,'2').replace(/^C$/i,'3').replace(/^D$/i,'4'),{bold:true,size:20,color:'15803D',align:AlignmentType.CENTER,after:0})],width))})]}));}}
    if(data.includeSolutions){const solved=questions.filter(q=>q.solution);if(solved.length){children.push(textParagraph('DETAILED SOLUTIONS / विस्तृत हल',{bold:true,size:22,color:'164E63',align:AlignmentType.CENTER,before:100,after:35}));for(const q of solved){children.push(textParagraph(`Q.${q.number} Solution / हल:`,{bold:true,size:20,color:'2563EB',after:20,keepNext:true}));children.push(textParagraph(q.solution||'',{size:20,after:28}));}}}
  } else if(data.rawContent){for(const line of data.rawContent.split(/\r?\n/))if(line.trim())children.push(textParagraph(line,{size:24,after:25}));}
  const doc=new Document({creator:'JARVIS AI Office',title,sections:[{properties:{page:{margin:{top:560,bottom:560,left:650,right:650}}},children}]});
  return await Packer.toBuffer(doc);
}
