import test from 'node:test';
import assert from 'node:assert/strict';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildSamplePdfBytes } from './samplePdf';
import { DEFAULT_CONFIG } from '../engine/config';
import { scoreDocument } from '../engine/scoring';
import type { PageData, RectBox } from '../engine/types';

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

test('generated sample PDF parses in pdfjs-dist and scores expected pages', async () => {
  const bytes = buildSamplePdfBytes();
  const header = new TextDecoder().decode(bytes.slice(0, 8));
  assert.ok(header.startsWith('%PDF-1.4'));

  const doc = await pdfjsLib.getDocument({ data: bytes, verbosity: 0 }).promise;
  assert.equal(doc.numPages, 12);

  const pages: PageData[] = [];
  const OPS = pdfjsLib.OPS;

  for (let p = 1; p <= doc.numPages; p += 1) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    let textCharCount = 0;
    const textItems: RectBox[] = [];
    const lineBuckets = new Map<number, string>();

    for (const item of textContent.items) {
      if (!('str' in item)) continue;
      const trimmed = item.str.trim();
      textCharCount += trimmed.length;
      if (trimmed.length > 0) {
        const yFromTop = viewport.height - item.transform[5] - (item.height || 10);
        textItems.push({
          x: item.transform[4],
          y: yFromTop,
          w: item.width || 0,
          h: item.height || 10,
        });
        const bucketY = Math.round(yFromTop / 4) * 4;
        lineBuckets.set(bucketY, `${lineBuckets.get(bucketY) ?? ''} ${item.str}`);
      }
    }

    let equationLines = 0;
    for (const line of lineBuckets.values()) {
      if (/[A-Za-z0-9]\s*=\s*[A-Za-z0-9]/.test(line)) equationLines += 1;
    }

    const opList = await page.getOperatorList();
    const stack: number[][] = [];
    let ctm = [1, 0, 0, 1, 0, 0];
    const images: RectBox[] = [];

    for (let i = 0; i < opList.fnArray.length; i += 1) {
      const fn = opList.fnArray[i];
      const args = opList.argsArray[i];
      if (fn === OPS.save) stack.push([...ctm]);
      else if (fn === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
      else if (fn === OPS.transform && Array.isArray(args)) ctm = multiplyMatrices(ctm, args as number[]);
      else if (fn === OPS.paintImageXObject) {
        const corners = [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ].map(([ux, uy]) => [ctm[0] * ux + ctm[2] * uy + ctm[4], ctm[1] * ux + ctm[3] * uy + ctm[5]]);
        const xs = corners.map((c) => c[0]);
        const ys = corners.map((c) => c[1]);
        images.push({
          x: Math.min(...xs),
          y: viewport.height - Math.max(...ys),
          w: Math.max(...xs) - Math.min(...xs),
          h: Math.max(...ys) - Math.min(...ys),
        });
      }
    }

    pages.push({
      page: p,
      width: viewport.width,
      height: viewport.height,
      textCharCount,
      textItems,
      images,
      mathText: { strongChars: 0, equationLines },
      tags: { hasStructTree: false, figureAlts: [] },
    });
    page.cleanup();
  }

  const scored = scoreDocument(pages, DEFAULT_CONFIG);
  assert.equal(scored.header.pagesScanned, 12);
  assert.equal(scored.header.cannotAnalyze, 1); // Page 10 scan
  assert.deepEqual(scored.cannotAnalyzePages, [10]);
  assert.equal(scored.header.flaggedTotal, 5); // Pages 3, 4, 5, 6, 7
  assert.deepEqual(
    scored.rows.map((r) => [r.page, r.verdict, r.suspectedCount]),
    [
      [7, 'ESCALATE', 6],
      [6, 'FIX NOW', 3],
      [3, 'FIX NOW', 2],
      [4, 'ESCALATE', 1],
      [5, 'FIX LATER', 1],
    ],
  );
  assert.ok(scored.notices.some((n) => n.includes('Math found as text on 1 page')));
});
