from pathlib import Path

p=Path('server/docx-generator.ts')
s=p.read_text()
s=s.replace('const BODY_SIZE = 22;','const BODY_SIZE = 24;\nconst MATH_SIZE = 24;')
s=s.replace("const FONT_EN = 'Aptos';","const FONT_EN = 'Times New Roman';")
s=s.replace('new MathRun(cleanPlainText(buffer))','new MathRun({text:cleanPlainText(buffer),font:FONT_MATH,size:MATH_SIZE})')
s=s.replace("new MathRun('')","new MathRun({text:'',font:FONT_MATH,size:MATH_SIZE})")
s=s.replace('new MathRun(GREEK[command])','new MathRun({text:GREEK[command],font:FONT_MATH,size:MATH_SIZE})')
s=s.replace('new MathRun(symbols[command])','new MathRun({text:symbols[command],font:FONT_MATH,size:MATH_SIZE})')

a=s.index('function richChildren'); b=s.index('\nfunction textParagraph',a)
s=s[:a]+r'''function richChildren(text: string, options: TextOptions = {}): Array<TextRun | DocxMath> {
  const source=sanitizeTextInput(String(text||''));
  const baseRun=(value:string)=>new TextRun({text:cleanPlainText(value),bold:options.bold,size:options.size??BODY_SIZE,font:options.hindi?FONT_HI:FONT_EN,color:options.color});
  if(!hasMath(source)) return [baseRun(source)];
  const output:Array<TextRun|DocxMath>=[];
  const pattern=/\[\[MATH:([\s\S]*?)\]\]|\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$|\\\(([\s\S]*?)\\\)/g;
  let last=0; let match:RegExpExecArray|null;
  while((match=pattern.exec(source))){
    const before=source.slice(last,match.index); if(before) output.push(baseRun(before));
    if(before&&!/\s$/.test(before)) output.push(baseRun(' '));
    output.push(mathNode(match[1]??match[2]??match[3]??match[4]??''));
    const next=source.slice(match.index+match[0].length,match.index+match[0].length+1);
    if(next&&!/\s|[.,;:!?%)\]}]/.test(next)) output.push(baseRun(' '));
    last=match.index+match[0].length;
  }
  if(last<source.length) output.push(baseRun(source.slice(last)));
  return output.length?output:[baseRun('')];
}
''' + s[b:]

# Replace the complete question renderer. This avoids depending on any older placeholder patch shape.
a=s.index('async function questionTable'); b=s.index('\nfunction appendAnswerKey',a)
question=r'''async function questionTable(q:NonNullable<DocxPaperData['questions']>[number],first:boolean):Promise<Table>{
  const cleanQ=(v:string)=>sanitizeTextInput(v).trim().replace(/^\s*Q\.?\s*\d+\s*[:.)-]?\s*/i,'');
  const en:any[]=[textParagraph(`Q.${q.number}  ${cleanQ(q.textEn)}`,{bold:true,size:QUESTION_SIZE,color:'0F172A',after:45,keepNext:true,pageBreakBefore:first})];
  const hi:any[]=[textParagraph(cleanQ(q.textHi||''),{bold:true,size:QUESTION_SIZE,color:'334155',hindi:true,after:45,keepNext:true})];
  if(needsSourceImage(q)){
    const ph=await renderDiagram(sourceImagePlaceholderSvg(q.number));
    if(ph){en.push(ph);const hp=await renderDiagram(sourceImagePlaceholderSvg(q.number));if(hp)hi.push(hp);}
  }else if(q.diagramSvg?.trim()){
    const diagram=await renderDiagram(q.diagramSvg);
    if(diagram){en.push(diagram);const hp=await renderDiagram(q.diagramSvg);if(hp)hi.push(hp);}
  }
  if(q.questionType!=='numerical'){
    const enOptions=q.optionsEn||[]; const hiOptions=q.optionsHi||[];
    const enMatch=isMatchColumn(q.textEn,enOptions); const hiMatch=isMatchColumn(q.textHi||'',hiOptions);
    const mtEn=enMatch?(matchTableFromQuestion(q.textEn,false)||matchTable(enOptions,false)):null;
    const mtHi=hiMatch?(matchTableFromQuestion(q.textHi||'',true)||matchTable(hiOptions,true)):null;
    if(mtEn&&mtHi){en.push(mtEn);hi.push(mtHi);}else{en.push(optionTable(enOptions,false));hi.push(optionTable(hiOptions,true));}
  }
  const rows:TableRow[]=[];
  if(first)rows.push(new TableRow({cantSplit:true,children:[makeCell([textParagraph('ENGLISH',{bold:true,size:BODY_SIZE,color:'FFFFFF',align:AlignmentType.CENTER,after:0})],50,'164E63'),makeCell([textParagraph('हिन्दी',{bold:true,size:BODY_SIZE,color:'FFFFFF',hindi:true,align:AlignmentType.CENTER,after:0})],50,'164E63')]}));
  rows.push(new TableRow({cantSplit:true,children:[makeCell(en,50,'F8FAFC'),makeCell(hi,50,'F8FAFC')]}));
  return new Table({width:{size:100,type:WidthType.PERCENTAGE},rows,borders:{...THIN_BORDERS,insideHorizontal:{style:BorderStyle.SINGLE,size:2,color:'E2E8F0'},insideVertical:{style:BorderStyle.SINGLE,size:4,color:'CBD5E1'}}});
}
'''
s=s[:a]+question+s[b:]

# Add a source-text matching-table parser before questionTable if absent.
if 'function matchTableFromQuestion' not in s:
  pos=s.index('async function questionTable')
  helper=r'''function matchTableFromQuestion(text:string,hindi=false):Table|null{
  const body=sanitizeTextInput(text).split(/\(\s*1\s*\)/)[0];
  const alpha=[...body.matchAll(/(?:^|\s)([A-D])\s*[.)]\s*([\s\S]*?)(?=\s+[A-D]\s*[.)]\s*|\s+(?:I|II|III|IV|1|2|3|4)\s*[.)\-:]\s*|$)/gi)].map(m=>({label:m[1].toUpperCase(),value:m[2].trim()}));
  const second=[...body.matchAll(/(?:^|\s)(I|II|III|IV|1|2|3|4)\s*[.)\-:]\s*([\s\S]*?)(?=\s+(?:I|II|III|IV|1|2|3|4)\s*[.)\-:]\s*|\s+[A-D]\s*[.)]\s*|$)/gi)].map(m=>({label:m[1].toUpperCase(),value:m[2].trim()}));
  if(alpha.length<2||second.length<2)return null;
  const rows=alpha.slice(0,4).map((x,i)=>({a:`${x.label}. ${x.value}`,b:`${second[i].label}. ${second[i].value}`}));
  return new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({cantSplit:true,children:[makeCell([textParagraph('Column I',{bold:true,size:BODY_SIZE,hindi,align:AlignmentType.CENTER,after:0})],50,'E2E8F0'),makeCell([textParagraph('Column II',{bold:true,size:BODY_SIZE,hindi,align:AlignmentType.CENTER,after:0})],50,'E2E8F0')]}),...rows.map(r=>new TableRow({cantSplit:true,children:[makeCell([textParagraph(r.a,{size:BODY_SIZE,hindi,after:0})],50),makeCell([textParagraph(r.b,{size:BODY_SIZE,hindi,after:0})],50)]}))],borders:THIN_BORDERS});
}
'''
  s=s[:pos]+helper+s[pos:]

p.write_text(s)
print('DOCX renderer patched',len(s))
