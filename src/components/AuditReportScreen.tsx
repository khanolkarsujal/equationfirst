import React, { useEffect, useRef, useState } from 'react';
import type * as pdfjsLib from 'pdfjs-dist';
import { DEFAULT_CONFIG } from '../engine/config';
import { renderPdfPageToCanvas } from '../engine/pdfExtractor';
import {
  applyEquationAltEdit,
  applyPageNoteEdit,
  applyStatusEdit,
  buildEditedExportText,
  countEditedPages,
  getEffectivePageStatus,
  isPageEdited,
  type OpenDocumentSummary,
  resetAllEdits,
  resetPageEdits,
  undoLastEdit,
} from '../engine/reviewState';
import type {
  DocumentReviewState,
  PageStatus,
  PageSummaryItem,
  ScoringResult,
} from '../engine/types';
import { AuditReferenceModal, type ReferenceTabId } from './AuditReferenceModal';

interface AuditReportScreenProps {
  activeFileId: string;
  fileName: string;
  result: ScoringResult;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  openFiles: OpenDocumentSummary[];
  reviewState: DocumentReviewState;
  onChangeReviewState: (next: DocumentReviewState) => void;
  onSwitchFile: (id: string) => void;
  onAddFiles: (files: FileList) => void;
  onLoadSample: () => void;
  onCloseFile: (id: string) => void;
  onUploadAnother: () => void;
}

type PageFilterId = 'ALL' | 'FLAGGED' | 'FIX NOW' | 'ESCALATE';
type MobileTabId = 'pages' | 'preview' | 'edit';
type ZoomLevel = 'Fit' | '75%' | '100%' | '125%' | '150%';

const ZOOM_LEVELS: ZoomLevel[] = ['Fit', '75%', '100%', '125%', '150%'];

const STATUS_CHOICES: Array<{ value: PageStatus; label: string }> = [
  { value: 'FIX NOW', label: 'Fix Now' },
  { value: 'FIX LATER', label: 'Fix Later' },
  { value: 'ESCALATE', label: 'Escalate' },
  { value: 'VERIFIED', label: 'Verified' },
];

export const AuditReportScreen: React.FC<AuditReportScreenProps> = ({
  activeFileId,
  fileName,
  result,
  pdfDoc,
  openFiles,
  reviewState,
  onChangeReviewState,
  onSwitchFile,
  onAddFiles,
  onLoadSample,
  onCloseFile,
  onUploadAnother,
}) => {
  const resultsHeadingRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPage, setSelectedPage] = useState<number>(() => {
    const p4 = result.pageSummaries.find((p) => p.page === 4 && p.status !== 'PASS');
    if (p4) return 4;
    return result.rows[0]?.page ?? 1;
  });
  const [selectedEqId, setSelectedEqId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('Fit');
  const [highlightBounds, setHighlightBounds] = useState<boolean>(true);
  const [pageFilter, setPageFilter] = useState<PageFilterId>('ALL');

  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(true);
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(true);
  const [showFileMenu, setShowFileMenu] = useState<boolean>(false);

  const [showRefModal, setShowRefModal] = useState<boolean>(false);
  const [refTab, setRefTab] = useState<ReferenceTabId>('ranked');
  const [mobileTab, setMobileTab] = useState<MobileTabId>('preview');

  // Keep selectedPage valid when switching files
  useEffect(() => {
    const maxPage = Math.max(1, result.header.pagesScanned);
    const preferred =
      result.pageSummaries.find((p) => p.page === 4 && p.status !== 'PASS')?.page ??
      result.rows[0]?.page ??
      1;
    setSelectedPage((prev) => (prev >= 1 && prev <= maxPage ? prev : preferred));
    setSelectedEqId(null);
  }, [activeFileId, result]);

  useEffect(() => {
    resultsHeadingRef.current?.focus();
  }, []);

  // Close file dropdown on outside click or Escape
  useEffect(() => {
    if (!showFileMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setShowFileMenu(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFileMenu(false);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showFileMenu]);

  // Render active PDF page into canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    const scaleMap: Record<ZoomLevel, number> = {
      Fit: 1.25,
      '75%': 0.9,
      '100%': 1.2,
      '125%': 1.5,
      '150%': 1.85,
    };
    renderPdfPageToCanvas(pdfDoc, selectedPage, canvasRef.current, scaleMap[zoomLevel]).catch(
      () => {
        // Ignore transient render cancellation
      },
    );
  }, [pdfDoc, selectedPage, zoomLevel, mobileTab, showLeftSidebar, showRightSidebar]);

  const totalPages = result.header.pagesScanned;
  const activePageSummary =
    result.pageSummaries.find((p) => p.page === selectedPage) ?? result.pageSummaries[0];

  const activeEffectiveStatus = activePageSummary
    ? getEffectivePageStatus(activePageSummary, reviewState)
    : 'PASS';

  const activePageEdited = isPageEdited(selectedPage, reviewState);
  const editedPagesCount = countEditedPages(reviewState);
  const activePageEdits = reviewState.pages[selectedPage];

  const candidateEquations = (activePageSummary?.images ?? []).filter(
    (img) => img.category === 'clear' || img.category === 'ambiguous',
  );

  useEffect(() => {
    if (candidateEquations.length === 0) {
      setSelectedEqId(null);
    } else if (!selectedEqId || !candidateEquations.some((c) => c.id === selectedEqId)) {
      setSelectedEqId(candidateEquations[0].id);
    }
  }, [selectedPage, activeFileId, candidateEquations.length]);

  const textMathDetectedPages = result.pageSummaries.filter(
    (p) =>
      p.status !== 'UNANALYZED' &&
      (p.mathText.strongChars >= DEFAULT_CONFIG.textMathMinStrongChars ||
        p.mathText.equationLines >= DEFAULT_CONFIG.textMathMinEqLines),
  );

  // Live summary counts reflecting edits
  const fixNowLive = result.pageSummaries.filter(
    (p) => getEffectivePageStatus(p, reviewState) === 'FIX NOW',
  ).length;
  const fixLaterLive = result.pageSummaries.filter(
    (p) => getEffectivePageStatus(p, reviewState) === 'FIX LATER',
  ).length;
  const escalateLive = result.pageSummaries.filter(
    (p) => getEffectivePageStatus(p, reviewState) === 'ESCALATE',
  ).length;
  const unanalyzedLive = result.pageSummaries.filter(
    (p) => getEffectivePageStatus(p, reviewState) === 'UNANALYZED',
  ).length;
  const flaggedLiveCount = fixNowLive + fixLaterLive + escalateLive;

  const filteredPages = result.pageSummaries.filter((p) => {
    const eff = getEffectivePageStatus(p, reviewState);
    if (pageFilter === 'FLAGGED') {
      return eff === 'FIX NOW' || eff === 'FIX LATER' || eff === 'ESCALATE' || eff === 'UNANALYZED';
    }
    if (pageFilter === 'FIX NOW') {
      return eff === 'FIX NOW' || eff === 'FIX LATER';
    }
    if (pageFilter === 'ESCALATE') {
      return eff === 'ESCALATE';
    }
    return true;
  });

  const handleDownloadTxt = () => {
    const now = new Date();
    const generatedAt = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    const txt = buildEditedExportText(
      result,
      {
        fileName,
        pageCount: totalPages,
        generatedAt,
      },
      reviewState,
      DEFAULT_CONFIG,
    );
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const cleanName = fileName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
    a.href = url;
    a.download = `equationfirst_${cleanName}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleJumpToNextFlagged = (current = selectedPage) => {
    const remainingFlagged = result.pageSummaries.filter((p) => {
      const st = getEffectivePageStatus(p, reviewState);
      return st === 'FIX NOW' || st === 'FIX LATER' || st === 'ESCALATE';
    });
    if (remainingFlagged.length === 0) return;
    const after = remainingFlagged.find((p) => p.page > current);
    const target = after ?? remainingFlagged[0];
    setSelectedPage(target.page);
  };

  const handleVerifyAndNext = () => {
    if (!activePageSummary) return;
    const nextState = applyStatusEdit(
      reviewState,
      activePageSummary.page,
      'VERIFIED',
      activePageSummary.status,
    );
    onChangeReviewState(nextState);

    const nextCandidate =
      result.pageSummaries.find((p) => {
        if (p.page <= activePageSummary.page) return false;
        const st = getEffectivePageStatus(p, nextState);
        return st === 'FIX NOW' || st === 'FIX LATER' || st === 'ESCALATE';
      }) ??
      result.pageSummaries.find((p) => {
        if (p.page === activePageSummary.page) return false;
        const st = getEffectivePageStatus(p, nextState);
        return st === 'FIX NOW' || st === 'FIX LATER' || st === 'ESCALATE';
      });
    if (nextCandidate) {
      setSelectedPage(nextCandidate.page);
    }
  };

  const stepZoom = (dir: -1 | 1) => {
    const idx = ZOOM_LEVELS.indexOf(zoomLevel);
    const nextIdx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, idx + dir));
    setZoomLevel(ZOOM_LEVELS[nextIdx]);
  };

  const padPage = (p: number) => String(p).padStart(2, '0');

  const renderStatusTag = (status: PageStatus) => {
    const labels: Record<PageStatus, string> = {
      'FIX NOW': 'Fix Now',
      'FIX LATER': 'Fix Later',
      ESCALATE: 'Escalate',
      UNANALYZED: 'Scan',
      VERIFIED: 'Verified',
      PASS: 'Pass',
    };
    const colors: Record<PageStatus, string> = {
      'FIX NOW': 'bg-secondary text-on-secondary border-primary',
      'FIX LATER': 'bg-[#faf3e0] text-[#8c6d1f] border-[#8c6d1f]/50',
      ESCALATE: 'bg-[#ffdad3] text-primary border-primary',
      UNANALYZED: 'bg-surface text-on-surface-variant border-outline-variant',
      VERIFIED: 'bg-emerald-200 text-emerald-950 border-emerald-700',
      PASS: 'text-emerald-800 border-transparent bg-transparent',
    };
    return (
      <span
        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${colors[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const activeEqObj =
    candidateEquations.find((c) => c.id === selectedEqId) ?? candidateEquations[0] ?? null;

  return (
    <div
      ref={resultsHeadingRef}
      tabIndex={-1}
      className="w-full bg-surface text-on-surface antialiased selection:bg-[#ffdad3] selection:text-primary md:h-screen md:overflow-hidden min-h-screen flex flex-col outline-none"
    >
      {/* Hidden input for adding more PDFs directly inside the workspace */}
      <input
        ref={addFileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAddFiles(e.target.files);
            setShowFileMenu(false);
          }
          e.target.value = '';
        }}
      />

      {/* TOP SOFTWARE APPLICATION BAR (Full-Bleed Edge-to-Edge) */}
      <header className="w-full h-12 bg-surface-container-lowest border-b-2 border-primary px-2 sm:px-3 flex items-center justify-between gap-2 shrink-0 sticky top-0 md:static z-30">
        {/* Left: Sidebar Toggle + Brand + File Manager Switcher */}
        <div className="flex-1 flex items-center gap-1 sm:gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setShowLeftSidebar((s) => !s)}
            aria-label={showLeftSidebar ? 'Hide pages sidebar' : 'Show pages sidebar'}
            aria-pressed={showLeftSidebar}
            title={showLeftSidebar ? 'Hide pages sidebar' : 'Show pages sidebar'}
            className={`hidden md:inline-flex w-9 h-9 rounded-md border items-center justify-center cursor-pointer transition-colors shrink-0 ${
              showLeftSidebar
                ? 'bg-[#ffdad3] border-primary text-primary'
                : 'bg-surface-container-low border-primary/30 text-on-surface-variant hover:text-primary hover:border-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {showLeftSidebar ? 'left_panel_close' : 'left_panel_open'}
            </span>
          </button>

          <button
            type="button"
            onClick={onUploadAnother}
            className="min-h-[40px] md:min-h-0 flex items-center gap-1.5 px-0.5 sm:px-1 cursor-pointer shrink-0"
            aria-label="Return to EquationFirst start screen"
          >
            <span className="w-7 h-7 rounded bg-[#ffdad3] border-2 border-primary flex items-center justify-center text-primary font-headline-sm font-bold text-sm select-none">
              Σ
            </span>
            <span className="hidden lg:inline font-display-md text-[17px] font-bold tracking-tight whitespace-nowrap">
              <span className="text-primary">Equation</span>
              <span className="text-secondary">First</span>
            </span>
          </button>

          <span className="hidden sm:inline-block w-px h-5 bg-primary/25 shrink-0" />

          {/* Active File Menu & File Manager */}
          <div ref={fileMenuRef} className="relative min-w-0">
            <button
              type="button"
              onClick={() => setShowFileMenu((o) => !o)}
              aria-expanded={showFileMenu}
              aria-haspopup="menu"
              className="min-h-[38px] md:min-h-[34px] flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-md border border-primary/40 hover:border-primary bg-surface-container-low text-primary font-mono text-xs font-bold cursor-pointer min-w-0 max-w-[138px] sm:max-w-[260px]"
            >
              <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">
                description
              </span>
              <span className="truncate">{fileName}</span>
              <span className="material-symbols-outlined text-[15px] text-on-surface-variant shrink-0">
                expand_more
              </span>
            </button>

            {showFileMenu && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-surface-container-lowest border-2 border-primary rounded-lg shadow-ink-lg z-50 overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-primary/20 bg-surface-container-low flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Workspace Files ({openFiles.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => addFileInputRef.current?.click()}
                    className="font-mono text-[11px] font-bold text-secondary hover:underline cursor-pointer"
                  >
                    + Open PDF
                  </button>
                </div>

                <div className="max-h-52 overflow-y-auto divide-y divide-primary/10">
                  {openFiles.map((file) => {
                    const isCurrent = file.id === activeFileId;
                    return (
                      <div
                        key={file.id}
                        className={`px-3 py-2 flex items-center justify-between gap-2 ${
                          isCurrent ? 'bg-[#ffdad3]/45' : 'hover:bg-surface-container-low'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSwitchFile(file.id);
                            setShowFileMenu(false);
                          }}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="font-mono text-xs font-bold text-primary truncate">
                            {file.name}
                          </div>
                          <div className="font-mono text-[10px] text-on-surface-variant tabular-nums">
                            {file.pages} pages · {file.flagged} flagged
                            {file.editedCount > 0 ? ` · ${file.editedCount} edited` : ''}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowFileMenu(false);
                            onCloseFile(file.id);
                          }}
                          aria-label={`Close ${file.name}`}
                          className="w-7 h-7 rounded border border-transparent hover:border-primary/40 flex items-center justify-center text-on-surface-variant hover:text-secondary cursor-pointer shrink-0"
                        >
                          <span className="material-symbols-outlined text-[15px]">close</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="p-2 border-t border-primary/20 bg-surface flex flex-col gap-1 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => addFileInputRef.current?.click()}
                    className="w-full px-2.5 py-1.5 rounded text-left hover:bg-[#ffdad3]/50 text-primary font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      upload_file
                    </span>
                    <span>Open Another PDF...</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFileMenu(false);
                      onLoadSample();
                    }}
                    className="w-full px-2.5 py-1.5 rounded text-left hover:bg-[#ffdad3]/50 text-primary font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      science
                    </span>
                    <span>Load Sample Syllabus PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFileMenu(false);
                      onUploadAnother();
                    }}
                    className="w-full px-2.5 py-1.5 rounded text-left hover:bg-surface-container-low text-on-surface-variant flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">home</span>
                    <span>Back to Dropzone</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Summary: Quiet Unboxed Tabular Text */}
        <div className="hidden lg:flex items-center gap-2 font-mono text-xs text-on-surface-variant tabular-nums whitespace-nowrap">
          <span>{totalPages} pages</span>
          <span aria-hidden="true">·</span>
          <span className="text-primary font-bold">{flaggedLiveCount} flagged</span>
          {unanalyzedLive > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>{unanalyzedLive} unanalyzed</span>
            </>
          )}
          {editedPagesCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-secondary font-bold">{editedPagesCount} edited</span>
            </>
          )}
        </div>

        {/* Right: Undo + Limits & Rules + Export + Right Sidebar Toggle */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            disabled={reviewState.history.length === 0}
            onClick={() => onChangeReviewState(undoLastEdit(reviewState))}
            aria-label="Undo last edit"
            title="Undo last edit"
            className="min-h-[38px] w-9 sm:w-auto sm:min-h-[34px] inline-flex items-center justify-center gap-1 px-0 sm:px-2.5 py-1 rounded-md border border-primary/35 bg-surface-container-low hover:bg-[#ffdad3] disabled:opacity-40 disabled:pointer-events-none text-primary font-mono text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">undo</span>
            <span className="hidden sm:inline">Undo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRefTab('ranked');
              setShowRefModal(true);
            }}
            aria-label="Audit limits and ranked summary"
            title="Audit Limits & Ranked List"
            className="min-h-[38px] w-9 sm:w-auto sm:min-h-[34px] inline-flex items-center justify-center gap-1 px-0 sm:px-2.5 py-1 rounded-md border border-primary/35 bg-surface-container-low hover:bg-[#ffdad3] text-primary font-mono text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">info</span>
            <span className="hidden xl:inline">Audit Limits</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            className="min-h-[38px] md:min-h-[34px] inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1 rounded-md border-2 border-primary bg-secondary hover:bg-[#962e1c] text-on-secondary font-mono text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRightSidebar((s) => !s)}
            aria-label={showRightSidebar ? 'Hide review editor' : 'Show review editor'}
            aria-pressed={showRightSidebar}
            title={showRightSidebar ? 'Hide review editor' : 'Show review editor'}
            className={`hidden md:inline-flex w-9 h-9 rounded-md border items-center justify-center cursor-pointer transition-colors shrink-0 ${
              showRightSidebar
                ? 'bg-[#ffdad3] border-primary text-primary'
                : 'bg-surface-container-low border-primary/30 text-on-surface-variant hover:text-primary hover:border-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {showRightSidebar ? 'right_panel_close' : 'right_panel_open'}
            </span>
          </button>
        </div>
      </header>

      {/* FULL-BLEED DOCKED SOFTWARE WORKBENCH (Zero blank outer side margins) */}
      <main className="flex-1 min-h-0 w-full flex overflow-hidden pb-14 md:pb-0">
        {/* LEFT SIDEBAR: Always anchored on Left edge, togglable */}
        <aside
          aria-label="Pages and Issues Navigator"
          className={`${mobileTab === 'pages' ? 'flex w-full' : 'hidden'} ${
            showLeftSidebar
              ? 'md:flex md:w-[196px] lg:w-[256px] xl:w-[276px]'
              : 'md:hidden'
          } bg-surface-container-lowest border-r-2 border-primary shrink-0 flex-col h-full min-h-0`}
        >
          <div className="px-3 py-2 border-b border-primary/20 flex items-center justify-between shrink-0">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
              Pages &amp; Issues
            </h2>
            <span className="font-mono text-[11px] text-on-surface-variant tabular-nums">
              {filteredPages.length}/{totalPages}
            </span>
          </div>

          {/* Compact Filter Strip */}
          <div
            role="group"
            aria-label="Filter pages"
            className="px-2 py-1.5 border-b border-primary/20 bg-surface-container-low grid grid-cols-4 gap-1 font-mono text-[10px] shrink-0"
          >
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'FLAGGED', label: 'Flagged' },
                { id: 'FIX NOW', label: 'Fix' },
                { id: 'ESCALATE', label: 'Esc' },
              ] as const
            ).map((tab) => {
              const active = pageFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPageFilter(tab.id)}
                  className={`min-h-[34px] md:min-h-[26px] rounded border font-bold cursor-pointer transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#ffdad3] border-primary text-primary'
                      : 'bg-surface-container-lowest border-primary/20 text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Flat Scrollable Page Navigator Rows */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-primary/10">
            {filteredPages.length === 0 ? (
              <div className="p-4 text-xs font-mono text-on-surface-variant text-center">
                No pages match this filter.
              </div>
            ) : (
              filteredPages.map((item) => {
                const eff = getEffectivePageStatus(item, reviewState);
                const edited = isPageEdited(item.page, reviewState);
                const isSelected = selectedPage === item.page;
                return (
                  <button
                    key={item.page}
                    type="button"
                    onClick={() => {
                      setSelectedPage(item.page);
                      setMobileTab('preview');
                    }}
                    className={`w-full min-h-[46px] md:min-h-[38px] px-3 py-1.5 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#ffdad3]/65 text-primary'
                        : 'hover:bg-surface-container-low text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`font-mono text-[11px] font-bold tabular-nums shrink-0 ${
                          isSelected ? 'text-secondary' : 'text-on-surface-variant'
                        }`}
                      >
                        P{padPage(item.page)}
                      </span>
                      <span className="text-xs truncate font-medium">
                        {item.suspectedCount > 0
                          ? `${item.suspectedCount} eq`
                          : item.status === 'UNANALYZED'
                          ? 'Scan'
                          : `Page ${item.page}`}
                      </span>
                      {edited && (
                        <span
                          title="Page edited"
                          className="font-mono text-[10px] font-bold text-secondary shrink-0"
                        >
                          <span className="lg:hidden">*</span>
                          <span className="hidden lg:inline">·Edited</span>
                        </span>
                      )}
                    </div>
                    <div className="shrink-0">{renderStatusTag(eff)}</div>
                  </button>
                );
              })
            )}
          </div>

          {/* Quiet Text-Math Link when applicable */}
          {textMathDetectedPages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setRefTab('textmath');
                setShowRefModal(true);
              }}
              className="px-3 py-2 border-t border-primary/20 bg-[#faf3e0] hover:bg-[#ffdad3] text-left font-mono text-[11px] text-primary flex items-center justify-between gap-2 cursor-pointer shrink-0"
            >
              <span className="truncate font-bold">
                Text-math on {textMathDetectedPages.length}p
              </span>
              <span className="text-secondary underline shrink-0">Check</span>
            </button>
          )}
        </aside>

        {/* CENTER WORKSPACE: Dedicated Strictly to Viewing the PDF Properly */}
        <section
          aria-label="PDF Workspace"
          className={`${
            mobileTab === 'preview' ? 'flex w-full' : 'hidden'
          } md:flex flex-1 min-w-0 h-full flex-col bg-[#e7e1d4]`}
        >
          {/* Minimal PDF Viewer Control Bar */}
          <div className="h-10 px-2 sm:px-3 bg-surface border-b border-primary/25 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                aria-label="Previous page"
                disabled={selectedPage <= 1}
                onClick={() => setSelectedPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 md:w-7 md:h-7 rounded border border-primary/40 bg-surface-container-lowest hover:bg-[#ffdad3] disabled:opacity-40 flex items-center justify-center text-primary cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">chevron_left</span>
              </button>
              <span className="font-mono text-xs font-bold text-primary px-0.5 sm:px-1 tabular-nums whitespace-nowrap">
                <span className="hidden lg:inline">Page </span>
                {selectedPage} / {totalPages}
              </span>
              <button
                type="button"
                aria-label="Next page"
                disabled={selectedPage >= totalPages}
                onClick={() => setSelectedPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 md:w-7 md:h-7 rounded border border-primary/40 bg-surface-container-lowest hover:bg-[#ffdad3] disabled:opacity-40 flex items-center justify-center text-primary cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">chevron_right</span>
              </button>

              {flaggedLiveCount > 0 && (
                <button
                  type="button"
                  onClick={() => handleJumpToNextFlagged()}
                  aria-label="Jump to next flagged page"
                  title="Jump to next flagged page"
                  className="hidden sm:inline-flex items-center gap-1 h-7 px-1.5 lg:px-2 ml-0.5 lg:ml-1 rounded border border-primary/35 bg-surface-container-low hover:bg-[#ffdad3] font-mono text-[11px] font-bold text-primary cursor-pointer whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[14px] text-secondary">
                    skip_next
                  </span>
                  <span className="hidden lg:inline">Next Issue</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center rounded border border-primary/40 bg-surface-container-lowest overflow-hidden font-mono text-[11px] font-bold">
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => stepZoom(-1)}
                  disabled={zoomLevel === ZOOM_LEVELS[0]}
                  className="px-1.5 h-7 hover:bg-surface-container-low disabled:opacity-35 cursor-pointer"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => (z === 'Fit' ? '100%' : 'Fit'))}
                  className="px-2 h-7 border-x border-primary/25 hover:bg-[#ffdad3]/60 text-primary cursor-pointer tabular-nums whitespace-nowrap"
                >
                  {zoomLevel}
                </button>
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => stepZoom(1)}
                  disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                  className="px-1.5 h-7 hover:bg-surface-container-low disabled:opacity-35 cursor-pointer"
                >
                  +
                </button>
              </div>

              <label className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-primary cursor-pointer pl-1.5 border-l border-primary/25 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={highlightBounds}
                  onChange={(e) => setHighlightBounds(e.target.checked)}
                  className="accent-secondary w-4 h-4 md:w-3.5 md:h-3.5"
                />
                <span className="hidden sm:inline">Bounds</span>
              </label>
            </div>
          </div>

          {/* Pure PDF Viewing Stage */}
          <div
            className={`flex-1 min-h-0 w-full flex items-center justify-center p-2 sm:p-4 lg:p-5 ${
              zoomLevel === 'Fit' ? 'overflow-hidden' : 'overflow-auto'
            }`}
          >
            {pdfDoc ? (
              <div className="relative inline-flex items-center justify-center max-h-full max-w-full bg-white border border-primary/35 shadow-md">
                <canvas
                  ref={canvasRef}
                  className={
                    zoomLevel === 'Fit'
                      ? 'max-h-[calc(100dvh-11rem)] md:max-h-[calc(100vh-7rem)] max-w-full w-auto h-auto block'
                      : 'block'
                  }
                />
                {highlightBounds &&
                  activePageSummary?.images
                    .filter((img) => img.category !== 'ignore')
                    .map((img) => {
                      const pageW = Math.max(1, activePageSummary.width || 612);
                      const pageH = Math.max(1, activePageSummary.height || 792);
                      const leftPct = (img.x / pageW) * 100;
                      const topPct = (img.y / pageH) * 100;
                      const widthPct = (img.w / pageW) * 100;
                      const heightPct = (img.h / pageH) * 100;
                      const isFlagged = img.category === 'clear' || img.category === 'ambiguous';
                      const isSelectedEq = selectedEqId === img.id;
                      const hasDraftAlt = Boolean(
                        activePageEdits?.equationAlts[img.id]?.trim().length,
                      );

                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => {
                            if (isFlagged) {
                              setSelectedEqId(img.id);
                              setShowRightSidebar(true);
                            }
                          }}
                          aria-label={`Select ${img.id} (${img.category})`}
                          style={{
                            left: `${Math.max(0, Math.min(95, leftPct))}%`,
                            top: `${Math.max(0, Math.min(95, topPct))}%`,
                            width: `${Math.max(4, Math.min(100 - Math.max(0, leftPct), widthPct))}%`,
                            height: `${Math.max(3, Math.min(100 - Math.max(0, topPct), heightPct))}%`,
                          }}
                          className={`absolute border-2 transition-colors ${
                            isFlagged ? 'cursor-pointer' : 'pointer-events-none border-dashed'
                          } ${
                            isSelectedEq
                              ? 'border-secondary bg-secondary/15 ring-2 ring-secondary/50'
                              : isFlagged
                              ? 'border-secondary/80 bg-secondary/10 hover:bg-secondary/20'
                              : 'border-outline/60 bg-surface/10'
                          }`}
                        >
                          <span
                            className={`absolute -top-4 left-0 px-1 text-[9px] font-mono font-bold whitespace-nowrap ${
                              hasDraftAlt
                                ? 'bg-emerald-700 text-white'
                                : isFlagged
                                ? 'bg-secondary text-white'
                                : 'bg-primary text-white'
                            }`}
                          >
                            {img.id}
                            {hasDraftAlt ? ' · ALT' : ''}
                          </span>
                        </button>
                      );
                    })}
              </div>
            ) : (
              <div className="text-sm text-on-surface-variant font-mono">
                Page {selectedPage} preview unavailable.
              </div>
            )}
          </div>

          {/* Mobile-only compact status strip above bottom tab bar */}
          <div className="md:hidden px-3 py-1.5 bg-surface border-t border-primary/25 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {renderStatusTag(activeEffectiveStatus)}
              <span className="font-mono text-[11px] text-primary truncate">
                {candidateEquations.length > 0
                  ? `${candidateEquations.length} suspected eq`
                  : activePageSummary?.status === 'UNANALYZED'
                  ? 'Scan page'
                  : 'No equation images'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileTab('edit')}
              className="min-h-[36px] px-2.5 py-1 rounded bg-secondary text-on-secondary font-mono text-[11px] font-bold shrink-0 cursor-pointer"
            >
              Review &amp; Edit
            </button>
          </div>
        </section>

        {/* RIGHT SIDEBAR: Always anchored on Right edge, togglable — Review & Edit Panel */}
        <aside
          aria-label="Review and Edit Inspector"
          className={`${mobileTab === 'edit' ? 'flex w-full' : 'hidden'} ${
            showRightSidebar
              ? 'md:flex md:w-[232px] lg:w-[300px] xl:w-[328px]'
              : 'md:hidden'
          } bg-surface-container-lowest border-l-2 border-primary shrink-0 flex-col h-full min-h-0`}
        >
          <div className="px-3 py-2 border-b border-primary/20 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary truncate">
                Review &amp; Edit · P{padPage(selectedPage)}
              </h2>
              {activePageEdited && (
                <span className="font-mono text-[10px] font-bold text-secondary shrink-0">
                  Edited
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activePageEdited && (
                <button
                  type="button"
                  onClick={() => onChangeReviewState(resetPageEdits(reviewState, selectedPage))}
                  className="font-mono text-[10px] font-bold text-secondary hover:underline cursor-pointer"
                >
                  Reset Page
                </button>
              )}
              {editedPagesCount > 0 && (
                <button
                  type="button"
                  onClick={() => onChangeReviewState(resetAllEdits(reviewState))}
                  className="font-mono text-[10px] text-on-surface-variant hover:text-primary underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3.5">
            {/* 1. Status Switcher */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Triage Status
                </span>
                {renderStatusTag(activeEffectiveStatus)}
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                {STATUS_CHOICES.map((choice) => {
                  const isCurrent = activeEffectiveStatus === choice.value;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      onClick={() => {
                        if (!activePageSummary) return;
                        onChangeReviewState(
                          applyStatusEdit(
                            reviewState,
                            activePageSummary.page,
                            choice.value,
                            activePageSummary.status,
                          ),
                        );
                      }}
                      className={`min-h-[38px] md:min-h-[32px] px-2 py-1 rounded border font-bold cursor-pointer transition-colors ${
                        isCurrent
                          ? choice.value === 'VERIFIED'
                            ? 'bg-emerald-200 border-emerald-700 text-emerald-950'
                            : 'bg-[#ffdad3] border-primary text-primary'
                          : 'bg-surface-container-low border-primary/25 text-on-surface-variant hover:border-primary hover:text-primary'
                      }`}
                    >
                      {choice.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Finding Summary & Evidence (Flat structural divider, zero nested cards) */}
            <div className="pt-3 border-t border-primary/15 space-y-2">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Detection Details
              </div>
              <p className="text-xs text-primary leading-snug">
                {activePageSummary?.reason ??
                  'No suspected image-only equations detected on this page.'}
              </p>
              <dl className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[10px] text-on-surface-variant tabular-nums">
                <div>
                  <dt className="inline">Location: </dt>
                  <dd className="inline text-primary">{activePageSummary?.locationCue ?? '—'}</dd>
                </div>
                <div>
                  <dt className="inline">Tags: </dt>
                  <dd className="inline text-primary">
                    {activePageSummary?.hasStructTree ? 'Present' : 'Missing'}
                  </dd>
                </div>
                <div>
                  <dt className="inline">Images: </dt>
                  <dd className="inline text-primary">{activePageSummary?.images.length ?? 0}</dd>
                </div>
                <div>
                  <dt className="inline">Usable Alts: </dt>
                  <dd className="inline text-primary">
                    {activePageSummary?.usableAltsCount ?? 0}
                  </dd>
                </div>
              </dl>
            </div>

            {/* 3. Equation Alt-Text Draft Editor */}
            {candidateEquations.length > 0 && (
              <div className="pt-3 border-t border-primary/15 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Draft Alt-Text
                  </span>
                  {activeEqObj && (
                    <span className="font-mono text-[10px] text-on-surface-variant tabular-nums">
                      {activeEqObj.w}×{activeEqObj.h}pt
                    </span>
                  )}
                </div>

                {/* Equation Selector Tabs */}
                <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                  {candidateEquations.map((eq) => {
                    const active = eq.id === activeEqObj?.id;
                    const filled = Boolean(activePageEdits?.equationAlts[eq.id]?.trim().length);
                    return (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => setSelectedEqId(eq.id)}
                        className={`min-h-[30px] px-2 py-0.5 rounded border font-bold cursor-pointer ${
                          active
                            ? 'bg-secondary text-on-secondary border-primary'
                            : filled
                            ? 'bg-emerald-100 border-emerald-600 text-emerald-950'
                            : 'bg-surface-container-low border-primary/25 text-primary hover:border-primary'
                        }`}
                      >
                        {eq.id}
                      </button>
                    );
                  })}
                </div>

                {activeEqObj && (
                  <label className="block">
                    <span className="sr-only">Alt text for {activeEqObj.id}</span>
                    <textarea
                      rows={3}
                      value={activePageEdits?.equationAlts[activeEqObj.id] ?? ''}
                      onChange={(e) =>
                        onChangeReviewState(
                          applyEquationAltEdit(
                            reviewState,
                            selectedPage,
                            activeEqObj.id,
                            e.target.value,
                          ),
                        )
                      }
                      placeholder={`Write spoken alt-text for ${activeEqObj.id}...`}
                      className="w-full rounded-md border border-primary/40 focus:border-primary bg-surface px-2.5 py-2 text-xs text-primary placeholder:text-on-surface-variant/65 focus:outline-none resize-y"
                    />
                  </label>
                )}
              </div>
            )}

            {/* 4. Reviewer Note */}
            <div className="pt-3 border-t border-primary/15 space-y-1.5">
              <label
                htmlFor="page-reviewer-note"
                className="block font-mono text-[10px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Reviewer Note
              </label>
              <textarea
                id="page-reviewer-note"
                rows={2}
                value={activePageEdits?.pageNote ?? ''}
                onChange={(e) =>
                  onChangeReviewState(applyPageNoteEdit(reviewState, selectedPage, e.target.value))
                }
                placeholder="Add remediation or screen-reader check note..."
                className="w-full rounded-md border border-primary/40 focus:border-primary bg-surface px-2.5 py-2 text-xs text-primary placeholder:text-on-surface-variant/65 focus:outline-none resize-y"
              />
            </div>

            {/* 5. Primary Review Workflow CTA */}
            <div className="pt-1 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={handleVerifyAndNext}
                className="min-h-[42px] md:min-h-[38px] w-full px-3 py-1.5 rounded-md bg-secondary hover:bg-[#962e1c] text-on-secondary border-2 border-primary font-mono text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Verify &amp; Next Issue</span>
              </button>
            </div>
          </div>

          {/* Honesty Line anchored unobtrusively at bottom of Right Sidebar */}
          <div className="px-3 py-2 border-t border-primary/15 bg-surface-container-low font-mono text-[10px] text-on-surface-variant leading-snug shrink-0">
            {DEFAULT_CONFIG.honestyLine}
          </div>
        </aside>
      </main>

      {/* PHONE-FIRST FIXED BOTTOM THUMB TAB BAR (< 768px, 56px height) */}
      <nav
        aria-label="Mobile workspace tabs"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-surface-container-lowest/95 backdrop-blur-md border-t-2 border-primary grid grid-cols-3 items-stretch font-mono"
      >
        <button
          type="button"
          onClick={() => setMobileTab('pages')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold cursor-pointer ${
            mobileTab === 'pages' ? 'bg-[#ffdad3] text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">list_alt</span>
          <span>Pages ({totalPages})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold border-x border-primary/25 cursor-pointer ${
            mobileTab === 'preview' ? 'bg-[#ffdad3] text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">find_in_page</span>
          <span>PDF</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('edit')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold cursor-pointer ${
            mobileTab === 'edit' ? 'bg-[#ffdad3] text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">edit_note</span>
          <span>Edit</span>
        </button>
      </nav>

      {/* Optional Reference / Limits Modal */}
      <AuditReferenceModal
        open={showRefModal}
        activeTab={refTab}
        onSelectTab={setRefTab}
        onClose={() => setShowRefModal(false)}
        result={result}
        selectedPage={selectedPage}
        activePageSummary={activePageSummary}
        textMathDetectedPages={textMathDetectedPages}
        reviewState={reviewState}
        onJumpToPage={(page) => {
          setSelectedPage(page);
          setMobileTab('preview');
        }}
        onDownloadTxt={handleDownloadTxt}
      />
    </div>
  );
};
