import type { RuleId } from "./core/model";

export type Word = { latin: string; meaning: string; job: string };
export type Reading = {
  id: RuleId;
  title: string;
  reference: string;
  pages: number[];
  latin: string;
  english: string;
  note: string;
  words: Word[];
};

export const edition = {
  title: "Gai Institutiones, or Institutes of Roman Law",
  description:
    "Gaius; Latin with Edward Poste's translation and commentary, fourth edition revised by E. A. Whittuck, Oxford: Clarendon Press, 1904.",
  url: "https://archive.org/details/gaiinstitutiones00gaiuuoft",
  independent: "https://droitromain.univ-grenoble-alpes.fr/Anglica/gai2_Poste.htm",
  editorial:
    "Latin is transcribed from the retained 1904 pages with line breaks joined and consonantal u printed as v. Angle brackets mark supplied text; […] marks an excerpt's omission. The English below is a new close translation for this workshop. The scans retain Poste's historical translation and commentary, including their wording and textual gaps.",
};

export const readings: Reading[] = [
  {
    id: "classification",
    title: "Which things need the formality?",
    reference: "1.120; compare 2.15, 2.19",
    pages: [75, 133],
    latin:
      "[…] animalia quoque quae mancipi sunt, quo in numero habentur boves, equi, muli, asini; item praedia tam urbana quam rustica quae et ipsa mancipi sunt, qualia sunt Italica, eodem modo solent mancipari.",
    english:
      "[…] also the animals that are res mancipi, among which are counted oxen, horses, mules and asses; likewise urban and rural estates that are themselves res mancipi, such as Italian ones, are customarily mancipated in the same way.",
    note: "Excerpt from 1.120. The mule here is already trained: 2.15 records disagreement about when young animals become res mancipi. The damaged classification in 2.14a is not silently reconstructed. Silver falls under the delivery examples of 2.19–20.",
    words: [
      {
        latin: "mancipi",
        meaning: "of a class requiring a formal civil conveyance",
        job: "A legal category, not a synonym for expensive. A silver cup and a mule take different routes.",
      },
      {
        latin: "muli",
        meaning: "mules",
        job: "Nominative plural of mulus. The object used in the first investigation is named in Gaius's list.",
      },
      {
        latin: "Italica",
        meaning: "Italian",
        job: "Qualifies the estates. Moving the example to a province changes its legal setting.",
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery by the owner",
    reference: "2.19–20",
    pages: [133, 134],
    latin:
      "Nam res nec mancipi ipsa traditione pleno iure alterius fiunt, si modo corporales sunt et ob id recipiunt traditionem. Itaque si tibi vestem vel aurum vel argentum tradidero sive ex venditionis causa sive ex donationis sive quavis alia ex causa, statim tua fit ea res, si modo ego eius dominus sim.",
    english:
      "For things that are not res mancipi become another's with full right by delivery itself, provided they are corporeal and therefore admit of delivery. Thus if I deliver to you clothing, gold or silver, whether on account of sale, gift or any other ground, the thing immediately becomes yours, provided I am its owner.",
    note: "Complete 2.19–20. The model supplies a valid sale, the seller's capacity and delivery; it does not equate touching or borrowing a thing with acquiring ownership.",
    words: [
      {
        latin: "traditione",
        meaning: "by delivery",
        job: "Ablative singular of traditio: the means by which possession is handed over.",
      },
      {
        latin: "si modo",
        meaning: "provided that",
        job: "A condition, not a prediction. The owner premise matters: a non-owner's delivery takes us to 2.43.",
      },
      {
        latin: "statim",
        meaning: "immediately",
        job: "For the owner's silver cup, title transfers at delivery. The year counter has no work to do.",
      },
      {
        latin: "dominus",
        meaning: "owner",
        job: "The seller must be owner in this rule. Having the thing in hand is a different fact.",
      },
    ],
  },
  {
    id: "form",
    title: "A civil form of transfer",
    reference: "2.22; compare 1.119",
    pages: [134, 74, 75],
    latin:
      "Mancipi vero res sunt quae per mancipationem ad alium transferuntur; unde etiam mancipi res sunt dictae. quod autem valet ⟨mancipatio, idem valet et in iure cessio⟩.",
    english:
      "Res mancipi, however, are things transferred to another through mancipation; hence they are called res mancipi. What mancipation accomplishes, surrender before a magistrate accomplishes as well.",
    note: "The end of 2.22 is supplied text in the retained edition. The control assumes a valid mancipation, including the formalities described in 1.119. In iure cessio is another form named by Gaius; the workshop does not reenact either ceremony.",
    words: [
      {
        latin: "mancipationem",
        meaning: "mancipation",
        job: "Accusative after per. A formal civil conveyance, not just the purchase agreement.",
      },
      {
        latin: "in iure cessio",
        meaning: "surrender before a magistrate",
        job: "A second formal route. Its mention prevents the misleading claim that mancipation was the only possible civil transfer.",
      },
    ],
  },
  {
    id: "division",
    title: "Two legal positions in one thing",
    reference: "2.40–41",
    pages: [146, 147],
    latin:
      "[…] sed postea divisionem accepit dominium, ut alius possit esse ex iure Quiritium dominus, alius in bonis habere. Nam si tibi rem mancipi neque mancipavero neque in iure cessero, sed tantum tradidero, in bonis quidem tuis ea res efficitur, ex iure Quiritium vero mea permanebit, donec tu eam possidendo usucapias: semel enim inpleta usucapione proinde pleno iure incipit, id est et in bonis et ex iure Quiritium tua res esse, ac si ea mancipata vel in iure cessa ⟨esset⟩.",
    english:
      "[…] but afterwards ownership admitted a division, so that one person could be owner by the law of the Quirites while another had the thing among his goods. For if I neither mancipate a res mancipi to you nor surrender it before a magistrate, but only deliver it, the thing becomes yours in bonis, while by the law of the Quirites it will remain mine until you acquire it by possessing it. Once usucapion is completed, it becomes yours with full right, both in bonis and by the law of the Quirites, just as if it had been mancipated or surrendered before a magistrate.",
    note: "End of 2.40 and complete 2.41. The in bonis position is conventionally called bonitary ownership. The diagram does not imply fractional co-ownership or a modern trust. Gaius's two positions can belong to different people; possession is drawn as a third, separate fact.",
    words: [
      {
        latin: "in bonis",
        meaning: "among one's goods; in one's estate",
        job: "The phrase behind bonitary ownership. In the owner's informal delivery of a mule, this position belongs to the buyer.",
      },
      {
        latin: "ex iure Quiritium",
        meaning: "by the law of the Quirites",
        job: "The civil title retained by Lucius until qualifying usucapion is complete.",
      },
      {
        latin: "donec",
        meaning: "until",
        job: "Sets a temporal boundary. Advancing the case to the required year changes who has civil title.",
      },
      {
        latin: "possidendo",
        meaning: "by possessing",
        job: "Ablative gerund of possidere. Possession over time does work that one act of delivery did not finish.",
      },
    ],
  },
  {
    id: "time",
    title: "One year, or two",
    reference: "2.42",
    pages: [147],
    latin:
      "⟨Usucapio autem⟩ mobilium quidem rerum anno conpletur, fundi vero et aedium biennio; et ita lege XII tabularum cautum est.",
    english:
      "Usucapion of movable things is completed in a year, but of land and buildings in two years; and so it was provided by the law of the Twelve Tables.",
    note: "Complete 2.42. The beginning is supplied in the 1904 edition. This is Gaius's account, not a surviving quotation of the Twelve Tables. The model uses completed years, assumes uninterrupted possession and does not calculate historical dates.",
    words: [
      {
        latin: "usucapio",
        meaning: "acquisition through possession over time",
        job: "A route to ownership, conditional on more than elapsed time.",
      },
      {
        latin: "anno",
        meaning: "in a year",
        job: "Ablative singular of annus; the interval for movables in this account.",
      },
      {
        latin: "biennio",
        meaning: "in a two-year period",
        job: "The field needs twice the interval of the cup or mule, assuming the other conditions are met.",
      },
    ],
  },
  {
    id: "belief",
    title: "Receiving from a non-owner",
    reference: "2.43",
    pages: [147],
    latin:
      "Ceterum etiam earum rerum usucapio nobis conpetit, quae non a domino nobis traditae fuerint, sive mancipi sint eae res sive nec mancipi, si modo eas bona fide acceperimus, cum crederemus eum qui traderet dominum esse.",
    english:
      "Moreover, usucapion is available to us even for things delivered to us by someone who is not their owner, whether they are res mancipi or not, provided we received them in good faith, believing that the person delivering them was the owner.",
    note: "Complete 2.43. The belief control concerns the buyer when receiving the thing. It does not change the seller's knowledge and does not model later discoveries, agents with authority, or exceptional modes discussed elsewhere.",
    words: [
      {
        latin: "non a domino",
        meaning: "not from the owner",
        job: "Shows why simple delivery has not yet conferred civil ownership.",
      },
      {
        latin: "bona fide",
        meaning: "in good faith",
        job: "Here explained by Gaius as believing that the deliverer was owner. It is the buyer's belief, not a guarantee about the object's history.",
      },
      {
        latin: "si modo",
        meaning: "provided that",
        job: "Makes good faith a condition of this non-owner purchase route.",
      },
    ],
  },
  {
    id: "taint",
    title: "When good faith is insufficient",
    reference: "2.45",
    pages: [147, 148],
    latin:
      "Sed aliquando etiamsi maxime quis bona fide alienam rem possideat, non tamen illi usucapio procedit, velut si quis rem furtivam aut vi possessam possideat; nam furtivam lex XII tabularum usucapi prohibet, vi possessam lex Iulia et Plautia.",
    english:
      "But sometimes, even if someone possesses another's thing in the utmost good faith, usucapion still does not proceed for that person: for example, if the thing is stolen or possessed by force. The law of the Twelve Tables forbids usucapion of a stolen thing, and the Julian and Plautian law that of a thing possessed by force.",
    note: "Complete 2.45. The workshop keeps the original defect in place. It does not model a return to the owner, later authorized disposition, remedies for the purchase, or later law.",
    words: [
      {
        latin: "etiamsi",
        meaning: "even if",
        job: "Introduces a concession: grant good faith and the obstacle can still remain.",
      },
      {
        latin: "furtivam",
        meaning: "stolen",
        job: "Describes the thing's history. The later buyer need not have committed the theft.",
      },
      {
        latin: "vi",
        meaning: "by force",
        job: "An ablative that changes the empty-field case: peaceful entry and violent taking are not interchangeable.",
      },
    ],
  },
  {
    id: "province",
    title: "A boundary of the method",
    reference: "2.46; compare 2.21",
    pages: [148, 134],
    latin: "Item provincialia praedia usucapionem non recipiunt.",
    english: "Provincial estates likewise do not admit of usucapion.",
    note: "Complete 2.46. This is not a claim that provincial occupants had no private rights. The model declines to assign private Quiritary title there; 2.21 distinguishes the provincial setting. Later prescriptions and imperial reforms are outside this edition's experiment.",
    words: [
      {
        latin: "provincialia praedia",
        meaning: "provincial estates",
        job: "Names the excluded category. A geographical change can make the whole mechanism inapplicable.",
      },
      {
        latin: "non recipiunt",
        meaning: "do not admit of",
        job: "A categorical limit to this method, not a longer duration.",
      },
    ],
  },
  {
    id: "innocent",
    title: "Even an innocent later buyer",
    reference: "2.49",
    pages: [148],
    latin: "[…] sed nec ullus alius, quamquam ab eo bona fide emerit, usucapiendi ius habeat.",
    english:
      "[…] but no other person has the right to acquire by usucapion either, even though that person bought from him in good faith.",
    note: "Final clause of 2.49. The full paragraph distinguishes the thief's own bad faith from the bar that also affects an innocent purchaser. See the whole retained page for that argument.",
    words: [
      {
        latin: "quamquam",
        meaning: "although; even though",
        job: "The sentence grants good faith and still denies this acquisition. Replacing it with 'because' would reverse the reasoning.",
      },
      {
        latin: "ullus alius",
        meaning: "any other person",
        job: "The rule reaches beyond the original thief or violent taker.",
      },
    ],
  },
  {
    id: "heir",
    title: "The heir's honest mistake",
    reference: "2.50",
    pages: [148, 149],
    latin:
      "[…] nam si heres rem defuncto commodatam aut locatam vel apud eum depositam existimans eam esse hereditariam vendiderit aut donaverit, furtum non committit; […] furtum enim sine adfectu furandi non committitur.",
    english:
      "[…] for if an heir sells or gives away a thing lent or hired to the deceased, or deposited with him, believing it to belong to the inheritance, he does not commit theft; […] for theft is not committed without an intention to steal.",
    note: "Two excerpts from 2.50. The cup and names are invented teaching details. The sale of a borrowed object by an honestly mistaken heir is Gaius's example. The omitted intervening example concerns an enslaved woman's child; it remains visible in the scan. This paragraph does not make every unauthorized sale innocent.",
    words: [
      {
        latin: "heres",
        meaning: "heir",
        job: "Marcus inherits from the borrower, not from Lucius. His mistake does not make the cup his property.",
      },
      {
        latin: "commodatam",
        meaning: "lent",
        job: "The deceased held a borrowed thing. It was not thereby part of his ownership.",
      },
      {
        latin: "existimans",
        meaning: "believing; supposing",
        job: "A present participle identifying the heir's mistake. Compare the buyer's independent belief at receipt.",
      },
      {
        latin: "sine adfectu furandi",
        meaning: "without an intention to steal",
        job: "The reason this example escapes theft. It removes one barrier; it does not transfer title immediately.",
      },
    ],
  },
  {
    id: "land",
    title: "The occupier knows; the buyer does not",
    reference: "2.51",
    pages: [149],
    latin:
      "Fundi quoque alieni potest aliquis sine vi possessionem nancisci, quae vel ex neglegentia domini vacet, vel quia dominus sine successore decesserit vel longo tempore afuerit; quam si ad alium bona fide accipientem transtulerit, poterit usucapere possessor; et quamvis ipse, qui vacantem possessionem nactus est, intellegat alienum esse fundum, tamen nihil hoc bonae fidei possessori ad usucapionem nocet, ⟨cum⟩ inprobata sit eorum sententia, qui putaverint furtivum fundum fieri posse.",
    english:
      "Someone can also obtain possession of another's field without force, when it lies vacant through the owner's neglect, death without a successor, or long absence. If that person transfers possession to another who receives it in good faith, the possessor can acquire by usucapion. Although the person who obtained vacant possession knows the field belongs to another, this does no harm to the good-faith possessor's usucapion, since the opinion that a field could become stolen has been rejected.",
    note: "Complete 2.51; cum is supplied in the 1904 text. The first occupier and later buyer are different people. The workshop uses the owner's absence and Italian land, without violence, to stay within the example and 2.46's boundary.",
    words: [
      {
        latin: "sine vi",
        meaning: "without force",
        job: "The premise that the violent-entry control removes.",
      },
      {
        latin: "ad alium",
        meaning: "to another person",
        job: "The transfer is to a second person. The innocent buyer is not the knowing first occupier.",
      },
      {
        latin: "quamvis",
        meaning: "although",
        job: "Concedes the first occupier's knowledge. The later buyer's good faith remains a separate condition.",
      },
    ],
  },
];

export function reading(id: RuleId): Reading {
  const result = readings.find((item) => item.id === id);
  if (!result) throw new Error(`Unknown reading: ${id}`);
  return result;
}

export const scope = [
  "These are invented cases within Gaius's second-century account. The people are independent adult Roman citizens with the relevant legal capacity. The object is ordinary private property; the sale, price arrangements and intended delivery are valid. The seller in the first investigation is owner and authorized to convey.",
  "The buyer keeps uninterrupted possession. Time steps mean completed years, not modern anniversary calculations. There is no further sale, recovery by the former owner, interruption, inheritance of the buyer's possession or change in the buyer's belief being modeled.",
  "The in bonis track illustrates the owner's informal conveyance in 2.41. The workshop does not settle every juristic use of in bonis, possessory interdicts, the actio Publiciana, competing claims or the outcome of litigation. 'Not the 2.41 route' makes no claim that an innocent possessor has no protection.",
  "Gaius also discusses exceptions and other acquisition routes, including usucapio pro herede and usureceptio. They are outside these ordinary sale cases. Provincial holdings are a stated boundary. Justinian's later rules are not mixed into Gaius's periods.",
  "Roman property law included enslavement and unequal legal status. The retained pages preserve that evidence and their historical translators' language. The interactive cases concern a cup, a mule and land; they do not turn people into game objects.",
];
