# What the model decides

Traditio asks which legal position results from a small set of facts in Gaius's
_Institutes_. It is a modern reading experiment, not a historical case database
or a simulator of Roman court decisions. Lucius, Marcus, the father, Aulus and
the particular cup are invented examples. The categories and distinctions are
anchored to the passages below.

## Source-to-rule mapping

| Model decision                                                          | Source                            | Retained printed evidence |
| ----------------------------------------------------------------------- | --------------------------------- | ------------------------- |
| Trained mule and Italian field are res mancipi                          | 1.120; animal-age dispute in 2.15 | pp. 75, 133               |
| The owner's silver passes fully by sale and delivery                    | 2.19–20                           | pp. 133–134               |
| A valid mancipation transfers civil title                               | 2.22; formalities in 1.119        | pp. 74–75, 134            |
| Delivery of res mancipi by the owner divides civil title and in bonis   | 2.40–41                           | pp. 146–147               |
| Qualifying movable possession takes one year; land takes two            | 2.42                              | p. 147                    |
| A non-owner's transferee can qualify when receiving in good faith       | 2.43                              | p. 147                    |
| Theft and force block this acquisition despite good faith               | 2.45, 2.49                        | pp. 147–148               |
| Provincial estates lie outside this usucapion                           | 2.46; setting in 2.21             | pp. 148, 134              |
| An heir's honest mistaken sale of a borrowed thing need not be theft    | 2.50                              | pp. 148–149               |
| A knowing peaceful occupier can transfer to a qualifying innocent buyer | 2.51                              | p. 149                    |

The baseline for the first case is:

```text
                         At the owner's delivery       After a qualifying year
Possession               Aulus                         Aulus
Civil title              Lucius                        Aulus
In bonis                 Aulus                         united with civil title
```

The third track describes 2.41's owner-to-buyer conveyance. It does not label
every good-faith possessor a bonitary owner. The non-owner cases show
"Not the 2.41 route" until full acquisition; that says nothing about all the
possessor's possible remedies. Likewise, an out-of-scope provincial case gets
no invented private Quiritary owner. The UI still reports physical possession.

## Cases and assumptions

The delivery investigation fixes an authorized owner, capable parties, a valid
sale and actual delivery of possession. Choosing mancipation assumes that the
formal act is valid; it does not test witness qualifications or ritual speech.
The cup case only offers informal delivery. The trained mule avoids the school
disagreement about newborn animals in 2.15. The field in this investigation is
always Italian land.

The good-faith investigation fixes a silver cup belonging to Lucius, sold and
delivered by Marcus. In one branch Lucius lent it to Marcus's father; after the
father's death, Marcus honestly mistakes it for an inherited possession. In the
other branch Marcus stole it. The buyer's belief is separate from the seller's
belief and concerns the moment of receipt. Sale of a borrowed cup is a concrete
instance of 2.50, not a statement that all unauthorized sales are innocent.

The land investigation uses the original holder's absence, rather than death
and an unaccepted inheritance. Marcus knows the field is another's. His entry
is either without force into vacant possession or by force; a later buyer
receives it with or without good faith. The provincial switch deliberately
leaves this model. It does not claim that provincial holdings lacked private
rights or that no later prescription was possible.

All clocks describe uninterrupted possession in completed years. There is no
start date, counting of civil days, succession to another possessor's period,
interruption, return to the owner or later authorized disposal. Nor is there
a model of later-discovered bad faith, competing interests, an actio Publiciana,
interdicts, adjudication, guardianship or other exceptional acquisition routes.
Gaius's usucapio pro herede and usureceptio make a universal claim that "bad
faith can never acquire" especially inappropriate; the UI confines that bar
to these ordinary purchase cases.

## The edition is part of the evidence

The retained volume is **Gai Institutiones, or Institutes of Roman Law**, with
Latin, Edward Poste's translation and commentary, fourth edition revised by
E. A. Whittuck, Oxford: Clarendon Press, 1904. The
[digitized Toronto copy](https://archive.org/details/gaiinstitutiones00gaiuuoft)
is retained as complete page images. The
[Roman Law Library's Poste text](https://droitromain.univ-grenoble-alpes.fr/Anglica/gai2_Poste.htm)
and [Latin Library Book II](https://www.thelatinlibrary.com/gaius2.html) were
used as independent comparisons, not as substitutes for inspecting the pages.

The early classification is damaged in this edition. The workshop uses 1.120
for the mule and Italian land and does not invent missing words in 2.14a.
Page 135 retains the conspicuous gaps in 2.26–27 as additional context. The
readings mark the supplied ending of 2.22, the supplied text around 2.41–42,
and supplied _cum_ in 2.51. Excerpt omissions are also marked. Printed u/v is
normalized for English-speaking beginners, while spellings such as _inpleta_
and _conpletur_ are retained.

New close English and contextual notes belong to this workshop. The scans
keep the old translation and commentary intact. Gaius's own attribution of
rules to the Twelve Tables is not presented as a surviving verbatim text of
those tables. The original pages also preserve slavery and unequal status,
which the interactive cases do not turn into game mechanics.

## The computation

`src/core/model.ts` is a pure evaluator of a discriminated case union. First it
handles a direct owner conveyance. Then it applies the provincial scope boundary
and, in ordinary non-owner purchase cases, reports good faith, object-history
eligibility and elapsed time separately. Multiple barriers remain visible.
The calculation returns both legal positions and exact reading identifiers.

The typed domain contains 68 combinations: 20 owner-conveyance cases, 16 cup
purchase cases, and 32 land cases. `tests/model.test.ts` compares them with
manually transcribed title histories from the passages. This catches coding
inconsistencies with that table; it is not independent expert review of Roman
law. Source text, translation, interpretation and executable model remain
separate things to review.

Case files save facts, never a trusted answer. Opening a JSON file or shared link
validates its format, version, keys, enum values and bounded time, then recomputes
the result. A comparison between different investigations is explicitly labeled
as such; it is never described as the effect of one changed fact.

## Counterexamples and their premises

The three argument prompts are modern, deliberately overbroad hypotheses.
They are not quotations from Gaius. A successful submission must instantiate
the hypothesis's premises and contradict its conclusion within the bounded
model above. Cases outside that model remain unresolved.

| Hypothesis to challenge                                                      | Required premises                                                                            | Refuting case                                                                          | Source coverage for the refutation |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------- |
| Every owner's sale and delivery passes civil title at once                   | Owner conveyance, inspected at year 0                                                        | Informal delivery of the mule or Italian field leaves civil title with Lucius          | 2.40-41                            |
| Good faith and the completed period suffice for a non-owner's buyer          | Non-owner sale; good faith at receipt; at least one year for the cup or two for Italian land | Theft or force still prevents acquisition                                              | 2.42 and either 2.45 or 2.49       |
| A seller's knowledge of non-ownership prevents every later buyer's usucapion | Seller knows the thing is not his                                                            | Peaceful vacant Italian possession passes to an innocent buyer who completes two years | 2.42 and 2.51                      |

The second prompt rejects a bad-faith buyer or an unfinished period as a failed
premise, not a refutation. The third rejects the honestly mistaken heir for the
same reason: he does not know. An agreeing case does not prove a universal claim.
The first prompt asks for year 0 so the recorded case actually inspects receipt;
it does not infer earlier title from a later time step.

`src/core/argument.ts` checks the captured case using the same bounded title
model and an explicit premise check. Citation coverage is a separate result:
including the expected passages cannot make unsuitable facts a counterexample,
and cannot establish that the written explanation interprets those passages
correctly. The explanation is retained verbatim as learner-authored text and
is never graded. All output escapes it as text.

The submitted case is separate from the live case and comparison pin. It changes
only when the learner submits again, changes the saved argument, or clears it.
Changing the selected claim keeps the submitted facts, citations and note and
recomputes their relationship to the new claim. Saving captures all of these
inputs before fetching casebook resources.

Version 1 files retain their original four fields. Version 2 adds an `argument`
object with `claim`, nullable `witness`, unique retained-reading `citations`, and
a `note` limited to 1,000 UTF-16 code units (the textarea's character limit).
Both versions are limited to 16 KiB and reject unknown fields and unsupported
facts. No saved verdict is accepted. Reopening a version 1 case clears any
previous argument, so facts from unrelated documents are not silently combined.
