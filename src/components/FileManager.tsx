import React, { useState } from 'react';
import {
  FolderKanban,
  FileText,
  Download,
  Trash2,
  UploadCloud,
  File,
  Image as ImageIcon,
  Sparkles,
  Search,
  ExternalLink,
} from 'lucide-react';
import { AttachedFile, GeneratedArtifact } from '../types';

interface FileManagerProps {
  uploadedFiles: AttachedFile[];
  generatedArtifacts: {
    artifact: GeneratedArtifact;
    taskTitle: string;
    date: string;
  }[];
  onUploadFile: (files: AttachedFile[]) => void;
  onDeleteUploadedFile: (id: string) => void;
  onProcessFile: (file: AttachedFile) => void;
}

export const FileManager: React.FC<FileManagerProps> = ({
  uploadedFiles,
  generatedArtifacts,
  onUploadFile,
  onDeleteUploadedFile,
  onProcessFile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pdf' | 'docx' | 'generated'>('all');

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownloadArtifact = (artifact: GeneratedArtifact) => {
    if (artifact.docxBase64) {
      const byteCharacters = atob(artifact.docxBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = artifact.name;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([artifact.content || ''], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = artifact.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center space-x-2.5">
            <FolderKanban className="h-5 w-5 text-cyan-400" />
            <h2 className="font-['Space_Grotesk'] text-xl font-bold text-white tracking-tight sm:text-2xl">
              JARVIS File Workspace
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-300 sm:text-sm">
            Manage source PDFs, uploaded exams, and generated bilingual Word documents.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 backdrop-blur-md focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Generated Documents Section */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-4 flex items-center space-x-2">
          <Sparkles className="h-4 w-4" />
          <span>Generated Output Artifacts ({generatedArtifacts.length})</span>
        </h3>

        {generatedArtifacts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-400 backdrop-blur-md">
            No generated documents yet. Run a prompt in JARVIS to create bilingual papers or DPPs.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {generatedArtifacts.map(({ artifact, taskTitle, date }, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white truncate max-w-[170px]" title={artifact.name}>
                          {artifact.name}
                        </h4>
                        <span className="text-[10px] uppercase font-mono text-cyan-400 font-semibold">
                          .{artifact.fileType} • {formatSize(artifact.size)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400 truncate" title={taskTitle}>
                    Task: {taskTitle}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-[10px] text-slate-500">{new Date(date).toLocaleTimeString()}</span>
                  <button
                    onClick={() => handleDownloadArtifact(artifact)}
                    className="flex items-center space-x-1 rounded-xl bg-cyan-500/20 border border-cyan-500/30 px-3 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition-all"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Uploaded Files Section */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center space-x-2">
          <UploadCloud className="h-4 w-4 text-cyan-400" />
          <span>Uploaded Source Files ({uploadedFiles.length})</span>
        </h3>

        {uploadedFiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-400 backdrop-blur-md">
            No source files uploaded yet. You can attach PDFs or question papers in the Assistant chat.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all hover:border-white/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white truncate max-w-[170px]" title={file.name}>
                        {file.name}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {formatSize(file.size)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteUploadedFile(file.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-[10px] text-slate-500">{new Date(file.uploadedAt).toLocaleTimeString()}</span>
                  <button
                    onClick={() => onProcessFile(file)}
                    className="flex items-center space-x-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Process with JARVIS</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
