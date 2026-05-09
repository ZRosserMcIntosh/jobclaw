/**
 * lib/extract-text.ts
 *
 * Server-side text extraction from PDF and DOCX files.
 * PDF  → pdf-parse
 * DOCX → mammoth
 * ODT  → strip XML tags (good enough for structured résumés)
 */

export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') {
    // dynamic import to avoid edge-runtime issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import('pdf-parse') as any;
    const pdfParse = mod.default ?? mod;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const result  = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === 'odt') {
    // ODT is a ZIP containing content.xml — decode XML to plain text
    const text = buffer.toString('utf8');
    return text.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }

  // Fallback: try treating as plain text
  return buffer.toString('utf8');
}
