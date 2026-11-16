import React, { useRef, useState } from 'react';
import { DEFAULT_CONFIG } from '../engine/config';

interface DropzoneScreenProps {
  stagedFile: { name: string; sizeLabel: string; isSample: boolean } | null;
  errorMessage: string | null;
  onSelectFile: (file: File) => void;
  onSelectSample: () => void;
  onClearFile: () => void;
  onStartAnalysis: () => void;
  onLaunchDemoQuick: () => void;
}

interface Particle {
  id: number;
  symbol: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0.0 MB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const DropzoneScreen: React.FC<DropzoneScreenProps> = ({
  stagedFile,
  errorMessage,
  onSelectFile,
  onSelectSample,
  onClearFile,
  onStartAnalysis,
  onLaunchDemoQuick,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  const emitParticles = () => {
    const rect = dropZoneRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth * 0.65;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight * 0.45;
    const symbols = ['f(x)', '∫', '∑', 'dx', 'lim', '√x', '∂y', 'θ', 'π', '≈'];
    const batch: Particle[] = Array.from({ length: 12 }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.4;
      const velocity = Math.random() * 75 + 40;
      return {
        id: Date.now() + i,
        symbol: symbols[i % symbols.length],
        x: cx,
        y: cy,
        tx: Math.cos(angle) * velocity,
        ty: Math.sin(angle) * velocity - 25,
        size: Math.floor(Math.random() * 5 + 11),
      };
    });
    setParticles(batch);
    setTimeout(() => setParticles([]), 800);
  };

  const handleFilePicked = (file: File | undefined) => {
    if (!file) return;
    emitParticles();
    onSelectFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFilePicked(file);
      return;
    }
    const text = e.dataTransfer.getData('text/plain');
    if (text === 'SAMPLE_STEM_PAPER.pdf') {
      emitParticles();
      onSelectSample();
    }
  };

  const handleSampleClick = () => {
    emitParticles();
    onSelectSample();
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen relative overflow-x-hidden selection:bg-secondary selection:text-on-secondary">
      {/* Subtle decorative geometric backdrop */}
      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden="true">
        <svg
          className="w-full h-full text-outline-variant/30"
          fill="none"
          preserveAspectRatio="none"
          stroke="currentColor"
          viewBox="0 0 1440 900"
        >
          <path
            d="M180,120 Q180,140 160,140 Q180,140 180,160 Q180,140 200,140 Q180,140 180,120 Z"
            fill="rgba(184, 61, 39, 0.16)"
            stroke="none"
          />
          <polygon
            fill="none"
            opacity="0.18"
            points="680,90 730,170 630,170"
            stroke="#1c1c16"
            strokeDasharray="3 4"
            strokeWidth="0.8"
          />
          <path
            d="M1320,240 Q1320,255 1305,255 Q1320,255 1320,270 Q1320,255 1335,255 Q1320,255 1320,240 Z"
            fill="#1c1c16"
            opacity="0.15"
          />
          <polygon
            fill="none"
            opacity="0.2"
            points="120,680 160,740 90,730"
            stroke="#1c1c16"
            strokeDasharray="2 3"
            strokeWidth="0.75"
          />
          <path
            d="M590,750 Q590,762 578,762 Q590,762 590,774 Q590,762 602,762 Q590,762 590,750 Z"
            fill="rgba(184, 61, 39, 0.22)"
            stroke="none"
          />
          <polygon
            fill="none"
            opacity="0.16"
            points="1260,620 1310,690 1220,700"
            stroke="#1c1c16"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
          <path
            d="M1100,105 Q1100,115 1090,115 Q1100,115 1100,125 Q1100,115 1110,115 Q1100,115 1100,105 Z"
            fill="#1c1c16"
            opacity="0.18"
          />
        </svg>
      </div>

      {/* Fixed Header */}
      <header className="fixed top-0 left-0 w-full z-40 bg-surface/90 backdrop-blur-sm border-b border-outline-variant/60">
        <div className="h-14 sm:h-16 max-w-7xl mx-auto px-3 sm:px-6 md:px-10 lg:px-12 flex items-center justify-between gap-2 sm:gap-4">
          <a
            aria-label="EquationFirst Home"
            className="group flex items-center gap-2 sm:gap-2.5 select-none transition-transform duration-150 shrink-0"
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onClearFile();
            }}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#ffdad3] border-2 border-primary flex items-center justify-center transition-all duration-200 group-hover:-rotate-6 group-hover:scale-110 active:scale-95 flex-shrink-0 shadow-[2px_2px_0px_#19231f]">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-primary stroke-current"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path d="M18 6H7l6 6-6 6h11" />
                <path d="M6 3v3" />
                <path d="M6 18v3" />
              </svg>
            </div>
            <div className="flex items-baseline tracking-tight font-headline-md leading-none">
              <span className="font-bold text-[18px] sm:text-[20px] text-primary">Equation</span>
              <span className="font-extrabold text-[18px] sm:text-[20px] text-secondary ml-0.5">First</span>
            </div>
          </a>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              className="hidden sm:inline-flex items-center min-h-[40px] px-4 py-1.5 rounded-full border border-secondary text-secondary hover:bg-secondary/10 text-[13px] font-bold font-mono transition-all cursor-pointer whitespace-nowrap"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              Get started
            </button>
            <button
              className="min-h-[40px] px-3.5 sm:px-4 py-1.5 rounded-full border-2 border-primary bg-surface-container-lowest text-primary hover:bg-surface-container font-bold text-xs sm:text-[13px] font-mono shadow-[3px_3px_0px_#19231f] flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              type="button"
              onClick={onLaunchDemoQuick}
            >
              <span>Try Demo</span>
              <span className="text-[11px]">▾</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-14 sm:pt-16 bg-surface min-h-screen flex flex-col justify-center relative z-20">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-12 py-6 sm:py-10 flex flex-col gap-8 sm:gap-12">
          <div
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center relative"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(215, 208, 194, 0.35) 1px, transparent 1px), linear-gradient(rgba(215, 208, 194, 0.35) 1px, transparent 1px)',
              backgroundSize: '72px 72px',
              backgroundPosition: 'center top',
            }}
          >
            {/* Left Editorial Column */}
            <section
              aria-labelledby="editorial-heading"
              className="lg:col-span-7 flex flex-col select-none pr-0 lg:pr-4 relative z-10"
            >
              <div className="inline-flex items-center self-start gap-1.5 px-3 py-1 bg-surface-container-low border border-primary/20 rounded-full shadow-[2px_2px_0px_#19231f] text-primary text-[12px] font-bold font-mono tracking-tight -rotate-1 hover:rotate-0 transition-transform mb-3">
                <span>Let&apos;s analyze it</span>
              </div>

              <h1
                className="font-display-lg text-[36px] sm:text-[54px] md:text-[60px] lg:text-[68px] text-primary tracking-tight font-extrabold cursor-default mb-3 sm:mb-4"
                id="editorial-heading"
              >
                <span className="block text-primary font-extrabold leading-none">Make every</span>
                <span className="inline-flex items-center flex-wrap gap-x-2.5 sm:gap-x-3 gap-y-2 mt-1 leading-none">
                  <span className="relative inline-block align-baseline">
                    <span className="inline-block bg-[#ffdad3] text-primary px-2.5 sm:px-4 py-0.5 leading-none border-2 border-primary rounded-sm shadow-[4px_4px_0px_#19231f]">
                      equation
                    </span>
                  </span>
                  <span>count.</span>
                </span>
              </h1>

              <h2 className="font-headline-lg text-[20px] sm:text-[26px] lg:text-[30px] text-on-surface font-semibold tracking-tight mb-2">
                Find the equations to fix first.
              </h2>

              <p className="font-body-lg text-[15px] sm:text-[17px] text-on-surface-variant max-w-xl leading-relaxed mb-2">
                With EquationFirst, professors, accessibility teams, and researchers can audit large
                and small PDF papers and spot inaccessible math notation instantly.
              </p>

              <p className="font-label-md text-xs text-on-surface-variant mb-5 sm:mb-6">
                Early prototype: flags suspected problems for human review.
                {DEFAULT_CONFIG.claimNoUpload && (
                  <span className="block mt-1 text-primary/80">
                    This page runs in your browser and does not send your PDF anywhere.
                  </span>
                )}
              </p>

              <div className="flex items-center gap-4 sm:gap-6 mb-2 sm:mb-4">
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <button
                    className="min-h-[46px] px-6 py-3 rounded-full bg-secondary text-white font-bold text-[15px] border-2 border-primary shadow-[4px_4px_0px_#19231f] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#19231f] active:translate-y-[1px] active:shadow-[2px_2px_0px_#19231f] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    id="get-started-cta"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span>Get Started</span>
                    <span aria-hidden="true">→</span>
                  </button>

                  <button
                    className="min-h-[46px] px-5 py-3 rounded-full bg-surface-container-lowest text-primary font-bold text-[14px] font-mono border-2 border-primary shadow-[3px_3px_0px_#19231f] hover:bg-surface-container flex items-center justify-center gap-2 transition-all cursor-pointer"
                    id="load-sample-btn"
                    type="button"
                    onClick={handleSampleClick}
                  >
                    <span>Sample Equation PDF</span>
                    <span className="text-xs">▾</span>
                  </button>
                </div>

                {/* Rotating Seal */}
                <div className="relative w-20 h-20 hidden sm:flex items-center justify-center flex-shrink-0 select-none group">
                  <div className="absolute inset-0 animate-[spin_12s_linear_infinite]">
                    <svg
                      className="w-full h-full fill-current text-on-surface-variant/80 text-[8.5px] font-mono font-bold tracking-[0.22em] uppercase"
                      viewBox="0 0 100 100"
                    >
                      <defs>
                        <path
                          d="M 50, 50 m -36, 0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0"
                          id="circlePath"
                        />
                      </defs>
                      <text>
                        <textPath href="#circlePath">INSPECT • RECOGNIZE • FIX • MATH •</textPath>
                      </text>
                    </svg>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[#ffdad3] border border-primary flex items-center justify-center shadow-[1px_1px_0px_#19231f] text-secondary font-bold text-base">
                    ∑
                  </div>
                </div>
              </div>
            </section>

            {/* Right Document Upload Portal */}
            <section aria-label="Document Upload Portal" className="lg:col-span-5 flex flex-col relative">
              <div
                aria-hidden="true"
                className="hidden sm:block absolute -top-7 -left-7 w-16 h-16 pointer-events-none z-20 select-none"
              >
                <svg
                  className="w-full h-full"
                  fill="none"
                  stroke="#1c1c16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  viewBox="0 0 60 60"
                >
                  <line x1="10" x2="2" y1="16" y2="10" />
                  <line x1="16" x2="13" y1="12" y2="2" />
                  <line x1="22" x2="24" y1="15" y2="3" />
                </svg>
              </div>

              <div
                aria-hidden="true"
                className="hidden sm:block absolute top-1/3 -left-6 w-10 h-24 pointer-events-none z-20 select-none"
              >
                <svg
                  className="w-full h-full"
                  fill="none"
                  stroke="#1c1c16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  viewBox="0 0 40 90"
                >
                  <path d="M28,6 C16,14 6,24 16,33 C26,42 34,28 18,48 C6,64 12,78 28,84" />
                </svg>
              </div>

              <div className="absolute -right-8 top-0 bottom-0 w-8 pointer-events-none z-20 hidden xl:flex items-center justify-center overflow-hidden">
                <div className="rotate-90 whitespace-nowrap text-[11px] font-mono tracking-widest text-outline/60 uppercase select-none">
                  EquationFirst ~ Accessible Math ~ STEM Documents ~
                </div>
              </div>

              <div className="bg-surface-container-lowest border-2 border-primary rounded-2xl shadow-[6px_6px_0px_#19231f] relative flex flex-col p-4 sm:p-6 z-10">
                <div
                  ref={dropZoneRef}
                  aria-live="polite"
                  role="region"
                  aria-label="PDF drop zone"
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(false);
                  }}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (!stagedFile) fileInputRef.current?.click();
                  }}
                  className={`relative border-2 border-dashed rounded-xl transition-all duration-200 p-6 flex flex-col items-center justify-center text-center group ${
                    isDragOver
                      ? 'border-secondary bg-surface-container'
                      : stagedFile
                      ? 'border-primary bg-surface-container-low'
                      : 'border-primary/30 hover:border-secondary bg-surface-container-low/60 hover:bg-surface-container/70 cursor-pointer'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    accept="application/pdf,.pdf"
                    aria-label="Choose a PDF file to analyze"
                    className="sr-only"
                    id="file-input"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      handleFilePicked(file);
                      e.target.value = '';
                    }}
                  />

                  {!stagedFile ? (
                    <>
                      <div className="w-12 h-12 mb-3 rounded-xl bg-[#ffdad3] border-2 border-primary flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-150 shadow-[2px_2px_0px_#19231f]">
                        <svg
                          className="w-6 h-6 stroke-current fill-none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="9" x2="15" y1="13" y2="13" />
                          <line x1="9" x2="13" y1="17" y2="17" />
                        </svg>
                      </div>
                      <div className="font-headline-sm text-[17px] font-bold text-primary tracking-tight mb-1">
                        {isDragOver ? (
                          <span className="text-secondary">[ RELEASE TO INGEST ]</span>
                        ) : (
                          <>
                            Drop STEM PDF here or{' '}
                            <button
                              type="button"
                              id="choose-file-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="text-secondary underline underline-offset-2 hover:text-primary cursor-pointer"
                            >
                              browse
                            </button>
                          </>
                        )}
                      </div>
                      <p className="font-label-sm text-[11px] font-mono text-on-surface-variant max-w-xs leading-normal uppercase tracking-wider mt-1">
                        Accepts STEM PDFs, LaTeX preprints &amp; scans up to 64MB
                      </p>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-[#ffdad3] border-2 border-primary flex items-center justify-center font-mono text-xs font-bold text-secondary shrink-0 shadow-[2px_2px_0px_#19231f]">
                          PDF
                        </div>
                        <div className="min-w-0">
                          <p className="font-headline-sm text-sm font-bold text-primary truncate">
                            {stagedFile.name}
                          </p>
                          <p className="font-label-sm text-[11px] font-mono text-on-surface-variant mt-0.5">
                            {stagedFile.sizeLabel} •{' '}
                            <span className="text-emerald-700 font-bold">READY</span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearFile();
                        }}
                        aria-label="Remove staged file"
                        className="w-8 h-8 rounded-lg border border-primary/40 hover:border-secondary hover:bg-[#ffdad3] flex items-center justify-center text-primary cursor-pointer shrink-0"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div
                    role="alert"
                    className="mt-3 p-3 rounded-xl bg-[#ffdad6] border-2 border-secondary text-xs font-body-sm text-[#6a0b00] flex items-start gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px] text-secondary shrink-0 mt-0.5">
                      error
                    </span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2">
                  <div className="font-label-sm text-[10px] font-mono uppercase tracking-widest text-outline">
                    Supported Ingestion Types
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="font-label-sm text-[11px] text-on-surface bg-surface-container-low border border-primary/20 px-2 py-0.5 rounded">
                      Research Papers
                    </span>
                    <span className="font-label-sm text-[11px] text-on-surface bg-surface-container-low border border-primary/20 px-2 py-0.5 rounded">
                      Course Textbooks
                    </span>
                    <span className="font-label-sm text-[11px] text-on-surface bg-surface-container-low border border-primary/20 px-2 py-0.5 rounded">
                      LaTeX arXiv
                    </span>
                    <span className="font-label-sm text-[11px] text-on-surface bg-surface-container-low border border-primary/20 px-2 py-0.5 rounded">
                      Manuals
                    </span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    className="w-full min-h-[48px] py-3.5 px-6 font-mono text-xs sm:text-sm uppercase tracking-wider font-extrabold transition-all duration-150 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] bg-[#ffdad3] text-primary border-2 border-primary shadow-[4px_4px_0px_#19231f] hover:bg-[#ffb4a5]"
                    id="analyze-action-btn"
                    type="button"
                    onClick={() => {
                      if (stagedFile) {
                        onStartAnalysis();
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <span>
                      {stagedFile ? 'Inspect Staged PDF Equations' : 'Upload & Inspect Equations'}
                    </span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Kind of Ingestion Section */}
          <section
            className="pt-6 border-t-2 border-primary/10 flex flex-col gap-6"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(215, 208, 194, 0.3) 1px, transparent 1px)',
              backgroundSize: '100% 1px',
              backgroundPosition: '0px 0px',
            }}
          >
            <div className="text-center">
              <h3 className="font-headline-lg text-[32px] sm:text-[38px] font-bold text-primary tracking-tight">
                Kind of Ingestion
              </h3>
              <p className="text-sm text-on-surface-variant mt-1">
                Automated extraction &amp; accessibility checking for all STEM formats
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
              <div className="bg-surface-container-lowest border-2 border-primary rounded-2xl p-5 shadow-[4px_4px_0px_#19231f] flex items-center gap-4 hover:-translate-y-1 transition-transform">
                <div className="w-14 h-14 rounded-2xl bg-[#ffdad3] border-2 border-primary flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_#19231f]">
                  <svg
                    className="w-7 h-7 text-secondary"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <div className="font-headline-sm text-[18px] font-bold text-primary">
                    Research Papers &amp; Preprints
                  </div>
                  <div className="text-[13px] text-on-surface-variant leading-snug mt-1">
                    arXiv, IEEE, and Nature PDF preprints with complex multi-line derivations.
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest border-2 border-primary rounded-2xl p-5 shadow-[4px_4px_0px_#19231f] flex items-center gap-4 hover:-translate-y-1 transition-transform">
                <div className="w-14 h-14 rounded-2xl bg-[#bbcac0] border-2 border-primary flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_#19231f]">
                  <svg
                    className="w-7 h-7 text-[#17241d]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <div className="font-headline-sm text-[18px] font-bold text-primary">
                    STEM Course Textbooks
                  </div>
                  <div className="text-[13px] text-on-surface-variant leading-snug mt-1">
                    High-density mathematical chapters, matrices, calculus, and theorem proofs.
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Particle emitter */}
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
          {particles.map((p) => (
            <span
              key={p.id}
              className="absolute font-mono font-bold text-secondary select-none transition-all duration-700"
              style={{
                left: p.x,
                top: p.y,
                fontSize: `${p.size}px`,
                transform: `translate(calc(-50% + ${p.tx}px), calc(-50% + ${p.ty}px))`,
                opacity: 0.7,
              }}
            >
              {p.symbol}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export { formatBytes };
