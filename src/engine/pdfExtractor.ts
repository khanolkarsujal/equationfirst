import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PageData, RectBox } from './types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export class PdfLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfLoadError';
  }
}

function multiplyMatrices(a: number[], b: number[]): number[] {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function unitSquareToTopLeftBox(ctm: number[], pageHeight: number): RectBox {
  const corners = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ].map(([ux, uy]) => [
    ctm[0] * ux + ctm[2] * uy + ctm[4],
    ctm[1] * ux + ctm[3] * uy + ctm[5],
  ]);

  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: Math.round(minX * 10) / 10,
    y: Math.round((pageHeight - maxY) * 10) / 10,
    w: Math.round((maxX - minX) * 10) / 10,
    h: Math.round((maxY - minY) * 10) / 10,
  };
}

function countStrongMathChars(str: string): number {
  let count = 0;
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    const isGreek = cp >= 0x0370 && cp <= 0x03ff;
    const isMathOp = cp >= 0x2200 && cp <= 0x22ff;
    const isMathAlpha = cp >= 0x1d400 && cp <= 0x1d7ff;
    const isSuppMathOp = cp >= 0x2a00 && cp <= 0x2aff;
    if (isGreek || isMathOp || isMathAlpha || isSuppMathOp) {
      count += 1;
    }
  }
  return count;
}

interface StructNodeLike {
  role?: string;
  alt?: string;
  children?: StructNodeLike[];
}

function collectFigureAlts(node: StructNodeLike | null | undefined, out: Array<string | null>): void {
  if (!node) return;
  if (node.role === 'Figure' || node.role === 'Formula') {
    out.push(typeof node.alt === 'string' ? node.alt : null);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectFigureAlts(child, out);
    }
  }
}

export async function openPdfFromBytes(bytes: Uint8Array): Promise<pdfjsLib.PDFDocumentProxy> {
  // Check basic PDF magic header
  if (bytes.length < 5) {
    throw new PdfLoadError('This file is empty or not a valid PDF document.');
  }
  const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]);
  if (!header.startsWith('%PDF-')) {
    throw new PdfLoadError('This file does not appear to be a PDF. Please select a valid .pdf file.');
  }

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: bytes,
      useSystemFonts: false,
      disableFontFace: false,
    });
    const doc = await loadingTask.promise;
    if (!doc || doc.numPages === 0) {
      throw new PdfLoadError('This PDF has zero pages and cannot be analyzed.');
    }
    return doc;
  } catch (err: unknown) {
    if (err instanceof PdfLoadError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    const name = err instanceof Error ? err.name : '';
    if (name === 'PasswordException' || /password/i.test(msg)) {
      throw new PdfLoadError(
        'This PDF is password-protected. Ask the instructor or source owner for an unlocked copy.',
      );
    }
    throw new PdfLoadError(
      'This PDF appears damaged or unreadable. Try re-exporting it or using another copy.',
    );
  }
}

export async function extractPageData(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
): Promise<PageData> {
  const page = await pdfDoc.getPage(pageNumber);
  try {
    const viewport = page.getViewport({ scale: 1 });
    const width = viewport.width;
    const height = viewport.height;

    // 1. Text extraction
    const textContent = await page.getTextContent();
    const textItems: RectBox[] = [];
    let textCharCount = 0;
    let strongChars = 0;
    const lineBuckets = new Map<number, string>();

    for (const item of textContent.items) {
      if (!('str' in item)) continue;
      const str = item.str;
      const trimmed = str.trim();
      textCharCount += trimmed.length;
      strongChars += countStrongMathChars(str);

      const tx = item.transform;
      const itemW = typeof item.width === 'number' ? item.width : 0;
      const itemH = typeof item.height === 'number' && item.height > 0 ? item.height : Math.abs(tx[3]) || 10;
      const x = tx[4];
      const yFromTop = height - tx[5] - itemH;

      if (trimmed.length > 0) {
        textItems.push({
          x: Math.round(x * 10) / 10,
          y: Math.round(yFromTop * 10) / 10,
          w: Math.round(itemW * 10) / 10,
          h: Math.round(itemH * 10) / 10,
        });
        const bucketY = Math.round(yFromTop / 4) * 4;
        lineBuckets.set(bucketY, `${lineBuckets.get(bucketY) ?? ''} ${str}`);
      }
    }

    let equationLines = 0;
    for (const lineText of lineBuckets.values()) {
      if (/[A-Za-z0-9]\s*=\s*[A-Za-z0-9]/.test(lineText)) {
        equationLines += 1;
      }
    }

    // 2. Image bounding boxes via operator list
    const opList = await page.getOperatorList();
    const OPS = pdfjsLib.OPS;
    const stack: number[][] = [];
    let ctm = [1, 0, 0, 1, 0, 0];
    const images: RectBox[] = [];

    for (let i = 0; i < opList.fnArray.length; i += 1) {
      const fn = opList.fnArray[i];
      const args = opList.argsArray[i];
      if (fn === OPS.save) {
        stack.push([...ctm]);
      } else if (fn === OPS.restore) {
        ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
      } else if (fn === OPS.transform && Array.isArray(args) && args.length >= 6) {
        ctm = multiplyMatrices(ctm, args as number[]);
      } else if (
        fn === OPS.paintImageXObject ||
        fn === OPS.paintInlineImageXObject ||
        fn === OPS.paintImageMaskXObject
      ) {
        const box = unitSquareToTopLeftBox(ctm, height);
        if (box.w > 0 && box.h > 0) {
          images.push(box);
        }
      }
    }

    // 3. Tag tree / alt text
    let hasStructTree = false;
    const figureAlts: Array<string | null> = [];
    try {
      const structTree = await page.getStructTree();
      if (structTree) {
        hasStructTree = true;
        collectFigureAlts(structTree as StructNodeLike, figureAlts);
      }
    } catch {
      // Tag tree unavailable for some PDFs
    }

    return {
      page: pageNumber,
      width,
      height,
      textCharCount,
      textItems,
      images,
      mathText: {
        strongChars,
        equationLines,
      },
      tags: {
        hasStructTree,
        figureAlts,
      },
    };
  } finally {
    page.cleanup();
  }
}

export async function extractDocumentPages(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
  waitIfPaused?: () => Promise<void>,
): Promise<PageData[]> {
  const total = pdfDoc.numPages;
  const pages: PageData[] = [];

  for (let p = 1; p <= total; p += 1) {
    if (signal?.aborted) {
      throw new DOMException('Analysis cancelled', 'AbortError');
    }
    if (waitIfPaused) {
      await waitIfPaused();
      if (signal?.aborted) {
        throw new DOMException('Analysis cancelled', 'AbortError');
      }
    }
    const pageData = await extractPageData(pdfDoc, p);
    pages.push(pageData);
    onProgress?.(p, total);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return pages;
}

export async function renderPdfPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1.5,
): Promise<void> {
  const page = await pdfDoc.getPage(pageNumber);
  try {
    const viewport = page.getViewport({ scale });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  } finally {
    page.cleanup();
  }
}
