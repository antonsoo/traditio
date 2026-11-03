import type { ReadingId } from "./core/craft";
export type CraftReading = {
  id: ReadingId;
  ref: string;
  title: string;
  latin: string;
  english: string;
  note: string;
  pages: number[];
  words: [string, string, string][];
};
export const craftReadings: CraftReading[] = [
  {
    id: "writing",
    ref: "2.77 · ownership",
    title: "The letters follow the parchment",
    latin:
      "Eadem ratione probatum est quod in chartulis sive membranis meis aliquis scripserit, licet aureis litteris, meum esse, quia litterae chartulis sive membranis cedunt.",
    english:
      "By the same reasoning, it has been accepted that what someone has written on my paper or parchment belongs to me, even in gold letters, because the letters follow the paper or parchment.",
    note: "Opening sentence of 2.77. The antecedent of ‘the same reasoning’ lies in the preceding accession discussion. This is ownership of the tangible object; no modern intellectual-property rule is asserted.",
    pages: [162],
    words: [
      [
        "licet aureis litteris",
        "even in gold letters",
        "The expense or preciousness of the lettering does not reverse the reported rule.",
      ],
      [
        "litterae … cedunt",
        "the letters follow …",
        "Litterae is the subject. The paper or parchment is what they legally follow.",
      ],
      [
        "meum esse",
        "to be mine",
        "The owner of the paper speaks as ‘I’ in the source; Lucius fills that role in the invented case.",
      ],
    ],
  },
  {
    id: "writing-remedy",
    ref: "2.77 · recovery",
    title: "Title does not remove the expense question",
    latin:
      "Itaque si ego eos libros easve membranas petam nec inpensam scripturae solvam, per exceptionem doli mali summoveri potero.",
    english:
      "Accordingly, if I claim those books or parchments and do not pay the expense of writing, I can be defeated by a defense of fraud.",
    note: "Remainder of 2.77. The ownership sentence and this qualification coexist. The app does not compute compensation, conduct litigation or model a modern lien.",
    pages: [162],
    words: [
      [
        "nec inpensam … solvam",
        "and do not pay the expense …",
        "The refusal or omission to pay qualifies the attempt to recover.",
      ],
      [
        "per exceptionem doli mali",
        "by a defense of fraud",
        "An exceptio is a procedural defense; it is not a second ownership share.",
      ],
    ],
  },
  {
    id: "painting",
    ref: "2.78 · ownership",
    title: "The direction reverses",
    latin:
      "Sed si in tabula mea aliquis pinxerit veluti imaginem, contra probatur; magis enim dicitur tabulam picturae cedere. Cuius diversitatis vix idonea ratio redditur; […]",
    english:
      "But if someone paints on my board, for example an image, the opposite is accepted: the board is rather said to follow the painting. Scarcely an adequate reason is given for this difference; […]",
    note: "Opening of 2.78; the continuation concerns recovery and expense. Tabula is a board or panel, although the historical English alongside says ‘canvas’. The source criticizes the unexplained distinction; the workshop does not repair it with a theory of artistic value.",
    pages: [162],
    words: [
      [
        "contra probatur",
        "the opposite is accepted",
        "The immediately preceding writing case supplies the contrast.",
      ],
      [
        "tabulam picturae cedere",
        "the board to follow the painting",
        "Tabulam is the subject of the infinitive; picturae identifies what it follows. Reversing them reverses the legal result.",
      ],
      [
        "vix idonea ratio",
        "scarcely an adequate reason",
        "This is the source’s reservation, not a modern certainty about why the rule exists.",
      ],
    ],
  },
  {
    id: "painting-remedy",
    ref: "2.78 · recovery and theft",
    title: "Holding, owning and recovering differ",
    latin:
      "[…] certe secundum hanc regulam si me possidente petas imaginem tuam esse, nec solvas pretium tabulae, poteris per exceptionem doli mali summoveri; at si tu possideas, consequens est, ut utilis mihi actio adversum te dari debeat; quo casu nisi solvam inpensam picturae, poteris me per exceptionem doli mali repellere, utique si bonae fidei possessor fueris. Illud palam est, quod sive tu subripueris tabulam sive alius, conpetit mihi furti actio.",
    english:
      "[…] At any rate, under this rule, if while I possess it you claim the image as yours and do not pay the value of the board, you can be defeated by a defense of fraud. But if you possess it, it follows that an adapted action should be given to me against you. In that case, unless I pay the painting expense, you can repel me by a defense of fraud, at least if you have been a possessor in good faith. This is clear: whether you or another stole the board, an action for theft is available to me.",
    note: "Remainder of 2.78 after the ownership discussion, retaining both custody branches and the final theft sentence. Me and mihi refer to the board owner; tu and te to the painter. Actio utilis is rendered adapted action, without importing a modern equity jurisdiction. Utique si expressly supplies the good-faith possessor’s case; this lesson does not infer a complete converse for bad faith. Payment removes the stated nonpayment ground, not every possible issue in litigation.",
    pages: [162],
    words: [
      [
        "me possidente",
        "while I possess it",
        "The board owner can hold the physical painting while claiming a procedural defense.",
      ],
      [
        "secundum hanc regulam",
        "under this rule",
        "Keeps the stated ownership rule distinct from the means of recovery.",
      ],
      [
        "sive tu … sive alius",
        "whether you … or another",
        "The theft clause distinguishes the thief from the possible maker.",
      ],
      [
        "utilis mihi actio",
        "an adapted action for me",
        "The board owner receives a described claim even though the ownership rule favors the painter.",
      ],
      [
        "nisi solvam inpensam picturae",
        "unless I pay the painting expense",
        "This branch concerns the board owner paying painting expenses; the earlier branch concerns the painter paying for the board.",
      ],
      [
        "utique si bonae fidei possessor fueris",
        "at least if you have been a possessor in good faith",
        "The positive qualification is explicit. Removing it does not create an express denial for every bad-faith case.",
      ],
    ],
  },
  {
    id: "question",
    ref: "2.79 · examples",
    title: "Mine, or yours?",
    latin:
      "In aliis quoque speciebus naturalis ratio requiritur. Proinde si ex uvis ⟨aut olivis aut spicis⟩ meis vinum aut oleum aut frumentum feceris, quaeritur utrum meum sit id vinum aut oleum aut frumentum, an tuum. Item si ex auro aut argento meo vas aliquod feceris, vel ex tabulis meis navem aut armarium aut subsellium fabricaveris; […]",
    english:
      "In other cases too, natural reasoning is called for. Thus, if from my grapes ⟨or olives or ears of grain⟩ you make wine or oil or grain, the question is whether that wine, oil or grain is mine or yours. Likewise, if from my gold or silver you make a vessel, or from my boards construct a ship, cupboard or bench; […]",
    note: "Opening examples of 2.79 on p. 162; the question and rival answers continue onto p. 163. The angle brackets preserve this edition’s supplied words. The excerpt omits clothing, honeyed wine and medicinal preparations. The workshop’s cases are selected examples, not the paragraph’s complete list.",
    pages: [162, 163],
    words: [
      [
        "ex … meis",
        "from my …",
        "Identifies the pre-existing material’s owner, not an agreed sale to the maker.",
      ],
      [
        "utrum meum … an tuum",
        "whether mine … or yours",
        "Poses rival ownership outcomes; it does not divide the object between them.",
      ],
      [
        "armarium",
        "cupboard or chest",
        "The source gives a kind of constructed object, not dimensions or a surviving specimen.",
      ],
    ],
  },
  {
    id: "schools",
    ref: "2.79 · rival answers",
    title: "Some think. Others think.",
    latin:
      "[…] quidam materiam et substantiam spectandam esse putant, id est ut cuius materia sit, illius et res quae facta sit videatur esse, idque maxime placuit Sabino et Cassio. Alii vero eius rem esse putant qui fecerit, idque maxime diversae scholae auctoribus visum est; […]",
    english:
      "[…] Some think the material and substance should be considered: that is, the thing made should be regarded as belonging to the person whose material it is. This view especially pleased Sabinus and Cassius. Others, however, think the thing belongs to the person who made it; that view especially commended itself to the authorities of the opposing school; […]",
    note: "Selected central clauses of 2.79. Gaius names Sabinus and Cassius here, but calls their rivals the authorities of the opposing school without naming individual jurists in this paragraph. The app retains that wording. It infers neither a Stoic/Aristotelian alignment nor a later compromise from these clauses.",
    pages: [163],
    words: [
      [
        "quidam … alii vero",
        "some … others, however",
        "Reports disagreement; ‘others’ does not describe a later step in one ownership history.",
      ],
      [
        "cuius … illius",
        "whose … that person’s",
        "Links ownership of the input material with ownership of the result in the first answer.",
      ],
      [
        "qui fecerit",
        "the person who made it",
        "The maker becomes the criterion in the rival answer.",
      ],
      [
        "diversae scholae",
        "of the opposing school",
        "A school of jurists in this passage. The phrase does not identify a philosophical allegiance.",
      ],
    ],
  },
  {
    id: "theft",
    ref: "2.79 · surviving remedies",
    title: "A maker’s title is not permission to steal",
    latin:
      "[…] sed eum quoque cuius materia et substantia fuerit furti adversus eum qui subripuerit habere actionem; nec minus adversus eundem condictionem ei conpetere, quia extinctae res, licet vindicari non possint, condici tamen furibus et quibusdam aliis possessoribus possunt.",
    english:
      "[…] But the person whose material and substance it was also has an action for theft against the person who stole it, and a condictio is likewise available against that same person: although things that have ceased to exist cannot be vindicated, a condictio concerning them can nevertheless be brought against thieves and certain other possessors.",
    note: "Conclusion of 2.79. The theft remedy targets the thief, who need not be the maker. The workshop can stipulate that the maker stole the material; it does not infer theft from manufacture alone, compute an award, or treat the source’s remedies as modern criminal penalties.",
    pages: [163],
    words: [
      [
        "adversus eum qui subripuerit",
        "against the person who stole it",
        "The relevant target is identified by theft, not by the mere act of making.",
      ],
      [
        "licet … tamen",
        "although … nevertheless",
        "Loss of one kind of claim does not imply loss of every claim.",
      ],
      [
        "vindicari … condici",
        "be vindicated … be claimed by condictio",
        "Different forms of claim: the passage expressly separates them.",
      ],
    ],
  },
];
export function craftReading(id: ReadingId): CraftReading {
  const found = craftReadings.find((r) => r.id === id);
  if (!found) throw new Error("Unknown reading.");
  return found;
}
export const craftScope = [
  "These invented cases isolate the tangible object. Lucius owns the entire input or support; Aulus does the work on his own account. No agreed transfer, manufacture contract, mixed ownership, buyer, succession or usucapion is modeled. An ownership answer does not decide physical possession, recovery or the amount payable.",
  "The two positions in 2.79 are competing legal answers applied to the same facts. They are not joint shares, two successive title holders, or two results for different amounts of labor. The writing and painting rules are reported separately in 2.77–78; the workshop does not assert that both schools expressly assented to them.",
  "No gold price, hours of work, market value or test of reversibility selects a winner in these chosen Institutes paragraphs. Later texts and compromises are outside this room. Repair is an expressly undecided analogy, not a claim that Roman law had no answer.",
  "The source is Gaius’s second-century Institutes as edited in 1904, not an ancient manuscript photograph. Angle brackets retain supplied words; […] marks omitted clauses. Consonantal u is printed v, line breaks are joined, and sentence-initial capitals are normalized. English and phrase notes are new and have not had independent philological review. The drawings are modern explanatory diagrams, not recovered artifacts or legal advice.",
];
export const craftPage = (page: number) => ({
  path: `sources/poste-1904-p${page}.jpg`,
  label: `Poste–Whittuck 1904 · printed p. ${page}`,
  url: `https://archive.org/details/gaiinstitutiones00gaiuuoft/page/n${page + 63}/mode/1up`,
});
