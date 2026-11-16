import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from './config';
import { scoreDocument } from './scoring';
import {
  applyEquationAltEdit,
  applyPageNoteEdit,
  applyStatusEdit,
  buildEditedExportText,
  countEditedPages,
  createEmptyReviewState,
  isPageEdited,
  resetPageEdits,
  undoLastEdit,
} from './reviewState';
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

test('applies status overrides, alt-text drafts, notes, and supports undo and reset', () => {
  let state = createEmptyReviewState();
  assert.equal(countEditedPages(state), 0);

  state = applyStatusEdit(state, 3, 'VERIFIED', 'FIX NOW');
  assert.equal(countEditedPages(state), 1);
  assert.equal(isPageEdited(3, state), true);

  state = applyEquationAltEdit(state, 3, 'Eq-01', 'Integral of e to the minus x squared dx');
  state = applyPageNoteEdit(state, 3, 'Checked with MathJax template');
  assert.equal(state.pages[3]?.equationAlts['Eq-01'], 'Integral of e to the minus x squared dx');
  assert.equal(state.pages[3]?.pageNote, 'Checked with MathJax template');

  // Undo note edit
  state = undoLastEdit(state);
  assert.equal(state.pages[3]?.pageNote, '');
  assert.equal(state.pages[3]?.equationAlts['Eq-01'], 'Integral of e to the minus x squared dx');

  // Reset entire page
  state = resetPageEdits(state, 3);
  assert.equal(countEditedPages(state), 0);
  assert.equal(isPageEdited(3, state), false);

  // Undo reset restores prior edits
  state = undoLastEdit(state);
  assert.equal(countEditedPages(state), 1);
  assert.equal(state.pages[3]?.statusOverride, 'VERIFIED');
});

test('setting status back to base status clears redundant status override', () => {
  let state = createEmptyReviewState();
  state = applyStatusEdit(state, 4, 'VERIFIED', 'ESCALATE');
  assert.equal(isPageEdited(4, state), true);

  state = applyStatusEdit(state, 4, 'ESCALATE', 'ESCALATE');
  assert.equal(isPageEdited(4, state), false);
  assert.equal(countEditedPages(state), 0);
});

test('buildEditedExportText includes human review edits and preserves honesty line', () => {
  const clearImg = { x: 200, y: 380, w: 212, h: 36 };
  const result = scoreDocument([makeBasePage(2, { images: [clearImg, clearImg] })], DEFAULT_CONFIG);

  let state = createEmptyReviewState();
  state = applyStatusEdit(state, 2, 'VERIFIED', 'FIX NOW');
  state = applyEquationAltEdit(state, 2, 'Eq-01', 'y equals m x plus b');
  state = applyPageNoteEdit(state, 2, 'Confirmed alt text with author');

  const txt = buildEditedExportText(
    result,
    {
      fileName: 'algebra.pdf',
      pageCount: 1,
      generatedAt: '2026-11-16 10:30',
    },
    state,
    DEFAULT_CONFIG,
  );

  assert.ok(txt.includes(DEFAULT_CONFIG.honestyLine));
  assert.ok(txt.includes('Human Review Edits & Drafted Alt-Text:'));
  assert.ok(txt.includes('- p.2 [FIX NOW -> VERIFIED]'));
  assert.ok(txt.includes('Alt-Text (Eq-01): y equals m x plus b'));
  assert.ok(txt.includes('Note: Confirmed alt text with author'));
});
