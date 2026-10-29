# Contributing

Use Node 24 or later. Run `npm ci`, then `npm run dev` to work on the lesson.
`npm run check` runs lint, strict type checking, source-concordance and record
checks, retained-file verification and the production build.

Start a proposed historical change with an exact source passage and a clear
statement of its scope. Keep Gaius, the modern printed editor, the new English
translation and the instructional model distinct. Do not silently complete a
damaged text or combine later imperial rules with the model's periods.

Core rules live in `src/core/model.ts`; counterexample premises and citation
coverage are in `src/core/argument.ts`. Record validation is in
`src/core/record.ts`. Source readings and phrase notes are in `src/readings.ts`.
`src/asset-manifest.json` identifies the retained source, font and license bytes;
its public copy must agree. A changed source needs a new provenance record,
visual page-number check and explicit update to both manifests.

For interface or artifact changes, build and run `npm run test:browser` with
Playwright's Chromium and Firefox available. The script serves the build on an
ephemeral loopback port, exercises the actual controls and downloads, and refuses
origin connections during its offline reload. It also checks corruption, late
responses and source-cache recovery. Review the produced screenshots yourself.
Run `npm run test:audit` for failed installation/recovery, cancellation,
request deadlines, cached-file integrity and old/new edition transitions.
Use `REVIEW_BROWSER=firefox REVIEW_WIDTH=375 npm run test:browser` for a focused
reproduction; the final review should cover both browsers and both widths.

The browser review writes `docs/browser-review.json`, real screenshots under
`docs/assets/`, and native example artifacts under `examples/`. Its scratch
HTML files go to ignored `test-results/`. The recorded evidence is not a claim
about a deployed service or independent historical peer review.

Please keep the site static, local by default and free of tracking. State
changes belong to explicit controls; sharing should remain an explicit action.
Development uses port 4368 and production preview uses 4367. Keep those origins
separate: a preview worker must not mask changes in the development server.
