import { MarkItDown } from 'markitdown-ts';
import type { AttachedFile } from '../src/types/index.js';

const converter = new MarkItDown();
const MAX_PREVIEW_CHARS = 120_000;

function extensionFor(file: AttachedFile): string {
  const name = file.name.toLowerCase();
  const match = name.match(/\.[a-z0-9]+$/);
  if (match) return match[0];
  const mimeMap: Record<string, string> = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/html': '.html',
    'text/csv': '.csv',
    'application/json': '.json',
    'text/plain': '.txt',
  };
  return mimeMap[file.type] || '.bin';
}

function decodeBase64(data: string): Buffer {
  return Buffer.from(data.replace(/^data:[^;]+;base64,/, ''), 'base64');
}

/**
 * Converts uploaded documents to Markdown before they reach the JARVIS agents.
 * The original base64 payload is retained so multimodal/source-locked workflows
 * can still use the original document; Markdown becomes a deterministic text
 * representation for indexing, routing and fallback processing.
 */
export async function enrichFilesWithMarkdown(files: AttachedFile[] | undefined): Promise<AttachedFile[] | undefined> {
  if (!files?.length) return files;

  return Promise.all(files.map(async (file) => {
    if (!file.base64Data) return file;
    try {
      const result = await converter.convertBuffer(decodeBase64(file.base64Data), {
        file_extension: extensionFor(file),
      });
      const markdown = result?.markdown?.trim();
      if (!markdown) return file;
      return {
        ...file,
        textPreview: markdown.slice(0, MAX_PREVIEW_CHARS),
      };
    } catch (error) {
      console.warn(`[MarkItDown] Could not convert ${file.name}; preserving original attachment.`, error);
      return file;
    }
  }));
}

export async function convertFileToMarkdown(file: AttachedFile): Promise<string> {
  if (!file.base64Data) throw new Error(`File ${file.name} has no base64 content.`);
  const result = await converter.convertBuffer(decodeBase64(file.base64Data), {
    file_extension: extensionFor(file),
  });
  return result?.markdown?.trim() || '';
}
