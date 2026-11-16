export interface RectBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PageData {
  page: number;
  width: number;
  height: number;
  textCharCount: number;
  textItems: RectBox[];
  images: RectBox[];
  mathText: {
    strongChars: number;
    equationLines: number;
  };
  tags: {
    hasStructTree: boolean;
    figureAlts: Array<string | null>;
  };
}

export type ImageCategory = 'ignore' | 'large' | 'clear' | 'ambiguous';

export interface ClassifiedImage extends RectBox {
  id: string;
  category: ImageCategory;
}

export type Verdict = 'FIX NOW' | 'FIX LATER' | 'ESCALATE';

export type PageStatus = Verdict | 'PASS' | 'UNANALYZED' | 'VERIFIED';

export interface AuditRow {
  page: number;
  locationCue: string;
  reason: string;
  verdict: Verdict;
  nextAction: string;
  suspectedCount: number;
  clearCount: number;
  ambiguousCount: number;
  images: ClassifiedImage[];
  title?: string;
  subtitle?: string;
  snippetBefore?: string;
  equationPreview?: string;
  snippetAfter?: string;
  sectionRef?: string;
  evidenceLines?: string[];
  dpiLabel?: string;
  objectLabel?: string;
}

export interface ScoringHeader {
  pagesScanned: number;
  cannotAnalyze: number;
  flaggedTotal: number;
  fixNowCount: number;
  fixLaterCount: number;
  escalateCount: number;
}

export interface ScoringResult {
  header: ScoringHeader;
  rows: AuditRow[];
  notices: string[];
  notChecked: string[];
  cannotAnalyzePages: number[];
  pageSummaries: PageSummaryItem[];
}

export interface PageSummaryItem {
  page: number;
  width: number;
  height: number;
  title: string;
  status: PageStatus;
  suspectedCount: number;
  reason?: string;
  locationCue?: string;
  nextAction?: string;
  images: ClassifiedImage[];
  textCharCount: number;
  mathText: {
    strongChars: number;
    equationLines: number;
  };
  hasStructTree: boolean;
  figureAltsCount: number;
  usableAltsCount: number;
  snippetBefore?: string;
  equationPreview?: string;
  snippetAfter?: string;
  sectionRef?: string;
  evidenceLines?: string[];
  dpiLabel?: string;
  objectLabel?: string;
}

export interface ExportMeta {
  fileName: string;
  pageCount: number;
  generatedAt: string;
}

export type AppScreen = 'dropzone' | 'processing' | 'report';

export interface QueueItem {
  id: string;
  name: string;
  sizeBytes: number;
  sizeLabel: string;
  pagesDone: number;
  totalPages: number;
  status: 'complete' | 'active' | 'queued' | 'error';
  errorMessage?: string;
  isSample?: boolean;
  file?: File;
}

export interface PageReviewEdits {
  statusOverride?: PageStatus;
  pageNote: string;
  equationAlts: Record<string, string>;
}

export interface DocumentReviewState {
  pages: Record<number, PageReviewEdits>;
  history: Array<Record<number, PageReviewEdits>>;
}

