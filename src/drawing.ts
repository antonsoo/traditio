import { type Case, evaluate, story, thingName, thingOf } from "./core/model";
import { reading } from "./readings";

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ??
      character,
  );
}

/** Original schematic illustrations, not depictions of excavated objects. */
export function objectDrawing(thing: "cup" | "mule" | "field"): string {
  if (thing === "cup")
    return `<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">
    <ellipse cx="120" cy="44" rx="53" ry="10" fill="#dce5eb"/>
    <path d="M67 44 Q68 111 112 117 L112 140 L92 147 L148 147 L128 140 L128 117 Q172 111 173 44" fill="#edf2f6"/>
    <path d="M68 52 C25 34 35 101 78 93 M172 52 C215 34 205 101 162 93 M75 60 Q120 75 165 60 M83 88 Q120 100 157 88 M111 116 Q120 119 129 116"/>
    <path d="M91 73 L97 82 L103 73 M112 76 L118 85 L124 76 M133 75 L139 84 L145 75" stroke-width="1.5"/>
    <path d="M84 55 Q83 77 89 89 M100 107 Q110 112 120 112" stroke="#fff" stroke-width="4"/>
    </g>`;
  if (thing === "field")
    return `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
    <path d="M25 105 L112 45 L216 83 L129 146 Z" fill="#e2ebe3"/>
    <path d="M46 111 L132 53 M62 118 L148 60 M79 123 L166 66 M96 131 L182 72 M112 138 L199 78" stroke="#69816b" stroke-width="1.3"/>
    <path d="M52 87 L157 126 M78 69 L184 108" stroke="#fcfdff" stroke-width="6"/>
    <path d="M25 105 V91 M112 45 V31 M216 83 V69 M129 146 V132" stroke-width="4"/>
    <path d="M35 115 Q61 142 99 148 M145 150 Q186 141 218 110" stroke="#a2b4bc"/>
    <path d="M75 50 V33 M67 39 L75 28 L84 39 M165 41 V24 M157 30 L165 19 L174 30" stroke="#69816b"/>
    </g>`;
  return `<g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M49 80 C71 66 99 80 121 75 L143 65 L151 42 L169 38 L190 54 L200 75 L188 83 L168 75 L157 102 L149 114 L156 147 L144 147 L135 115 L113 117 L107 147 L96 147 L99 110 L69 107 L68 145 L56 145 L59 108 L47 99 Z" fill="#dbe3e8"/>
    <path d="M158 42 L150 12 Q161 13 166 39 M167 38 L169 7 Q180 12 176 43" fill="#dbe3e8"/>
    <path d="M49 79 Q33 88 32 110 L26 119 M54 87 Q44 94 45 107"/>
    <path d="M66 78 L70 98 L113 103 L124 77" stroke="#705181"/>
    <path d="M73 78 L76 93 L111 98 L119 78" fill="#c8bcd1" stroke="#705181"/>
    <path d="M168 56 L185 70 L199 70 M174 60 L162 81" stroke="#80601c"/>
    <circle cx="180" cy="55" r="2" fill="currentColor"/>
    <path d="M189 76 L195 75 M144 147 L154 147 M97 147 L106 147 M56 145 L66 145 M82 110 L84 140 L76 140 M126 116 L127 140 L119 140"/>
    <path d="M26 154 H210" stroke="#a2b4bc" stroke-width="1"/>
    </g>`;
}

export function objectSvg(input: Case): string {
  return `<svg viewBox="0 0 240 170" role="img" aria-label="Schematic ${escapeHtml(thingName(input))}" xmlns="http://www.w3.org/2000/svg">${objectDrawing(thingOf(input))}</svg>`;
}

export function diagramSvg(input: Case): string {
  const result = evaluate(input);
  const references = [
    ...new Set(result.conditions.map((condition) => reading(condition.rule).reference)),
  ].join("; ");
  const rows = [
    ["Possession", "Aulus", "#286491"],
    ["Civil title", result.title, "#705181"],
    ["In bonis (2.41)", result.bonitary, "#276457"],
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" role="img" aria-labelledby="svg-title svg-desc">
    <title id="svg-title">${escapeHtml(thingName(input))}: ${input.years} completed years</title>
    <desc id="svg-desc">${escapeHtml(story(input))} ${escapeHtml(result.headline)} ${escapeHtml(result.explanation)} Gaius ${escapeHtml(references)}. This case assumes capable citizens, a valid sale and uninterrupted possession.</desc>
    <rect width="800" height="450" fill="#edf2f6"/>
    <g font-family="Georgia,serif" fill="#172b43"><text x="30" y="38" font-size="25">Traditio · ${escapeHtml(thingName(input))}</text><text x="30" y="65" font-size="16">${input.years} completed ${input.years === 1 ? "year" : "years"} · Gaius, Institutes</text></g>
    <g transform="translate(280 64)" color="#172b43">${objectDrawing(thingOf(input))}</g>
    <g font-family="sans-serif" font-size="18">${rows
      .map(([label, value, color], i) => {
        const y = 265 + i * 53;
        return `<text x="30" y="${y + 6}" fill="#172b43">${label}</text><path d="M204 ${y} H760" stroke="${color}" opacity=".2" stroke-width="6"/><rect x="${value === "Lucius" ? 208 : 450}" y="${y - 18}" width="${value === "Lucius" ? 120 : 310}" height="36" rx="18" fill="${color}"/><text x="${value === "Lucius" ? 268 : 605}" y="${y + 6}" fill="white" text-anchor="middle">${value}</text>`;
      })
      .join("")}</g>
    <text x="30" y="415" font-family="sans-serif" font-size="15" fill="#172b43">Gaius ${escapeHtml(references)}. Valid sale and uninterrupted possession assumed.</text>
    <text x="30" y="438" font-family="sans-serif" font-size="13" fill="#526478">Schematic teaching case; full facts are in the image description. Read the casebook for scope and source pages.</text>
  </svg>`;
}
