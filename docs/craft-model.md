# Work, material and the limits of an analogy

The fourth room, `work.html`, reads Gaius, _Institutes_ 2.77–79. Its question is
not how much work improves an object. It is which legal criterion is reported,
and whether that report is a settled rule, a dispute, or silent about a proposed
analogy. These are different epistemic states; a single owner field loses them.

## Source and decisions

The source is Poste's fourth edition, revised by Whittuck (Oxford, 1904),
complete printed pages 162–163. The new JPEGs were obtained from the University
of Toronto volume on Internet Archive and inspected directly. They retain the
historical English, editorial supplies and surrounding material. Printed p. 162
is page endpoint n225; p. 163 is n226. The lower part of p. 163 resumes an earlier
numbered section in this edition; it is not a continuation of 2.79.
- [Complete p. 162](https://archive.org/details/gaiinstitutiones00gaiuuoft/page/n225/mode/1up)
- [Complete p. 163](https://archive.org/details/gaiinstitutiones00gaiuuoft/page/n226/mode/1up)
- [Independent Latin transcription](https://www.thelatinlibrary.com/gaius2.html)
- [Poste translation transcription](https://droitromain.univ-grenoble-alpes.fr/Anglica/gai2_Poste.htm)
- [New source notice](../public/sources/work-NOTICE.txt)

Latin joins printed line breaks, prints consonantal u as v and normalizes sentence-initial capitals. The opening
examples retain the supplied `⟨aut olivis aut spicis⟩`; omissions are explicit.
English and 24 contextual phrase notes are new. They have not had independent
philological review. _Tabula_ is rendered board/panel, rather than the
historical translation's canvas. The gold letters do not turn parchment into
a precious-metal manufacturing example: 2.77 still reports the support rule.

## Hand-checked outcome table

All inputs have one material/support owner, Lucius, and one maker, Aulus.
No agreed transfer, manufacture contract or mixed ownership settles the case.
The manufacture examples concern Aulus's own account. Labor hours, value and
reversibility are not model inputs. No philosophical allegiance is assigned.

| Selected example           | Source      | Source support                | Material-owner claim | Maker claim       |
| -------------------------- | ----------- | ----------------------------- | -------------------- | ----------------- |
| Gold into a vessel         | 2.79        | Rival answers                 | One reported view    | One reported view |
| Grapes into wine           | 2.79        | Rival answers                 | One reported view    | One reported view |
| Boards into a chest        | 2.79        | Rival answers                 | One reported view    | One reported view |
| Writing on parchment       | 2.77        | Support's owner               | Agrees here          | Counterexample    |
| Painting on a board        | 2.78        | Painter's side                | Counterexample       | Agrees here       |
| Repairing a cracked vessel | New analogy | Not decided in these passages | Outside              | Outside           |

A matching school is not proof of an always claim. Nor is a report of rival
answers mere silence. These distinctions drive `assess` and `testRule` in
`src/core/craft.ts`; a hand-transcribed fixture independently asserts each row.
The writing and painting rules are separate reports. The app does not claim both
schools expressly assented to them, or universalize the two criteria from 2.79.

Gaius names Sabinus and Cassius in 2.79. This paragraph calls their rivals the
authorities of the opposing school; it does not name those individuals here.
The diagram retains that wording. No later reversibility compromise is silently
introduced, and no Stoic/Aristotelian story is supplied to explain the split.

## Work, title, possession and claims

The arrow changes material into a drawn object. It never transfers legal title.
The following fork represents alternative answers about the _same_ object:

```text
Lucius's material -> Aulus's work -> one physical result
                                      |
                         +------------+-------------+
                         |                          |
                material-owner view            maker view
                Lucius owns result           Aulus owns result
```

The workshop's drawings are original schematics, without ancient dimensions or
claims of archaeological reconstruction. Writing and painting have their own
reported ownership outcomes, not the fork. Repair receives no invented owner.

Ownership is separate from recovering the thing without paying expenses.
The remedies control changes with the selected case: 2.77 for writing, 2.78 for
painting, the end of 2.79 for the manufacture examples. In the latter, theft is
an added hypothetical premise: Aulus himself stole the material. The text targets
the thief, who need not always be the maker. Manufacture alone proves no theft.
The app computes no damages, award, criminal penalty or litigation outcome.

## A reported owner can differ from the recovery claimant

The separate recovery experiment retains the rest of 2.78 rather than stopping
at its first expense clause. This matters: when the painter holds the object,
the board owner is given an _actio utilis_ even though the reported title rule
favors the painter. The workshop renders this an adapted claim, without importing
Poste's historical English phrase “equitable action” into a modern jurisdiction.

| Work     | Physical holder | Reported owner | Person seeking the object       | Claim described here           | Expense relevant to the stated defense |
| -------- | --------------- | -------------- | ------------------------------- | ------------------------------ | -------------------------------------- |
| Writing  | Aulus, writer   | Lucius         | Lucius                          | Ownership-based recovery       | Writing expense                        |
| Writing  | Lucius          | Lucius         | Aulus, proposed writer claimant | None supplied by these clauses | Not assigned here                      |
| Painting | Lucius          | Aulus, painter | Aulus                           | Ownership-based recovery       | Board value                            |
| Painting | Aulus, painter  | Aulus          | Lucius                          | Adapted claim, actio utilis    | Painting expense                       |

These positions concern one physical object; they are not shares or successive
owners. The second row leaves possible fee claims elsewhere open. It does not
invent a remedy or assert that the writer could never have one.

For the last row, _utique si bonae fidei possessor fueris_ expressly supplies the
good-faith possessor's defense. With unpaid expenses and good faith stipulated,
the workshop reports the stated defense. Turning off good faith leaves the
converse unresolved by this qualification. It does not transform a positive
qualification into a categorical rule against every bad-faith possessor. Payment
removes the stated nonpayment ground only; the model never awards the object or
predicts the complete judgment.

A learner can pin and restore one recovery point, then compare exactly which
facts and positions changed. The reported owner stays fixed while custody,
claimant, expense and defense vary. The live point and pinned comparison travel
in the native notebook, explicit link, script-free reading and printed copy.
These controls supply hypothetical facts and do not grade historical evidence
about a real transaction.

## Record and portable reading

A versioned record retains the live case, selected proposed general rule, six
independent drafts, up to twelve kept judgments, their chosen citations and a
1,500-character account of the case, plus current and pinned recovery facts. Each reason allows 800 characters.
The 64 KiB bound accommodates every maximum-length multilingual field.

Keeping a judgment makes a validated deep copy. Later case selections and draft
edits cannot mutate that entry or its citations. Unsupported versions and invalid
cases, rules, citations or duplicate drafts fail before replacement. Outcomes are
recomputed; the record stores proposals rather than an authoritative verdict.
Version 2 adds the recovery exercise. Version-1 imports preserve the existing judgments, drafts and account, initialize the new experiment to its stated defaults and disclose that migration. No prose or citation selection is graded. There is no automatic persistence:
explicit JSON, HTML and shared links retain the notebook. The UI says to save
before leaving. Links contain the learner's writing, including unkept drafts.

HTML preparation captures a record before reading any assets. Newer edits survive;
Cancel aborts preparation. Imported files are applied only if neither a newer
import nor an intervening edit has superseded them. Source requests are canceled
and numbered so a late response cannot replace a newer selected page.

The script-free reading embeds the full two pages, fonts, seven readings, phrase
notes, diagrams, both general-rule tables, the recovery experiment, learner work and complete licenses.
Its native JSON download restores kept judgments and drafts. All binary and text
assets are checked against the manifest before export. The saved file has a
restrictive CSP and no scripts; learner markup is escaped. Printing includes a
separate sheet for each complete source page. These properties are checked on
actual downloaded files with scripts disabled and the browser offline.
