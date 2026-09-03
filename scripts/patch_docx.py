from pathlib import Path
import re

p=Path('server/docx-generator.ts')
s=p.read_text()
s=s.replace('const BODY_SIZE = 22;','const BODY_SIZE = 24;\nconst MATH_SIZE = 24;')
s=s.replace("const FONT_EN = 'Aptos';","const FONT_EN = 'Times New Roman';")
s=s.replace('new MathRun(cleanPlainText(buffer))','new MathRun({text:cleanPlainText(buffer),font:FONT_MATH,size:MATH_SIZE})')
s=s.replace("new MathRun('')","new MathRun({text:'',font:FONT_MATH,size:MATH_SIZE})")
s=s.replace('new MathRun(GREEK[command])','new MathRun({text:GREEK[command],font:FONT_MATH,size:MATH_SIZE})')
s=s.replace('new MathRun(symbols[command])','new MathRun({text:symbols[command],font:FONT_MATH,size:MATH_SIZE})')

a=s.index('function richChildren'); b=s.index('\nfunction textParagraph',a)
rich='''function richChildren(text: string, options: TextOptions = {}): Array<TextRun | DocxMath> {\n  const source=sanitizeTextInput(String(text||''));\n  const baseRun=(value:string)=>new TextRun({text:cleanPlainText(value),bold:options.bold,size:options.size??BODY_SIZE,font:options.hindi?FONT_HI:FONT_EN,color:options.color});\n  if(!hasMath(source)) return [baseRun(source)];\n  const output:Array<TextRun|DocxMath>=[];\n  const pattern=/\\[\\[MATH:([\\s\\S]*?)\\]\\]|\\$\\$([\\s\\S]*?)\\$\\$|\\$([^$\\n]+)\\$|\\\\\\(([\\s\\S]*?)\\\\\\)/g;\n  let last=0; let match:RegExpExecArray|null;\n  while((match=pattern.exec(source))){\n    const before=source.slice(last,match.index); if(before) output.push(baseRun(before));\n    if(before&&!/\\s$/.test(before)) output.push(baseRun(' '));\n    output.push(mathNode(match[1]??match[2]??match[3]??match[4]??''));\n    const next=source.slice(match.index+match[0].length,match.index+match[0].length+1);\n    if(next&&!/\\s|[.,;:!?%)\\]}]/.test(next)) output.push(baseRun(' '));\n    last=match.index+match[0].length;\n  }\n  if(last<source.length) output.push(baseRun(source.slice(last)));\n  return output.length?output:[baseRun('')];\n}\n'''
s=s[:a]+rich+s[b:]

if 'function needsSourceImage' not in s:
    pos=s.index('async function questionTable')
    helper='''function needsSourceImage(q: NonNullable<DocxPaperData['questions']>[number]): boolean {\n  const n=Number(String(q.number).replace(/^Q\\.?/i,''));\n  if([35,36,37,38,47,54,62,65,67,74,83,169].includes(n)) return true;\n  return /(graph|plot|diagram|figure|fig\\.?|image|shown below|given below|shown in (?:the )?figure|चित्र|ग्राफ|आरेख)/i.test(`${q.textEn||''} ${q.textHi||''}`);\n}\nfunction sourceImagePlaceholderSvg(n: number|string): string {\n  const safe=String(n).replace(/[^0-9A-Za-z.]/g,'');\n  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="210"><rect x="6" y="6" width="708" height="198" rx="10" fill="#F8FAFC" stroke="#64748B" stroke-width="3"/><text x="360" y="100" text-anchor="middle" font-family="Arial" font-size="25" fill="#334155">Q.${safe} — ORIGINAL PDF IMAGE PLACEHOLDER</text><text x="360" y="138" text-anchor="middle" font-family="Arial" font-size="17" fill="#64748B">Insert the original source PDF image here</text></svg>`;\n}\n'''
    s=s[:pos]+helper+s[pos:]

# Always force the source-image placeholder for the known visual questions.
a=s.index('async function questionTable'); b=s.index('\nfunction appendAnswerKey',a); q=s[a:b]
if 'if (needsSourceImage(q))' not in q:
    needle=re.search(r"\n\s*const hi\s*=\s*\[textParagraph\([^\n]+\)\];",q)
    if not needle: raise SystemExit('questionTable insertion point not found')
    ins="\n  if (needsSourceImage(q)) { const ph=await renderDiagram(sourceImagePlaceholderSvg(q.number)); if(ph){ en.push(ph); const hp=await renderDiagram(sourceImagePlaceholderSvg(q.number)); if(hp) hi.push(hp); } }"
    q=q[:needle.end()]+ins+q[needle.end():]
s=s[:a]+q+s[b:]
p.write_text(s)
print('DOCX renderer patched')
