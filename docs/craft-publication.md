# Craft, recovery and the complete published edition

The [Traditio craft room](https://antonsoo.github.io/traditio/work.html) is published.
Application source is `a8b419dc89a6019c5076390606bdf41c4c499ade`; GitHub Pages
reports `98baa6099f66d7fd0590af15f9a2afe979ab4ce5` built successfully. The source
and full [operated review](craft-review.md) identify the clauses, artifacts,
source/model boundaries and absence of independent specialist review.

## The actual hosted journey

The [public receipt](../studies/craft-publication/public-review.json) operates
Chromium and Firefox at 1440px and 375px. Every profile uses the controlling
`traditio-a0da79a00a09748f2210` edition and all 39 verified inventory files.
All **40 canonical hosted files**, including the worker, match the clean Node 24
build byte for byte, before and after the browser journeys. Older hashed assets
remain on the publication branch for readers with cached entry pages; they are
not additional files in this edition's worker inventory.

Each journey:
- Operates ownership facts and keyboard comparisons, reads Latin phrases and
  checks all nine displayed ownership-source image hashes.
- Constructs counterexamples, keeps a fixed legal argument and downloads its
  native record and illustrated reading.
- Restores and exports a ceremony rehearsal with complete checked source pages.
- Navigates into craft and river from the hosted ownership page. In craft it
  changes the good-faith condition, restores the pinned recovery point, reads
  the supporting clause and phrase, and checks both actual displayed source
  images. In river it restores both histories and checks all four source images.
- Downloads each room's native JSON and illustrated reading. Craft and river
  readings open from disk with scripts disabled and the browser offline, with
  checked images, fonts, embedded native JSON and no HTTP requests.
- Refuses the actual origin through a TLS CONNECT proxy: existing tunnels are
  closed, new connections are refused, and a fresh worker-free context fails to
  load. All four previously retained rooms still reload, restore their records
  and export byte-identical illustrated readings.

The final receipts contain no recorded page/console errors. The main-page
external-request lists are empty, and the script-free readings make no HTTP
requests. This is a bounded browser observation,
not a promise of permanent browser storage or universal assistive-technology
behavior.

## Why the final publication differs from the first

The earlier public audit caught a Firefox worker error. It was retained as a
finding, not waived. A local reproduction showed that completing the last saved
file could make the page cancel the worker's still-returning Response. The
[before/after receipt](craft-review/retention-finish.json) and
[transfer review](transfer-audit.md#finishing-a-save-must-not-cancel-its-returning-file)
explain the event order and fix. The final public run has neither that aborted
final-file request nor its console error. The slow-network receipt also checks
that the final file is not canceled.

The [four-room upgrade replay](craft-review/four-room-upgrade.json) retains the
first published craft edition while the fix waits. Existing tabs keep coherent
older pages; all four records restore after the older clients leave. The worker
does not force unsaved readers to reload.

## Keep build, publication and CI separate

The [publication metadata](../studies/craft-publication/publication.json) records
the source commit, Pages commit, edition and workflow outcomes. The source CI
run and source Pages workflow failed **before any steps started**. Neither is
reported as passing. The independently verified static build was pushed normally
to `gh-pages`, preserving older assets; the legacy Pages build/deployment
succeeded. No account or credential changes were made.

To repeat against the matching publication:

```sh
npm ci
npm run check
REVIEW_OUTPUT=studies/craft-publication npm run test:public
```

The driver supports `REVIEW_BROWSER=firefox`, `REVIEW_WIDTH=375` and
`REVIEW_DIAGNOSTICS=1` for a targeted diagnostic replay without suppressing
console errors. `npm run test:transfer` separately exercises real streamed slow
bodies, inactivity, a cold shared connection, two-tab repair, a stalled shell
installation, gzip decoding and actual server outages.
