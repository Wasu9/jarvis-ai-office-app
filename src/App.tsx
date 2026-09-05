import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, FileText, Loader2, Upload, XCircle } from 'lucide-react';
import { ApiService, DEFAULT_SETTINGS } from './services/api';
import { AttachedFile, TaskRecord, TaskStep } from './types';
import { FileDropzone } from './components/FileDropzone';

function downloadArtifact(a: any) {
  if (!a) return;
  if (a.docxBase64) {
    const bytes = Uint8Array.from(atob(a.docxBase64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = a.name || 'JARVIS-Bilingual-Paper.docx';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (a.downloadUrl) window.open(a.downloadUrl, '_blank', 'noopener,noreferrer');
}

export default function App() {
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [task, setTask] = useState<TaskRecord | null>(null);
  const [liveSteps, setLiveSteps] = useState<TaskStep[]>([]);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const liveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onStep = (event: Event) => {
      const step = (event as CustomEvent<TaskStep>).detail;
      if (!step) return;
      setLiveSteps(prev => [...prev.slice(-199), step]);
      requestAnimationFrame(() => { if (liveRef.current) liveRef.current.scrollTop = liveRef.current.scrollHeight; });
    };
    window.addEventListener('jarvis-task-step', onStep);
    return () => window.removeEventListener('jarvis-task-step', onStep);
  }, []);

  const extractionStep = [...liveSteps].reverse().find(s => /^SOURCE EXTRACTION · Q\./i.test(s.label));
  const questionsSeen = useMemo(() => liveSteps.filter(s => /^SOURCE EXTRACTION · Q\./i.test(s.label)), [liveSteps]);
  const liveQuestion = useMemo(() => {
    const source = files[0]?.textPreview || '';
    const match = extractionStep?.label.match(/Q\.(\d+)–Q\.(\d+)/i);
    if (!source || !match) return null;
    const start = Number(match[1]);
    const end = Number(match[2]);
    const pattern = /(?:^|\n)\s*(?:Q(?:uestion)?\s*\.?\s*)?(\d{1,3})[.)]\s+/gi;
    const found = [...source.matchAll(pattern)];
    const target = found.findIndex(m => Number(m[1]) === start);
    if (target < 0) return { number: String(start), text: `Processing source questions Q.${start}–Q.${end}…`, range: `Q.${start}–Q.${end}` };
    const next = found[target + 1];
    const raw = source.slice(found[target].index, next?.index ?? source.length).trim();
    return { number: String(start), text: raw.slice(0, 1200), range: `Q.${start}–Q.${end}` };
  }, [files, extractionStep]);
  const primaryArtifact = task?.result?.artifacts?.find(a => a.fileType === 'docx') || task?.result?.artifacts?.[0];

  const reset = () => { setFiles([]); setTask(null); setLiveSteps([]); setError(''); setRunning(false); };

  const startConversion = async () => {
    if (running) return;
    const pdf = files.find(f => f.type.includes('pdf') || /\.pdf$/i.test(f.name));
    if (!pdf) { setError('Please upload a PDF first.'); return; }
    setError(''); setRunning(true); setTask(null); setLiveSteps([]);
    try {
      const result = await ApiService.executeTask({
        userPrompt: [
          'Convert the uploaded PDF paper into one exact bilingual English + Hindi Word document.',
          'SOURCE-LOCK: the PDF is the only authority.',
          'Do NOT add, remove, correct, solve, summarize, reorder, renumber, or rewrite any source question or option.',
          'Preserve the English question and every option exactly as printed. Translate only the English text into faithful Hindi.',
          'Preserve all equations, fractions, powers, subscripts, superscripts, Greek letters, symbols, units, punctuation, decimals and scientific notation.',
          'If a graph, figure, diagram or image cannot be reproduced accurately, insert a clearly labelled placeholder image in the Word document at that exact question location, showing the question number and what visual must be added manually.',
          'Do not create an answer key or solutions.',
          'Return the completed Word document as the main deliverable.'
        ].join(' '),
        selectedAgentId: 'pdf-bilingual', attachedFiles: [pdf], model: DEFAULT_SETTINGS.aiModel, settings: DEFAULT_SETTINGS
      });
      setTask(result);
      if (result.status === 'failed') setError(result.error || 'Conversion failed.');
    } catch (e: any) { setError(e?.message || 'Conversion failed.'); }
    finally { setRunning(false); }
  };

  return <div className="simple-app">
    <header className="simple-header">
      <div><div className="brand">JARVIS <span>AI OFFICE</span></div><div className="subtitle">PDF → Exact Bilingual Paper</div></div>
      <div className="status"><i className={running ? 'busy' : 'online'} /> {running ? 'PROCESSING' : 'READY'}</div>
    </header>
    <main className="simple-grid">
      <section className="work-panel">
        <div className="panel-title"><div><h1>Convert Paper</h1><p>Upload your PDF. JARVIS keeps the source unchanged and adds Hindi.</p></div>{files.length > 0 && !running && <button className="ghost-btn" onClick={reset}><XCircle size={16} /> Clear</button>}</div>
        <div className="drop-card">
          <FileText size={38} />
          <h2>{files.length ? files[0].name : 'Upload your paper PDF'}</h2>
          <p>{files.length ? 'PDF ready for conversion.' : 'Choose one PDF from your computer'}</p>
          <FileDropzone attachedFiles={files} onAddFiles={newFiles => { const pdfs = newFiles.filter(f => f.type.includes('pdf') || /\.pdf$/i.test(f.name)); setFiles(pdfs.slice(0, 1)); setError(pdfs.length ? '' : 'Please select a PDF file.'); }} onRemoveFile={() => setFiles([])} disabled={running} />
        </div>
        <div className="rules">
          <div><b>✓</b> English questions & options unchanged</div><div><b>✓</b> Hindi translation only</div>
          <div><b>✓</b> Maths & special characters preserved</div><div><b>✓</b> Missing graph/figure → manual placeholder</div>
        </div>
        <button className="convert-btn" disabled={running || !files.length} onClick={startConversion}>{running ? <><Loader2 size={18} className="spin" /> Converting paper…</> : <><Upload size={18} /> Convert to Bilingual Word</>}</button>
        {error && <div className="error-box">{error}</div>}
        {task?.status === 'completed' && primaryArtifact && <div className="success-box"><div><CheckCircle2 size={22} /><div><strong>Paper ready</strong><span>English + Hindi Word document generated.</span></div></div><button onClick={() => downloadArtifact(primaryArtifact)}><Download size={17} /> Download Word</button></div>}
      </section>
      <aside className="live-panel">
        <div className="live-head"><div><span className="live-dot" /> LIVE</div><span>{questionsSeen.length ? `${questionsSeen.length} batches processed` : 'Waiting for paper'}</span></div>
        <div className="current-question">{liveQuestion ? <><div className="q-label">CURRENT SOURCE · {liveQuestion.range || `Q.${liveQuestion.number}`}</div><div className="q-text">{liveQuestion.text}</div></> : <div className="waiting-copy">{running ? 'Reading the PDF and preparing the first question…' : 'Upload a paper and start conversion. The current source question will appear here while JARVIS works.'}</div>}</div>
        <div className="activity" ref={liveRef}>{liveSteps.map((step, i) => <div className="activity-row" key={`${step.timestamp}-${i}`}><span className="activity-dot" /><div><b>{step.label}</b>{step.details && <small>{step.details}</small>}</div></div>)}{!liveSteps.length && <div className="empty-activity">Live processing activity will appear here.</div>}</div>
      </aside>
    </main>
  </div>;
}
