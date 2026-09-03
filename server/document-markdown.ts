import type { AttachedFile } from '../src/types/index.js';

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
  return Buffer.from(String(data || '').replace(/^data:[^;]+;base64,/, ''), 'base64');
}

/**
 * Optional MarkItDown adapter. It is intentionally imported lazily because its
 * PDF stack can pull native canvas modules that are unavailable in Vercel's
 * serverless runtime. A failed conversion must never make an API route crash.
 */
async function getConverter(): Promise<any | null> {
  try {
    const mod: any = await import('markitdown-ts');
    return typeof mod.MarkItDown === 'function' ? new mod.MarkItDown() : null;
  } catch (error) {
    console.warn('[MarkItDown] Converter unavailable; falling back to Gemini/native file input.', error);
    return null;
  }
}

export async function enrichFilesWithMarkdown(files: AttachedFile[] | undefined): Promise<AttachedFile[] | undefined> {
  if (!files?.length) return files;
  const converter = await getConverter();
  if (!converter) return files;

  return Promise.all(files.map(async (file) => {
    if (!file.base64Data) return file;
    try {
      const result = await converter.convertBuffer(decodeBase64(file.base64Data), { file_extension: extensionFor(file) });
      const markdown = String(result?.markdown || '').trim();
      if (!markdown) return file;
      return { ...file, textPreview: markdown.slice(0, MAX_PREVIEW_CHARS) };
    } catch (error) {
      console.warn(`[MarkItDown] Could not convert ${file.name}; preserving original attachment.`, error);
      return file;
    }
  }));
}

export async function convertFileToMarkdown(file: AttachedFile): Promise<string> {
  if (!file.base64Data) throw new Error(`File ${file.name} has no base64 content.`);
  const converter = await getConverter();
  if (!converter) return '';
  try {
    const result = await converter.convertBuffer(decodeBase64(file.base64Data), { file_extension: extensionFor(file) });
    return String(result?.markdown || '').trim();
  } catch (error) {
    console.warn(`[MarkItDown] Could not convert ${file.name}.`, error);
    return '';
  }
}
