import React, { useRef } from 'react';
import { Paperclip, FileText, File, Image as ImageIcon, X } from 'lucide-react';
import { AttachedFile } from '../types';

interface FileDropzoneProps {
  attachedFiles: AttachedFile[];
  onAddFiles: (files: AttachedFile[]) => void;
  onRemoveFile: (id: string) => void;
  disabled?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({ attachedFiles, onAddFiles, onRemoveFile, disabled = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const selected: File[] = Array.from(e.target.files);
    const newAttached: AttachedFile[] = [];
    for (const file of selected) {
      const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      let base64Data: string | undefined;
      let textPreview: string | undefined;
      if (file.type.includes('pdf') || file.type.startsWith('image/')) base64Data = await readFileAsBase64(file);
      else if (file.type.includes('text') || /\.(txt|md)$/i.test(file.name)) textPreview = await readFileAsText(file);
      else base64Data = await readFileAsBase64(file);
      newAttached.push({ id, name: file.name, size: file.size, type: file.type || 'application/octet-stream', base64Data, textPreview, uploadedAt: new Date().toISOString() });
    }
    onAddFiles(newAttached);
    e.target.value = '';
  };

  const readFileAsBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file);
  });
  const readFileAsText = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve((reader.result as string).slice(0, 1000)); reader.onerror = reject; reader.readAsText(file);
  });
  const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  const getFileIcon = (name: string, type: string) => type.includes('pdf') || name.toLowerCase().endsWith('.pdf') ? <FileText className="h-4 w-4 text-rose-400" /> : type.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-emerald-400" /> : <File className="h-4 w-4 text-cyan-400" />;

  return (
    <div className="shrink-0 min-w-0">
      <input ref={fileInputRef} onChange={handleFileChange} type="file" multiple accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg" className="hidden" />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={disabled} onClick={() => fileInputRef.current?.click()} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-200">
          <Paperclip className="h-4 w-4 text-cyan-400" /><span>Attach PDF / Document</span>
        </button>
        {attachedFiles.map(file => <div key={file.id} className="flex max-w-full items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-1.5 pl-3 pr-2 text-xs text-slate-200">
          {getFileIcon(file.name, file.type)}<span className="max-w-[140px] truncate font-medium text-cyan-100" title={file.name}>{file.name}</span><span className="text-[10px] text-slate-400">({formatSize(file.size)})</span>
          <button type="button" onClick={() => onRemoveFile(file.id)} className="rounded p-0.5 text-slate-400 hover:bg-white/10 hover:text-rose-400" title="Remove file"><X className="h-3.5 w-3.5" /></button>
        </div>)}
      </div>
    </div>
  );
};
