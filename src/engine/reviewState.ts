import { DEFAULT_CONFIG, type EquationFirstConfig } from './config';
import { buildExportText } from './scoring';
import type {
  DocumentReviewState,
  ExportMeta,
  PageReviewEdits,
  PageStatus,
  PageSummaryItem,
  ScoringResult,
} from './types';

export interface OpenDocumentSummary {
  id: string;
  name: string;
  pages: number;
  flagged: number;
  editedCount: number;
}

const MAX_HISTORY_STEPS = 40;

export function createEmptyReviewState(): DocumentReviewState {
  return {
    pages: {},
    history: [],
  };
}

function getOrCreatePageEdit(
  pages: Record<number, PageReviewEdits>,
  page: number,
): PageReviewEdits {
  return (
    pages[page] ?? {
      pageNote: '',
      equationAlts: {},
    }
  );
}

function hasMeaningfulPageEdit(edit: PageReviewEdits | undefined): boolean {
  if (!edit) return false;
  if (edit.statusOverride !== undefined) return true;
  if (edit.pageNote.trim().length > 0) return true;
  return Object.values(edit.equationAlts).some((val) => val.trim().length > 0);
}

function pushSnapshot(
  state: DocumentReviewState,
  nextPages: Record<number, PageReviewEdits>,
): DocumentReviewState {
  const cleanedPages: Record<number, PageReviewEdits> = {};
  for (const [k, v] of Object.entries(nextPages)) {
    const pageNum = Number(k);
    if (hasMeaningfulPageEdit(v)) {
      cleanedPages[pageNum] = v;
    }
  }

  const nextHistory = [...state.history, state.pages].slice(-MAX_HISTORY_STEPS);
  return {
    pages: cleanedPages,
    history: nextHistory,
  };
}

export function applyStatusEdit(
  state: DocumentReviewState,
  page: number,
  nextStatus: PageStatus,
  baseStatus: PageStatus,
): DocumentReviewState {
  const prev = getOrCreatePageEdit(state.pages, page);
  const resolvedOverride = nextStatus === baseStatus ? undefined : nextStatus;
  if (prev.statusOverride === resolvedOverride) return state;

  const updatedPage: PageReviewEdits = {
    ...prev,
    statusOverride: resolvedOverride,
  };
  return pushSnapshot(state, { ...state.pages, [page]: updatedPage });
}

export function applyEquationAltEdit(
  state: DocumentReviewState,
  page: number,
  eqId: string,
  altText: string,
): DocumentReviewState {
  const prev = getOrCreatePageEdit(state.pages, page);
  if ((prev.equationAlts[eqId] ?? '') === altText) return state;

  const nextAlts = { ...prev.equationAlts };
  if (altText.length === 0) {
    delete nextAlts[eqId];
  } else {
    nextAlts[eqId] = altText;
  }

  return pushSnapshot(state, {
    ...state.pages,
    [page]: {
      ...prev,
      equationAlts: nextAlts,
    },
  });
}

export function applyPageNoteEdit(
  state: DocumentReviewState,
  page: number,
  note: string,
): DocumentReviewState {
  const prev = getOrCreatePageEdit(state.pages, page);
  if (prev.pageNote === note) return state;

  return pushSnapshot(state, {
    ...state.pages,
    [page]: {
      ...prev,
      pageNote: note,
    },
  });
}

export function resetPageEdits(
  state: DocumentReviewState,
  page: number,
): DocumentReviewState {
  if (!hasMeaningfulPageEdit(state.pages[page])) return state;
  const nextPages = { ...state.pages };
  delete nextPages[page];
  return pushSnapshot(state, nextPages);
}

export function resetAllEdits(state: DocumentReviewState): DocumentReviewState {
  if (Object.keys(state.pages).length === 0) return state;
  return pushSnapshot(state, {});
}

export function undoLastEdit(state: DocumentReviewState): DocumentReviewState {
  if (state.history.length === 0) return state;
  const previousPages = state.history[state.history.length - 1];
  return {
    pages: previousPages,
    history: state.history.slice(0, -1),
  };
}

export function getEffectivePageStatus(
  item: PageSummaryItem,
  state: DocumentReviewState,
): PageStatus {
  return state.pages[item.page]?.statusOverride ?? item.status;
}

export function isPageEdited(
  page: number,
  state: DocumentReviewState,
): boolean {
  return hasMeaningfulPageEdit(state.pages[page]);
}

export function countEditedPages(state: DocumentReviewState): number {
  return Object.keys(state.pages).filter((k) =>
    hasMeaningfulPageEdit(state.pages[Number(k)]),
  ).length;
}

export function buildEditedExportText(
  result: ScoringResult,
  meta: ExportMeta,
  reviewState: DocumentReviewState,
  config: EquationFirstConfig = DEFAULT_CONFIG,
): string {
  const baseText = buildExportText(result, meta, config);
  const editedPageNums = Object.keys(reviewState.pages)
    .map(Number)
    .filter((p) => hasMeaningfulPageEdit(reviewState.pages[p]))
    .sort((a, b) => a - b);

  if (editedPageNums.length === 0) {
    return baseText;
  }

  const lines: string[] = [baseText, '', 'Human Review Edits & Drafted Alt-Text:'];
  for (const pageNum of editedPageNums) {
    const edit = reviewState.pages[pageNum];
    const baseSummary = result.pageSummaries.find((p) => p.page === pageNum);
    const statusLabel = edit.statusOverride
      ? `${baseSummary?.status ?? 'UNLISTED'} -> ${edit.statusOverride}`
      : `${baseSummary?.status ?? 'UNLISTED'} (status unchanged)`;
    lines.push(`- p.${pageNum} [${statusLabel}]`);

    const altEntries = Object.entries(edit.equationAlts).filter(
      ([, txt]) => txt.trim().length > 0,
    );
    for (const [eqId, txt] of altEntries) {
      lines.push(`  Alt-Text (${eqId}): ${txt.trim()}`);
    }
    if (edit.pageNote.trim().length > 0) {
      lines.push(`  Note: ${edit.pageNote.trim()}`);
    }
  }

  return lines.join('\n');
}
