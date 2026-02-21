#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const [inArg, outArg] = process.argv.slice(2);
const inputPath = path.resolve(process.cwd(), inArg || 'emoji.json');
const outputPath = path.resolve(process.cwd(), outArg || path.join('src', 'emoji.ts'));

const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const FITZ = ['', '🏻', '🏼', '🏽', '🏾', '🏿'];
const MOD_SET = new Set(FITZ.slice(1));
const FE0F = '\uFE0F';

// Greatly simplified regular expression and explicit lookups
const TONE_SUFFIX_RE = /_(tone[1-5]|(?:light|medium_light|medium|medium_dark|dark)_skin_tone)(?:_(tone[1-5]|(?:light|medium_light|medium|medium_dark|dark)_skin_tone))?$/;
const TONES = { tone1: 1, light_skin_tone: 1, tone2: 2, medium_light_skin_tone: 2, tone3: 3, medium_skin_tone: 3, tone4: 4, medium_dark_skin_tone: 4, tone5: 5, dark_skin_tone: 5 };
const KEYCAPS = { zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', hash: '#', asterisk: '*' };

function toneTokenToNumber(token) { return TONES[token] || 0; }

function parseToneSuffixName(name) {
  const m = TONE_SUFFIX_RE.exec(name);
  if (!m) return null;
  const t1 = toneTokenToNumber(m[1]);
  const t2 = m[2] ? toneTokenToNumber(m[2]) : 0;
  if (!t1 || (m[2] && !t2)) return null;
  return { stem: name.slice(0, m.index), tones: t2 ? [t1, t2] : [t1] };
}

// Drastically minified versions of the algorithmic generation
function maybeAlgorithmic(name) {
  if (name.startsWith('flag_') && name.length === 7) return String.fromCodePoint(0x1f1e6 + name.charCodeAt(5) - 97, 0x1f1e6 + name.charCodeAt(6) - 97);
  if (name.startsWith('regional_indicator_') && name.length === 20) return String.fromCodePoint(0x1f1e6 + name.charCodeAt(19) - 97);
  if (name.startsWith('clock')) {
    const r = name.slice(5), half = r.endsWith('30'), n = Number(half ? r.slice(0, -2) : r);
    if (n) return String.fromCodePoint((half ? 0x1f55c : 0x1f550) + n - 1);
  }
  const kc = KEYCAPS[name];
  if (kc) return kc + '\uFE0F\u20E3';
  if (name === 'keycap_ten') return '🔟';
}

function nextCp(str, iCU) {
  const cp = str.codePointAt(iCU);
  if (cp === undefined) return null;
  const ch = String.fromCodePoint(cp);
  return { ch, len: ch.length };
}

function computeToneOps(base, variant) {
  const ins = [], del = [];
  let iB = 0, iV = 0;
  while (iB < base.length || iV < variant.length) {
    if (iV < variant.length) {
      const v = nextCp(variant, iV);
      if (!v) return null;
      if (MOD_SET.has(v.ch)) { ins.push(iB); iV += v.len; continue; }
    }
    if (iB < base.length) {
      const b = nextCp(base, iB);
      if (!b) return null;
      if (b.ch === FE0F) {
        if (iV >= variant.length) { del.push(iB); iB += b.len; continue; }
        const v = nextCp(variant, iV);
        if (!v) return null;
        if (v.ch !== FE0F) { del.push(iB); iB += b.len; continue; }
      }
    }
    if (iB >= base.length || iV >= variant.length) return null;
    const b2 = nextCp(base, iB), v2 = nextCp(variant, iV);
    if (!b2 || !v2 || b2.ch !== v2.ch) return null;
    iB += b2.len; iV += v2.len;
  }
  return { ins, del };
}

function applyToneOps(base, ins, del, tones) {
  let out = base;
  let di = del.length - 1, ii = ins.length - 1;
  while (di >= 0 || ii >= 0) {
    const nd = di >= 0 ? del[di] : -1, ni = ii >= 0 ? ins[ii] : -1;
    const idx = nd > ni ? nd : ni;
    while (di >= 0 && del[di] === idx) { out = out.slice(0, idx) + out.slice(idx + 1); di--; }
    while (ii >= 0 && ins[ii] === idx) { out = out.slice(0, idx) + FITZ[tones[ii] ?? tones[0]] + out.slice(idx); ii--; }
  }
  return out;
}

function sortObject(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

const toneVariants = [], nonToneNames = [];
for (const [name, emoji] of Object.entries(raw)) {
  const tone = parseToneSuffixName(name);
  if (tone) toneVariants.push({ name, stem: tone.stem, tones: tone.tones, emoji });
  else nonToneNames.push(name);
}

const droppable = new Set();
for (const name of nonToneNames) {
  const emoji = raw[name], gen = maybeAlgorithmic(name);
  if (gen && gen === emoji) droppable.add(name);
}

const byValue = new Map();
for (const name of nonToneNames) {
  const emoji = raw[name];
  const arr = byValue.get(emoji);
  if (arr) arr.push(name); else byValue.set(emoji, [name]);
}

function rankCanonical(name) { return [droppable.has(name) ? 0 : /^[a-z0-9_]+$/.test(name) ? 1 : 2, name.length, name]; }
function betterRank(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return false;
}
function pickCanonical(names) {
  let best = names[0], bestRank = rankCanonical(best);
  for (let i = 1; i < names.length; i++) {
    const r = rankCanonical(names[i]);
    if (betterRank(r, bestRank)) { best = names[i]; bestRank = r; }
  }
  return best;
}

const ALIAS = Object.create(null), canonicalOf = Object.create(null), canonicalNames = new Set();
for (const [emoji, names] of byValue.entries()) {
  const canon = pickCanonical(names);
  canonicalNames.add(canon);
  for (const n of names) { canonicalOf[n] = canon; if (n !== canon) ALIAS[n] = canon; }
}

const BASE = Object.create(null);
for (const canon of canonicalNames) { if (!droppable.has(canon)) BASE[canon] = raw[canon]; }

const toneGroups = new Map();
for (const v of toneVariants) {
  const canonStem = canonicalOf[v.stem] || v.stem;
  const arr = toneGroups.get(canonStem);
  if (arr) arr.push(v); else toneGroups.set(canonStem, [v]);
}

const TONE_RULES = Object.create(null), EXPLICIT_TONES = Object.create(null);
for (const [stem, variants] of toneGroups.entries()) {
  let baseEmoji = raw[stem];
  if (typeof baseEmoji !== 'string') {
    baseEmoji = variants[0].emoji.replace(/[🏻🏼🏽🏾🏿]/g, '');
    if (!droppable.has(stem) && BASE[stem] == null) BASE[stem] = baseEmoji;
  }

  let maxLen = 0;
  for (const v of variants) maxLen = Math.max(maxLen, v.tones.length);
  let sample = variants.find((v) => v.tones.length === maxLen && v.tones.every((t) => t === 1)) || variants.find((v) => v.tones.length === maxLen) || variants[0];
  const ops = computeToneOps(baseEmoji, sample.emoji);
  let ok = !!ops && ops.ins.length > 0;

  if (ok) {
    for (const v of variants) {
      const slots = ops.ins.length;
      let tones;
      if (slots === 1) {
        if (v.tones.length !== 1) { ok = false; break; }
        tones = v.tones;
      } else if (slots === 2) {
        tones = v.tones.length === 2 ? v.tones : [v.tones[0], v.tones[0]];
      } else { ok = false; break; }

      if (applyToneOps(baseEmoji, ops.ins, ops.del, tones) !== v.emoji) { ok = false; break; }
    }
  }

  if (ok) TONE_RULES[stem] = [ops.ins, ops.del];
  else for (const v of variants) EXPLICIT_TONES[stem + '_tone' + v.tones[0] + (v.tones.length === 2 ? '_tone' + v.tones[1] : '')] = v.emoji;
}

function getEmojiGenerated(input) {
  if (!input) return;
  let name = input;
  if (name.startsWith(':') && name.endsWith(':')) name = name.slice(1, -1);

  let t1 = 0, t2 = 0;
  const m = TONE_SUFFIX_RE.exec(name);
  if (m) {
    t1 = toneTokenToNumber(m[1]);
    t2 = m[2] ? toneTokenToNumber(m[2]) : 0;
    name = name.slice(0, m.index);
  }

  name = ALIAS[name] || name;
  const base = BASE[name];

  if (base) {
    if (!t1) return base;
    const rule = TONE_RULES[name];
    if (rule) return applyToneOps(base, rule[0], rule[1], rule[0].length === 2 ? (t2 ? [t1, t2] : [t1, t1]) : [t1]);
  }

  const alg = maybeAlgorithmic(name);
  if (alg) return alg;

  if (t2) return EXPLICIT_TONES[name + '_tone' + t1 + '_tone' + t2];
  return EXPLICIT_TONES[name + '_tone' + t1] || EXPLICIT_TONES[name + '_tone' + t1 + '_tone' + t1];
}

let mismatches = 0;
for (const [name, emoji] of Object.entries(raw)) {
  const got = getEmojiGenerated(name);
  if (got !== emoji) { mismatches++; console.error({ name, expected: emoji, got }); }
}
if (mismatches) { console.error('Validation failed.', mismatches); process.exit(1); }

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

// Emits inline (un-beautified) maps to radically reduce output file size
const ts = `// AUTO-GENERATED
const BASE: Record<string, string> = ${JSON.stringify(sortObject(BASE))};
const ALIAS: Record<string, string> = ${JSON.stringify(sortObject(ALIAS))};
const TONE_RULES: Record<string, readonly [readonly number[], readonly number[]]> = ${JSON.stringify(sortObject(TONE_RULES))};
const EXPLICIT_TONES: Record<string, string> = ${JSON.stringify(sortObject(EXPLICIT_TONES))};
const FITZ = ['', '🏻', '🏼', '🏽', '🏾', '🏿'];
const TONES: Record<string, number> = { tone1: 1, light_skin_tone: 1, tone2: 2, medium_light_skin_tone: 2, tone3: 3, medium_skin_tone: 3, tone4: 4, medium_dark_skin_tone: 4, tone5: 5, dark_skin_tone: 5 };
const KEYCAPS: Record<string, string> = { zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', hash: '#', asterisk: '*' };
const TONE_SUFFIX_RE = /_(tone[1-5]|(?:light|medium_light|medium|medium_dark|dark)_skin_tone)(?:_(tone[1-5]|(?:light|medium_light|medium|medium_dark|dark)_skin_tone))?$/;

function applyTone(base: string, [ins, del]: readonly [readonly number[], readonly number[]], tones: readonly number[]): string {
  let out = base;
  let di = del.length - 1, ii = ins.length - 1;
  while (di >= 0 || ii >= 0) {
    const nd = di >= 0 ? del[di] : -1, ni = ii >= 0 ? ins[ii] : -1;
    const idx = nd > ni ? nd : ni;
    while (di >= 0 && del[di] === idx) { out = out.slice(0, idx) + out.slice(idx + 1); di--; }
    while (ii >= 0 && ins[ii] === idx) { out = out.slice(0, idx) + FITZ[tones[ii]] + out.slice(idx); ii--; }
  }
  return out;
}

export function getEmoji(input: string): string | undefined {
  if (!input) return;
  let name = input;
  if (name.startsWith(':') && name.endsWith(':')) name = name.slice(1, -1);

  let t1 = 0, t2 = 0;
  const m = TONE_SUFFIX_RE.exec(name);
  if (m) {
    t1 = TONES[m[1]] || 0;
    t2 = m[2] ? TONES[m[2]] : 0;
    name = name.slice(0, m.index);
  }

  name = ALIAS[name] || name;
  const base = BASE[name];

  if (base) {
    if (!t1) return base;
    const rule = TONE_RULES[name];
    if (rule) return applyTone(base, rule, rule[0].length === 2 ? (t2 ? [t1, t2] : [t1, t1]) : [t1]);
  }

  if (name.startsWith('flag_') && name.length === 7) return String.fromCodePoint(0x1f1e6 + name.charCodeAt(5) - 97, 0x1f1e6 + name.charCodeAt(6) - 97);
  if (name.startsWith('regional_indicator_') && name.length === 20) return String.fromCodePoint(0x1f1e6 + name.charCodeAt(19) - 97);
  if (name.startsWith('clock')) {
    const r = name.slice(5), half = r.endsWith('30'), n = Number(half ? r.slice(0, -2) : r);
    if (n) return String.fromCodePoint((half ? 0x1f55c : 0x1f550) + n - 1);
  }
  const kc = KEYCAPS[name];
  if (kc) return kc + '\\uFE0F\\u20E3';
  if (name === 'keycap_ten') return '🔟';

  if (t2) return EXPLICIT_TONES[name + '_tone' + t1 + '_tone' + t2];
  return EXPLICIT_TONES[name + '_tone' + t1] || EXPLICIT_TONES[name + '_tone' + t1 + '_tone' + t1];
}
`;

fs.writeFileSync(outputPath, ts, 'utf8');
console.log('Generated:', outputPath);