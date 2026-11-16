/**
 * Generates a real, spec-compliant binary %PDF-1.4 document in memory
 * containing selectable Helvetica text blocks and real /XObject /Subtype /Image
 * raster bitmap streams (equation images, large diagram, full-page scan, tiny logo).
 *
 * Used by "Sample Equation PDF" / "Try Demo" so the demo runs through the exact
 * same real pdfjs-dist extraction, scoring, and canvas rendering pipeline as any uploaded PDF.
 */

export const SAMPLE_PDF_NAME = 'Calculus_Syllabus_Sample.pdf';

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Creates a clean RGB raster bitmap with crisp dark-ink border and stylized equation/diagram strokes.
 * Returns raw uncompressed RGB bytes (w * h * 3).
 */
function makeRasterRgbBytes(
  w: number,
  h: number,
  variant: 'equation' | 'diagram' | 'scan' | 'logo',
): Uint8Array {
  const buf = new Uint8Array(w * h * 3);
  // Fill warm paper background
  for (let i = 0; i < w * h; i += 1) {
    buf[i * 3] = variant === 'scan' ? 236 : 250;
    buf[i * 3 + 1] = variant === 'scan' ? 232 : 246;
    buf[i * 3 + 2] = variant === 'scan' ? 223 : 238;
  }

  const setPixel = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = (y * w + x) * 3;
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
  };

  // Subtle dark border
  for (let x = 0; x < w; x += 1) {
    setPixel(x, 0, 25, 35, 31);
    setPixel(x, h - 1, 25, 35, 31);
  }
  for (let y = 0; y < h; y += 1) {
    setPixel(0, y, 25, 35, 31);
    setPixel(w - 1, y, 25, 35, 31);
  }

  if (variant === 'equation') {
    // Stylized integral + horizontal fraction bar + curve strokes in carbon ink
    const midY = Math.floor(h / 2);
    // Integral S-curve on left
    for (let y = 4; y < h - 4; y += 1) {
      const t = (y - 4) / Math.max(1, h - 8);
      const sx = Math.round(14 + Math.sin(t * Math.PI * 2) * 3);
      setPixel(sx, y, 25, 35, 31);
      setPixel(sx + 1, y, 25, 35, 31);
    }
    // Fraction / equals strokes
    for (let x = 26; x < w - 16; x += 1) {
      if (x % 14 < 9) {
        setPixel(x, midY - 2, 25, 35, 31);
        setPixel(x, midY + 2, 25, 35, 31);
      }
      const waveY = midY + Math.round(Math.sin(x * 0.22) * (h * 0.22));
      setPixel(x, waveY, 184, 61, 39);
    }
  } else if (variant === 'diagram') {
    // Coordinate axes and sinusoidal wave
    const midX = Math.floor(w / 2);
    const midY = Math.floor(h / 2);
    for (let x = 10; x < w - 10; x += 1) setPixel(x, midY, 25, 35, 31);
    for (let y = 10; y < h - 10; y += 1) setPixel(midX, y, 25, 35, 31);
    for (let x = 12; x < w - 12; x += 1) {
      const y = midY - Math.round(Math.sin((x - 12) * 0.12) * (h * 0.3));
      setPixel(x, y, 184, 61, 39);
      setPixel(x, y + 1, 184, 61, 39);
    }
  } else if (variant === 'scan') {
    // Simulated scanned document horizontal lines
    for (let row = 18; row < h - 18; row += 12) {
      for (let x = 14; x < w - 14; x += 1) {
        if ((x + row) % 9 !== 0) {
          setPixel(x, row, 75, 80, 78);
        }
      }
    }
  } else {
    // Tiny logo block
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        setPixel(x, y, 184, 61, 39);
      }
    }
  }

  return buf;
}

interface PlacedImage {
  name: string;
  x: number;
  yFromTop: number;
  w: number;
  h: number;
  variant: 'equation' | 'diagram' | 'scan' | 'logo';
}

interface SamplePageSpec {
  heading: string;
  lines: string[];
  images: PlacedImage[];
}

export function buildSamplePdfBytes(): Uint8Array {
  const PAGE_W = 612;
  const PAGE_H = 792;

  const pageSpecs: SamplePageSpec[] = [
    {
      heading: 'MATH 301: ADVANCED CALCULUS & DIFFERENTIAL EQUATIONS',
      lines: [
        'Page 1 - Syllabus Overview and Course Policies',
        'This course covers multivariable integration, Gauss divergence, Stokes theorem,',
        'and boundary-value differential equations across fourteen instructional weeks.',
        'All definitions on this introductory page are encoded as selectable text.',
      ],
      images: [],
    },
    {
      heading: 'SECTION 2: NON-ADIABATIC COOLING DIAGRAM',
      lines: [
        'Page 2 - Reference Manifold Illustration (Large Diagram Skipped)',
        'Below is a large phase-space reference diagram exceeding 35 percent of page area.',
      ],
      images: [{ name: 'ImDiag1', x: 86, yFromTop: 220, w: 440, h: 400, variant: 'diagram' }],
    },
    {
      heading: 'SECTION 3: GAUSSIAN KERNEL & NORMALIZATION',
      lines: [
        'Page 3 - Two Embedded Equation Screenshots (FIX NOW)',
        'Under boundary conditions of non-adiabatic flow, the dispersion kernel follows:',
        'And the normalized probability density over the real line evaluates to:',
      ],
      images: [
        { name: 'ImEq3a', x: 146, yFromTop: 250, w: 320, h: 48, variant: 'equation' },
        { name: 'ImEq3b', x: 146, yFromTop: 360, w: 320, h: 48, variant: 'equation' },
      ],
    },
    {
      heading: 'SECTION 4: STOKES BOUNDARY MANIFOLD',
      lines: [
        'Page 4 - Ambiguous Diagram / Equation Hybrid (ESCALATE)',
        'Relating line circulation around curve C to curl F produces a tall hybrid figure:',
      ],
      images: [{ name: 'ImAmb4', x: 166, yFromTop: 260, w: 280, h: 150, variant: 'diagram' }],
    },
    {
      heading: 'SECTION 5: SURFACE FLUX INTEGRAL',
      lines: [
        'Page 5 - Single Suspected Equation Image (FIX LATER)',
        'Let S be a smooth oriented surface parameterized by r(u, v). The flux integral is:',
      ],
      images: [{ name: 'ImEq5', x: 156, yFromTop: 260, w: 300, h: 46, variant: 'equation' }],
    },
    {
      heading: 'SECTION 6: VECTOR DIVERGENCE DERIVATION',
      lines: [
        'Page 6 - Three Suspected Equation Images (FIX NOW)',
        'Three consecutive derivation steps were pasted as bitmap screenshots:',
      ],
      images: [
        { name: 'ImEq6a', x: 150, yFromTop: 220, w: 312, h: 44, variant: 'equation' },
        { name: 'ImEq6b', x: 150, yFromTop: 310, w: 312, h: 44, variant: 'equation' },
        { name: 'ImEq6c', x: 150, yFromTop: 400, w: 312, h: 44, variant: 'equation' },
      ],
    },
    {
      heading: 'SECTION 7: CUMULATIVE FORMULA SHEET',
      lines: [
        'Page 7 - Six Equation Images on One Page (ESCALATE)',
        'Six stacked display equation screenshots appear below with no alt text:',
      ],
      images: [
        { name: 'ImEq7a', x: 150, yFromTop: 190, w: 312, h: 38, variant: 'equation' },
        { name: 'ImEq7b', x: 150, yFromTop: 250, w: 312, h: 38, variant: 'equation' },
        { name: 'ImEq7c', x: 150, yFromTop: 310, w: 312, h: 38, variant: 'equation' },
        { name: 'ImEq7d', x: 150, yFromTop: 370, w: 312, h: 38, variant: 'equation' },
        { name: 'ImEq7e', x: 150, yFromTop: 430, w: 312, h: 38, variant: 'equation' },
        { name: 'ImEq7f', x: 150, yFromTop: 490, w: 312, h: 38, variant: 'equation' },
      ],
    },
    {
      heading: 'SECTION 8: PROBLEM SET GUIDELINES',
      lines: [
        'Page 8 - Text-Only Instructional Notes',
        'Submit all problem sets in accessible formats. Show clear intermediate steps',
        'for partial credit on boundary-condition proofs.',
      ],
      images: [],
    },
    {
      heading: 'SECTION 9: TEXT-BASED EQUATION REFERENCE',
      lines: [
        'Page 9 - Equations Written as Plain Text',
        'Energy-mass equivalence: E = mc2',
        'Newton second law: F = ma',
        'Pythagorean identity: a2 + b2 = c2',
        'Linear slope intercept: y = mx + b',
      ],
      images: [],
    },
    {
      heading: '',
      lines: [],
      images: [{ name: 'ImScan10', x: 16, yFromTop: 16, w: 580, h: 760, variant: 'scan' }],
    },
    {
      heading: 'SECTION 11: DEPARTMENT SEAL & FOOTER NOTE',
      lines: [
        'Page 11 - Text With Tiny 8x8pt Logo Mark (Ignored)',
        'The small decorative corner mark under 10pt is ignored by equation heuristics.',
      ],
      images: [{ name: 'ImLogo11', x: 72, yFromTop: 720, w: 8, h: 8, variant: 'logo' }],
    },
    {
      heading: 'SECTION 12: END OF SAMPLE SYLLABUS',
      lines: [
        'Page 12 - Summary & Office Hours',
        'Office hours are held Tuesdays and Thursdays 2:00 PM - 4:00 PM in Hall 204.',
      ],
      images: [],
    },
  ];

  // Build PDF objects manually
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0]; // 1-indexed objects; obj 0 is free
  let byteLength = 0;

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    byteLength += bytes.length;
  };
  const pushStr = (s: string) => pushBytes(encoder.encode(s));

  pushStr('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // Object numbering:
  // 1: Catalog
  // 2: Pages
  // 3: Font (/F1 Helvetica)
  // 4: Font (/F2 Helvetica-Bold)
  // 5..8: Shared XObject Images (4 variants: equation, diagram, scan, logo)
  // For each page i (0..11): Page obj + Content stream obj

  const OBJ_CATALOG = 1;
  const OBJ_PAGES = 2;
  const OBJ_FONT_REG = 3;
  const OBJ_FONT_BOLD = 4;
  const OBJ_IMG_EQ = 5;
  const OBJ_IMG_DIAG = 6;
  const OBJ_IMG_SCAN = 7;
  const OBJ_IMG_LOGO = 8;

  const firstPageObj = 9;
  const pageObjIds: number[] = [];

  const beginObj = (id: number) => {
    offsets[id] = byteLength;
    pushStr(`${id} 0 obj\n`);
  };
  const endObj = () => pushStr('\nendobj\n');

  // 1. Catalog
  beginObj(OBJ_CATALOG);
  pushStr(`<< /Type /Catalog /Pages ${OBJ_PAGES} 0 R >>`);
  endObj();

  // Compute page object IDs first
  for (let i = 0; i < pageSpecs.length; i += 1) {
    pageObjIds.push(firstPageObj + i * 2);
  }

  // 2. Pages
  beginObj(OBJ_PAGES);
  pushStr(
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageSpecs.length} >>`,
  );
  endObj();

  // 3 & 4. Fonts
  beginObj(OBJ_FONT_REG);
  pushStr('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  endObj();

  beginObj(OBJ_FONT_BOLD);
  pushStr('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  endObj();

  // 5..8. Image XObjects
  const writeImageObj = (objId: number, pxW: number, pxH: number, variant: 'equation' | 'diagram' | 'scan' | 'logo') => {
    const raw = makeRasterRgbBytes(pxW, pxH, variant);
    beginObj(objId);
    pushStr(
      `<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${raw.length} >>\nstream\n`,
    );
    pushBytes(raw);
    pushStr('\nendstream');
    endObj();
  };

  writeImageObj(OBJ_IMG_EQ, 160, 28, 'equation');
  writeImageObj(OBJ_IMG_DIAG, 180, 140, 'diagram');
  writeImageObj(OBJ_IMG_SCAN, 140, 180, 'scan');
  writeImageObj(OBJ_IMG_LOGO, 8, 8, 'logo');

  const variantToObj = {
    equation: OBJ_IMG_EQ,
    diagram: OBJ_IMG_DIAG,
    scan: OBJ_IMG_SCAN,
    logo: OBJ_IMG_LOGO,
  };

  // Write each page + content stream
  pageSpecs.forEach((spec, idx) => {
    const pageId = firstPageObj + idx * 2;
    const contentId = pageId + 1;

    const xobjEntries = spec.images
      .map((im) => `/${im.name} ${variantToObj[im.variant]} 0 R`)
      .join(' ');

    beginObj(pageId);
    pushStr(
      `<< /Type /Page /Parent ${OBJ_PAGES} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${OBJ_FONT_REG} 0 R /F2 ${OBJ_FONT_BOLD} 0 R >> /XObject << ${xobjEntries} >> >> /Contents ${contentId} 0 R >>`,
    );
    endObj();

    const ops: string[] = [];
    if (spec.heading) {
      ops.push('BT');
      ops.push('/F2 15 Tf');
      ops.push(`72 ${PAGE_H - 72} Td`);
      ops.push(`(${escapePdfText(spec.heading)}) Tj`);
      ops.push('ET');
    }

    spec.lines.forEach((line, lineIdx) => {
      ops.push('BT');
      ops.push('/F1 11 Tf');
      ops.push(`72 ${PAGE_H - 110 - lineIdx * 20} Td`);
      ops.push(`(${escapePdfText(line)}) Tj`);
      ops.push('ET');
    });

    for (const im of spec.images) {
      const yBottom = PAGE_H - im.yFromTop - im.h;
      ops.push('q');
      ops.push(`${im.w} 0 0 ${im.h} ${im.x} ${yBottom} cm`);
      ops.push(`/${im.name} Do`);
      ops.push('Q');
    }

    const streamStr = ops.join('\n');
    const streamBytes = encoder.encode(streamStr);

    beginObj(contentId);
    pushStr(`<< /Length ${streamBytes.length} >>\nstream\n`);
    pushBytes(streamBytes);
    pushStr('\nendstream');
    endObj();
  });

  // Cross-reference table
  const xrefOffset = byteLength;
  const totalObjs = offsets.length;
  pushStr(`xref\n0 ${totalObjs}\n`);
  pushStr('0000000000 65535 f \n');
  for (let i = 1; i < totalObjs; i += 1) {
    const off = String(offsets[i]).padStart(10, '0');
    pushStr(`${off} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${totalObjs} /Root ${OBJ_CATALOG} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const out = new Uint8Array(byteLength);
  let pos = 0;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  return out;
}
