# Craft dispute and recovery: operated review

Traditio's fourth room turns Gaius's ownership disagreement into a learner-operated
investigation. Keep a proposal, read the rival answers, then test a generalization
against a neighboring example. The recovery experiment asks a further question:
can the reported owner and the person with a claim to recover the thing differ?

## What the learner can do

- Compare six craft cases: a reported rule, rival answers, or an undecided analogy.
- Keep twelve fixed judgments while six independent drafts remain editable.
- Read seven Latin/English selections, 24 contextual notes and two complete scans.
- Change custody and reimbursement in the writing and painting cases; pin a point
  and compare physical holding, title, claimant, claim and defense.
- Operate the good-faith qualification without inventing its converse for every
  bad-faith case or predicting a court's complete judgment.
- Save the entire experiment in JSON, an explicit link or a script-free illustrated
  notebook. Version-1 notebooks migrate with an explicit explanation of the new
  recovery defaults; their earlier reasoning is preserved.

The [model and source decisions](craft-model.md) give the manually checked outcome
tables, selected clauses and limits. The [source notice](../public/sources/work-NOTICE.txt)
identifies the 1904 edition and full printed pages 162–163. The new middle of the
2.78 recovery selection was checked directly against p. 162, including both
custody branches and _utique si bonae fidei possessor fueris_. No independent
specialist review is claimed.

## Reproduce the learner journeys

Use Node 24 or later and the Playwright browsers. Poppler tools inspect the actual
Chromium PDF. The reviewed local environment is WSL2 Linux.

```sh
npm ci
npm run check
npm run test:craft
```

The check runs lint, strict TypeScript, 44 tests, retained-file verification and
a production build. Build output is `dist/`, with base `/traditio/`. Preview using
`npm run preview` at `http://127.0.0.1:4367/traditio/work.html`. Development uses
`npm run dev` at port 4368 and does not install a worker.

The [browser receipt](craft-review/browser.json) records Chromium and Firefox at
1440px and 375px. Each of the four journeys exercises:
1. Navigation from ownership cases, keyboard submission, fixed judgments,
   independent drafts and both general-rule comparisons.
2. Both recovery media, both holders, payment, the good-faith qualification,
   pinned comparison, its source clause and the new phrase note.
3. Actual displayed source-image hashes, plus enlarged-page keyboard panning.
4. JSON and link restoration, version-1 migration, unsupported-version refusal,
   clipboard fallback, native downloads and pinned recovery restoration.
5. A downloaded reading opened from disk with scripts disabled and the browser
   offline: both embedded JPEGs, all fonts, recovery comparison, editable JSON
   download and zero network requests.
6. Reload after worker takeover, source display and notebook export offline,
   followed by navigation to all four rooms. No runtime errors, external asset
   requests or axe violations occurred in those operated views.

Eight additional fault checks across both browsers refuse same-length source
corruption, recover on retry, reject superseded source responses, preserve the
click-time export while later edits survive, cancel without a download, preserve
newer facts during delayed import, and escape learner markup in live/saved work.

## Audit the connection and saved edition

The audit found actual regressions hidden by fast connections. The
[slow-transfer review](transfer-audit.md) explains the reproductions and fixes.
Run these additional browser checks:

```sh
npm run test:transfer
npm run test:readiness
npm run test:upgrade
npm run test:audit
```

The [readiness receipt](craft-review/readiness.json) covers all four rooms in
both browsers: two simultaneous pages, damaged cached files, a real stopped
origin, withdrawal of stale readiness, repeated notifications and verified
recovery without losing explanations. Emulated offline behavior and a stopped
origin are recorded separately.

The [upgrade fixture receipt](craft-review/upgrade.json) uses a generated two-room
fixture. A separate [previous-publication replay](craft-review/public-baseline-upgrade.json)
uses the retained `gh-pages` tree at `6575bdad4919ec80c056361bec1eacedc063aa5d`,
which already has the river room. Existing routes stay coherent under their older
controller; the new craft route offers an editable-work download while those
readers remain open. These are distinct fixtures, with the previous worker's
SHA-256 recorded in each receipt. Releasing the old edition allows all
four native formats to restore and new readings to download with the origin
stopped. The worker does not force unsaved readers to reload. A further
[four-room patch replay](craft-review/four-room-upgrade.json) covers the already
published craft edition moving to the final retention fix: all existing rooms
stay coherent under their older controller and all four records restore after
release. The [retention completion receipt](craft-review/retention-finish.json)
reproduces and fixes a canceled final-file read and intermittent Firefox console
error, separately from the legal model.

## Inspect actual artifacts

![Craft bench at 1440px](assets/craft-1440.png)

[Phone bench](assets/craft-375.png) ·
[Recovery exercise on desktop](assets/craft-recovery-1440.png) ·
[Recovery exercise on a phone](assets/craft-recovery-375.png).

The original diagrams use a vertical input/work/result sequence on phones.
The recovery exercise uses the existing blue casebook palette and a table of
distinct legal positions, with changed comparison rows highlighted. Screenshots
and printed source sheets were opened and inspected.
- [Illustrated notebook, gzip](craft-review/notebook.html.gz)
- [Actual 29-page tagged Chromium PDF](craft-review/notebook.pdf)
- [Editable version-2 notebook](craft-review/notebook.json)
- [Artifact lengths and SHA-256 identities](craft-review/artifacts.json)

The notebook keeps an initial material-owner proposal and a revised account of
the dispute, plus a pinned good-faith recovery point compared with a current
point whose converse is unresolved. Both complete source pages occupy separate
PDF sheets. The retained-file checker compares not only image and font hashes,
but the notebook's actual Latin, English, scope, phrase notes, licenses and
embedded native JSON against the current sources. Decompress the HTML before
opening it.

## Boundaries and separate evidence

The edited 1904 source is a witness to Gaius, not an ancient manuscript image.
The app infers no philosophical affiliation, silently adds no later compromise,
and supplies no adjudication for repair or calculation of compensation. These
invented facts isolate a selected question, with no agreed manufacture contract
or transfer. They do not model the full Roman legal system.

Work requires explicit saves; leaving an unsaved page can lose explanations.
The footer's complete verified edition and a downloaded notebook are different
copies. Browser eviction, lifecycle limits and total transfer deadlines still
exist. The source mapping and new English have not had independent legal or
philological review.

The [ownership](craft-review/ownership-regression.json),
[ceremony](craft-review/ceremony-regression.json),
[river](craft-review/river-regression.json), and
[failure/edition/export](craft-review/failure-regression.json) receipts cover the
existing rooms separately. Build identity and publication checks are recorded
with their own scope; local tests alone do not establish remote CI or hosted bytes.

## Clean committed checkout

The clean checkout at `a8b419dc89a6019c5076390606bdf41c4c499ade` used Node
24.22.1 and dependencies from `npm ci`. Its `npm run check` passed. All four
`test:craft` journeys and eight fault checks passed against the matching final
working build; the same native JSON and HTML had already matched the clean
checkout downloads exactly. The check includes all 44 tests and
verification of current source text inside the retained notebook.

The independent [build inventories](craft-review/build-inventory.json) match
across all 40 files. The worker's 39-file inventory contains 13,101,638 bytes;
its edition is `a0da79a00a09748f2210`. The clean native JSON and HTML downloads
match the retained examples exactly; the retained PDF has its own print timestamp.
The slow-transfer receipt uses the same exact build bytes. Local build identity,
remote source, hosted files, operated public controls and remote CI remain
separate claims.
