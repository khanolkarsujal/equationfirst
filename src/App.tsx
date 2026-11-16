import { useEffect, useRef, useState } from 'react';
import type * as pdfjsLib from 'pdfjs-dist';
import { AuditReportScreen } from './components/AuditReportScreen';
import { DropzoneScreen, formatBytes } from './components/DropzoneScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { buildSamplePdfBytes, SAMPLE_PDF_NAME } from './data/samplePdf';
import { DEFAULT_CONFIG } from './engine/config';
import { extractDocumentPages, openPdfFromBytes, PdfLoadError } from './engine/pdfExtractor';
import {
  countEditedPages,
  createEmptyReviewState,
  type OpenDocumentSummary,
} from './engine/reviewState';
import { scoreDocument } from './engine/scoring';
import type { AppScreen, DocumentReviewState, QueueItem, ScoringResult } from './engine/types';

interface StagedInput {
  name: string;
  sizeLabel: string;
  sizeBytes: number;
  isSample: boolean;
  file?: File;
}

interface CompletedAudit {
  fileName: string;
  result: ScoringResult;
  pdfDoc: pdfjsLib.PDFDocumentProxy;
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('dropzone');
  const [staged, setStaged] = useState<StagedInput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real Queue & Processing State
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reviewStatesByFile, setReviewStatesByFile] = useState<Record<string, DocumentReviewState>>({});

  const completedMapRef = useRef<Map<string, CompletedAudit>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const isProcessingLoopRef = useRef<boolean>(false);
  const pausedRef = useRef<boolean>(false);
  const pauseResolversRef = useRef<Array<() => void>>([]);
  const queueRef = useRef<QueueItem[]>([]);
  const autostartDoneRef = useRef<boolean>(false);

  useEffect(() => {
    queueRef.current = queueItems;
  }, [queueItems]);

  useEffect(() => {
    pausedRef.current = isPaused;
    if (!isPaused) {
      const resolvers = pauseResolversRef.current.splice(0);
      resolvers.forEach((r) => r());
    }
  }, [isPaused]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const waitIfPaused = () => {
    if (!pausedRef.current) return Promise.resolve();
    return new Promise<void>((resolve) => {
      pauseResolversRef.current.push(resolve);
    });
  };

  const stopOngoingWork = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    isProcessingLoopRef.current = false;
    pausedRef.current = false;
    setIsPaused(false);
    const resolvers = pauseResolversRef.current.splice(0);
    resolvers.forEach((r) => r());
  };

  const handleSelectFile = (file: File) => {
    setErrorMessage(null);
    const isPdfMime = file.type === 'application/pdf';
    const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
    if (!isPdfMime && !isPdfExt) {
      setStaged(null);
      setErrorMessage('That file is not a PDF. Please choose a valid .pdf document.');
      return;
    }
    if (file.size === 0) {
      setStaged(null);
      setErrorMessage('This PDF file is empty (0 bytes) and cannot be analyzed.');
      return;
    }
    setStaged({
      name: file.name,
      sizeLabel: formatBytes(file.size),
      sizeBytes: file.size,
      isSample: false,
      file,
    });
  };

  const handleSelectSample = () => {
    setErrorMessage(null);
    const sampleBytes = buildSamplePdfBytes();
    setStaged({
      name: SAMPLE_PDF_NAME,
      sizeLabel: formatBytes(sampleBytes.byteLength),
      sizeBytes: sampleBytes.byteLength,
      isSample: true,
    });
  };

  const handleClearFile = () => {
    stopOngoingWork();
    setStaged(null);
    setErrorMessage(null);
  };

  const processNextInQueue = async (
    initialItems?: QueueItem[],
    autoOpenReportOnDone?: boolean,
  ) => {
    if (isProcessingLoopRef.current) return;
    isProcessingLoopRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    if (initialItems) {
      queueRef.current = initialItems;
    }

    let lastCompletedId: string | null = null;

    try {
      while (!controller.signal.aborted) {
        const nextItem = queueRef.current.find((item) => item.status === 'queued');
        if (!nextItem) break;

        setQueueItems((prev) =>
          prev.map((it) => (it.id === nextItem.id ? { ...it, status: 'active' } : it)),
        );

        try {
          const bytes = nextItem.isSample
            ? buildSamplePdfBytes()
            : new Uint8Array(await nextItem.file!.arrayBuffer());

          const pdfDoc = await openPdfFromBytes(bytes);
          if (controller.signal.aborted) break;

          const totalPages = pdfDoc.numPages;
          setQueueItems((prev) =>
            prev.map((it) =>
              it.id === nextItem.id ? { ...it, totalPages, pagesDone: 0 } : it,
            ),
          );

          const pages = await extractDocumentPages(
            pdfDoc,
            (done, count) => {
              setQueueItems((prev) =>
                prev.map((it) =>
                  it.id === nextItem.id
                    ? { ...it, pagesDone: done, totalPages: count }
                    : it,
                ),
              );
            },
            controller.signal,
            waitIfPaused,
          );

          const result = scoreDocument(pages, DEFAULT_CONFIG);
          completedMapRef.current.set(nextItem.id, {
            fileName: nextItem.name,
            result,
            pdfDoc,
          });
          lastCompletedId = nextItem.id;

          setQueueItems((prev) =>
            prev.map((it) =>
              it.id === nextItem.id
                ? {
                    ...it,
                    status: 'complete',
                    pagesDone: totalPages,
                    totalPages,
                  }
                : it,
            ),
          );

          setSelectedReportId((prevId) => prevId ?? nextItem.id);
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            break;
          }
          const msg =
            err instanceof PdfLoadError
              ? err.message
              : 'Could not extract pages from this PDF. It may be damaged or encrypted.';
          setQueueItems((prev) =>
            prev.map((it) =>
              it.id === nextItem.id
                ? { ...it, status: 'error', errorMessage: msg }
                : it,
            ),
          );
        }
      }
      if (autoOpenReportOnDone && lastCompletedId && !controller.signal.aborted) {
        setSelectedReportId(lastCompletedId);
        setScreen('report');
      }
    } finally {
      isProcessingLoopRef.current = false;
    }
  };

  const beginQueueProcessing = (items: QueueItem[], autoOpen = false) => {
    stopOngoingWork();
    completedMapRef.current.clear();
    setReviewStatesByFile({});
    setSelectedReportId(null);
    setQueueItems(items);
    setScreen('processing');
    void processNextInQueue(items, autoOpen);
  };

  const handleStartAnalysis = () => {
    if (!staged) return;
    const item: QueueItem = {
      id: `pdf-${Date.now()}`,
      name: staged.name,
      sizeBytes: staged.sizeBytes,
      sizeLabel: staged.sizeLabel,
      pagesDone: 0,
      totalPages: 0,
      status: 'queued',
      isSample: staged.isSample,
      file: staged.file,
    };
    beginQueueProcessing([item]);
  };

  const handleLaunchDemoQuick = (autoOpen = false) => {
    const sampleBytes = buildSamplePdfBytes();
    const sizeLabel = formatBytes(sampleBytes.byteLength);
    setStaged({
      name: SAMPLE_PDF_NAME,
      sizeLabel,
      sizeBytes: sampleBytes.byteLength,
      isSample: true,
    });
    const item: QueueItem = {
      id: `sample-${Date.now()}`,
      name: SAMPLE_PDF_NAME,
      sizeBytes: sampleBytes.byteLength,
      sizeLabel,
      pagesDone: 0,
      totalPages: 0,
      status: 'queued',
      isSample: true,
    };
    beginQueueProcessing([item], autoOpen);
  };

  useEffect(() => {
    if (autostartDoneRef.current) return;
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1') {
      autostartDoneRef.current = true;
      handleLaunchDemoQuick(true);
    }
  });

  const handleAddFilesInQueue = (fileList: FileList, switchToProcessing = false) => {
    const additions: QueueItem[] = [];
    Array.from(fileList).forEach((file, idx) => {
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      additions.push({
        id: `pdf-${Date.now()}-${idx}`,
        name: file.name,
        sizeBytes: file.size,
        sizeLabel: formatBytes(file.size),
        pagesDone: 0,
        totalPages: 0,
        status: isPdf && file.size > 0 ? 'queued' : 'error',
        errorMessage:
          !isPdf
            ? 'Not a PDF file.'
            : file.size === 0
            ? 'File is empty (0 bytes).'
            : undefined,
        file,
      });
    });

    if (additions.length === 0) return;

    setQueueItems((prev) => {
      const updated = [...prev, ...additions];
      queueRef.current = updated;
      return updated;
    });

    if (switchToProcessing) {
      setScreen('processing');
    }

    if (!isProcessingLoopRef.current) {
      void processNextInQueue(undefined, switchToProcessing);
    }
  };

  const handleRemoveQueueItem = (id: string) => {
    completedMapRef.current.delete(id);
    setReviewStatesByFile((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    const target = queueItems.find((q) => q.id === id);
    if (target?.status === 'active') {
      stopOngoingWork();
      setQueueItems((prev) => {
        const remaining = prev.filter((q) => q.id !== id);
        queueRef.current = remaining;
        if (remaining.length === 0) {
          setSelectedReportId(null);
          setScreen('dropzone');
        } else {
          void processNextInQueue(remaining);
        }
        return remaining;
      });
      return;
    }

    setQueueItems((prev) => {
      const remaining = prev.filter((q) => q.id !== id);
      queueRef.current = remaining;
      if (remaining.length === 0) {
        setSelectedReportId(null);
        setScreen('dropzone');
      } else if (selectedReportId === id) {
        const nextComplete = remaining.find((r) => r.status === 'complete' && completedMapRef.current.has(r.id));
        if (nextComplete) {
          setSelectedReportId(nextComplete.id);
        } else {
          setSelectedReportId(null);
          setScreen('dropzone');
        }
      }
      return remaining;
    });
  };

  const handleViewResults = (itemId?: string) => {
    const targetId =
      itemId ??
      selectedReportId ??
      queueItems.find((q) => q.status === 'complete')?.id ??
      null;
    if (!targetId || !completedMapRef.current.has(targetId)) return;
    setSelectedReportId(targetId);
    setScreen('report');
  };

  const handleReturnToDropzone = () => {
    stopOngoingWork();
    setScreen('dropzone');
  };

  const handleLoadSampleInEditor = () => {
    const existingSample = queueItems.find(
      (q) => q.isSample && q.status === 'complete' && completedMapRef.current.has(q.id),
    );
    if (existingSample) {
      setSelectedReportId(existingSample.id);
      return;
    }
    const sampleBytes = buildSamplePdfBytes();
    const sizeLabel = formatBytes(sampleBytes.byteLength);
    const item: QueueItem = {
      id: `sample-${Date.now()}`,
      name: SAMPLE_PDF_NAME,
      sizeBytes: sampleBytes.byteLength,
      sizeLabel,
      pagesDone: 0,
      totalPages: 0,
      status: 'queued',
      isSample: true,
    };
    setQueueItems((prev) => {
      const updated = [...prev, item];
      queueRef.current = updated;
      return updated;
    });
    setScreen('processing');
    void processNextInQueue(undefined, true);
  };

  if (screen === 'processing') {
    return (
      <ProcessingScreen
        queueItems={queueItems}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((p) => !p)}
        onCancelToDropzone={handleReturnToDropzone}
        onViewResults={handleViewResults}
        onAddFiles={(files) => handleAddFilesInQueue(files, false)}
        onRemoveQueueItem={handleRemoveQueueItem}
      />
    );
  }

  if (screen === 'report' && selectedReportId) {
    const completed = completedMapRef.current.get(selectedReportId);
    if (completed) {
      const openFiles: OpenDocumentSummary[] = [];
      for (const [id, entry] of completedMapRef.current.entries()) {
        const stateForFile = reviewStatesByFile[id] ?? createEmptyReviewState();
        openFiles.push({
          id,
          name: entry.fileName,
          pages: entry.result.header.pagesScanned,
          flagged: entry.result.header.flaggedTotal,
          editedCount: countEditedPages(stateForFile),
        });
      }

      const activeReviewState =
        reviewStatesByFile[selectedReportId] ?? createEmptyReviewState();

      return (
        <AuditReportScreen
          activeFileId={selectedReportId}
          fileName={completed.fileName}
          result={completed.result}
          pdfDoc={completed.pdfDoc}
          openFiles={openFiles}
          reviewState={activeReviewState}
          onChangeReviewState={(nextState) =>
            setReviewStatesByFile((prev) => ({
              ...prev,
              [selectedReportId]: nextState,
            }))
          }
          onSwitchFile={(id) => {
            if (completedMapRef.current.has(id)) {
              setSelectedReportId(id);
            }
          }}
          onAddFiles={(files) => handleAddFilesInQueue(files, true)}
          onLoadSample={handleLoadSampleInEditor}
          onCloseFile={(id) => handleRemoveQueueItem(id)}
          onUploadAnother={handleReturnToDropzone}
        />
      );
    }
  }

  return (
    <DropzoneScreen
      stagedFile={staged}
      errorMessage={errorMessage}
      onSelectFile={handleSelectFile}
      onSelectSample={handleSelectSample}
      onClearFile={handleClearFile}
      onStartAnalysis={handleStartAnalysis}
      onLaunchDemoQuick={() => handleLaunchDemoQuick(false)}
    />
  );
}

