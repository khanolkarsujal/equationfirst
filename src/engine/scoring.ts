import { DEFAULT_CONFIG, type EquationFirstConfig } from './config';
import type {
  AuditRow,
  ClassifiedImage,
  ExportMeta,
  ImageCategory,
  PageData,
  PageSummaryItem,
  RectBox,
  ScoringResult,
  Verdict,
} from './types';

export function isUsableAltText(alt: string | null | undefined, config: EquationFirstConfig = DEFAULT_CONFIG): boolean {
  if (alt == null) return false;
  const trimmed = alt.trim();
  if (trimmed.length < config.minAltTextLength) return false;

  const lower = trimmed.toLowerCase();
  if (config.junkAltWords.includes(lower)) return false;

  for (const ext of config.junkAltExtensions) {
    if (lower.endsWith(ext)) return false;
  }

  // Looks like a filename (no whitespace and contains a dot)
  if (!/\s/.test(trimmed) && trimmed.includes('.')) {
    return false;
  }

  return true;
}

export function overlapsTextVertically(img: RectBox, textItems: RectBox[]): boolean {
  const imgTop = img.y;
  const imgBottom = img.y + img.h;
  for (const item of textItems) {
    const tTop = item.y;
    const tBottom = item.y + item.h;
    if (imgTop <= tBottom && imgBottom >= tTop) {
      return true;
    }
  }
  return false;
}

export function classifyImage(
  img: RectBox,
  pageWidth: number,
  pageHeight: number,
  textItems: RectBox[],
  config: EquationFirstConfig = DEFAULT_CONFIG,
): ImageCategory {
  if (img.w < config.minImageSizePt || img.h < config.minImageSizePt) {
    return 'ignore';
  }

  const pageArea = Math.max(1, pageWidth * pageHeight);
  const imgArea = Math.max(0, img.w * img.h);
  if (imgArea / pageArea > config.largeImageAreaRatio) {
    return 'large';
  }

  const heightRatio = img.h / Math.max(1, pageHeight);
  const widthRatio = img.w / Math.max(1, pageWidth);
  const aspect = img.w / Math.max(1, img.h);
  const centerXRatio = (img.x + img.w / 2) / Math.max(1, pageWidth);
  const isCentered = centerXRatio >= config.clearEqCenterMin && centerXRatio <= config.clearEqCenterMax;
  const inlineWithText = overlapsTextVertically(img, textItems);

  if (
    heightRatio <= config.clearEqMaxHeightRatio &&
    aspect >= config.clearEqMinAspect &&
    widthRatio <= config.clearEqMaxWidthRatio &&
    (isCentered || inlineWithText)
  ) {
    return 'clear';
  }

  return 'ambiguous';
}

export function computeLocationCue(
  img: RectBox,
  pageWidth: number,
  pageHeight: number,
  textItems: RectBox[],
  config: EquationFirstConfig = DEFAULT_CONFIG,
): string {
  const centerYRatio = (img.y + img.h / 2) / Math.max(1, pageHeight);
  let vertical = 'middle of page';
  if (centerYRatio < 1 / 3) {
    vertical = 'top third';
  } else if (centerYRatio > 2 / 3) {
    vertical = 'bottom third';
  }

  const centerXRatio = (img.x + img.w / 2) / Math.max(1, pageWidth);
  const isInline = overlapsTextVertically(img, textItems);

  let horizontal = 'centered';
  if (isInline && (centerXRatio < config.clearEqCenterMin || centerXRatio > config.clearEqCenterMax)) {
    horizontal = 'in line with text';
  } else if (centerXRatio < config.clearEqCenterMin) {
    horizontal = 'left';
  } else if (centerXRatio > config.clearEqCenterMax) {
    horizontal = 'right';
  } else if (isInline) {
    horizontal = 'in line with text';
  }

  return `${vertical}, ${horizontal}`;
}

export function scoreDocument(
  pages: PageData[],
  config: EquationFirstConfig = DEFAULT_CONFIG,
): ScoringResult {
  const rows: AuditRow[] = [];
  const cannotAnalyzePages: number[] = [];
  const pageSummaries: PageSummaryItem[] = [];
  let largeImagesSkipped = 0;
  let textMathPages = 0;

  for (const page of pages) {
    const pageArea = Math.max(1, page.width * page.height);
    const hasFullPageImage = page.images.some(
      (img) => (img.w * img.h) / pageArea >= config.fullPageImageRatio,
    );

    const classifiedImages: ClassifiedImage[] = page.images.map((img, idx) => ({
      ...img,
      id: `Eq-${String(idx + 1).padStart(2, '0')}`,
      category: classifyImage(img, page.width, page.height, page.textItems, config),
    }));

    const usableAltsCount = page.tags.figureAlts.filter((alt) => isUsableAltText(alt, config)).length;

    if (page.textCharCount < config.minTextCharsForAnalysis || hasFullPageImage) {
      cannotAnalyzePages.push(page.page);
      pageSummaries.push({
        page: page.page,
        width: page.width,
        height: page.height,
        title: `Page ${page.page} (Scan / No Text)`,
        status: 'UNANALYZED',
        suspectedCount: 0,
        reason: hasFullPageImage
          ? 'Full-page scanned image detected; cannot inspect embedded equations without OCR.'
          : 'Insufficient extractable text (< 20 characters); treated as unanalyzable.',
        images: classifiedImages,
        textCharCount: page.textCharCount,
        mathText: page.mathText,
        hasStructTree: page.tags.hasStructTree,
        figureAltsCount: page.tags.figureAlts.length,
        usableAltsCount,
      });
      continue;
    }

    if (
      page.mathText.strongChars >= config.textMathMinStrongChars ||
      page.mathText.equationLines >= config.textMathMinEqLines
    ) {
      textMathPages += 1;
    }

    let clearCount = 0;
    let ambiguousCount = 0;
    const candidateImages: ClassifiedImage[] = [];

    for (const cImg of classifiedImages) {
      if (cImg.category === 'large') {
        largeImagesSkipped += 1;
      } else if (cImg.category === 'clear') {
        clearCount += 1;
        candidateImages.push(cImg);
      } else if (cImg.category === 'ambiguous') {
        ambiguousCount += 1;
        candidateImages.push(cImg);
      }
    }

    // Subtract usable alt text coverage from clear first, then ambiguous
    let remainingAlts = usableAltsCount;
    const clearAfterAlts = Math.max(0, clearCount - remainingAlts);
    remainingAlts = Math.max(0, remainingAlts - clearCount);
    const ambiguousAfterAlts = Math.max(0, ambiguousCount - remainingAlts);

    const suspectedCount = clearAfterAlts + ambiguousAfterAlts;

    if (suspectedCount === 0) {
      pageSummaries.push({
        page: page.page,
        width: page.width,
        height: page.height,
        title: `Page ${page.page}`,
        status: 'PASS',
        suspectedCount: 0,
        images: classifiedImages,
        textCharCount: page.textCharCount,
        mathText: page.mathText,
        hasStructTree: page.tags.hasStructTree,
        figureAltsCount: page.tags.figureAlts.length,
        usableAltsCount,
      });
      continue;
    }

    let verdict: Verdict;
    if (ambiguousAfterAlts > 0 || suspectedCount >= config.escalateThresholdCount) {
      verdict = 'ESCALATE';
    } else if (clearAfterAlts >= 2) {
      verdict = 'FIX NOW';
    } else {
      verdict = 'FIX LATER';
    }

    const primaryImg =
      candidateImages.find((img) => img.category === 'clear') ?? candidateImages[0];
    const locationCue = primaryImg
      ? computeLocationCue(primaryImg, page.width, page.height, page.textItems, config)
      : 'middle of page, centered';

    let reason = '';
    if (clearAfterAlts > 0 && ambiguousAfterAlts === 0) {
      reason =
        clearAfterAlts === 1
          ? '1 image that looks like an equation, no text alternative'
          : `${clearAfterAlts} images that look like equations, no text alternative`;
    } else if (clearAfterAlts === 0 && ambiguousAfterAlts > 0) {
      reason =
        ambiguousAfterAlts === 1
          ? '1 image that may be an equation or a diagram, no text alternative'
          : `${ambiguousAfterAlts} images that may be equations or diagrams, no text alternative`;
    } else {
      reason = `${clearAfterAlts} equation-like and ${ambiguousAfterAlts} ambiguous images, no text alternative`;
    }

    const nextAction = config.nextActions[verdict];

    const row: AuditRow = {
      page: page.page,
      locationCue,
      reason,
      verdict,
      nextAction,
      suspectedCount,
      clearCount: clearAfterAlts,
      ambiguousCount: ambiguousAfterAlts,
      images: classifiedImages,
    };

    rows.push(row);
    pageSummaries.push({
      page: page.page,
      width: page.width,
      height: page.height,
      title: `Page ${page.page}`,
      status: verdict,
      suspectedCount,
      reason,
      locationCue,
      nextAction,
      images: classifiedImages,
      textCharCount: page.textCharCount,
      mathText: page.mathText,
      hasStructTree: page.tags.hasStructTree,
      figureAltsCount: page.tags.figureAlts.length,
      usableAltsCount,
    });
  }

  // Deterministic ranking: suspectedCount desc, verdict priority, page number asc
  rows.sort((a, b) => {
    if (b.suspectedCount !== a.suspectedCount) {
      return b.suspectedCount - a.suspectedCount;
    }
    const orderDiff = config.verdictSortOrder[a.verdict] - config.verdictSortOrder[b.verdict];
    if (orderDiff !== 0) return orderDiff;
    return a.page - b.page;
  });

  const fixNowCount = rows.filter((r) => r.verdict === 'FIX NOW').length;
  const fixLaterCount = rows.filter((r) => r.verdict === 'FIX LATER').length;
  const escalateCount = rows.filter((r) => r.verdict === 'ESCALATE').length;

  const notices: string[] = [];
  if (textMathPages > 0) {
    const noun = textMathPages === 1 ? '1 page' : `${textMathPages} pages`;
    notices.push(
      `Math found as text on ${noun}. Listen to one page with a screen reader to check.`,
    );
  }

  const notChecked: string[] = [
    `Pages skipped because they appear to be scans or have < ${config.minTextCharsForAnalysis} characters: ${cannotAnalyzePages.length}`,
    `Large images skipped (> ${Math.round(config.largeImageAreaRatio * 100)}% of page area, likely diagrams or photos): ${largeImagesSkipped}`,
    'Alt text is checked at page level only and treats obviously empty, filename-like, or generic labels as missing.',
    'Pages not listed were not confirmed accessible.',
  ];

  return {
    header: {
      pagesScanned: pages.length,
      cannotAnalyze: cannotAnalyzePages.length,
      flaggedTotal: rows.length,
      fixNowCount,
      fixLaterCount,
      escalateCount,
    },
    rows,
    notices,
    notChecked,
    cannotAnalyzePages,
    pageSummaries,
  };
}

export function buildExportText(
  result: ScoringResult,
  meta: ExportMeta,
  config: EquationFirstConfig = DEFAULT_CONFIG,
): string {
  const { header, rows, notices, notChecked } = result;
  const lines: string[] = [];

  lines.push(`EquationFirst list: ${meta.fileName}`);
  lines.push(
    `Generated: ${meta.generatedAt} · Pages scanned: ${header.pagesScanned} · Could not analyze: ${header.cannotAnalyze} (scan) · Flagged: ${header.flaggedTotal} (${header.fixNowCount} Fix now, ${header.fixLaterCount} Fix later, ${header.escalateCount} Escalate)`,
  );
  lines.push(config.honestyLine);

  if (notices.length > 0) {
    lines.push('');
    for (const notice of notices) {
      lines.push(`Notice: ${notice}`);
    }
  }

  lines.push('');
  if (rows.length === 0) {
    lines.push('0 pages flagged for suspected image-only equations.');
  } else {
    rows.forEach((row, index) => {
      lines.push(
        `${index + 1}. p.${row.page} · ${row.locationCue} · ${row.reason} · ${row.verdict}`,
      );
      lines.push(`   ${row.nextAction}`);
    });
  }

  lines.push('');
  lines.push('What was not checked:');
  for (const item of notChecked) {
    lines.push(`- ${item}`);
  }

  return lines.join('\n');
}
