import React from 'react';
import { DEFAULT_CONFIG } from '../engine/config';
import { getEffectivePageStatus } from '../engine/reviewState';
import type {
  DocumentReviewState,
  PageStatus,
  PageSummaryItem,
  ScoringResult,
} from '../engine/types';

export type ReferenceTabId = 'ranked' | 'textmath' | 'notchecked' | 'alttext';

interface AuditReferenceModalProps {
  open: boolean;
  activeTab: ReferenceTabId;
  onSelectTab: (tab: ReferenceTabId) => void;
  onClose: () => void;
  result: ScoringResult;
  selectedPage: number;
  activePageSummary?: PageSummaryItem;
  textMathDetectedPages: PageSummaryItem[];
  reviewState: DocumentReviewState;
  onJumpToPage: (page: number) => void;
  onDownloadTxt: () => void;
}

const TABS: Array<{ id: ReferenceTabId; label: string }> = [
  { id: 'ranked', label: 'Ranked List' },
  { id: 'textmath', label: 'Text-Math' },
  { id: 'notchecked', label: 'Not Checked' },
  { id: 'alttext', label: 'Alt-Text Rules' },
];

function renderStatusBadge(status: PageStatus) {
  const styles: Record<PageStatus, string> = {
    'FIX NOW': 'bg-secondary text-on-secondary border-primary',
    'FIX LATER': 'bg-[#faf3e0] text-[#8c6d1f] border-[#8c6d1f]/50',
    ESCALATE: 'bg-[#ffdad3] text-primary border-primary',
    UNANALYZED: 'bg-surface text-on-surface-variant border-outline-variant',
    VERIFIED: 'bg-emerald-200 text-emerald-950 border-emerald-700',
    PASS: 'bg-emerald-100 text-emerald-900 border-emerald-500',
  };
  return (
    <span
      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${styles[status]}`}
    >
      {status === 'PASS' ? 'Pass' : status}
    </span>
  );
}

export const AuditReferenceModal: React.FC<AuditReferenceModalProps> = ({
  open,
  activeTab,
  onSelectTab,
  onClose,
  result,
  selectedPage,
  activePageSummary,
  textMathDetectedPages,
  reviewState,
  onJumpToPage,
  onDownloadTxt,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-primary/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reference-modal-title"
    >
      <div className="bg-surface-container-lowest border-2 border-primary rounded-xl shadow-ink-xl max-w-2xl w-full max-h-[86vh] flex flex-col overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b-2 border-primary bg-surface flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="reference-modal-title"
              className="font-headline-md text-lg font-bold text-primary truncate"
            >
              Audit Reference &amp; Limits
            </h2>
            <p className="font-mono text-[11px] text-on-surface-variant mt-0.5 tabular-nums">
              Profile: Equations-Only Triage · {result.header.pagesScanned} scanned ·{' '}
              {result.header.cannotAnalyze} unanalyzed · {result.header.flaggedTotal} flagged
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit reference dialog"
            className="min-h-[40px] min-w-[40px] w-9 h-9 rounded-lg border-2 border-primary bg-surface-container-lowest hover:bg-[#ffdad3] flex items-center justify-center cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="px-4 sm:px-5 py-2 border-b border-primary/25 bg-surface-container-low flex flex-wrap gap-1.5 font-mono text-xs">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`min-h-[36px] px-3 py-1 rounded-md border font-bold cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#ffdad3] border-primary text-primary'
                    : 'bg-surface-container-lowest border-primary/25 text-on-surface-variant hover:text-primary'
                }`}
              >
                {tab.label}
                {tab.id === 'textmath' && textMathDetectedPages.length > 0
                  ? ` (${textMathDetectedPages.length})`
                  : ''}
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {activeTab === 'ranked' && (
            <div>
              {result.rows.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  0 pages flagged for suspected image-only equations.
                </p>
              ) : (
                <ol className="divide-y divide-primary/15 border border-primary/25 rounded-lg overflow-hidden">
                  {result.rows.map((row, idx) => {
                    const summary = result.pageSummaries.find((p) => p.page === row.page);
                    const eff = summary ? getEffectivePageStatus(summary, reviewState) : row.verdict;
                    return (
                      <li key={row.page} className="p-3 bg-surface-container-low flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onJumpToPage(row.page);
                              onClose();
                            }}
                            className="font-mono text-xs font-bold text-primary hover:text-secondary underline cursor-pointer text-left"
                          >
                            {idx + 1}. Page {row.page} · {row.locationCue}
                          </button>
                          {renderStatusBadge(eff)}
                        </div>
                        <div className="text-xs text-primary font-medium">{row.reason}</div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}

          {activeTab === 'textmath' && (
            <div className="space-y-3">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Math stored as selectable Unicode text can still fail in screen readers if symbols are dropped or read out of order. Listen to one sample page with a screen reader.
              </p>
              {textMathDetectedPages.length === 0 ? (
                <p className="text-xs font-mono text-on-surface-variant">
                  No pages met the selectable text-math threshold in this PDF.
                </p>
              ) : (
                <div className="divide-y divide-primary/15 border border-primary/25 rounded-lg overflow-hidden">
                  {textMathDetectedPages.map((p) => (
                    <div
                      key={p.page}
                      className="p-3 bg-surface-container-low flex items-center justify-between gap-2"
                    >
                      <div className="font-mono text-xs">
                        <span className="font-bold text-primary">Page {p.page}</span>
                        <span className="text-on-surface-variant ml-2">
                          {p.mathText.strongChars} math symbols · {p.mathText.equationLines} eq lines
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onJumpToPage(p.page);
                          onClose();
                        }}
                        className="min-h-[34px] px-2.5 py-1 rounded border border-primary bg-surface-container-lowest hover:bg-[#ffdad3] font-mono text-[11px] font-bold text-primary cursor-pointer"
                      >
                        Go to Page
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notchecked' && (
            <ul className="list-disc pl-5 space-y-2 text-xs text-on-surface-variant font-mono">
              {result.notChecked.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}

          {activeTab === 'alttext' && (
            <div className="space-y-3 text-xs">
              <div className="font-mono text-on-surface-variant space-y-1 pb-2 border-b border-primary/15">
                <div>
                  Page {selectedPage} Structure Tree:{' '}
                  <strong className="text-primary">
                    {activePageSummary?.hasStructTree ? 'Present' : 'Missing'}
                  </strong>
                </div>
                <div>
                  &lt;Figure&gt; alt strings found:{' '}
                  <strong className="text-primary">{activePageSummary?.figureAltsCount ?? 0}</strong>{' '}
                  ({activePageSummary?.usableAltsCount ?? 0} usable)
                </div>
              </div>
              <p className="text-on-surface-variant">
                Alt text under {DEFAULT_CONFIG.minAltTextLength} characters or matching placeholder words/filenames is treated as missing:
              </p>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                {DEFAULT_CONFIG.junkAltWords.map((word) => (
                  <span
                    key={word}
                    className="px-2 py-0.5 rounded bg-surface-container border border-primary/25 text-primary"
                  >
                    &ldquo;{word}&rdquo;
                  </span>
                ))}
                {DEFAULT_CONFIG.junkAltExtensions.map((ext) => (
                  <span
                    key={ext}
                    className="px-2 py-0.5 rounded bg-[#ffdad3]/60 border border-primary/25 text-secondary"
                  >
                    *{ext}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-[#ffdad3]/45 border border-primary/40 text-xs text-primary leading-relaxed">
            {DEFAULT_CONFIG.honestyLine}
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-primary/25 bg-surface flex justify-end gap-2">
          <button
            type="button"
            onClick={onDownloadTxt}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-[#ffdad3] text-primary border-2 border-primary font-mono text-xs font-bold cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">download</span>
            <span>Export Report (.txt)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 py-1.5 rounded-lg bg-primary text-on-primary border-2 border-primary font-mono text-xs font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
