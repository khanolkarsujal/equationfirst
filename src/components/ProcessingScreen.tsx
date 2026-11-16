import React, { useRef } from 'react';
import type { QueueItem } from '../engine/types';

interface ProcessingScreenProps {
  queueItems: QueueItem[];
  isPaused: boolean;
  onTogglePause: () => void;
  onCancelToDropzone: () => void;
  onViewResults: (itemId?: string) => void;
  onAddFiles: (files: FileList) => void;
  onRemoveQueueItem: (id: string) => void;
}

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  queueItems,
  isPaused,
  onTogglePause,
  onCancelToDropzone,
  onViewResults,
  onAddFiles,
  onRemoveQueueItem,
}) => {
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const activeItem =
    queueItems.find((item) => item.status === 'active') ??
    queueItems[queueItems.length - 1];

  const completedCount = queueItems.filter((q) => q.status === 'complete').length;
  const hasAnyActiveOrQueued = queueItems.some(
    (q) => q.status === 'active' || q.status === 'queued',
  );
  const allComplete = queueItems.length > 0 && !hasAnyActiveOrQueued && completedCount > 0;

  const pagesDone = activeItem?.pagesDone ?? 0;
  const totalPages = activeItem?.totalPages ?? 0;
  const percentage =
    totalPages > 0 ? Math.min(100, Math.round((pagesDone / totalPages) * 100)) : 0;

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased md:h-screen md:overflow-hidden min-h-screen flex flex-col selection:bg-secondary selection:text-on-secondary">
      {/* Minimal Header */}
      <header className="w-full border-b border-outline-variant/50 bg-surface/90 backdrop-blur-sm shrink-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <a
            className="flex items-center gap-2 sm:gap-2.5 select-none group shrink-0"
            href="#dropzone"
            onClick={(e) => {
              e.preventDefault();
              onCancelToDropzone();
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-[#ffdad3] border-2 border-primary flex items-center justify-center transition-transform duration-200 group-hover:-rotate-6 shadow-[2px_2px_0px_#19231f]">
              <span className="font-bold text-primary text-base font-label-md">∑</span>
            </div>
            <div className="flex items-baseline tracking-tight font-headline-md leading-none">
              <span className="font-bold text-lg text-primary">Equation</span>
              <span className="font-extrabold text-lg text-[#ff5733] ml-0.5">First</span>
            </div>
          </a>

          <div className="flex items-center gap-3 shrink-0">
            <button
              className="min-h-[40px] px-3.5 py-1.5 rounded-full border-2 border-primary bg-surface hover:bg-[#ffdad3] text-xs font-label-md font-bold transition-all shadow-[2px_2px_0px_#19231f] cursor-pointer whitespace-nowrap"
              type="button"
              onClick={onCancelToDropzone}
            >
              New Batch
            </button>
          </div>
        </div>
      </header>

      {/* Main Centered Presentation Card */}
      <main
        className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 flex flex-col justify-center min-h-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(215, 208, 194, 0.35) 1px, transparent 1px), linear-gradient(rgba(215, 208, 194, 0.35) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          backgroundPosition: 'center center',
        }}
      >
        <div className="relative flex items-center justify-between mb-3 sm:mb-4 px-1 sm:px-2">
          <div className="hidden sm:block absolute -top-3 -left-2 pointer-events-none select-none z-10">
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              stroke="#19231F"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="8" y1="18" x2="2" y2="16" />
              <line x1="12" y1="11" x2="7" y2="5" />
              <line x1="18" y1="8" x2="17" y2="2" />
            </svg>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ffdad3] border-2 border-primary rounded-full text-[11px] sm:text-xs font-label-md font-bold text-primary shadow-[2px_2px_0px_#19231f] sm:-rotate-1 sm:ml-4 lg:ml-0">
            {allComplete
              ? 'Ingestion Pipeline Complete'
              : isPaused
              ? 'Ingestion Pipeline Paused'
              : 'Ingestion Pipeline Active'}
          </div>
          <span className="font-label-sm text-xs text-on-surface-variant font-medium hidden sm:inline-block">
            Local Browser Worker • Zero Upload
          </span>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border-2 border-primary shadow-[6px_6px_0px_#19231f] overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-outline-variant/60">
            {/* LEFT PANE: Real-time Distillation Progress */}
            <div className="md:col-span-5 p-5 sm:p-8 lg:p-10 flex flex-col items-center justify-center text-center relative bg-gradient-to-b from-surface to-surface-container-lowest/40">
              <div className="w-full flex items-center justify-between mb-2 sm:mb-4">
                <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-medium">
                  PDF Operator Inspector
                </span>
                <span className="font-label-sm text-xs text-secondary font-bold" id="live-percentage">
                  {percentage}%
                </span>
              </div>

              {/* Animated Teacup / Beaker Graphic */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 lg:w-52 lg:h-52 flex items-center justify-center my-1 sm:my-2 select-none">
                <div className="absolute inset-0 pointer-events-none">
                  <svg
                    className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-12 overflow-visible"
                    fill="none"
                    stroke="#B83D27"
                    strokeLinecap="round"
                    strokeWidth="2"
                  >
                    <path className="steam-wisp-1" d="M -6 18 Q -2 6 4 12 T 12 0" opacity="0.4" />
                    <path className="steam-wisp-2" d="M 6 22 Q 12 10 18 16 T 24 2" opacity="0.45" />
                  </svg>
                  <span
                    className="bubble-1 absolute font-label-md text-xs font-bold text-secondary"
                    style={{ top: '26%', left: '34%' }}
                  >
                    ∫
                  </span>
                  <span
                    className="bubble-2 absolute font-label-md text-xs font-bold text-secondary"
                    style={{ top: '22%', left: '54%' }}
                  >
                    ∑
                  </span>
                  <span
                    className="bubble-3 absolute font-label-md text-xs font-bold text-secondary"
                    style={{ top: '28%', left: '45%' }}
                  >
                    λ
                  </span>
                  <span
                    className="bubble-4 absolute font-label-md text-[10px] font-bold text-secondary"
                    style={{ top: '24%', left: '63%' }}
                  >
                    x²
                  </span>
                </div>

                <svg
                  className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 overflow-visible"
                  fill="none"
                  viewBox="0 0 200 180"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <clipPath id="cup-liquid-clip">
                      <path d="M 52 56 H 148 V 118 C 148 136 134 148 116 148 H 84 C 66 148 52 136 52 118 Z" />
                    </clipPath>
                    <linearGradient id="warmTeaGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#fd8a67" />
                      <stop offset="45%" stopColor="#B83D27" />
                      <stop offset="100%" stopColor="#7a1c09" />
                    </linearGradient>
                    <linearGradient id="softWaveGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#ffb094" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#e25338" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>

                  <g clipPath="url(#cup-liquid-clip)">
                    <rect fill="url(#warmTeaGrad)" height="70" width="120" x="40" y="86" />
                    <path
                      className="animate-wave-slow"
                      d="M 20 90 Q 45 80, 75 90 T 135 90 T 195 90 T 255 90 V 160 H 20 Z"
                      fill="url(#softWaveGrad)"
                    />
                    <path
                      className="animate-wave-fast"
                      d="M 10 93 Q 40 102, 70 93 T 130 93 T 190 93 T 250 93 V 160 H 10 Z"
                      fill="url(#warmTeaGrad)"
                      opacity="0.95"
                    />
                    <circle className="core-dot" cx="100" cy="132" fill="#fdf9f0" r="3.5" />
                    <circle cx="120" cy="120" fill="#ffd4c8" opacity="0.85" r="2" />
                    <circle cx="78" cy="126" fill="#ffd4c8" opacity="0.75" r="1.8" />
                  </g>

                  <path
                    d="M 148 76 C 168 76 172 88 172 99 C 172 110 166 122 148 122"
                    stroke="#19231F"
                    strokeLinecap="round"
                    strokeWidth="5.5"
                  />
                  <path
                    d="M 50 54 H 150 V 118 C 150 137.5 134.5 150 116 150 H 84 C 65.5 150 50 137.5 50 118 Z"
                    stroke="#19231F"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="5.5"
                  />
                  <line stroke="#19231F" strokeLinecap="round" strokeWidth="5.5" x1="42" x2="158" y1="152" y2="152" />
                  <line stroke="#19231F" strokeLinecap="round" strokeWidth="5.5" x1="168" x2="176" y1="152" y2="152" />
                </svg>
              </div>

              <div className="mt-2 flex items-baseline justify-center gap-1">
                <span className="font-headline-md text-2xl font-semibold text-primary tracking-tight">
                  {allComplete
                    ? 'analysis complete'
                    : isPaused
                    ? 'inspection paused'
                    : 'inspecting equations'}
                </span>
                {!allComplete && !isPaused && (
                  <span className="inline-flex gap-1 pl-1 items-baseline">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0.18s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0.36s' }} />
                  </span>
                )}
              </div>

              <p className="font-body-sm text-sm text-on-surface-variant mt-2 max-w-xs">
                {activeItem ? (
                  <>
                    Extracting image bounding boxes, text items, and tag-tree alt text from{' '}
                    <span className="font-semibold text-primary break-words">{activeItem.name}</span>.
                  </>
                ) : (
                  'Add a PDF file to inspect.'
                )}
              </p>

              {/* Progress Bar & Polite Live Region */}
              <div className="w-full max-w-xs mt-6">
                <div
                  role="progressbar"
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="PDF equation inspection progress"
                  className="w-full h-2.5 rounded-full bg-surface-container border border-outline-variant overflow-hidden p-0.5"
                >
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-200 ease-out"
                    id="progress-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div
                  aria-live="polite"
                  className="flex justify-between items-center mt-2 font-label-sm text-xs text-on-surface-variant"
                >
                  <span>
                    {totalPages > 0 ? `Page ${pagesDone} of ${totalPages}` : 'Opening PDF...'}
                  </span>
                  <span>
                    {completedCount} of {queueItems.length} PDF{queueItems.length === 1 ? '' : 's'} Ready
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT PANE: Real Document Queue */}
            <div className="md:col-span-7 p-5 sm:p-7 lg:p-9 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-outline-variant/60">
                  <div className="min-w-0">
                    <h2 className="font-headline-sm text-base sm:text-lg font-bold text-primary">
                      Uploaded Documents
                    </h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      {queueItems.length} {queueItems.length === 1 ? 'PDF' : 'PDFs'} in processing queue
                    </p>
                  </div>
                  <input
                    ref={addFileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    className="sr-only"
                    aria-label="Add another PDF to queue"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        onAddFiles(e.target.files);
                      }
                      e.target.value = '';
                    }}
                  />
                  <button
                    className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-label-md font-bold text-primary bg-surface hover:bg-[#ffdad3] px-3.5 py-1.5 rounded-lg border-2 border-primary transition-all shadow-[2px_2px_0px_#19231f] cursor-pointer shrink-0 whitespace-nowrap"
                    type="button"
                    onClick={() => addFileInputRef.current?.click()}
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add file
                  </button>
                </div>

                <div className="divide-y divide-outline-variant/40 max-h-[34vh] md:max-h-[40vh] overflow-y-auto px-1">
                  {queueItems.map((item) => {
                    if (item.status === 'complete') {
                      return (
                        <div key={item.id} className="py-4 flex items-center justify-between gap-4 group">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-full border border-outline-variant bg-surface-container flex items-center justify-center font-label-sm text-xs font-bold text-primary shrink-0">
                              PDF
                            </div>
                            <div className="min-w-0">
                              <p className="font-body-md text-sm font-medium text-primary truncate">
                                {item.name}
                              </p>
                              <p className="font-label-sm text-xs text-on-surface-variant mt-0.5">
                                {item.sizeLabel} • {item.totalPages} pages analyzed
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => onViewResults(item.id)}
                              className="px-2.5 py-1 rounded border border-primary bg-surface-container-low hover:bg-[#ffdad3] text-[11px] font-mono font-bold text-primary cursor-pointer"
                            >
                              Open Report
                            </button>
                            <div
                              className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center"
                              title="Analysis Complete"
                            >
                              <span className="material-symbols-outlined text-[18px] font-bold">check</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (item.status === 'active') {
                      return (
                        <div
                          key={item.id}
                          className="py-4 flex items-center justify-between gap-4 group bg-surface-container-low/70 -mx-3 px-3 rounded-xl border border-secondary/20"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-full border border-secondary bg-secondary/10 flex items-center justify-center font-label-sm text-xs font-bold text-secondary shrink-0">
                              PDF
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-body-md text-sm font-semibold text-primary truncate">
                                  {item.name}
                                </p>
                                <span className="text-[10px] font-label-md px-1.5 py-0.5 rounded bg-secondary text-on-secondary font-bold">
                                  ACTIVE
                                </span>
                              </div>
                              <p className="font-label-sm text-xs text-secondary mt-0.5 font-medium">
                                {item.sizeLabel} •{' '}
                                {item.totalPages > 0
                                  ? `Page ${item.pagesDone} of ${item.totalPages} • Extracting bounds`
                                  : 'Parsing PDF header...'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!isPaused && (
                              <span className="material-symbols-outlined text-secondary text-[20px] animate-spin">
                                progress_activity
                              </span>
                            )}
                            <button
                              className="w-7 h-7 rounded-full text-on-surface-variant hover:text-secondary hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer"
                              title="Cancel analysis"
                              type="button"
                              onClick={() => onRemoveQueueItem(item.id)}
                            >
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (item.status === 'error') {
                      return (
                        <div
                          key={item.id}
                          className="py-4 flex items-center justify-between gap-4 bg-[#ffdad6]/50 -mx-3 px-3 rounded-xl border border-secondary/40"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-full border border-secondary bg-[#ffdad6] flex items-center justify-center font-label-sm text-xs font-bold text-secondary shrink-0">
                              ERR
                            </div>
                            <div className="min-w-0">
                              <p className="font-body-md text-sm font-semibold text-primary truncate">
                                {item.name}
                              </p>
                              <p className="font-body-sm text-xs text-[#6a0b00] mt-0.5">
                                {item.errorMessage ?? 'Could not parse this PDF.'}
                              </p>
                            </div>
                          </div>
                          <button
                            className="w-7 h-7 rounded-full text-secondary hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer shrink-0"
                            title="Remove failed file"
                            type="button"
                            onClick={() => onRemoveQueueItem(item.id)}
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div key={item.id} className="py-4 flex items-center justify-between gap-4 group">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-full border border-outline-variant bg-surface-container flex items-center justify-center font-label-sm text-xs font-bold text-on-surface-variant shrink-0">
                            PDF
                          </div>
                          <div className="min-w-0">
                            <p className="font-body-md text-sm font-normal text-on-surface truncate">
                              {item.name}
                            </p>
                            <p className="font-label-sm text-xs text-on-surface-variant mt-0.5">
                              {item.sizeLabel} • Waiting in queue
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            className="w-7 h-7 rounded-full text-outline hover:text-secondary hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer"
                            title="Remove file from queue"
                            type="button"
                            onClick={() => onRemoveQueueItem(item.id)}
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-outline-variant/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <span className="font-label-sm text-xs text-on-surface-variant">
                  100% client-side pdf.js extraction • No files uploaded
                </span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  {hasAnyActiveOrQueued && (
                    <button
                      className={`min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-label-md font-bold bg-surface hover:bg-surface-container border-2 rounded-lg transition-all shadow-[2px_2px_0px_#19231f] cursor-pointer whitespace-nowrap ${
                        isPaused ? 'border-secondary text-secondary' : 'border-primary text-primary'
                      }`}
                      id="pause-btn"
                      type="button"
                      onClick={onTogglePause}
                    >
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                  )}
                  <button
                    disabled={completedCount === 0}
                    className="min-h-[44px] sm:min-h-[38px] px-5 py-2 text-xs font-label-md font-bold bg-[#ffdad3] hover:bg-[#ffb4a5] disabled:opacity-45 disabled:cursor-not-allowed text-primary border-2 border-primary rounded-lg transition-all shadow-[3px_3px_0px_#19231f] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    id="view-results-btn"
                    type="button"
                    onClick={() => onViewResults()}
                  >
                    <span>{allComplete ? 'Review Complete' : 'View Ready Report'}</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-5 text-center">
          <a
            className="min-h-[44px] font-label-sm text-xs font-semibold text-primary hover:text-secondary inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-primary bg-surface hover:bg-surface-container-high transition-all shadow-[2px_2px_0px_#19231f]"
            href="#dropzone"
            onClick={(e) => {
              e.preventDefault();
              onCancelToDropzone();
            }}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Return to document dropzone
          </a>
        </div>
      </main>
    </div>
  );
};
