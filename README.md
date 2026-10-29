# Traditio

**Change a fact in a Roman ownership case. Follow the title, then read the Latin.**

[![License: MIT](https://img.shields.io/badge/license-MIT-172b43)](LICENSE)

![A mule is in Aulus's possession and in bonis, while Lucius retains civil title](docs/assets/workshop-chromium-1440.png)

An innocent buyer can possess a stolen cup for years without acquiring its
ownership. Yet an equally innocent buyer of a cup mistakenly sold by a
borrower's heir can acquire it. The buyer's belief is the same; the object's
history changes the result. Gaius makes that distinction in _Institutes_
2.43–50. Traditio lets an English-speaking learner change one premise, see
which legal position changes, and inspect the Latin that does the work.

This checkout is ready for local use. It has not been published by this work.
The configured repository and Pages destinations are
`https://github.com/antonsoo/traditio` and
`https://antonsoo.github.io/traditio/`; neither is asserted to be live.

## Try three investigations

| Investigation         | Change to make                                                                  | What to watch                                                                                             |
| --------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| The missing formality | Pin the mule at transfer; complete one year                                     | Possession stays with Aulus while civil title moves from Lucius to Aulus                                  |
| The innocent buyer    | Pin the honestly mistaken heir's sale at one year; change the seller to a thief | The same good-faith buyer no longer acquires civil title                                                  |
| The empty field       | Pin peaceful Italian possession after two years; change the entry to force      | The history of the taking blocks this acquisition; a provincial location instead leaves the model's scope |

The first case has three tracks: possession, civil title _ex iure Quiritium_,
and the _in bonis_ position described in 2.41. They are not fractional shares.
The comparison highlights changed premises and distinguishes a one-fact
experiment from a comparison across different investigations.

Eleven readings pair Latin with new close English and 33 contextual phrase
notes. Select _donec_ to follow "until," _si modo_ to examine a condition, or
_quamquam_ to see why "even though" matters. Nine complete scanned pages from
the 1904 Poste–Whittuck edition retain the printed context, editorial supplies,
textual gaps and old translation. Enlarge a page and pan with the keyboard.

## Run locally

From this checkout, with Node **24 or later**:

```sh
npm ci
npm run check
npm run dev
```

Open `http://127.0.0.1:4367/traditio/`. Stop the development server before using
the same port for a production preview:

```sh
npm run build
npm run preview
```

`npm run build` produces the complete static site in **`dist/`**, with base
`/traditio/`. There is no server application, account, analytics or upload.
The production edition installs its files for offline reading; the footer
reports readiness after the controlling worker and complete inventory match.
Development mode does not install an offline edition.

## Keep a casebook

| Artifact                  | What it preserves                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Editable JSON             | Current and pinned facts, versioned and validated on reopening; answers are recomputed                                                  |
| Explicit case link        | The same facts in the URL fragment; editing controls never rewrites the address bar                                                     |
| SVG diagram               | Current legal positions, source references, original schematic drawing and a description containing the facts                           |
| Illustrated HTML casebook | Both cases, comparison, all readings and word notes, nine complete source pages, both fonts, licenses and native case/diagram downloads |
| PDF                       | Use Print on the standalone casebook; the retained example was printed in Chromium                                                      |

The casebook captures the cases when Save is pressed. It checks the actual
source, font and license bytes before embedding them. A substituted image,
even with the correct filename and HTTP status, prevents that export.
The HTML contains no JavaScript and makes no asset request when opened.

Actual browser-generated examples:
- [Editable innocent-buyer comparison](examples/mistaken-heir-comparison.json)
- [SVG of the current case](examples/mistaken-heir-comparison.svg)
- [Complete HTML casebook, gzip](examples/mistaken-heir-comparison.html.gz)
- [Tagged, 32-page PDF](examples/mistaken-heir-comparison.pdf)

To reopen the retained HTML:

```sh
gzip -dk examples/mistaken-heir-comparison.html.gz
```

Open `examples/mistaken-heir-comparison.html` in a browser. Its editable-case download reopens through the
workshop's file control; no data is sent anywhere.

## How it works

The pure TypeScript evaluator keeps owner conveyance, non-owner purchase and
the provincial boundary separate. It reports good faith, theft/force and time
as individual conditions, including simultaneous barriers. A non-owner's
good-faith possessor is not silently labeled the bonitary owner of 2.41.

```text
source clause -> chosen facts -> legal positions -> one-fact comparison
      ^                                  |
      +----------- inspect the Latin ----+
```

`src/core/model.ts` handles the bounded rules; `src/core/record.ts` validates
saved facts and links. `src/readings.ts` holds text, translations and contextual
notes. `src/asset-manifest.json` pins the retained file identities. The page
viewer cancels superseded loads and ignores late responses. Exports capture
their inputs before asynchronous file work begins.

The build generates a versioned worker from the complete output inventory.
Installation and readiness use length and SHA-256 checks, not the existence of
a cache alone. Missing or damaged cached files stop the readiness claim; a
connected inventory check repairs them only with matching edition bytes.
An already open edition stays together while a later worker waits to activate.

[Exact source-to-rule mapping and model boundaries](docs/model-and-sources.md) ·
[Retained-file manifest](public/sources/manifest.json) ·
[Font provenance](public/fonts/provenance.json).

## Verification and limits

`npm run check` runs lint, strict type checking, seven tests, retained-file
verification and the production build. The tests include all 68 supported
configurations against a manually transcribed source-concordance table, record
round trips, invalid inputs and distinct legal positions. This checks the code
against that table; it is not independent expert review of Roman law.

With Playwright's Chromium and Firefox available:

```sh
npm run test:browser
```

The browser review operates the built site at desktop and 375px, including
keyboard controls, comparisons, Latin phrases, actual source-image bytes,
downloads, standalone reopening and accessibility checks. It refuses origin
connections during an actual document reload, then produces the same casebook
offline. It also checks cache loss/recovery, corrupt source refusal, late source
responses and saving while the live case changes. Screenshots and evidence
are retained in [the review](docs/review.md).

These are invented cases within Gaius's second-century account. They assume
capable Roman citizens, valid transactions and uninterrupted possession.
They do not decide litigation, all possessory remedies, exceptional usucapion,
provincial private rights or Justinian's later law. Whole years are instructional
steps, not historical date arithmetic. Source scans preserve the ancient
system's enslavement and unequal status; the interactive cases use objects and
land. The diagram is modern and schematic.

## Sources

The primary evidence is [Gaius in the 1904 Poste–Whittuck edition](https://archive.org/details/gaiinstitutiones00gaiuuoft).
The [Roman Law Library's Poste transcription](https://droitromain.univ-grenoble-alpes.fr/Anglica/gai2_Poste.htm)
and [Latin Library text](https://www.thelatinlibrary.com/gaius2.html) supplied
independent comparisons. The printed edition's restorations are marked; its
English is distinct from this workshop's translations. See the
[source notice](public/sources/NOTICE.txt).

## Contributing and license

[Contributing](CONTRIBUTING.md) describes the source and browser review process.
Code, original drawings and new translations are [MIT](LICENSE).
The historical text and page images are public domain. Literata and Source
Sans 3 retain their SIL Open Font Licenses under `public/fonts/`.
