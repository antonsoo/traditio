# Traditio local review

Reviewed on 2026-10-29. The application, retained sources and review driver are
committed through `f020e54952ab5e583daf42d409d023e3f31b70c9`. The documentation and
native example artifacts accompany that implementation. This is local evidence;
no repository, release or hosted edition was published during this review.

## The learner's work

The central experiment is the innocent buyer's cup. Pin the honestly mistaken
heir's sale after one year, then change the seller to a thief. The buyer's belief,
possession, sale and elapsed year stay the same. Civil title changes from Aulus
to Lucius. The learner can inspect the concession _quamquam_ in 2.49 and the
intent requirement in 2.50, including the complete printed pages.

The other investigations distinguish the owner's informal conveyance of a
_res mancipi_ from a direct civil conveyance, and a peaceful first occupier from
a violent taker. Provincial land is an explicit boundary. The three tracks
separate physical possession, civil title and the _in bonis_ position of 2.41.

This is a focused reading of Gaius. It does not combine several periods of Roman
law into one rule engine. The [source mapping](model-and-sources.md) identifies
the exact premises, passages, editorial restorations and excluded questions.

## Fresh install and output identity

An archive of the committed source was unpacked into a new directory with no
installed dependencies or previous build. On Linux x64, Node **24.22.1** and npm
**11.19.1**:

| Command                                              | Observed result                                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm ci`                                             | Installed successfully from the lockfile                                                              |
| `npm run check`                                      | Lint, strict types, seven tests, retained-file verification and production build passed               |
| `npm run dev`                                        | The documented URL opened; case controls and the Latin reader worked; development installed no worker |
| `npm run build`                                      | Produced the complete static edition under `dist/` with base `/traditio/`                             |
| `npm run preview`                                    | The documented URL opened; the case worked and the complete offline edition became ready              |
| `gzip -dk examples/mistaken-heir-comparison.html.gz` | In the artifact checkout, recreated the exact browser-reviewed HTML                                   |

Both review servers were stopped afterward. Every one of the **22 production
files** from the clean Node 24 build matched the browser-reviewed file bytes.
The worker inventory contains 21 files; the worker itself is the remaining
production file. The inventory is 7,104,775 bytes.

The seven tests include all **68 supported fact combinations** against a
manually transcribed source-concordance table, distinct legal positions,
simultaneous barriers, comparisons, all record round trips and invalid input.
The table is independent of the evaluator's branching code. Its historical
interpretation is still the author's, not an independent expert assessment.
Fifteen source, font and license files matched their retained SHA-256 identities.

Exact output identities and artifact checks are in
[artifact-review.json](artifact-review.json).

## Actual browser journeys

Playwright 1.63.0 operated the production site on a loopback origin. The full
browser review ran under Node 26.7.0; the separate Node 24 build reproduced its
served bytes exactly.

| Browser                | Viewport    | Controls, comparison, Latin and scans | Downloads and standalone reopening | Origin refused, document reloaded, offline export |
| ---------------------- | ----------- | ------------------------------------- | ---------------------------------- | ------------------------------------------------- |
| Chromium 153.0.8010.12 | 1440 x 1000 | Passed                                | Passed                             | Passed                                            |
| Chromium 153.0.8010.12 | 375 x 1000  | Passed                                | Passed                             | Passed                                            |
| Firefox 155.0          | 1440 x 1000 | Passed                                | Passed                             | Passed                                            |
| Firefox 155.0          | 375 x 1000  | Passed                                | Passed                             | Passed                                            |

The driver used keyboard controls, changed ownership periods, exercised both
non-owner histories and the provincial boundary, pinned and reopened cases,
and checked simultaneous barriers. In the Latin reader it selected _quamquam_,
verified that the note for _traditione_ did not attach to _traditionem_, enlarged
a source page and panned it with the keyboard. Every displayed source image's
Blob bytes were hashed and compared with the retained manifest.

JSON, SVG and HTML were actual browser downloads. Invalid input kept the live
case intact. Clipboard refusal exposed a selected link which reopened the
same current and pinned facts. Editing the controls did not rewrite the URL.
The standalone HTML was opened from a file URL; all nine source images loaded,
both embedded fonts matched, and no HTTP asset request occurred. Its nested
editable-case download also restored the same facts.

For offline review, the origin refused all TCP connections and the browser
performed an actual document reload under its controlling worker. The offline
HTML export matched the online export byte for byte. Deleting one cached source
page stopped the readiness claim; reconnecting repaired that page with the
expected bytes. This is evidence for an unavailable origin, not a claim about
every browser's offline-emulation implementation or future cache retention.

The four normal journeys reported no page/console errors, no external requests
and zero axe violations under the WCAG 2/2.1 A/AA tags. Those checks do not replace
assistive-technology testing or a comprehensive accessibility audit.

Separate fault journeys in both browsers established that:
- A same-length, one-byte-corrupted source image was refused by the viewer and
  prevented casebook export. Restoring the real file recovered both operations.
- A delayed earlier source response could not replace a later selected page or
  undo its enlarged state.
- Changing the live time control while an export waited for a source file did
  not alter the captured case in that download.

The detailed results are in [browser-review.json](browser-review.json), produced
by `npm run test:browser`. Its file inventory binds these observations to the
actual production bytes.

## Visual and printable review

All 13 retained browser screenshots were opened and inspected. The desktop
layout keeps the facts beside the object and ownership tracks; the phone layout
stacks them and retains readable controls. The comparison remains an exact
three-column table at 375px, so its reasoning rows are tall and require scrolling.
The source viewer preserves the whole page and allows magnification rather
than pretending a small phone rendering is already readable at full detail.

| State            | Chromium desktop                             | Chromium phone                              | Firefox desktop                             | Firefox phone                              |
| ---------------- | -------------------------------------------- | ------------------------------------------- | ------------------------------------------- | ------------------------------------------ |
| Workshop         | [Image](assets/workshop-chromium-1440.png)   | [Image](assets/workshop-chromium-375.png)   | [Image](assets/workshop-firefox-1440.png)   | [Image](assets/workshop-firefox-375.png)   |
| Comparison       | [Image](assets/comparison-chromium-1440.png) | [Image](assets/comparison-chromium-375.png) | [Image](assets/comparison-firefox-1440.png) | [Image](assets/comparison-firefox-375.png) |
| Latin and source | [Image](assets/reading-chromium-1440.png)    | [Image](assets/reading-chromium-375.png)    | [Image](assets/reading-firefox-1440.png)    | [Image](assets/reading-firefox-375.png)    |

The [standalone casebook image](assets/study-sheet.png) comes from the actual
download opened on its own. The [32-page PDF](../examples/mistaken-heir-comparison.pdf)
was printed from that HTML in Chromium. `pdfinfo` confirmed tagged output with
no JavaScript. Extracted text retained both sets of conditions. Pages 1, 2, 3,
15, 16 and 24 were rendered and visually inspected for case layout, print
pagination, Latin notes and complete scan placement. Extracting the PDF's nine
JPEGs reproduced all nine original retained image hashes.

The PDF is a printed reading artifact. Its JSON companion, or the native
download in the HTML casebook, is the route back to editable cases.

## Boundaries and handoff

Historical source evidence, the executable interpretation, the clean build,
browser behavior and portable artifacts have separate receipts. GitHub Actions
has not executed this repository's workflows. Hosted bytes, public navigation
and a public service worker have not been checked. No live-demo badge or catalogue
entry asserts publication.

The model fixes valid transactions, capacity and uninterrupted possession. It
does not decide litigation or all possessory remedies, implement exceptional
usucapion, or combine Justinian's later periods with Gaius. The drawings are
original modern schematics. The retained source pages preserve the historical
system's enslavement and unequal legal status.

Build for publication with **`npm run build`**; deploy the complete **`dist/`**
directory under **`/traditio/`**. The proposed repository and site destinations
are already in package metadata and the README. Publication still needs its own
review of the actual hosted files and learner journey.

Suggested GitHub description:

> Explore Roman ownership through Gaius's Latin: change a fact, compare legal positions, and keep the sources offline.

Suggested topics: `roman-law`, `latin`, `gaius`, `legal-history`,
`interactive-learning`, `digital-humanities`, `typescript`.
