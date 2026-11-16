# EquationFirst: Build Plan for a Web Coding Agent

For Morax · Nov 16, 2026 · Source: the EquationFirst spec (AccessED Hacks, hard deadline Fri Nov 20, 5:00 PM ET). Thresholds below are starting guesses, not findings. I have not run any of these prompts.

## How to use this

1. Paste **Prompt 0** into the agent first. It is the standing brief. If the agent has a rules or knowledge file, put it there too.
2. Then paste one step at a time, in order. Do not paste the next step until the current step's **Done when** list passes.
3. Steps or items marked **MANUAL** are yours, not the agent's: real PDFs, browser tests, the screen-reader check.
4. There are two gates (end of Step 4, end of Step 6). If a gate fails, stop adding features and cut scope.
5. If the agent drifts (adds React, a backend, AI calls, extra features), paste the **Drift reset** at the end.
6. After every step, ask the agent: what did you run, what did you not verify? Do not accept 'it should work'.

| Step | What | When |
| --- | --- | --- |
| 0 | Standing brief | Mon |
| 1 | Skeleton, pdf.js, CSP, opens from a local file | Mon |
| 2 | Synthetic handout, extraction module, test PDFs | Mon |
| 3 | Scoring module (pure rules) | Tue |
| 4 | Node replay, accuracy table, **Gate 1** | Tue |
| 5 | Single-screen interface | Wed |
| 6 | Plain-text export, hardening, **Gate 2** and feature freeze | Wed |
| 7 | README, credits, submission assets | Thu |
| Buffer | No new features | Fri until 5:00 PM ET |

## Prompt 0: Project brief and global rules (paste first)

```
You are building EquationFirst, a small free tool for a hackathon (AccessED Hacks, deadline Nov 20). Read this whole brief before writing any code. Treat it as standing rules for every later step.

WHAT IT IS
A community-college accessibility coordinator drops one STEM course PDF into a web page. The tool lists the pages where equations are probably screenshots with no text alternative (a blind student's screen reader says 'image' or nothing), ranks those pages, gives each flagged page one verdict (Fix now, Fix later, or Escalate), and exports a plain-text task list.

WHAT IT IS NOT
It does not fix, convert, or describe equations. No OCR, no AI model, no MathML or LaTeX output, no accounts, no saved history, no batches, no compliance scores. It covers equations only: not captions, slides, contrast, tables, or general PDF accessibility.

HARD RULES
1. Client-only. No backend, no server calls, no analytics, no telemetry, no upload, no hosted AI. The PDF must never leave the browser. Nothing is stored after the tab closes (no localStorage, no cookies).
2. Plain HTML, CSS, and JavaScript. No framework (no React, Vue, Svelte), no bundler, no TypeScript, no npm build step for the app. The only library is pdf.js, vendored into /vendor. Use a pdf.js build that loads with a plain script tag (not ES modules) so it can work from a local file.
3. Extraction is separate from scoring. extract.js reads one PDF page and returns plain data. scoring.js is a pure function: page data in, rows out. No DOM, no pdf.js, no randomness, no dates. Same input must always give the same output in the same order.
4. Every flag carries a plain-language reason string and a location cue. Verdicts come from one rules table. When the rules are unsure, the verdict is Escalate.
5. Never silent. Pages that cannot be analyzed (scans, no text) are counted and shown. A file whose math is real text gets a notice. Never show a bare '0 flagged' without saying what was not checked.
6. Never claim a page is accessible. Show the honesty line (below) in the UI and in the export.
7. The tool itself must be accessible: one screen, full keyboard use, visible focus, labelled controls, semantic HTML, an aria-live region for progress and results, plain language, contrast of at least 4.5:1, works at 200% zoom.
8. All thresholds live in one config.js with a comment on each. No hidden numbers in code.
9. Small files, plain names, comments that explain why. One person must be able to understand all of it.
10. After each step, tell me: what you built, what you ran, what you did NOT verify, and anything you were unsure about. Do not claim something works unless you ran it. Never invent test results.

HONESTY LINE (exact text)
'These are suspected problems only. A person must confirm each one. Fixing an equation does not by itself prove a screen-reader user can understand it.'

FOLDER LAYOUT
/index.html /app.js /extract.js /scoring.js /export.js /config.js /styles.css
/vendor/ (pdf.js and its worker)
/sample/ (bundled sample PDF)
/test/ (pdfs, labels, scripts)
/README.md

Reply only with: 'Ready. Waiting for Step 1.'
```

## Step 1: Skeleton, pdf.js, and the no-network seatbelt (Mon)

```
Step 1. Create the folder layout with empty but valid files, then build the smallest page that proves the foundation:

1. index.html with a file input (accept .pdf) and a status line.
2. Vendor pdf.js into /vendor, using a build that loads with a plain script tag and includes the worker file. Tell me the exact version, its license, and whether that license allows bundling it in a project like this.
3. When I choose a PDF, load it fully in the browser and show 'N pages' in the status line.
4. The page must work when index.html is opened by double-click from a local folder (file://). If the pdf.js worker cannot load from a file URL, create the worker from a Blob URL built from the vendored worker text, and explain what you did.
5. Add this Content-Security-Policy meta tag in the head: default-src 'none'; script-src 'self' 'unsafe-inline' blob:; worker-src blob: 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: data:. If pdf.js needs more (character maps, fonts), allow only that, and tell me exactly what you widened and why.
6. Build nothing else. No styling, no scoring.
```

**Done when**

- Double-clicking index.html in a browser, choosing a PDF, shows the page count.
- No CSP errors in the console on a normal text PDF.
- The agent has stated the pdf.js version and license, and what it did not test.

**MANUAL:** open it from a local folder in 2 or 3 browsers (for example Chrome, Firefox, Edge or Safari). If the local-file open fails everywhere, tell the agent to document a fallback: run from plain static hosting or a tiny local server. That changes how it is distributed, not the privacy claim.

## Step 2: Synthetic handout and extraction (Mon)

### 2A. Synthetic 12-page physics handout with an answer key

```
Step 2A. Write a script test/make_handout.py that generates test/pdfs/synthetic_physics.pdf, a 12-page physics handout, plus test/labels/synthetic_physics.json. Use reportlab and matplotlib (mathtext) or anything simple that works. Equations must be embedded as PNG images, NOT as text. The pages:

p1 text only
p2 text plus one large circuit-style diagram image
p3 three centered equation images between paragraphs
p4 one medium image that could be an equation or a diagram
p5 text only
p6 two small equation images inline with body text
p7 one centered equation image
p8 seven equation images
p9 equations written as real text characters (Greek letters, operators), no images
p10 one full-page scanned-looking image, no text
p11 text plus a tiny logo image (under 10 points tall)
p12 text only

Label format (JSON): { 'file': 'synthetic_physics.pdf', 'set': 'tuning', 'type': 'synthetic', 'pages': { '1': 'ok', '3': 'broken', ... } } where each page value is one of: ok, broken, ambiguous, scan.
Also write a short test/LABELS.md describing this format, and a script test/new_label.mjs <pdf> that creates a label template listing every page as 'unlabeled'.
Tell me which pages you labeled and why.
```

**Done when:** the PDF opens, pages match the list above, and the label file marks p3, p6, p7, p8 as broken, p4 as ambiguous, p10 as scan, the rest ok.

### 2B. Extraction module

```
Step 2B. Write extract.js. It exports extractPage(pdfDocument, pageNumber, onProgress?) and extractDocument(pdfDocument, onProgress). It takes a pdf.js document object and never touches the DOM, so the same code runs in the browser and in Node.

It returns PageData, plain JSON only:
{
  page: 1-based number,
  width, height: page size in points,
  textCharCount: number,
  textItems: [{ x, y, w, h }]   // from getTextContent, y measured from the top of the page
  images: [{ x, y, w, h }]      // bounding boxes in points, y from the top, from the drawing operators
  mathText: { strongChars: number, equationLines: number },
  tags: { hasStructTree: boolean, figureAlts: [string or null] }  // one entry per Figure or Formula node on this page
}

Rules:
- Images: walk page.getOperatorList(). Track the transform matrix through save, restore, and transform operators. For each image paint operator (image XObject, inline image, image mask), the image fills the unit square under the current matrix. Compute that square's bounding box and convert to a top-left origin. Do not decode pixels.
- mathText.strongChars: count characters in the Unicode math-operator block, the Greek letter blocks, and the mathematical alphanumeric block. mathText.equationLines: count text lines containing an equals sign with letters or digits on both sides.
- tags: use page.getStructTree() and walk it. Collect nodes whose role is Figure or Formula, with their alternative text if this pdf.js version exposes one, else null. TELL ME HONESTLY whether this version exposes alt text and how you checked. If it does not, say so and stop on that part.
- Memory: process pages one at a time, keep only the small records, call page.cleanup() after each page, never keep page images. Call onProgress(done, total) after each page and yield to the event loop between pages so a progress bar can repaint.

Also write test/dump.mjs <pdf> that runs extraction in Node (use the pdfjs-dist npm package, same version as the vendored one, as a dev tool only) and prints PageData as JSON, so I can eyeball it. The app itself still uses no npm.
```

**Done when**

- test/dump.mjs on the synthetic handout shows image counts per page that match the answer key (p3 has 3, p8 has 7, p10 has one full-page image, p9 has math text but no images).
- The agent says plainly whether alt text from the tag tree is readable in this pdf.js version.

**MANUAL (the long pole, do it Monday):**

- Collect 6 to 8 real, openly licensed PDFs: a LaTeX or open textbook, a Word file with the equation editor, a Word file with pasted equation screenshots, a scan, and a publisher-style file. Note each file's license for the credits.
- Also make one small tagged PDF with real alt text on equation images (add alt text in Word, export to PDF). Add it to the set.
- Label about 20 to 30 pages per file, not whole books, using new\_label.mjs.
- **Split into tuning and held-out sets before you look at any results.** Write 'set' in each label file. Keep the synthetic handout in tuning.

## Step 3: Scoring module (Tue)

```
Step 3. Write scoring.js as a pure module that works in both the browser (global EquationFirstScoring) and Node (module.exports). Main function: scoreDocument(pages, config) returns { header, rows, notices, notChecked }. pages is the array of PageData from Step 2B. All numbers come from config.js, each with a comment. These are starting guesses, I will tune them.

RULES
1. Page-type check. A page is 'cannot analyze' if textCharCount is under 20, OR one image covers at least 80% of the page area. These pages are counted, never ranked, never called fine.
2. Classify each image:
   - ignore: shorter or narrower than 10 points
   - large: area over 35% of the page. Not flagged (likely a diagram or photo). Counted as 'large images skipped'.
   - clear equation: height at most 12% of page height, width over height by at least 1.2 times, width at most 85% of page width, AND (its center is within 30% to 70% of page width, OR it overlaps the vertical range of a text item)
   - ambiguous: every other image that is not ignored or large
3. Alt text coverage (a page-level approximation, say so in the notChecked list). Usable alt text is not null and not junk. Junk means: empty or whitespace, shorter than 3 characters, ends in a common image file extension, looks like a file name (no spaces and contains a dot), or equals one of: image, picture, graphic, figure, photo, img, untitled (any case). Take the count of usable alts on the page and subtract it from the clear count first, then from the ambiguous count. What is left is the suspected count.
4. Verdicts, one rules table:
   - Escalate: any ambiguous left, OR total suspected is 6 or more
   - Fix now: 2 to 5 clear, no ambiguous
   - Fix later: exactly 1 clear, no ambiguous
   - Pages with 0 suspected are not listed.
   Next-action text: Fix now = 'Re-key from the LaTeX or Word source, or replace with text.' Fix later = same text, lower priority. Escalate = 'Ask for the LaTeX or Word source. Fallback: a reviewer who can read math re-keys it. Do not guess at equation descriptions.'
5. Each row has: page, locationCue, reason, verdict, nextAction, suspectedCount. Reason is plain language, for example '3 images that look like equations, no text alternative'. Location cue is the vertical third of the main image (top third, middle of page, bottom third) plus centered, left, right, or 'in line with text'.
6. Ranking: suspectedCount descending, then verdict order (Fix now, Escalate, Fix later), then page number ascending. Same input, same order.
7. Text-math notice: if the document has no rows AND at least one page has strongChars of 5 or more or equationLines of 3 or more, add the notice 'Math found as text on N pages. Listen to one page with a screen reader to check.' Also add it as a separate notice when some pages have text math and others are flagged.
8. header: pagesScanned, cannotAnalyze, flagged total, and counts per verdict.
9. notChecked: scans count, 'Pages not listed were not confirmed accessible.', the page-level alt text note, large images skipped count.

Also write test/scoring.test.mjs (plain Node, no test framework) with hand-made PageData that checks: each rule above, scan handling, the 0-flagged case still reports what was not checked, identical output on two runs, and tie order. Run it and show me the output.
```

**Done when:** the test script runs green and the agent shows the output. Scoring has no DOM or pdf.js import anywhere.

## Step 4: Node replay and accuracy table, then Gate 1 (Tue)

```
Step 4. Write test/replay.mjs. For every PDF in test/pdfs that has a label file: extract with pdfjs-dist in Node, cache the PageData in test/cache/<name>.json, score it with scoring.js and config.js, and compare against the labels. Only labeled pages count.

Print one table, grouped by file type and by set (tuning, heldout): truly broken pages, broken pages found in the list, broken pages missed, total flagged pages, false flags (flagged pages whose label is not broken). Report COUNTS, not percentages. Then list every miss and every false flag by file and page. Also print, for each file, whether it was reported as 'cannot analyze' or 'math found as text' when it should be (never silent).
Support --set tuning and --set heldout. Never change thresholds inside the replay script.
One command: node test/replay.mjs
```

**Gate 1 (end of Tuesday). Starting bars, set before testing:**

- At least 8 of 10 truly broken pages appear in the list.
- No more than 1 in 3 flagged pages is wrong.
- Non-image files say 'cannot analyze' or 'math found as text', never silence.

**How to run the gate honestly**

- Tune config.js using the **tuning** set only.
- Run the **held-out** set once at the end and report what it says, misses and false flags included.
- If the bars are missed: stop adding features, tune, and report the real numbers. The minimum submission is still the detector, ranked list with reasons, honesty line, limitations, and real test results, even weak ones.

## Step 5: Interface (Wed)

```
Step 5. Build the single-screen interface in index.html, app.js, and styles.css, on top of the existing extract.js and scoring.js. Do not change their logic.

STATES: empty, analyzing (progress), results, error.
SCREEN CONTENT, top to bottom:
- h1 'EquationFirst' and one plain sentence: 'Find the equations to fix first.' Below it, a small line: 'Early prototype: flags suspected problems for human review.'
- A file picker styled as a button, plus optional drag and drop (never required). A second button: 'Try the sample PDF'.
- Privacy sentence 'This page runs in your browser and does not send your PDF anywhere.' controlled by a flag claimNoUpload in config.js, default false. Do not show it unless the flag is true.
- Progress bar with 'Page X of N', also announced through a polite aria-live region.
- Results: a summary line (pages scanned, could not analyze, flagged with verdict counts), then notices, then an ordered list of rows. Each row shows page, location cue, reason, verdict as visible text (not color alone), and the next action.
- A 'What was not checked' section, then the honesty line.
- Button 'Download list (.txt)'.
RULES:
- Rows are rendered from the same row data that the export will use.
- 'Try the sample PDF' must run the real extraction and scoring. Embed the sample PDF as base64 in sample/sample.js and decode it to bytes, so it works from a local file with no fetch.
- After analysis finishes, move keyboard focus to the results heading.
- Logical tab order, visible focus ring, labels on every control, buttons are real buttons, no motion, readable at 200% zoom.
- Errors in plain language: not a PDF, password-protected, damaged, zero pages. Never crash.
```

**Done when:** the sample runs end to end; the list on screen matches the Node replay for the same file; the whole page works with the keyboard alone.

## Step 6: Export, hardening, Gate 2 (Wed)

```
Step 6. Write export.js: buildExport(result, meta) returns a plain-text string, where meta holds file name, page count, and generated time (passed in, so scoring stays pure). Wire the download button (Blob plus a download link), file name equationfirst_<pdfname>.txt. Format, plain text only, no tables, no emoji:

EquationFirst list: <file name>
Generated: <local date and time> · Pages scanned: N · Could not analyze: N (scan) · Flagged: N (x Fix now, y Fix later, z Escalate)
<honesty line>
<any notices>

1. p.7 · middle of page · 3 images that look like equations, no text alternative · FIX NOW
   <next action>
2. ...

What was not checked:
- <list from notChecked>

The on-screen list and the export must come from the same rows. Add a test that builds both from one result and checks the order and text match.

HARDENING
- Make a 300-page test PDF by repeating the synthetic handout (script in test/). It must finish with the progress bar moving and no frozen tab.
- Check cancelling or reloading mid-analysis does not leave the page stuck.
- Confirm no code path makes a network request. List every place that touches fetch, XHR, WebSocket, or an external URL (pdf.js internals included) and what each is for.
- Do not add features. Report what you ran and what you did not.
```

**MANUAL (Wednesday, before feature freeze)**

- Load the page, switch the browser to offline, run the sample and a real PDF. It must complete.
- Open the browser's Network tab, run a real PDF, and look for any request carrying the file. Only after this passes, set claimNoUpload to true.
- Test the 300-page file on the oldest computer you can get. Write down the machine and the largest file tested.
- **Gate 2:** feature freeze at the end of the day. Decide: named maintainer, or 'this project is archived'.

## Step 7: README, credits, submission assets (Thu)

```
Step 7. Write README.md with: what the tool does and who it is for; how to open it (the order that actually worked: local file, local folder with scripts, or static hosting); the verdict rules and thresholds copied from config.js; the limitations list below; the test table pasted from the real output of node test/replay.mjs (no invented numbers); how to rerun the tests; who maintains it or that it is archived; credits.

Limitations to state: it flags suspected problem pages and does not fix or verify equations; detection is rule-based and will miss some equations and flag some diagrams; a person must confirm each flag; it cannot read scanned pages, it counts them; a page not listed has not been confirmed accessible; alt text is checked at page level and only for obviously empty or generic labels; not tested with real screen-reader users.

Also create a LICENSE file (ask me which license), a THIRD_PARTY.md listing pdf.js with its license and every test PDF with its license and source, and a CREDITS section with a placeholder for how AI tools were used (I will fill it in). List every bracket or placeholder you left so I can fix them. Do not write claims I have not verified: no 'faster than checking by hand', no 'helps blind students'.
```

**MANUAL (Thursday)**

- Run a free screen reader on the exported .txt and on the page (NVDA on Windows, VoiceOver on Mac). Record honest notes on what worked and what did not.
- Side-by-side screenshot: a standard accessibility checker's output on the synthetic handout next to ours. Describe only what you saw, including anything it does better.
- If you want a speed claim, time the by-hand way and the tool way on the same PDF. Otherwise write 'not measured'.
- Demo video from a real run (2 to 3 minutes, captioned), screenshots, Devpost page.
- Fill every bracket. **No brackets left in the submission.**
- Confirm every team member's name and eligibility. Re-read the Devpost rules page once.
- **Submit by the end of Thu Nov 19.** Friday is buffer only. Hard stop Fri Nov 20, 5:00 PM ET.

## Cut list if time slips (in this order)

1. Drop the tag-tree alt text check and treat every candidate image as unprotected. State it in the limitations.
2. Drop 'Try the sample' polish, keep the bundled sample.
3. Ship as a folder or static page instead of a single file.
4. Minimum submission: detector, ranked list with reasons, honesty line, limitations, real test results.

## P1 backlog (only after Gate 2 passes and only if time is left)

Review mode (preview a flagged page with Confirm / Not an equation), spot-check pages, 'request one source file for the whole document' header, editable professor request note, Copy diagnostics button, confidence label (only if High is measurably more reliable than Low). Each one is its own prompt later. Do not start any before Step 6 is done.

## Open decisions for Morax

- **Tie order:** I picked Fix now, then Escalate, then Fix later at equal counts. The spec did not say. Change it in config.js if you disagree.
- **Distribution:** the plan keeps a small folder (index.html plus scripts), which is the spec's own fallback number 2. Merging into one HTML file is a stretch task after Gate 2.
- **Thresholds:** every number in Step 3 other than the spec's 2 to 5, 1, and 6 plus rule is my guess. Tune on the tuning set only.

## Drift reset (paste if the agent goes off track)

```
Stop. Re-read the Step 0 brief. You are drifting from it. Remove anything that adds a framework, a backend, a network call, AI, OCR, new features, or hidden numbers. Keep extraction and scoring separate and scoring pure. Tell me what you removed and what is still not verified. Then continue only the current step.
```
