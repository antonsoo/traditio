# Who performs the formal transfer?

[Open the rehearsal](https://antonsoo.github.io/traditio/ceremony.html).

The ownership cases assume “valid mancipation.” The companion lesson opens that
assumption: who is present, who speaks, who moves the bronze, who asks the
question, and who completes the transfer. A declaration of ownership is not
silently treated as the whole conveyance.

## Try the actual work

1. Start with four witnesses and the separate balance holder. Attempt Aulus's
   claim. Add a fifth witness; then count the holder among those witnesses instead.
   Read _non minus quam quinque_ and _praeterea alio_ on printed page 74.
2. With five witnesses plus another holder, try giving the bronze before speaking,
   or let Lucius speak for Aulus. Then have Aulus speak, strike the balance and
   give that bronze. The rejected attempts remain in the record.
3. Remove the mule. Its absence misses 1.121's condition. Change to Italian land
   and complete the acts while the field is absent. This exception is not copied
   into the magistrate scene.
4. Before the praetor, have Aulus claim, the praetor ask, and Lucius be silent.
   Civil title waits for the praetor's award. Undo the response and make a
   counterclaim: the workshop reports a dispute outside this model, not a winner.
5. Save the illustrated rehearsal. Reopen its native JSON download, inspect the
   four complete pages without a connection, or print the document.

## Text and implementation

| Operable distinction                                                                            | Passage        | Complete printed evidence |
| ----------------------------------------------------------------------------------------------- | -------------- | ------------------------- |
| At least five witnesses, plus an additional balance holder of the stated condition              | 1.119, opening | 74–75                     |
| Acquirer speaks with bronze, then strikes the balance and gives that bronze to the transferor   | 1.119          | 74–75                     |
| Trained mule and Italian land; animal present and grasped, land may be absent                   | 1.120–121      | 75                        |
| Acquirer claims; praetor asks; transferor disclaims a counterclaim or is silent; praetor awards | 2.24           | 134                       |
| Preference for a private procedure with friends rather than attendance before a magistrate      | 2.25           | 134–135                   |

The pages are from Gaius, _Institutes_, Edward Poste's translation and commentary,
fourth edition revised by E. A. Whittuck, Oxford, 1904. All four were visually
read and independently fetched again from their Internet Archive image URLs;
the fetched bytes equal the retained images. The
[source-origin receipt](ceremony-review/source-origin.json) records those checks.
The Roman Law Library's transcriptions of
[Book I](https://droitromain.univ-grenoble-alpes.fr/Anglica/gai1_Poste.htm) and
[Book II](https://droitromain.univ-grenoble-alpes.fr/Anglica/gai2_Poste.htm)
provide a separate comparison. The printed pages govern this lesson's transcription.

The Latin joins line breaks and prints consonantal u as v. Omissions and editorial
supplies remain marked. English translations are new. The formulas on the pages
concern people under Roman domination; the app preserves that context in the reader
and uses a mule or land for the operative examples. Its English action labels
are adaptations, not newly attested ancient formulas. Participant locations,
colors and stage numbers are teaching conventions.

A capable, authorized owner, capable acquirer, suitable property and valid price
arrangements are stipulated. The code checks the described sequence, not every
Roman transaction or possible defect. _Quasi pretii loco_ distinguishes the bronze
act from an assertion about the negotiated price. The ceremony diagram does not
assign possession. The counterclaim branch is deliberately unresolved because
2.24's unopposed conveyance does not supply a contested judgment.

The record contains only arrangement, attempted acts and the learner's explanation.
Results are replayed from those facts. Unknown fields, forged result fields,
unsupported arrangements, unrecognized acts, oversized records and more than
40 attempts are rejected. The prose is preserved, escaped in portable HTML and
never graded. Arrangement changes restart the sequence while keeping the prose;
Undo removes one attempt. Sharing is explicit and includes the explanation.

## Defects reproduced and corrected

- **Delayed import erased newer prose.** Starting a file read, then typing an
  explanation, allowed the older file to replace the edited case and clear its
  argument. The [before receipt](ceremony-review/import-before.json) captures the
  loss. A revision guard now keeps newer work; a newer shared case also supersedes
  a pending import. The new ceremony importer follows the same rule.
- **The editorial supply closed early.** On page 134 the supplied passage starts
  at _mancipatio_ in 2.22 and continues through _Et_ at the opening of 2.23.
  The old reader closed it before the period ending 2.22. Its expanded 2.22–23
  reading now preserves the actual bracket boundary and includes a matching new
  translation. The retained existing casebooks were regenerated from the correction.
- **Firefox offline reads depended on fetch cache mode.** With a current controller
  and a complete inventory, Firefox's tested offline mode refused `no-store` and
  `reload` reads of page 74; `default` and `force-cache` returned its exact bytes.
  The [bounded reproduction](ceremony-review/offline-before.json) distinguishes
  this from a real origin outage, which the existing suite already handled.
  Source reads now allow HTTP caching while independently checking byte length
  and SHA-256. The source and export checks still refuse a substituted file.
- **The build had one HTML entry.** Both pages now carry the same edition identity.
  Regenerating an edition first removes previous identities so a companion page
  cannot retain a stale first metadata tag. A waiting newer worker still leaves
  existing readers on their current edition until they leave.

## Review evidence

The completed local review operates Chromium 153.0.8010.12 and Firefox 155.0 at
1440 and 375 pixels. It exercises the witness and presence distinctions, premature
and wrong-speaker acts, silence, disclaimer, counterclaim, Undo, native records,
explicit sharing, four displayed source-image hashes and keyboard source panning.
The operated page has no horizontal overflow or axe violations in these contexts.

Every native illustrated rehearsal is 4,571,494 bytes, SHA-256
`d577bba809b563973b93f2d3e4d61a67a8fa7971bb2f3a313b9f7dbb61b22440`.
Its four images and two fonts match the retained bytes; all four license/source
notice texts are present. The same bytes are produced after actual document reload
in browser offline mode. The standalone document is opened by file URL with
JavaScript disabled and makes no HTTP requests. Its retained PDF has 19 tagged A4
pages and no JavaScript; the rendered sequence page was visually inspected.

Fault exercises in both engines retain a newer explanation during delayed import,
prevent a late page 75 response from replacing page 134, freeze the export at the
clicked arrangement and notes, refuse a corrupted source image and dossier, and
cancel preparation without a download or loss of the current explanation.

The existing ownership/counterexample journeys also pass at both sizes in both
engines, including their real origin-connection outage. The separate worker audit
checks failed installation, exact cache recovery, a waiting upgrade, both HTML
entry identities, cancellation, timeout/retry and accessible diagram descriptions.
- [Ceremony browser and artifact receipt](ceremony-review/local/review.json)
- [Delayed imports, shared records and browser Back](ceremony-review/local/state-review.json)
- [Exact duplicate artifact identities](ceremony-review/local/artifact-identities.json)
- [Original-case journeys on this build](ceremony-review/existing/browser.json)
- [Worker and export audit](ceremony-review/existing/after-browser-audit.json)
- [Illustrated rehearsal, gzip](ceremony-review/local/rehearsal.html.gz)
- [Native record](ceremony-review/local/rehearsal.json) and [absent-field record](ceremony-review/local/field.json)
- [Printed PDF](ceremony-review/local/rehearsal.pdf)

Run `npm run check`, `npm run test:ceremony`, `npm run test:browser` and
`npm run test:audit` from a matching checkout. The browser checks are bounded
observations, not scholarly peer review or a guarantee about future storage eviction.
Public build, source and hosted-browser evidence is recorded separately below.
