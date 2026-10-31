import type { ReadingId, RiverRoute } from "./core/river";

export type RiverReading = {
  id: ReadingId;
  reference: string;
  title: string;
  latin: string;
  english: string;
  note: string;
  pages: string[];
  words: [string, string, string][];
};
export const riverReadings: RiverReading[] = [
  {
    id: "g-alluvion",
    reference: "Gaius · Institutes 2.70",
    title: "So gradual that it eludes the eyes",
    latin:
      "Sed et id quod per adluvionem nobis adicitur eodem iure nostrum fit; per adluvionem autem id videtur adici quod ita paulatim flumen agro nostro adicit, ut aestimare non possimus quantum quoquo momento temporis adiciatur; hoc est quod vulgo dicitur per adluvionem id adici videri quod ita paulatim adicitur, ut oculos nostros fallat.",
    english:
      "What is added to us by alluvion also becomes ours by the same law. What the river adds to our field so gradually that we cannot estimate how much is added at each moment is regarded as added by alluvion. This is what people commonly mean when they say that an addition by alluvion is made so gradually as to elude our eyes.",
    note: "Complete 2.70, spanning printed pages 160–161. Adluvionem follows this edition. A large eventual addition can meet the stated condition: the question concerns what can be distinguished at each moment, not a maximum final area. The app stipulates that condition; it does not measure a real river.",
    pages: ["g160", "g161"],
    words: [
      ["ita paulatim", "so gradually", "Ita looks ahead to the consequence introduced by ut."],
      [
        "quoquo momento temporis",
        "at each moment of time",
        "The temporal scale of the test, not a limit on the eventual addition.",
      ],
      [
        "ut oculos nostros fallat",
        "so as to elude our eyes",
        "Fallere here describes escaping perception. It does not mean that any visibly slow movement is alluvion.",
      ],
    ],
  },
  {
    id: "g-parcel",
    reference: "Gaius · Institutes 2.71",
    title: "This piece remains yours",
    latin:
      "Itaque si flumen partem aliquam ex tuo praedio resciderit et ad meum praedium pertulerit, haec pars tua manet.",
    english:
      "Accordingly, if a river has torn some piece from your estate and carried it to mine, this piece remains yours.",
    note: "Complete 2.71. In the diagram Lucius supplies ‘your estate’, Aulus ‘mine’. The piece retains its identity across the move. The paragraph does not state what happens after the later attachment conditions in Digest 41.1.7.2. The model leaves that later history unresolved when these Institutes passages alone are selected; it does not assert perpetual ownership.",
    pages: ["g161"],
    words: [
      ["ex tuo … ad meum", "from yours … to mine", "Tracks origin and destination separately."],
      [
        "resciderit … pertulerit",
        "has torn away … has carried to",
        "The completed movement is part of the condition. It is not itself a conveyance.",
      ],
      [
        "haec pars tua manet",
        "this piece remains yours",
        "Haec pars keeps the identifiable piece in view; manet preserves its former ownership.",
      ],
    ],
  },
  {
    id: "g-soil",
    reference: "Gaius · Institutes 2.73",
    title: "The soil rule behind the tree sentence",
    latin:
      "Praeterea id quod in solo nostro ab aliquo aedificatum est, quamvis ille suo nomine aedificaverit, iure naturali nostrum fit, quia superficies solo cedit.",
    english:
      "Moreover, what someone has built on our soil becomes ours by natural law, although he built it on his own account, because the superstructure follows the soil.",
    note: "Complete 2.73. This gives the antecedent for id accidit in 2.74. The workshop does not model building materials or the remedies and expense questions that follow in 2.76. Acquiring ownership and recovering possession without paying expenses are separate questions.",
    pages: ["g161"],
    words: [
      [
        "quamvis",
        "although",
        "The builder’s acting on his own account does not prevent this ownership result.",
      ],
      [
        "superficies solo cedit",
        "the superstructure follows the soil",
        "Cedit expresses legal accession here, not a physical movement of the building.",
      ],
    ],
  },
  {
    id: "g-tree",
    reference: "Gaius · Institutes 2.74",
    title: "Provided that it has embraced the earth with roots",
    latin:
      "Multoque magis id accidit et in planta quam quis in solo nostro posuerit, si modo radicibus terram conplexa fuerit.",
    english:
      "Much more does the same occur with a plant that someone has placed in our soil, provided that it has embraced the earth with its roots.",
    note: "Complete 2.74. Conplexa follows the printed spelling. ‘The same’ refers to accession to the soil in 2.73. This is a planted tree, not a tree carried along with an identifiable piece of somebody’s land. Roots confined to a transported root ball do not establish the workshop’s fact of rooting in the receiving soil.",
    pages: ["g161"],
    words: [
      [
        "id accidit",
        "the same occurs",
        "Read the preceding sentence to find which legal result is being carried over.",
      ],
      ["si modo", "provided that", "Planting alone does not satisfy this condition."],
      [
        "radicibus terram conplexa",
        "having embraced the earth with roots",
        "Radicibus is instrumental: by means of the roots.",
      ],
    ],
  },
  {
    id: "d-alluvion",
    reference: "Digest 41.1.7.1",
    title: "Another formulation of gradual addition",
    latin:
      "Praeterea quod per alluvionem agro nostro flumen adicit, iure gentium nobis adquiritur. Per alluvionem autem id videtur adici, quod ita paulatim adicitur, ut intellegere non possimus, quantum quoquo momento temporis adiciatur.",
    english:
      "Moreover, what the river adds to our field by alluvion is acquired for us by the law of nations. An addition is regarded as made by alluvion when it is added so gradually that we cannot perceive how much is added at each moment of time.",
    note: "Complete 41.1.7.1. The Digest, compiled in 533 CE, attributes fragment 7 to book two of Gaius’s Res cottidianae sive aurea. This is a different work from the Institutes. The selector changes the passages available to the learner; it does not date the invention of a rule or establish that the law changed between the works.",
    pages: ["d1"],
    words: [
      [
        "iure gentium",
        "by the law of nations",
        "The source’s legal category, not a claim that every people had an identical rule.",
      ],
      [
        "intellegere non possimus",
        "we cannot perceive",
        "Keeps the increment’s imperceptibility explicit.",
      ],
    ],
  },
  {
    id: "d-parcel",
    reference: "Digest 41.1.7.2",
    title: "From that time: the additional conditions",
    latin:
      "Quod si vis fluminis partem aliquam ex tuo praedio detraxerit et meo praedio attulerit, palam est eam tuam permanere. Plane si longiore tempore fundo meo haeserit arboresque, quas secum traxerit, in meum fundum radices egerint, ex eo tempore videtur meo fundo adquisita esse.",
    english:
      "But if the force of a river has torn some piece from your estate and brought it to mine, it is clear that it remains yours. If, however, it has adhered to my land for a long time, and the trees which it carried with it have put down roots in my land, from that time it is regarded as acquired for my land.",
    note: "Complete 41.1.7.2, attributed in the Digest to Gaius’s Res cottidianae. Both long attachment and the carried trees rooting in the receiving land are explicit in this sentence. The workshop treats them as separate stipulated facts; either can be established first after arrival. It does not convert longiore tempore into a fixed year count, or decide a treeless parcel, disputed evidence or every route to accession.",
    pages: ["d1"],
    words: [
      [
        "palam est … permanere",
        "it is clear … that it remains",
        "The initial consequence agrees with the shorter Institutes paragraph.",
      ],
      [
        "longiore tempore … haeserit",
        "has adhered for a long time",
        "Time must concern attachment at the receiving estate. No numeric duration is supplied.",
      ],
      [
        "arboresque … radices egerint",
        "and the trees … have put down roots",
        "The conjunction adds the rooting fact; it is not erased by waiting.",
      ],
      [
        "ex eo tempore",
        "from that time",
        "Marks the later acquisition, rather than backdating it to arrival.",
      ],
    ],
  },
  {
    id: "d-tree",
    reference: "Digest 41.1.7.13 · opening",
    title: "Before roots, it remains the former owner’s",
    latin:
      "Si alienam plantam in meo solo posuero, mea erit: ex diverso si meam plantam in alieno solo posuero, illius erit: si modo utroque casu radices egerit: antequam enim radices ageret, illius permanet, cuius et fuit.",
    english:
      "If I have placed another person’s plant in my soil, it will be mine; conversely, if I have placed my plant in another person’s soil, it will be theirs, provided in either case that it has put down roots. Before putting down roots, it remains the property of the person whose it was.",
    note: "Opening of 41.1.7.13; the omitted continuation considers a neighbour’s tree and shared roots across a boundary. This workshop keeps all new roots within Aulus’s soil. The former-owner statement is express here; the Institutes states rooting as the accession condition. The complete scanned page retains the continuation.",
    pages: ["d2"],
    words: [
      ["utroque casu", "in either case", "Both who plants and whose soil it is must be tracked."],
      ["antequam", "before", "Makes the pre-rooting stage explicit."],
      [
        "illius … cuius et fuit",
        "of that person … whose it was",
        "Refers back to the former owner, not automatically to the person holding the plant.",
      ],
    ],
  },
  {
    id: "d-flood",
    reference: "Digest 41.1.7.6",
    title: "Inundation does not change the field’s identity",
    latin:
      "Aliud sane est, si cuius ager totus inundatus fuerit: namque inundatio speciem fundi non mutat et ob id, cum recesserit aqua, palam est eiusdem esse, cuius et fuit.",
    english:
      "It is certainly different if someone’s entire field has been flooded: inundation does not change the identity of the estate, and therefore, when the water has receded, it plainly belongs to the same person whose it was.",
    note: "Complete 41.1.7.6. Aliud distinguishes this from the preceding discussion of a river permanently abandoning its bed and taking a new channel. Covering land with floodwater is not silently treated as creating a public riverbed. Those channel changes and allocation of abandoned beds are outside this model.",
    pages: ["d1"],
    words: [
      [
        "aliud sane est",
        "it is certainly different",
        "Do not carry over the preceding new-channel result to a flood.",
      ],
      [
        "speciem fundi non mutat",
        "does not change the estate’s identity",
        "The ground remains the same estate beneath the water.",
      ],
      [
        "eiusdem … cuius et fuit",
        "of the same person … whose it was",
        "The returning view of dry land does not create a new owner.",
      ],
    ],
  },
];
export const routeStories: Record<RiverRoute, string> = {
  parcel:
    "Lucius owns a piece of the left estate, with a tree on it. The river carries that identifiable piece to Aulus’s bank. Does a new location mean a new owner?",
  silt: "Aulus owns the right-hand estate. The river adds soil so gradually that its increment cannot be distinguished at each moment. The outline shows the eventual addition.",
  plant:
    "Lucius owns a lifted tree. Someone plants it directly in Aulus’s soil, without conveying it. What does si modo require before it follows the soil?",
  flood:
    "Aulus owns the right-hand field. Water covers it and recedes. No permanent new channel or loss of the field’s identity is stipulated.",
};
export const riverScope = [
  "These invented histories apply selected clauses to stipulated facts. The estates are ordinary private river-bounded land, the initial owners have full title, and there is no sale, gift, competing right or usucapion. The drawing assigns no ancient units, surveyed boundaries, real river profile or modern jurisdiction. It concerns ownership, not the legal possession or public use of a bank.",
  "An imperceptible increment is supplied as a fact, not inferred from animation speed. A torn piece retains its identity and carries a tree. The tree’s later roots must enter the receiving estate’s soil. Long attachment is a separate fact with no computed number of years. A transplanted tree starts lifted and unrooted in the receiving soil. Flooding leaves the field’s identity intact and creates no permanent channel.",
  "For the carried parcel, the Digest model establishes the described acquisition when both long attachment and new roots are present. Cases with a treeless piece, other forms of union, contested evidence, removal after accession, boundary-spanning roots, ager limitatus, islands or abandoned beds are not decided. Repeated buttons cannot manufacture time. Rejected attempts stay in the history without changing its facts.",
  "‘Not settled here’ means that the selected passages do not decide this elaborated history. The last express or stipulated owner is shown separately, not passed off as a final ruling. The Digest’s 533 compilation attributes these excerpts to another Gaian work; comparison does not establish a date of legal change, or settle authorship and textual history. The app does not make the two texts contradict one another.",
  "Ownership alone does not determine remedies or reimbursement. Gaius 2.76, visible on the retained page, discusses expenses and the defence of fraud. These questions are outside the evaluator. New English and phrase explanations have not received independent philological or legal-historical review. Whole scans are modern printed editions, not ancient manuscripts.",
];
export function riverReading(id: ReadingId): RiverReading {
  const r = riverReadings.find((r) => r.id === id);
  if (!r) throw new Error(`Missing reading ${id}`);
  return r;
}
