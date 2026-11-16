import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from './config';
import { buildExportText, isUsableAltText, scoreDocument } from './scoring';
import type { PageData } from './types';

function makeBasePage(page: number, overrides: Partial<PageData> = {}): PageData {
  return {
    page,
    width: 612,
    height: 792,
    textCharCount: 450,
    textItems: [{ x: 72, y: 120, w: 468, h: 14 }],
    images: [],
    mathText: { strongChars: 0, equationLines: 0 },
    tags: { hasStructTree: false, figureAlts: [] },
    ...overrides,
  };
}

test('identifies scan / low-text pages as cannot analyze and never flags them', () => {
  const pages: PageData[] = [
    makeBasePage(1, { textCharCount: 5 }),
    makeBasePage(2, {
      textCharCount: 250,
      images: [{ x: 0, y: 0, w: 600, h: 750 }], // > 80% area
    }),
  ];

  const result = scoreDocument(pages, DEFAULT_CONFIG);
  assert.equal(result.header.pagesScanned, 2);
  assert.equal(result.header.cannotAnalyze, 2);
  assert.equal(result.header.flaggedTotal, 0);
  assert.deepEqual(result.cannotAnalyzePages, [1, 2]);
  assert.ok(result.notChecked.some((line) => line.includes('Pages not listed were not confirmed accessible.')));
});

test('ignores tiny logos (<10pt) and skips large diagrams (>35% area)', () => {
  const pages: PageData[] = [
    makeBasePage(1, {
      images: [
        { x: 50, y: 50, w: 8, h: 8 }, // ignore
        { x: 60, y: 150, w: 450, h: 420 }, // ~39% area -> large diagram
      ],
    }),
  ];

  const result = scoreDocument(pages, DEFAULT_CONFIG);
  assert.equal(result.header.flaggedTotal, 0);
  assert.ok(result.notChecked.some((line) => line.includes('Large images skipped') && line.includes('1')));
});

test('applies verdict rules (Fix later = 1 clear, Fix now = 2-5 clear, Escalate = 6+ or ambiguous)', () => {
  const clearImg = { x: 200, y: 380, w: 212, h: 36 }; // centered, thin, wide
  const ambiguousImg = { x: 420, y: 300, w: 120, h: 110 }; // tall/right, not inline

  const pages: PageData[] = [
    makeBasePage(1, { images: [clearImg] }), // 1 clear -> FIX LATER
    makeBasePage(2, { images: [clearImg, clearImg, clearImg] }), // 3 clear -> FIX NOW
    makeBasePage(3, { images: [clearImg, clearImg, clearImg, clearImg, clearImg, clearImg] }), // 6 clear -> ESCALATE
    makeBasePage(4, { images: [clearImg, ambiguousImg] }), // 1 clear + 1 ambiguous -> ESCALATE
  ];

  const result = scoreDocument(pages, DEFAULT_CONFIG);
  assert.equal(result.header.flaggedTotal, 4);
  assert.equal(result.header.fixNowCount, 1);
  assert.equal(result.header.fixLaterCount, 1);
  assert.equal(result.header.escalateCount, 2);

  // Ranking: suspectedCount desc -> p3 (6), p2 (3), p4 (2), p1 (1)
  assert.deepEqual(
    result.rows.map((r) => [r.page, r.verdict, r.suspectedCount]),
    [
      [3, 'ESCALATE', 6],
      [2, 'FIX NOW', 3],
      [4, 'ESCALATE', 2],
      [1, 'FIX LATER', 1],
    ],
  );
});

test('tie order is deterministic: suspectedCount desc, Fix now -> Escalate -> Fix later, page asc', () => {
  const clearImg = { x: 200, y: 380, w: 212, h: 36 };
  const ambiguousImg = { x: 420, y: 300, w: 120, h: 110 };

  const pages: PageData[] = [
    makeBasePage(5, { images: [clearImg, ambiguousImg] }), // 2 suspected, ESCALATE
    makeBasePage(4, { images: [clearImg, clearImg] }), // 2 suspected, FIX NOW
    makeBasePage(2, { images: [clearImg, clearImg] }), // 2 suspected, FIX NOW
  ];

  const run1 = scoreDocument(pages, DEFAULT_CONFIG);
  const run2 = scoreDocument(pages, DEFAULT_CONFIG);
  assert.deepEqual(run1, run2);
  assert.deepEqual(
    run1.rows.map((r) => [r.page, r.verdict]),
    [
      [2, 'FIX NOW'],
      [4, 'FIX NOW'],
      [5, 'ESCALATE'],
    ],
  );
});

test('filters out junk alt text and subtracts usable alt text from clear images first', () => {
  assert.equal(isUsableAltText(null), false);
  assert.equal(isUsableAltText('  '), false);
  assert.equal(isUsableAltText('eq'), false);
  assert.equal(isUsableAltText('image'), false);
  assert.equal(isUsableAltText('eq_04.png'), false);
  assert.equal(isUsableAltText('Integral from minus infinity to infinity of e to the minus x squared'), true);

  const clearImg = { x: 200, y: 380, w: 212, h: 36 };
  const pages: PageData[] = [
    makeBasePage(1, {
      images: [clearImg, clearImg],
      tags: {
        hasStructTree: true,
        figureAlts: ['image', 'eq1.png', 'Sum of x from 1 to n'], // only 1 usable
      },
    }),
  ];

  const result = scoreDocument(pages, DEFAULT_CONFIG);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].suspectedCount, 1);
  assert.equal(result.rows[0].verdict, 'FIX LATER');
});

test('adds text-math notice when equations appear as text characters', () => {
  const pages: PageData[] = [
    makeBasePage(1, { mathText: { strongChars: 12, equationLines: 4 } }),
  ];

  const result = scoreDocument(pages, DEFAULT_CONFIG);
  assert.equal(result.header.flaggedTotal, 0);
  assert.equal(result.notices.length, 1);
  assert.match(result.notices[0], /Math found as text on 1 page/);
});

test('export text matches on-screen row order, verdicts, and includes honesty line', () => {
  const clearImg = { x: 200, y: 380, w: 212, h: 36 };
  const pages: PageData[] = [
    makeBasePage(7, { images: [clearImg, clearImg, clearImg] }),
    makeBasePage(2, { textCharCount: 0 }),
  ];

  const result = scoreDocument(pages, DEFAULT_CONFIG);
  const exported = buildExportText(result, {
    fileName: 'physics_ch2.pdf',
    pageCount: 2,
    generatedAt: '2026-11-16 09:45',
  });

  assert.ok(exported.includes('EquationFirst list: physics_ch2.pdf'));
  assert.ok(exported.includes(DEFAULT_CONFIG.honestyLine));
  assert.ok(exported.includes('1. p.7 · middle of page, centered · 3 images that look like equations, no text alternative · FIX NOW'));
  assert.ok(exported.includes('What was not checked:'));
});
