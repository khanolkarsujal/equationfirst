# EquationFirst

**One learner. One barrier. One tool.**

*AccessED Hacks entry · Door: Interact (readable, screen-reader-friendly learning material) · Build window Oct 17 – Nov 20, 2026 · Submission due Nov 20, 5:00 PM ET*

*Status, Nov 16: MVP chosen and cut to fit a 4-day build. Nothing below is a test result yet. Numbers marked "starting bar" are guesses to be tuned, not findings.*

**Builder and maintainer:** Akhilesh Tanti (add any other team members before submitting). Architecture chosen on Nov 16 after comparing two drafts; see section 8.

> **Pitch:** A community-college accessibility coordinator can use EquationFirst to stop guessing which pages of a STEM course PDF to fix first, via a ranked list that flags suspected unreadable equations and says Fix now, Fix later, or Escalate.

---

## 1. The Learner

**A blind or low-vision STEM student at a community college who uses a screen reader.**

She opens her course PDF. Every equation is a screenshot, so her screen reader says nothing, or just "image." She can read the words around the math but not the math.

## 2. The Person Who Can Fix It (the tool's user)

**A community-college accessibility coordinator** who has to make that course usable before a deadline. She has a pile of STEM PDFs, limited hours, a few student workers, and no quick way to tell which pages to start with. Her general checkers return one long, mixed list.

## 3. The One Barrier

**Equations in course PDFs are inaccessible, and nobody can tell which pages are the worst.**

Only that. Not captions, slides, contrast, tables, or general PDF structure.

## 4. What We Assume (not yet validated)

We have interviewed no one. These come from our own reading of the problem.

- **Her jobs:** find the equation pages a screen reader cannot read; decide what to fix first; decide per page whether to patch the PDF, fix it later, or ask the professor for the source file; give a student worker a clear, small task list; do it without sending course files to another service.
- **Where it hurts today:** equations are not separated out in broad checker lists; judging whether an image is an equation can mean opening pages by hand; it is unclear when to stop patching and ask for the source file; vague tasks waste student-worker time; new services may need approval; deadline pressure leaves little time for page-by-page review.

## 5. Unmet Needs and How the MVP Answers Them

| Unmet need | MVP answer |
|---|---|
| See the equation pages first | Pages ranked by number of suspected image-only equations |
| A decision, not a list | One verdict per flagged page: Fix now, Fix later, or Escalate |
| Know when to stop patching | Escalate names the source file to request (LaTeX or Word) and a fallback |
| A task list a student worker can use without a lecture | One-page plain-text list: page, location cue, reason, next action |
| Reasons she can check | Every row says why it was flagged |
| Do not mistake a quiet page for a safe one | Pages it cannot read are counted; text-math files get a notice, not a bare "0 flagged" |
| Check without uploading | Runs in the browser; the PDF is not sent anywhere (claimed only after we check) |

**A real need we do not solve:** confirming that a fixed equation is understandable through a screen reader. That needs a person and real testing. We say so.

---

## 6. The MVP (chosen)

**EquationFirst: a free, single-file, in-browser tool. Drop in a STEM PDF, get a ranked list of pages where equations are probably images with no text alternative, each with one verdict, and download it as a plain-text list.**

### What it does

1. **Drop one PDF** into one HTML file. No install, no account. Works with the network off once loaded.
2. **Page-type check.** Pages with no text, or one full-page image (scans), are counted and set aside. They are never ranked and never called fine.
3. **Equation check.** Images that look like equations are flagged unless the PDF's tags already give them alternative text. Each flag has a plain-language reason and a location cue (for example, "middle of page, centered"). Alternative text that is empty, a file name, or generic ("image") counts as none (starting list).
4. **Text-math notice.** If no image equations are found but math appears as text (a LaTeX-style export), it says "math found as text on N pages, listen to one page" instead of "0 flagged."
5. **Verdict and export.** One verdict per flagged page. Download a one-page .txt with header counts, ranked rows, what was not checked, and the honesty line.

### Verdict rules (starting guesses, tuned on Day 2; the shipped rules are copied into the README)

| Verdict | When (starting rule) | Next action shown |
|---|---|---|
| **Fix now** | 2–5 suspected equations on the page, clear signals | Re-key from the source, or replace with text |
| **Fix later** | One suspected equation, clear signals | Same, lower priority |
| **Escalate** | The rules are unsure (could be a diagram), or 6+ suspected equations on one page | Ask for the LaTeX or Word source; if it does not come, a reviewer who can read math re-keys it. Do not guess at equation descriptions. |

Ranking: by number of suspected equations, then verdict. Same input, same order. Ties keep page order.

### Build list

| Ship in this build (P0) | Cut for now (P1, only if time is left) |
|---|---|
| Local PDF input (pdf.js, bundled) | Review mode: preview a page, "Confirm" / "Not an equation" |
| Page-type check, with count | "Pages needed soonest" range box |
| Equation-image rules + tag-tree text-alternative check | Course, deadline, instructor fields |
| Text-math notice | Three random spot-check pages |
| Ranking, verdicts, reason strings | "Most pages flagged: request one source file for the whole document" header |
| Plain-text export with header counts and honesty line | Editable professor request note (stretch) |
| One accessible screen: keyboard use, plain language | **Confidence label (High / Medium / Low):** kept only if High is measurably more reliable than Low on real files. Until then, Escalate is how the tool admits it is unsure. |
| Bundled sample PDF the real tool runs on (a judge can try it in one step); Node replay script for the accuracy table | "Copy diagnostics" button: network-free counts a user can paste anywhere |

### Illustrative output (layout mock-up, not a test result)

```
EquationFirst list: physics_ch2.pdf
Pages scanned: 12 · Could not analyze: 1 (scan) · Flagged: 4 (1 Fix now, 1 Fix later, 2 Escalate)
Suspected problems only. A person must confirm each one. Pages not listed were not confirmed accessible.

1. p.7 · middle of page · 3 images that look like equations, no text alternative · FIX NOW
   Re-key from the LaTeX or Word source, or replace with text.
2. p.4 · top third, centered · image that may be an equation or a diagram · ESCALATE
   Ask for the LaTeX or Word source. Fallback: a reviewer who can read math.
```

### Architecture (chosen): client-only, extraction split from scoring

One static page, plain JavaScript, no server, no account, no telemetry, nothing stored after the tab closes. There is one user and one PDF at a time, so "scale" means pages per file (up to about 300), not traffic. The core of the project is the detection and verdict rules. Parsing, interface, and export are supporting work. Budget: $0. pdf.js is bundled (confirm its license allows bundling).

**Flow:** PDF file → extract page features (one page at a time) → score (a pure function: features in, ranked rows out) → one list of rows → on-screen list and .txt export.

| Decision | Why |
|---|---|
| **Client-only. No backend, no optional "upload for a deeper scan," no hosted AI model.** | Keeps "stays on her computer" true. A private tool with an upload button is not private. Nothing to host, run, or maintain. |
| **Extraction split from scoring.** Extraction reads each page and emits plain data (text items, image boxes, page size, tag info). Scoring is a pure function over that data. | We can replay the labeled PDFs through the scoring module in Node and get the accuracy table from one command. "Same input, same order" becomes testable without clicking through a browser. This is the most useful decision in the design. |
| **Reasons and verdicts are data.** Each rule emits a reason string. Verdicts come from one table, with Escalate as the default when the rules are unsure. | "Reasons she can check" comes for free. The on-screen list and the .txt export read the same rows, so they cannot drift apart. |
| **One PDF library (pdf.js), including its tag-tree reader for alternative text.** | An untagged PDF has no alternative text, so every image region becomes a candidate and the page-type check carries the weight. |
| **Bounded memory.** One page at a time, keep only the small feature records, never cache page images, draw previews only for flagged pages. Progress bar. | A 300-page file on an older machine must not freeze the tab. As far as we know, pdf.js already parses in its own worker. Day 1 check: it still does inside a single file, and the page opens from a local file in 2–3 browsers. We add a worker of our own only if the 300-page test shows a frozen tab. |
| **"No network" enforced from day one.** A Content-Security-Policy tag blocks fetch, XHR, and WebSocket, allowing only what the bundle needs. | A stray network call fails loudly instead of being found on Wednesday. It is a seatbelt, not proof. The network-tab check is the proof. |
| **Export header carries file name, page count, and time generated.** | A list should say which PDF it came from, so it is not mistaken for a newer version. |
| **No build-time ban on network words.** Network use is limited by the CSP tag and proven by the run, not by searching the bundle. | As far as we know, pdf.js's own code mentions network calls, so a text search of the bundle could fail for the wrong reason. Day 1: check the CSP tag still lets pdf.js load what it needs (fonts, character maps) on the physics handout and the real files, and allow only those. |
| **Built for one builder.** Plain JavaScript, no framework, no build step if we can avoid it, no account, no hosting. | One person can hold the whole design in their head, run the accuracy table with one Node command, and cut features without breaking the core. |
| **Opening order for pdf.js.** (1) one HTML file opened from a local folder; (2) the page plus a bundled script folder; (3) plain static hosting. Stop at the first one that works in 2–3 browsers. | Keeps "no install, no setup" as long as possible, and states the fallback honestly. |

**Architecture risks and what we do about them**

- **Detector fails on real files (the plan-killer).** Spike first, no interface, bars set before looking at results.
- **pdf.js worker or local-file opening fails in a single file.** Fall back to plain static hosting. That changes how it is distributed, not the claim, because no server logic touches the PDF. If a single file proves too heavy (pdf.js is a megabyte or two, to check), ship the page plus a bundled script folder and state the size.
- **300 pages exhaust memory.** Test on the oldest machine we can get. State the largest file tested and on what machine.
- **Junk alternative text hides a broken page.** Treat empty, file-name, and generic labels as no text alternative.
- **Live demo fails.** Bundle a sample PDF the real tool runs on, and record the video from a real run. No hidden pre-made results.
- **Library license.** Confirm it allows bundling before we choose.

**What would change this (after the hackathon, not now):** if many real files land in "cannot analyze" (starting guess: over 30%), scans dominate and OCR is needed; if recall stays under the bar after tuning, a model is needed; if coordinators work on whole folders, a command-line tool fits better. Any of these means a bigger tool, and we would not quietly send pages to a server to get there.

### Test bars (starting bars, set before testing)

| Check | Bar | When |
|---|---|---|
| Recall on image-equation files | At least 8 of 10 truly broken pages appear in the list | Tue, end of day (gate) |
| False flags | No more than 1 in 3 flagged pages wrong | Tue, end of day (gate) |
| Non-image files | Says "cannot analyze" or "math found as text"; never silent | Every test file |
| No-upload claim | Network-off run completes; network tab shows no request carrying the file | Wed |
| Output readability | Free screen reader reads the export top to bottom; notes recorded | Thu |
| Time to list | Measured per file before any speed claim | Thu |
| Accuracy table | Scoring module replays the labeled PDFs in Node and prints hits, false flags, and misses per file type from one command | Tue |
| Scale | A 300-page file completes with progress shown and no frozen tab on an older machine; largest file tested and the machine are stated | Thu |

Test set: one synthetic 12-page physics handout with a known answer key, plus 6–8 real, openly licensed PDFs (LaTeX or open textbook, Word with equation editor, Word with pasted screenshots, a scan, a publisher-style file). Label a bounded sample of pages per file (about 20–30), not whole books. Split the files into a **tuning set and a held-out set before looking at any results**. Report counts per file type, including misses. With only about 10 broken pages per bar, report counts, not percentages.

---

## 7. Four-Day Plan (Mon Nov 16 – Fri Nov 20)

| Day | Goal |
|---|---|
| **Mon Nov 16** | Lock this MVP. Collect test PDFs, split tuning vs held-out, write the answer key. Detector spike on real files: image objects per page, tag-tree alternative text. An empty page with the CSP tag opens from a local file in 2–3 browsers with pdf.js working. Confirm pdf.js's license allows bundling, and that the CSP tag allows only what pdf.js needs to run on the physics handout. **No interface work yet.** |
| **Tue Nov 17** | Page-type check, text-math notice, ranking, verdicts, reasons, written as pure scoring functions. Replay the labeled PDFs through them in Node for the accuracy table. **Gate:** if the starting bars are missed, stop adding features, tune, and report honestly. |
| **Wed Nov 18** | Single-screen interface, keyboard use, plain-text export, honesty line. Network-off run and network-tab check. **Feature freeze at end of day.** Decide: named maintainer, or "this project is archived." |
| **Thu Nov 19** | Screen-reader check of the export and the page. Side-by-side screenshot with a standard checker. Demo video, screenshots, README, credits. Fill every bracket in the submission draft from real results. **Submit by the end of the day.** |
| **Fri Nov 20** | Buffer only. No new features. Hard stop 5:00 PM ET. |

**Minimum submission if time slips:** detector, ranked list with reasons, honesty line, limitations, and real-file test results, even weak ones.

---

## 8. Why This MVP (defense)

### Which MVP, and why

| Option reviewed | What it offered | Decision |
|---|---|---|
| **EquationFirst MVP PRD** | Test bars set before testing, text-math notice, page-type check, confidence label made conditional, honesty rules, minimum-submission fallback | **Base.** It is the most defensible about what we can and cannot claim. |
| **Step-by-step PRD** | Persona, tag-tree check for existing alternative text, lean cut for a short deadline, one-line pitch | **Borrowed:** the tag-tree check, the lean cut, the pitch. |
| **Generic four-section PRD** | Sound stories and a 7–10 day estimate | **Not chosen.** The estimate does not fit our window; confidence label is unconditional; no text-math guard; no numeric bars. |

Both longer plans assumed a December deadline. The Devpost event page shows Nov 20, 5:00 PM ET, so the 5-week timeline was replaced with the 4-day plan above.

### Which architecture, and why

| Option reviewed | What it offered | Decision |
|---|---|---|
| **Client-only static page, extraction split from pure scoring, no worker of our own** (first architecture draft) | Fewest moving parts, fits a 3-day build, provable privacy claim, accuracy table from one Node command | **Base.** Best fit for the hackathon brief: small, working, no setup for a judge, and explainable in one paragraph. |
| **Client plus our own Web Worker and a rules module** (second architecture draft) | Reasons and verdicts as data with Escalate as the default, export header, license check, "silence is not safety" as a requirement | **Borrowed:** those items. **Not chosen:** our own worker by default (pdf.js already parses in its own worker, and a second one adds a local-file loading risk) and its December timeline. |
| **Client plus an optional server deep scan** | Higher detection ceiling | **Not chosen.** An upload path breaks the "stays on her computer" claim for everyone who sees it. |
| **Hosted server product** | Highest detection ceiling | **Not chosen.** A different product and buyer, with hosting and procurement we cannot finish or run. |

**Specific ideas rejected:** a build step that fails if the bundle mentions network calls (pdf.js itself may trip it); a hidden pre-computed demo result behind a URL flag (it conflicts with "no hidden pre-made results"); the "Copy diagnostics" button moves to P1.

### Why each key choice holds up

| Choice | Defense |
|---|---|
| **Triage, not fixing** | It is the part we can finish and measure in four days. Fixing is what remediation tools do. We say the student's benefit is indirect. |
| **Rule-based, no AI model** | Keeps "the PDF never leaves her computer" true, costs $0, gives the same output for the same input, and lets us report every miss. The cost: it misses some equations and flags some diagrams. We publish the numbers. |
| **Client-only, no optional server scan** | An optional upload path breaks the privacy claim for everyone who sees it. A server could detect more, but we only need to learn whether the simple version is useful. If real files say otherwise, that is a bigger tool, and we say so. |
| **Extraction split from scoring** | Lets us replay labeled PDFs through the scoring rules in Node and get the accuracy table from one command. It is what makes "same input, same order" testable. |
| **Escalate verdict** | It turns a list into a decision, and it means an unsure page is surfaced, not quietly ranked low. |
| **Count what it cannot read** | The worst failure of a triage tool is "0 flagged" read as "all fine." Scans are counted; text-math files get a notice; unlisted pages are never called accessible. |
| **Tag-tree alternative-text check** | The barrier is an image with no text alternative. An image that already has one is not the barrier, so flagging it would add false positives. |
| **Single HTML file** | No install, no IT approval, no account. Works on an older machine only once we test that. |
| **Confidence label demoted** | Escalate already covers uncertainty. A label that is not measurably reliable would claim more than we know. |
| **Tuning set vs held-out set** | Results on files the thresholds never saw mean something. Results on the tuning files only show we tuned. |
| **Detector first, interface second** | If detection fails on real files, nothing else matters. The Tuesday gate forces us to find out early. |

### Questions a judge may ask

- **"Isn't this an admin tool, not a learning tool?"** The pitch opens with her screen reader saying "image." The tool only changes where fixing effort goes, and we say that. The Devpost brief itself names a worksheet a screen reader cannot read as a barrier.
- **"Is rule-based detection good enough?"** We do not claim it is. We report hits, false flags, and misses per file type, and the tool says when it cannot tell.
- **"Why not use Acrobat's checker?"** We have not verified what other tools do. As far as we know, general checkers report all issue types together. We show our output beside one and describe only what we saw, including anything it does better.
- **"Did you talk to users?"** We say how many accessibility staff we talked to and what they said, or "none yet."
- **"Does it help blind students?"** It is meant to. We do not claim learner benefit without screen-reader testing, and the test we run is a proxy check of the tool's own output, not a user study.

---

## 9. Hackathon Fit

**Door:** Interact (screen-reader-friendly learning material). Secondary: Connect, because nothing is uploaded. We claim it works on modest computers only after we test that.

**Why it fits the brief:** the event asks for a small, working tool that removes one specific barrier between a person and an opportunity to learn, starting from the learner's circumstances and then choosing the technology. We start from one learner and one barrier, then pick the simplest technology that keeps course files private. One small thing that works, explained honestly, is what we are building. Technical complexity earns no bonus, so the architecture is deliberately plain: client-only, one page, one library, rules a judge can read. A judge should be able to open it and try it with no setup.

### What Devpost asks for, and where we answer it

| Devpost asks for | Where we answer |
|---|---|
| Intended learner, the task, the barrier | Sections 1–3. Task: read and work through her course equations at the same time as her classmates. |
| Working tool or demo | The single HTML file, shown on the synthetic physics handout |
| Before and after | Table below |
| Project page: name, short pitch, every team member | Pitch above; team list in checklist |
| Pre-existing foundation, clearly identified | pdf.js and any other library, listed. Nothing else built before Oct 17. [confirm] |
| Credits, including AI assistance | Libraries, test files and licenses, and exactly how AI tools were used |

### Before and after (synthetic 12-page physics handout)

| | Before | After |
|---|---|---|
| Student | Screen reader says "image" for an equation | Unchanged until a person fixes the page. The tool helps the worst pages get fixed first. |
| Coordinator | [what a standard checker showed on our test PDF] | A ranked list of suspected equation pages, each with a verdict, a reason, and a next action |
| Time to decide | [measured by hand, or "not measured"] | [measured with the tool, or "not measured"] |

### Judging criteria

| Criterion | What we show | What we must prove | Honest risk |
|---|---|---|---|
| **Barrier Removed** | Blind STEM student; image-only equations; before and after on the synthetic handout | The tool flags the pages we know are broken | The student benefits only after a person fixes the pages. The effect is indirect. Say so. |
| **Learning Value** | A concrete task: turn an equation-heavy PDF into a fix list so the student can reach the math | The exported list is clear enough to hand over as is | Judges may see an admin tool. Open with the student's moment. |
| **Inclusive Experience** | Keyboard use, plain language, plain-text output, no upload | A short screen-reader check of the tool's own output, with honest notes | No user testing. Say what was tested and what was not. |
| **Working Prototype & Explanation** | Drop a PDF, get a ranked list, download it; the architecture explained in one paragraph | Answer-key results, clear limits, full credits | Detection is rule-based and will miss some equations. |

---

## 10. Claims We Must Earn Before We Make Them

| Claim | Must be true first |
|---|---|
| "Your PDF never leaves your computer" | Built to run in the browser; network-off run completes; network tab shows no request carrying the file (the CSP tag is a seatbelt, not proof) |
| "Ranks the pages that matter" | Held-out test results shown, with misses and false flags reported |
| "Free, no account" | Prototype works with no login and no payment |
| "Faster than checking by hand" | We timed both ways on the same PDF |
| "Helps blind students" | Only after screen-reader testing. Until then: "meant to help." |
| "No install, opens with no setup" | Opened from a local file in 2–3 browsers, or the fallback (bundled script folder or static hosting) stated plainly |

Words we avoid: "only," "best," any competitor price or feature claim we have not checked ourselves. Say "as far as we know." Tagline: **Find the equations to fix first.** *(Early prototype: flags suspected problems for human review.)* Say "building" instead of "try" until the demo works.

## 11. Limitations and Out of Scope

**Say these honestly in the submission:**

- It flags suspected problem pages. It does not fix equations or check that a fixed equation is understandable.
- Detection is rule-based. It will miss some equations and flag some diagrams. A person must confirm each flag.
- It cannot read scanned pages. It counts them.
- A page that is not listed has not been confirmed accessible.
- Not tested with real screen-reader users.
- A well-tagged PDF may already be fine. The tool only checks what its rules can see. It does not judge whether existing alternative text is any good, beyond a short list of obviously empty or generic labels.

**Out of scope:** fixing, converting, or re-describing equations; MathML or LaTeX output; OCR; any hosted AI model; compliance scores; accounts, logins, dashboards, saved history, batches; captions, slides, contrast, tables, reading order, general PDF accessibility.

## 12. Honesty Line (shown in the tool and the submission)

> These are suspected problems only. A person must confirm each one. Fixing an equation does not by itself prove a screen-reader user can understand it.

We do not claim speed or learner benefit until we have measured it.

## 13. Submission Checklist

- [ ] Learner, task, and barrier named on the project page
- [ ] Working demo link or download, with setup steps
- [ ] A sample PDF bundled with the demo so a judge can run the real tool in one step
- [ ] Before and after on the synthetic physics handout
- [ ] Test table filled from real results; **no brackets left in the submission**
- [ ] Side-by-side screenshot: a standard checker's output vs. ours, described only as observed
- [ ] Screenshots, plus an optional 2–3 minute captioned demo video
- [ ] Source code and license; README says who maintains it, or that it is archived
- [ ] Credits: every library and license, test files and their licenses, exactly how AI tools were used, pre-existing work, every team member
- [ ] Confirm the team meets the eligibility rules (students above the legal age of majority in their country)
- [ ] Re-read the Devpost rules page once for the deadline and requirements
- [ ] **Submit by end of Thu Nov 19. Hard deadline Fri Nov 20, 5:00 PM ET.**

## 14. What We Know vs. What We Assume

- **Assumption:** coordinators lack a good way to prioritize equation pages. No one interviewed yet.
- **Assumption:** this step is underserved by existing tools. We have not compared actual features.
- **To validate this week:** test the detector on real PDFs, check the output with a screen reader, and talk to as many accessibility staff as we can reach, then report the real number.
