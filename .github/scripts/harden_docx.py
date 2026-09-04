from pathlib import Path
import re

p = Path('server/docx-generator.ts')
s = p.read_text(encoding='utf-8')

# Remove every hard-coded source-image placeholder path. Real diagrams are rendered only when diagramSvg exists.
s = re.sub(r"function needsSourceImage\(q:any\):boolean\s*\{.*?\n\}", "function needsSourceImage(q:any):boolean { return false; }", s, count=1, flags=re.S)
s = s.replace("if(!s || /^(?:Graph|ग्राफ|Figure|Fig\\.?|Image|चित्र)\\s*(?:\\(?[1-4A-D]\\)?)?$/i.test(s)) return `[ ORIGINAL PDF IMAGE PLACEHOLDER — OPTION ${label??''} ]`;", "if(!s || /^(?:Graph|ग्राफ|Figure|Fig\\.?|Image|चित्र)\\s*(?:\\(?[1-4A-D]\\)?)?$/i.test(s)) return '';" )
s = s.replace('const long=cleaned.some(o=>o.length>42);', 'const long=cleaned.some(o=>o.length>60);')

# Replace generic cover table with the approved compact first-page header structure.
old_cover = re.search(r"function coverTable\(data:DocxPaperData\):Table\{.*?\n\}", s, flags=re.S)
new_cover = '''function coverTable(data:DocxPaperData):Table{
  const cell=(children:any[],width:number,fill='FFFFFF')=>new TableCell({width:{size:width,type:WidthType.PERCENTAGE},shading:{fill,type:ShadingType.CLEAR},borders:THIN_BORDERS,margins:{top:55,bottom:55,left:80,right:80},children});
  const title=new TableRow({cantSplit:true,children:[cell([textParagraph('SHAHEEN',{bold:true,size:20,color:'15803D',align:AlignmentType.CENTER,after:0})],20),cell([textParagraph(String(data.instituteName||'SHAHEEN ACADEMY'),{bold:true,size:28,color:'DC2626',align:AlignmentType.CENTER,after:0}),textParagraph(String(data.title||'TEST PAPER'),{bold:true,size:20,align:AlignmentType.CENTER,after:0})],60),cell([textParagraph('SHAHEEN',{bold:true,size:20,color:'15803D',align:AlignmentType.CENTER,after:0})],20)]});
  const meta=new TableRow({cantSplit:true,children:[cell([textParagraph(`Duration: ${data.duration||''}`,{bold:true,size:20,after:0})],33.33,'F8FAFC'),cell([textParagraph(String(data.medium||'English + हिन्दी'),{bold:true,size:20,align:AlignmentType.CENTER,after:0})],33.34,'F8FAFC'),cell([textParagraph(`Maximum Marks: ${data.totalMarks||''}`,{bold:true,size:20,align:AlignmentType.RIGHT,after:0})],33.33,'F8FAFC')]});
  const syllabus=String(data.syllabus||'').trim();
  const syllabusText=syllabus?`SYLLABUS COVERED\\n${syllabus}`:'SYLLABUS COVERED';
  const syl=new TableRow({cantSplit:true,children:[cell([textParagraph(syllabusText,{size:20,after:0})],100,'FFFFFF')]});
  return new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[title,meta,syl],borders:THIN_BORDERS});
}'''
if old_cover:
    s=s[:old_cover.start()]+new_cover+s[old_cover.end():]

# Replace student information table with the standard fields.
old_student = re.search(r"function studentInfoTable\(\):Table\{.*?\n\}", s, flags=re.S)
new_student = '''function studentInfoTable():Table{
  const row=(a:string,b:string)=>new TableRow({cantSplit:true,children:[makeCell([field(a)],50),makeCell([field(b)],50)]});
  return new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[
    new TableRow({cantSplit:true,children:[makeCell([textParagraph('STUDENT INFORMATION / छात्र विवरण',{bold:true,size:BODY_SIZE,color:'FFFFFF',align:AlignmentType.CENTER,after:0})],100,'164E63')]}),
    row('Student Name','Roll Number'),row('Class','Batch'),row('Test Date','Mobile Number'),row('Student Signature','Invigilator Signature')
  ],borders:THIN_BORDERS});
}'''
if old_student:
    s=s[:old_student.start()]+new_student+s[old_student.end():]

# Remove the redundant generic title paragraphs before the cover table.
prefix = "children.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:70},children:[new TextRun({text:institute,bold:true,size:28,font:FONT_EN,color:'164E63'})]}));children.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:35},children:[new TextRun({text:title,bold:true,size:26,font:FONT_EN,color:'0F172A'})]}));children.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:80},children:[new TextRun({text:'BILINGUAL QUESTION PAPER  •  ENGLISH + हिन्दी',bold:true,size:BODY_SIZE,font:FONT_EN,color:'475569'})]}));children.push(coverTable(data));"
s=s.replace(prefix, "children.push(coverTable(data));")

# Guard against literal math wrapper leakage.
s=s.replace("let s=stripMathMarkers(text).replace(/\\\\n/g,'\\n');", "let s=stripMathMarkers(text).replace(/\\\\n/g,'\\n');s=s.replace(/\\[\\[MATH:/g,'').replace(/\\]\\]/g,'');")

marker='// JARVIS-DOCX-TEMPLATE-HARDENED-2026-09-04'
if marker not in s:
    s=marker+'\n'+s
p.write_text(s, encoding='utf-8')

# Harden source extraction prompts and one-attempt chunking.
t = Path('server/task-runner.ts')
s = t.read_text(encoding='utf-8')
s=s.replace('const chunkSize=20,chunks:', 'const chunkSize=10,chunks:')
s=s.replace('for(let attempt=1;attempt<=3;attempt++){try{add(\'working\',`SOURCE EXTRACTION · Q.${c.start}–Q.${c.end}`,`Attempt ${attempt}/3`);', 'for(let attempt=1;attempt<=1;attempt++){try{add(\'working\',`SOURCE EXTRACTION · Q.${c.start}–Q.${c.end}`,`Attempt ${attempt}/1`);')
s=s.replace('Read the actual PDF visually and textually. Return exactly', 'Read the actual PDF visually and textually. Preserve every visible word boundary and space; never concatenate adjacent tokens. Preserve punctuation, decimals, minus signs, fractions, superscripts, subscripts, Greek letters, units and symbols exactly. If OCR text is visually joined, restore the correct spacing from the rendered PDF. Return exactly')
s=s.replace('populate diagramSvg and sourcePage. Do not solve, correct, summarize, merge, skip or renumber anything.', 'populate diagramSvg with a self-contained SVG whenever a real graph/figure/diagram is visible; never put placeholder text into diagramSvg. Include sourcePage. Do not solve, correct, summarize, merge, skip or renumber anything.')
marker2='// JARVIS-SOURCE-FIDELITY-HARDENED-2026-09-04'
if marker2 not in s:
    s=marker2+'\n'+s
t.write_text(s, encoding='utf-8')
