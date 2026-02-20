#!/usr/bin/env node
'use strict';

/**
 * Generate emoji.ts from emojis.json with:
 * - canonical BASE map (deduped)
 * - ALIAS map (synonyms)
 * - skin-tone generation rules (insert Fitzpatrick modifiers, optionally delete FE0F)
 * - algorithmic generation for flags, regional indicators, keycaps, clocks
 *
 * The script validates that the generated getEmoji(name) reproduces emojis.json.
 */

const fs = require('fs');
const path = require('path');

const [inArg, outArg] = process.argv.slice(2);
const inputPath = path.resolve(process.cwd(), inArg || 'emojis.json');
const outputPath = path.resolve(process.cwd(), outArg || path.join('src', 'emoji.ts'));

const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const FITZ = ['', '🏻', '🏼', '🏽', '🏾', '🏿']; // 1..5
const MOD_SET = new Set(FITZ.slice(1));
const FE0F = '\uFE0F';

// Matches both numeric and verbose tone suffixes, with optional second tone.
const TONE_SUFFIX_RE =
  /_(tone[1-5]|light_skin_tone|medium_light_skin_tone|medium_skin_tone|medium_dark_skin_tone|dark_skin_tone)(?:_(tone[1-5]|light_skin_tone|medium_light_skin_tone|medium_skin_tone|medium_dark_skin_tone|dark_skin_tone))?$/;

function toneTokenToNumber(token) {
  switch (token) {
    case 'tone1':
    case 'light_skin_tone':
      return 1;
    case 'tone2':
    case 'medium_light_skin_tone':
      return 2;
    case 'tone3':
    case 'medium_skin_tone':
      return 3;
    case 'tone4':
    case 'medium_dark_skin_tone':
      return 4;
    case 'tone5':
    case 'dark_skin_tone':
      return 5;
    default:
      return 0;
  }
}

function parseToneSuffixName(name) {
  const m = TONE_SUFFIX_RE.exec(name);
  if (!m) return null;
  const t1 = toneTokenToNumber(m[1]);
  const t2 = m[2] ? toneTokenToNumber(m[2]) : 0;
  if (!t1 || (m[2] && !t2)) return null;
  return { stem: name.slice(0, m.index), tones: t2 ? [t1, t2] : [t1] };
}

function isAsciiLowerLetterCode(code) {
  return code >= 97 && code <= 122; // a-z
}

function maybeFlagFromName(name) {
  // "flag_" + 2 letters
  if (name.length !== 7) return undefined;
  if (
    name.charCodeAt(0) !== 102 || // f
    name.charCodeAt(1) !== 108 || // l
    name.charCodeAt(2) !== 97 || // a
    name.charCodeAt(3) !== 103 || // g
    name.charCodeAt(4) !== 95 // _
  ) {
    return undefined;
  }
  const c1 = name.charCodeAt(5);
  const c2 = name.charCodeAt(6);
  const a1 = (c1 | 32) - 97;
  const a2 = (c2 | 32) - 97;
  if (a1 < 0 || a1 > 25 || a2 < 0 || a2 > 25) return undefined;
  return String.fromCodePoint(0x1f1e6 + a1, 0x1f1e6 + a2);
}

function maybeRegionalIndicatorFromName(name) {
  const prefix = 'regional_indicator_';
  if (!name.startsWith(prefix) || name.length !== prefix.length + 1) return undefined;
  const c = name.charCodeAt(prefix.length);
  const a = (c | 32) - 97;
  if (a < 0 || a > 25) return undefined;
  return String.fromCodePoint(0x1f1e6 + a);
}

const KEYCAP_SUFFIX = '\uFE0F\u20E3';
function maybeKeycapFromName(name) {
  switch (name) {
    case 'zero':
      return '0' + KEYCAP_SUFFIX;
    case 'one':
      return '1' + KEYCAP_SUFFIX;
    case 'two':
      return '2' + KEYCAP_SUFFIX;
    case 'three':
      return '3' + KEYCAP_SUFFIX;
    case 'four':
      return '4' + KEYCAP_SUFFIX;
    case 'five':
      return '5' + KEYCAP_SUFFIX;
    case 'six':
      return '6' + KEYCAP_SUFFIX;
    case 'seven':
      return '7' + KEYCAP_SUFFIX;
    case 'eight':
      return '8' + KEYCAP_SUFFIX;
    case 'nine':
      return '9' + KEYCAP_SUFFIX;
    case 'hash':
      return '#' + KEYCAP_SUFFIX;
    case 'asterisk':
      return '*' + KEYCAP_SUFFIX;
    case 'keycap_ten':
      return '🔟';
    default:
      return undefined;
  }
}

function maybeClockFromName(name) {
  if (!name.startsWith('clock')) return undefined;
  const rest = name.slice(5);
  if (!rest) return undefined;

  if (rest.endsWith('30')) {
    const hourStr = rest.slice(0, -2);
    if (!hourStr) return undefined;
    const hour = Number(hourStr);
    if (!Number.isInteger(hour) || hour < 1 || hour > 12) return undefined;
    if (String(hour) !== hourStr) return undefined; // disallow "01"
    return String.fromCodePoint(0x1f55c + (hour - 1));
  }

  const hour = Number(rest);
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return undefined;
  if (String(hour) !== rest) return undefined;
  return String.fromCodePoint(0x1f550 + (hour - 1));
}

function maybeAlgorithmic(name) {
  return (
    maybeFlagFromName(name) ||
    maybeRegionalIndicatorFromName(name) ||
    maybeKeycapFromName(name) ||
    maybeClockFromName(name)
  );
}

// Iterate code points, but keep UTF-16 code unit indices.
function nextCp(str, iCU) {
  const cp = str.codePointAt(iCU);
  if (cp === undefined) return null;
  const ch = String.fromCodePoint(cp);
  return { ch, len: ch.length }; // len is 1 or 2 (UTF-16 code units)
}

/**
 * Compute a tone rule that turns base -> tonedVariant using ONLY:
 * - insert skin-tone modifiers (U+1F3FB..U+1F3FF)
 * - delete FE0F (VS16) code points from base when absent in variant
 *
 * Returns { ins: number[], del: number[] } with indices in base UTF-16 code units.
 */
function computeToneOps(base, variant) {
  const ins = [];
  const del = [];

  let iB = 0;
  let iV = 0;

  while (iB < base.length || iV < variant.length) {
    // 1) If variant has a Fitzpatrick modifier next, treat it as an insertion
    if (iV < variant.length) {
      const v = nextCp(variant, iV);
      if (!v) return null;
      if (MOD_SET.has(v.ch)) {
        ins.push(iB);
        iV += v.len;
        continue;
      }
    }

    // 2) If base has FE0F next but variant doesn't, treat it as a deletion
    if (iB < base.length) {
      const b = nextCp(base, iB);
      if (!b) return null;
      if (b.ch === FE0F) {
        if (iV >= variant.length) {
          del.push(iB);
          iB += b.len;
          continue;
        }
        const v = nextCp(variant, iV);
        if (!v) return null;
        if (v.ch !== FE0F) {
          del.push(iB);
          iB += b.len;
          continue;
        }
        // else FE0F matches; fallthrough to matching path
      }
    }

    // 3) Otherwise, code points must match
    if (iB >= base.length || iV >= variant.length) return null;
    const b2 = nextCp(base, iB);
    const v2 = nextCp(variant, iV);
    if (!b2 || !v2) return null;
    if (b2.ch !== v2.ch) return null;

    iB += b2.len;
    iV += v2.len;
  }

  return { ins, del };
}

function applyToneOps(base, ins, del, tones) {
  let out = base;

  // Apply from end so original indices remain valid.
  let di = del.length - 1;
  let ii = ins.length - 1;

  while (di >= 0 || ii >= 0) {
    const nextDel = di >= 0 ? del[di] : -1;
    const nextIns = ii >= 0 ? ins[ii] : -1;
    const idx = nextDel > nextIns ? nextDel : nextIns;

    // delete first at idx (important when del and ins share same index)
    while (di >= 0 && del[di] === idx) {
      out = out.slice(0, idx) + out.slice(idx + 1);
      di--;
    }

    // then insert
    while (ii >= 0 && ins[ii] === idx) {
      const tone = tones[ii] ?? tones[0];
      const mod = FITZ[tone] || '';
      out = out.slice(0, idx) + mod + out.slice(idx);
      ii--;
    }
  }

  return out;
}

function sortObject(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** ---------- Step 1: Split tone variants vs non-tone ---------- */
const toneVariants = []; // { name, stem, tones, emoji }
const nonToneNames = [];

for (const [name, emoji] of Object.entries(raw)) {
  const tone = parseToneSuffixName(name);
  if (tone) {
    toneVariants.push({ name, stem: tone.stem, tones: tone.tones, emoji });
  } else {
    nonToneNames.push(name);
  }
}

/** ---------- Step 2: Identify algorithmic entries we can drop ---------- */
const droppable = new Set();
for (const name of nonToneNames) {
  const emoji = raw[name];
  const gen = maybeAlgorithmic(name);
  if (gen && gen === emoji) droppable.add(name);
}

/** ---------- Step 3: Build canonical base + alias mapping (non-tone only) ---------- */
const byValue = new Map(); // emoji string -> string[]
for (const name of nonToneNames) {
  const emoji = raw[name];
  const arr = byValue.get(emoji);
  if (arr) arr.push(name);
  else byValue.set(emoji, [name]);
}

function rankCanonical(name) {
  // lower tuple is better
  const isSafe = /^[a-z0-9_]+$/.test(name);
  const p = droppable.has(name) ? 0 : isSafe ? 1 : 2;
  return [p, name.length, name];
}
function betterRank(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return false;
}
function pickCanonical(names) {
  let best = names[0];
  let bestRank = rankCanonical(best);
  for (let i = 1; i < names.length; i++) {
    const r = rankCanonical(names[i]);
    if (betterRank(r, bestRank)) {
      best = names[i];
      bestRank = r;
    }
  }
  return best;
}

const ALIAS = Object.create(null);
const canonicalOf = Object.create(null);
const canonicalNames = new Set();

for (const [emoji, names] of byValue.entries()) {
  const canon = pickCanonical(names);
  canonicalNames.add(canon);
  for (const n of names) canonicalOf[n] = canon;
  for (const n of names) {
    if (n !== canon) ALIAS[n] = canon;
  }
}

const BASE = Object.create(null);
for (const canon of canonicalNames) {
  if (droppable.has(canon)) continue; // generated at runtime
  BASE[canon] = raw[canon];
}

/** ---------- Step 4: Build tone rules keyed by canonical stem ---------- */
const toneGroups = new Map(); // canonicalStem -> variants[]
for (const v of toneVariants) {
  const canonStem = canonicalOf[v.stem] || v.stem;
  const arr = toneGroups.get(canonStem);
  if (arr) arr.push(v);
  else toneGroups.set(canonStem, [v]);
}

const TONE_RULES = Object.create(null); // stem -> [ins[], del[]]
const EXPLICIT_TONES = Object.create(null); // normalizedKey -> emoji

for (const [stem, variants] of toneGroups.entries()) {
  // base emoji: prefer actual stem entry, else derive from a variant (rare)
  let baseEmoji = raw[stem];
  if (typeof baseEmoji !== 'string') {
    baseEmoji = variants[0].emoji.replace(/[🏻🏼🏽🏾🏿]/g, '');
    if (!droppable.has(stem) && BASE[stem] == null) BASE[stem] = baseEmoji;
  }

  // pick a sample with max tones (2 preferred), prefer tone1/tone1_tone1 if possible
  let maxLen = 0;
  for (const v of variants) maxLen = Math.max(maxLen, v.tones.length);

  let sample =
    variants.find((v) => v.tones.length === maxLen && v.tones.every((t) => t === 1)) ||
    variants.find((v) => v.tones.length === maxLen) ||
    variants[0];

  const ops = computeToneOps(baseEmoji, sample.emoji);

  let ok = !!ops && ops.ins.length > 0;

  if (ok) {
    for (const v of variants) {
      const slots = ops.ins.length;
      let tones;
      if (slots === 1) {
        if (v.tones.length !== 1) {
          ok = false;
          break;
        }
        tones = v.tones;
      } else if (slots === 2) {
        tones = v.tones.length === 2 ? v.tones : [v.tones[0], v.tones[0]];
      } else {
        ok = false;
        break;
      }

      const gen = applyToneOps(baseEmoji, ops.ins, ops.del, tones);
      if (gen !== v.emoji) {
        ok = false;
        break;
      }
    }
  }

  if (ok) {
    TONE_RULES[stem] = [ops.ins, ops.del];
  } else {
    // fallback: store explicit toned values by normalized key
    for (const v of variants) {
      const k =
        stem +
        '_tone' +
        v.tones[0] +
        (v.tones.length === 2 ? '_tone' + v.tones[1] : '');
      EXPLICIT_TONES[k] = v.emoji;
    }
  }
}

/** ---------- Step 5: Validate compatibility against original emojis.json ---------- */
function getEmojiGenerated(input) {
  if (!input) return undefined;
  let name = input;

  // :shortcode:
  if (name.length > 2 && name.charCodeAt(0) === 58 && name.charCodeAt(name.length - 1) === 58) {
    name = name.slice(1, -1);
  }

  // tone parse
  let t1 = 0;
  let t2 = 0;
  const m = TONE_SUFFIX_RE.exec(name);
  if (m) {
    t1 = toneTokenToNumber(m[1]);
    t2 = m[2] ? toneTokenToNumber(m[2]) : 0;
    name = name.slice(0, m.index);
  }

  // alias on stem
  name = ALIAS[name] || name;

  // algorithmic
  const alg = maybeAlgorithmic(name);
  if (alg) return alg;

  const base = BASE[name];
  if (!t1) return base;

  const rule = TONE_RULES[name];
  if (rule && base) {
    const ins = rule[0];
    const del = rule[1];
    const slots = ins.length;
    const tones = slots === 2 ? (t2 ? [t1, t2] : [t1, t1]) : [t1];
    return applyToneOps(base, ins, del, tones);
  }

  // explicit tone fallback
  if (t2) {
    return EXPLICIT_TONES[name + '_tone' + t1 + '_tone' + t2];
  }
  return EXPLICIT_TONES[name + '_tone' + t1] || EXPLICIT_TONES[name + '_tone' + t1 + '_tone' + t1];
}

let mismatches = 0;
const mismatchSamples = [];
for (const [name, emoji] of Object.entries(raw)) {
  const got = getEmojiGenerated(name);
  if (got !== emoji) {
    mismatches++;
    if (mismatchSamples.length < 20) mismatchSamples.push({ name, expected: emoji, got });
  }
}

if (mismatches) {
  console.error('Validation failed. Mismatches:', mismatches);
  for (const m of mismatchSamples) console.error(m);
  process.exit(1);
}

/** ---------- Step 6: Emit emoji.ts ---------- */
const outDir = path.dirname(outputPath);
fs.mkdirSync(outDir, { recursive: true });

const ts = `/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 * Source: ${path.relative(process.cwd(), inputPath).replace(/\\/g, '/')}
 * Generator: scripts/gen-emoji-ts.cjs
 */

const BASE: Record<string, string> = ${JSON.stringify(sortObject(BASE), null, 2)};

const ALIAS: Record<string, string> = ${JSON.stringify(sortObject(ALIAS), null, 2)};

/**
 * Tone rules: stem -> [insertIndices, deleteIndices]
 * Indices are UTF-16 code unit offsets into the base emoji string.
 * deleteIndices are almost always for removing U+FE0F (VS16) when the toned form omits it.
 */
const TONE_RULES: Record<string, readonly [readonly number[], readonly number[]]> = ${JSON.stringify(
  sortObject(TONE_RULES),
  null,
  2
)};

/**
 * Rare exceptions where toned forms aren't representable by "insert modifier(s) + delete FE0F".
 * Keyed by normalized suffix: stem + "_toneX" or stem + "_toneX_toneY".
 */
const EXPLICIT_TONES: Record<string, string> = ${JSON.stringify(sortObject(EXPLICIT_TONES), null, 2)};

const FITZ: readonly string[] = ['', '🏻', '🏼', '🏽', '🏾', '🏿'] as const;

const TONE_SUFFIX_RE =
  /_(tone[1-5]|light_skin_tone|medium_light_skin_tone|medium_skin_tone|medium_dark_skin_tone|dark_skin_tone)(?:_(tone[1-5]|light_skin_tone|medium_light_skin_tone|medium_skin_tone|medium_dark_skin_tone|dark_skin_tone))?$/;

function toneTokenToNumber(token: string): 0 | 1 | 2 | 3 | 4 | 5 {
  switch (token) {
    case 'tone1':
    case 'light_skin_tone':
      return 1;
    case 'tone2':
    case 'medium_light_skin_tone':
      return 2;
    case 'tone3':
    case 'medium_skin_tone':
      return 3;
    case 'tone4':
    case 'medium_dark_skin_tone':
      return 4;
    case 'tone5':
    case 'dark_skin_tone':
      return 5;
    default:
      return 0;
  }
}

function maybeFlagFromName(name: string): string | undefined {
  // "flag_" + 2 letters
  if (name.length !== 7) return undefined;
  if (
    name.charCodeAt(0) !== 102 || // f
    name.charCodeAt(1) !== 108 || // l
    name.charCodeAt(2) !== 97 || // a
    name.charCodeAt(3) !== 103 || // g
    name.charCodeAt(4) !== 95 // _
  ) {
    return undefined;
  }
  const c1 = name.charCodeAt(5);
  const c2 = name.charCodeAt(6);
  const a1 = (c1 | 32) - 97;
  const a2 = (c2 | 32) - 97;
  if (a1 < 0 || a1 > 25 || a2 < 0 || a2 > 25) return undefined;
  return String.fromCodePoint(0x1f1e6 + a1, 0x1f1e6 + a2);
}

function maybeRegionalIndicatorFromName(name: string): string | undefined {
  const prefix = 'regional_indicator_';
  if (!name.startsWith(prefix) || name.length !== prefix.length + 1) return undefined;
  const c = name.charCodeAt(prefix.length);
  const a = (c | 32) - 97;
  if (a < 0 || a > 25) return undefined;
  return String.fromCodePoint(0x1f1e6 + a);
}

const KEYCAP_SUFFIX = '\\uFE0F\\u20E3';
function maybeKeycapFromName(name: string): string | undefined {
  switch (name) {
    case 'zero':
      return '0' + KEYCAP_SUFFIX;
    case 'one':
      return '1' + KEYCAP_SUFFIX;
    case 'two':
      return '2' + KEYCAP_SUFFIX;
    case 'three':
      return '3' + KEYCAP_SUFFIX;
    case 'four':
      return '4' + KEYCAP_SUFFIX;
    case 'five':
      return '5' + KEYCAP_SUFFIX;
    case 'six':
      return '6' + KEYCAP_SUFFIX;
    case 'seven':
      return '7' + KEYCAP_SUFFIX;
    case 'eight':
      return '8' + KEYCAP_SUFFIX;
    case 'nine':
      return '9' + KEYCAP_SUFFIX;
    case 'hash':
      return '#' + KEYCAP_SUFFIX;
    case 'asterisk':
      return '*' + KEYCAP_SUFFIX;
    case 'keycap_ten':
      return '🔟';
    default:
      return undefined;
  }
}

function maybeClockFromName(name: string): string | undefined {
  if (!name.startsWith('clock')) return undefined;
  const rest = name.slice(5);
  if (!rest) return undefined;

  if (rest.endsWith('30')) {
    const hourStr = rest.slice(0, -2);
    const hour = Number(hourStr);
    if (!Number.isInteger(hour) || hour < 1 || hour > 12) return undefined;
    if (String(hour) !== hourStr) return undefined;
    return String.fromCodePoint(0x1f55c + (hour - 1));
  }

  const hour = Number(rest);
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return undefined;
  if (String(hour) !== rest) return undefined;
  return String.fromCodePoint(0x1f550 + (hour - 1));
}

function applyTone(base: string, rule: readonly [readonly number[], readonly number[]], tones: readonly number[]): string {
  const ins = rule[0];
  const del = rule[1];

  let out = base;

  // Apply from end so indices stay valid.
  let di = del.length - 1;
  let ii = ins.length - 1;

  while (di >= 0 || ii >= 0) {
    const nextDel = di >= 0 ? del[di] : -1;
    const nextIns = ii >= 0 ? ins[ii] : -1;
    const idx = nextDel > nextIns ? nextDel : nextIns;

    // delete first at idx (important when del and ins share same index)
    while (di >= 0 && del[di] === idx) {
      out = out.slice(0, idx) + out.slice(idx + 1);
      di--;
    }

    // then insert
    while (ii >= 0 && ins[ii] === idx) {
      const tone = tones[ii] ?? tones[0];
      const mod = FITZ[tone] ?? '';
      out = out.slice(0, idx) + mod + out.slice(idx);
      ii--;
    }
  }

  return out;
}

export function getEmoji(input: string): string | undefined {
  if (!input) return undefined;
  let name = input;

  // optional :shortcode: wrapper
  if (name.length > 2 && name.charCodeAt(0) === 58 && name.charCodeAt(name.length - 1) === 58) {
    name = name.slice(1, -1);
  }

  // Parse skin tone suffix (1 or 2 tokens)
  let t1: 0 | 1 | 2 | 3 | 4 | 5 = 0;
  let t2: 0 | 1 | 2 | 3 | 4 | 5 = 0;

  const m = TONE_SUFFIX_RE.exec(name);
  if (m) {
    t1 = toneTokenToNumber(m[1]);
    t2 = m[2] ? toneTokenToNumber(m[2]) : 0;
    name = name.slice(0, m.index);
  }

  // Resolve alias on the (tone-less) stem
  const aliased = ALIAS[name];
  if (aliased) name = aliased;

  // Algorithmic (lets us drop hundreds of entries)
  const flag = maybeFlagFromName(name);
  if (flag) return flag;

  const ri = maybeRegionalIndicatorFromName(name);
  if (ri) return ri;

  const kc = maybeKeycapFromName(name);
  if (kc) return kc;

  const clk = maybeClockFromName(name);
  if (clk) return clk;

  const base = BASE[name];
  if (!t1) return base;

  // Prefer rule-based generation
  const rule = TONE_RULES[name];
  if (rule && base) {
    const slots = rule[0].length;
    const tones = slots === 2 ? (t2 ? [t1, t2] : [t1, t1]) : [t1];
    return applyTone(base, rule, tones);
  }

  // Fallback for rare exceptions (normalized key)
  if (t2) {
    return EXPLICIT_TONES[name + '_tone' + t1 + '_tone' + t2];
  }
  return EXPLICIT_TONES[name + '_tone' + t1] ?? EXPLICIT_TONES[name + '_tone' + t1 + '_tone' + t1];
}
`;

fs.writeFileSync(outputPath, ts, 'utf8');

const totalKeys = Object.keys(raw).length;
const uniqueValues = new Set(Object.values(raw)).size;

console.log('Generated:', outputPath);
console.log('Original keys:', totalKeys);
console.log('Original unique emoji values:', uniqueValues);
console.log('BASE entries:', Object.keys(BASE).length);
console.log('ALIAS entries:', Object.keys(ALIAS).length);
console.log('TONE_RULES stems:', Object.keys(TONE_RULES).length);
console.log('EXPLICIT_TONES entries:', Object.keys(EXPLICIT_TONES).length);
console.log('Droppable algorithmic entries:', droppable.size);
console.log('Tone-variant keys (generated at runtime):', toneVariants.length);
console.log('Validation: OK');