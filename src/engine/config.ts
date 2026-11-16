import type { Verdict } from './types';

export interface EquationFirstConfig {
  /** Minimum extracted characters before a page is treated as unanalyzable/scan */
  minTextCharsForAnalysis: number;
  /** Fraction of page area covered by a single image to classify page as a full-page scan */
  fullPageImageRatio: number;
  /** Images narrower or shorter than this (in PDF points) are ignored (logos, bullets, hairlines) */
  minImageSizePt: number;
  /** Images exceeding this fraction of page area are skipped as diagrams/photos */
  largeImageAreaRatio: number;
  /** Maximum height relative to page height for a clear single-line/display equation image */
  clearEqMaxHeightRatio: number;
  /** Minimum width-to-height aspect ratio for a clear equation image */
  clearEqMinAspect: number;
  /** Maximum width relative to page width for a clear equation image */
  clearEqMaxWidthRatio: number;
  /** Horizontal center lower bound (fraction of page width) for centered equations */
  clearEqCenterMin: number;
  /** Horizontal center upper bound (fraction of page width) for centered equations */
  clearEqCenterMax: number;
  /** Minimum length for alt text to be considered usable */
  minAltTextLength: number;
  /** Generic placeholder labels treated as missing alt text */
  junkAltWords: string[];
  /** Common image extensions indicating filename-only alt text */
  junkAltExtensions: string[];
  /** Number of suspected equations that triggers Escalate instead of Fix now */
  escalateThresholdCount: number;
  /** Minimum Unicode math characters on a page to trigger the text-math notice */
  textMathMinStrongChars: number;
  /** Minimum text equation lines on a page to trigger the text-math notice */
  textMathMinEqLines: number;
  /** Tie-break priority order when suspected counts are equal */
  verdictSortOrder: Record<Verdict, number>;
  /** Exact honesty line required in UI and export */
  honestyLine: string;
  /** Next-action instructions per verdict */
  nextActions: Record<Verdict, string>;
  /** Privacy statement toggle (only enabled after network-off verification) */
  claimNoUpload: boolean;
}

export const DEFAULT_CONFIG: EquationFirstConfig = {
  minTextCharsForAnalysis: 20,
  fullPageImageRatio: 0.8,
  minImageSizePt: 10,
  largeImageAreaRatio: 0.35,
  clearEqMaxHeightRatio: 0.12,
  clearEqMinAspect: 1.2,
  clearEqMaxWidthRatio: 0.85,
  clearEqCenterMin: 0.3,
  clearEqCenterMax: 0.7,
  minAltTextLength: 3,
  junkAltWords: ['image', 'picture', 'graphic', 'figure', 'photo', 'img', 'untitled'],
  junkAltExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.tif', '.svg', '.webp'],
  escalateThresholdCount: 6,
  textMathMinStrongChars: 5,
  textMathMinEqLines: 3,
  verdictSortOrder: {
    'FIX NOW': 0,
    'ESCALATE': 1,
    'FIX LATER': 2,
  },
  honestyLine:
    'These are suspected problems only. A person must confirm each one. Fixing an equation does not by itself prove a screen-reader user can understand it.',
  nextActions: {
    'FIX NOW': 'Re-key from the LaTeX or Word source, or replace with text.',
    'FIX LATER': 'Re-key from the LaTeX or Word source, or replace with text. (Lower priority)',
    'ESCALATE':
      'Ask for the LaTeX or Word source. Fallback: a reviewer who can read math re-keys it. Do not guess at equation descriptions.',
  },
  claimNoUpload: true,
};
