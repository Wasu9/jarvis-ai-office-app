import React from 'react';
import { Download, FileText, Image as ImageIcon, File } from 'lucide-react';
import { AttachedFile } from '../types';

const mimeFor = (file: AttachedFile) => file.type || 'application/octet-stream';

const downloadInputFile = (file: AttachedFile) => {
  if (!file.base64Data) return;
  const parts = file.base64Data.split(',');
  const byteString = atob(parts.length > 1 ? parts[1] : parts[0]);
  const bytes = Uint8Array.from(byteString, c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mimeFor(file) });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const iconFor = (file: AttachedFile) => {
  const name = file.name.toLowerCase();
  if (file.type.includes('pdf') || name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.doc')) {
    return <FileText className="h-4 w-4 text-cyan-300" />;
  }
  if (file.type.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-emerald-300" />;
  return <File className="h-4 w-4 text-slate-300" />;
};

const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export const InputFileDownloads: React.FC<{ files: AttachedFile[] }> = ({ files }) => {
  if (!files.length) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.03]">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-200">INPUT FILES</div>
          <div className="mt-0.5 text-[9px] text-slate-500">Original files used for this task</div>
        </div>
        <span className="text-[9px] font-mono text-slate-500">{files.length} FILE{files.length === 1 ? '' : 'S'}</span>
      </div>
      <div className="flex flex-wrap gap-2 p-3">
        {files.map(file => (
          <div key={file.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            {iconFor(file)}
            <div className="min-w-0">
              <div className="max-w-[220px] truncate text-[10px] font-semibold text-slate-200" title={file.name}>{file.name}</div>
              <div className="text-[8px] text-slate-500">{formatSize(file.size)}</div>
            </div>
            {file.base64Data ? (
              <button type="button" onClick={() => downloadInputFile(file)} className="ml-1 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-1.5 text-cyan-200 hover:bg-cyan-400/20" title={`Download ${file.name}`} aria-label={`Download ${file.name}`}>
                <Download className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="ml-1 text-[8px] text-amber-300" title="Original file data was not retained">Unavailable</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
