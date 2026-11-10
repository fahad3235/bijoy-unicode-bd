// bijoy-unicode-bd -- conversion engine.
// unicodeToBijoy: faithful JS port of OpenBangla Poriborton (MIT)
//   src/bijoy2000.rs -- Unicode -> Bijoy 2000 (SutonnyMJ) encoding.
// bijoyToUnicode: original inverse built on the same MAP table.
// This file is pure ASCII: every non-ASCII char is a \uXXXX escape.
'use strict';

// ---------------------------------------------------------------------------
// Bengali code points (U+0980..U+09FF) and joiners
// ---------------------------------------------------------------------------
const B_HASANTA = '\u09CD';
const B_AA_KAR = '\u09BE';
const B_I_KAR = '\u09BF';
const B_II_KAR = '\u09C0';
const B_U_KAR = '\u09C1';
const B_UU_KAR = '\u09C2';
const B_RRI_KAR = '\u09C3';
const B_E_KAR = '\u09C7';
const B_OI_KAR = '\u09C8';
const B_O_KAR = '\u09CB';
const B_OU_KAR = '\u09CC';
const B_DARI = '\u0964';
const B_DDARI = '\u0965';
const ZWJ = '\u200D';
const ZWNJ = '\u200C';
const B_REPH = '\u09B0\u09CD'; // ra + hasanta, prepended by reph
const B_YA_PHALA = '\u09CD\u09AF';
const B_RA_PHALA = '\u09CD\u09B0';
const B_BA_PHALA = '\u09CD\u09AC';
const B_LA_PHALA = '\u09CD\u09B2';
const B_MA_PHALA = '\u09CD\u09AE';
const B_NA_PHALA = '\u09CD\u09A8';
const B_NNA_PHALA = '\u09CD\u09A3';
const B_BHA_PHALA = '\u09CD\u09AD';

// ---------------------------------------------------------------------------
// Character classes (port of poriborton src/utility.rs + src/chars.rs)
// ---------------------------------------------------------------------------
function isKar(c) {
  return c >= '\u09BE' && c <= '\u09CC';
}
function isFrontKar(c) {
  return c === B_I_KAR || c === B_E_KAR || c === B_OI_KAR;
}
function isVowel(c) {
  return c >= '\u0985' && c <= '\u0994';
}
function isConsonant(c) {
  return c >= '\u0995' && c <= '\u09B9';
}
function isBaseLineRightChar(c) {
  return ['\u0996', '\u0997', '\u0998', '\u09A8', '\u09A3', '\u09A5', '\u09A6',
    '\u09A7', '\u09AA', '\u09AC', '\u09AE', '\u09AF', '\u09B0', '\u09B2',
    '\u09B6', '\u09B7', '\u09B8', '\u09B9', '\u09DF'].indexOf(c) !== -1;
}
// Last n Bengali chars of a string (all Bengali chars are single UTF-16 units).
function last(str, n) {
  if (!str || n <= 0) return null;
  if (str.length < n) return str;
  return str.slice(str.length - n);
}
function isFrontFacing(str) {
  // Port of poriborton is_front_facing: true when an e/oi-kar sits at the
  // front of its cluster (start of word, or after a conjunct boundary).
  if (!str) return true;
  let encounteredHasanta = false;
  let encounteredConsonant = false;
  for (let i = str.length - 1; i >= 0; i--) {
    const c = str[i];
    if (c === B_HASANTA) { encounteredHasanta = true; continue; }
    if (isConsonant(c) && encounteredConsonant && !encounteredHasanta) return false;
    if (isConsonant(c)) {
      encounteredConsonant = true; encounteredHasanta = false; continue;
    }
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r') break;
    if (isVowel(c) || isKar(c)) return false;
  }
  return true;
}
function isSpecialCombinationWithRFola(s) {
  if (!s) return false;
  return ['\u09B6\u09CD\u09B0', '\u09A6\u09CD\u09B0', '\u0997\u09CD\u09B0',
    '\u09A4\u09CD\u09B0', '\u099C\u09CD\u09B0', '\u09A5\u09CD\u09B0',
    '\u09A7\u09CD\u09B0', '\u09AA\u09CD\u09B0', '\u09AC\u09CD\u09B0',
    '\u09AD\u09CD\u09B0', '\u09AE\u09CD\u09B0', '\u09B8\u09CD\u09B0',
    '\u09A8\u09CD\u09A6\u09CD\u09B0', '\u09AE\u09CD\u09AA\u09CD\u09B0',
    '\u09B7\u09CD\u09AA\u09CD\u09B0', '\u09B8\u09CD\u09AA\u09CD\u09B0'
  ].indexOf(s) !== -1;
}
function isSpecialCombinationWithL(s) {
  if (!s) return false;
  return ['\u0997\u09CD\u09B2', '\u09AA\u09CD\u09B2', '\u09AC\u09CD\u09B2',
    '\u09B6\u09CD\u09B2', '\u09B8\u09CD\u09B2'].indexOf(s) !== -1;
}

// ---------------------------------------------------------------------------
// replaceKar: which Bijoy code a dependent vowel sign becomes.
// Port of poriborton replace_kar(). `preceding` is the buffered cluster.
// ---------------------------------------------------------------------------
function replaceKar(kar, front, preceding) {
  if (kar === B_AA_KAR) return 'v';
  if (kar === B_II_KAR) return 'x';
  if (kar === B_U_KAR) {
    if (preceding === '\u09B0') return '\u201c'; // ru
    const l1 = last(preceding, 1);
    if (l1 === '\u09B0') {
      if (isSpecialCombinationWithRFola(last(preceding, 3)) ||
          isSpecialCombinationWithRFola(last(preceding, 5))) return '\u201c';
      return 'y';
    }
    if (l1 === '\u09B2') {
      if (isSpecialCombinationWithL(last(preceding, 3)) ||
          last(preceding, 5) === '\u09B8\u09CD\u09AA\u09CD\u09B2') return '\u201c';
      return 'y';
    }
    if (l1 === '\u09A3') {
      if (last(preceding, 3) === '\u09B7\u09CD\u09A3') return 'z';
      return 'y';
    }
    if (l1 === '\u09B7') {
      if (last(preceding, 3) === '\u0995\u09CD\u09B7') return 'z';
      return 'y';
    }
    if (l1 && isBaseLineRightChar(l1)) return 'y';
    if (l1 === '\u09DC' || l1 === '\u09DD') return '\u2013';
    return 'z';
  }
  if (kar === B_UU_KAR) {
    if (preceding === '\u09B0') return '\u0192'; // ruu
    const l1 = last(preceding, 1);
    if (l1 === '\u09B0') {
      if (isSpecialCombinationWithRFola(last(preceding, 3)) ||
          isSpecialCombinationWithRFola(last(preceding, 5))) return '\u0192';
      return '~';
    }
    if (l1 === '\u09B2') {
      if (isSpecialCombinationWithL(last(preceding, 3)) ||
          last(preceding, 5) === '\u09B8\u09CD\u09AA\u09CD\u09B2') return '\u0192';
      return '~';
    }
    if (l1 === '\u09B7') {
      if (last(preceding, 3) === '\u0995\u09CD\u09B7') return '\u201a';
      return '~';
    }
    if (l1 && isBaseLineRightChar(l1)) return '~';
    return '\u201a';
  }
  if (kar === B_RRI_KAR) {
    const l1 = last(preceding, 1);
    if (l1 && isBaseLineRightChar(l1)) return '\u201e';
    return '\u2026';
  }
  if (kar === B_I_KAR) return 'w';
  if (kar === B_E_KAR) return front ? '\u2020' : '\u2021';
  if (kar === B_OI_KAR) return front ? '\u02c6' : '\u2030';
  // Unknown kar in the 09BE..09CC range (unassigned slots): pass through.
  return kar;
}

// ---------------------------------------------------------------------------
// convertBuffer: flush a buffered Unicode cluster into Bijoy output.
// Port of poriborton convert_buffer().
// ---------------------------------------------------------------------------
function convertBuffer(state) {
  // state = { buffer: string, out: string[] }
  let buffer = state.buffer;
  let reph = false;
  let zFola = false;
  let hasanta = false;
  if (buffer.slice(0, 2) === '\u09B0\u09CD') { // starts with reph "\u09b0\u09cd"
    buffer = buffer.slice(2);
    reph = true;
  }
  if (buffer.slice(0, 2) === '\u09B0' + ZWJ) { // "\u09b0" + ZWJ
    buffer = buffer.slice(0, 1) + buffer.slice(2);
  }
  if (buffer.slice(-2) === '\u09CD\u09AF') { // ends with "\u09cd\u09af" (ya-phala)
    buffer = buffer.slice(0, -2);
    zFola = true;
  }
  if (buffer.slice(-1) === B_HASANTA) { // trailing hasant
    buffer = buffer.slice(0, -1);
    hasanta = true;
  }
  if (buffer !== '' && Object.prototype.hasOwnProperty.call(BIJOY_MAP, buffer)) {
    state.out.push(BIJOY_MAP[buffer]);
  } else if (buffer !== '') {
    // Conjunct outside the Poriborton table: keep it readable as an
    // explicit hasant cluster instead of dropping it (Poriborton drops it).
    // Buffer holds base consonants joined by hasant already, e.g. "\u099c\u09cd\u09ae".
    state.out.push(explicitHasantaCluster(buffer));
  }
  state.buffer = '';
  if (zFola) state.out.push('\u00a8');
  if (reph) state.out.push('\u00a9');
  if (hasanta) state.out.push('&');
}

// A cluster the table does not know: spell it out consonant by consonant
// with explicit hasants, using the single-letter codes of the table.
function explicitHasantaCluster(buffer) {
  let out = '';
  for (let i = 0; i < buffer.length; i++) {
    const c = buffer[i];
    if (c === B_HASANTA) { out += '&'; continue; }
    if (c === ZWJ || c === ZWNJ) continue;
    if (Object.prototype.hasOwnProperty.call(BIJOY_MAP, c)) out += BIJOY_MAP[c];
    else out += c; // unknown char: pass through
  }
  return out;
}

// ---------------------------------------------------------------------------
// unicodeToBijoy: Unicode Bengali text -> Bijoy 2000 codes.
// Faithful port of poriborton::bijoy2000::unicode_to_bijoy.
// ---------------------------------------------------------------------------
function unicodeToBijoy(input) {
  // Normalise the decomposed nukta spellings to their single letters:
  // \u09af + nukta -> \u09af\u09bc, \u09a1 + nukta -> \u09a1\u09bc, \u09a2 + nukta -> \u09a2\u09bc. (Both spellings
  // are equivalent Unicode; the converter always uses the single letter.)
  input = input.split('\u09AF\u09BC').join('\u09DF')
    .split('\u09A1\u09BC').join('\u09DC')
    .split('\u09A2\u09BC').join('\u09DD');
  const state = { buffer: '', out: [] };
  let encounteredHasanta = false;
  const chars = Array.from(input); // code points
  for (let idx = 0; idx < chars.length; idx++) {
    const c = chars[idx];
    const prefix = chars.slice(0, idx).join('');
    if (c === B_O_KAR) {
      state.out.push(replaceKar(B_E_KAR, isFrontFacing(prefix), ''));
      convertBuffer(state);
      state.out.push('v');
    } else if (c === B_OU_KAR) {
      state.out.push(replaceKar(B_E_KAR, isFrontFacing(prefix), ''));
      convertBuffer(state);
      state.out.push('\u0160');
    } else if (isFrontKar(c)) {
      state.out.push(replaceKar(c, isFrontFacing(prefix), ''));
      convertBuffer(state);
    } else if (c === B_U_KAR && state.buffer === '\u0997') { // \u0997\u09c1
      state.out.push('\u00b8'); state.buffer = '';
    } else if (c === B_U_KAR && state.buffer === '\u09B6') { // \u09b6\u09c1
      state.out.push('\u00ef'); state.buffer = '';
    } else if (c === B_U_KAR && state.buffer === '\u09B9') { // \u09b9\u09c1
      state.out.push('\u00fb'); state.buffer = '';
    } else if (c === B_U_KAR && state.buffer.slice(-2) === '\u09CD\u09A4') { // "\u09cd\u09a4" + \u09c1
      // The ta of the cluster is written as '\u2018' (ta + u-kar) -- but only
      // when the cluster's Bijoy code actually ends with '\u2014' (ta), as in
      // \u09a8\u09cd\u09a4 -> "\u0161\u2014". For single-glyph clusters (\u0995\u09cd\u09a4 -> "\u00b3") there is no
      // separate ta code to pop, so use the regular u-kar code instead.
      // (Poriborton pops unconditionally and drops such clusters.)
      const before = state.buffer;
      convertBuffer(state);
      const lastEl = state.out[state.out.length - 1];
      if (lastEl && lastEl.slice(-1) === '\u2014') {
        state.out[state.out.length - 1] = lastEl.slice(0, -1);
        if (state.out[state.out.length - 1] === '') state.out.pop();
        state.out.push('\u2018');
      } else {
        state.out.push(replaceKar(B_U_KAR, false, before));
      }
    } else if (c === B_RRI_KAR && state.buffer === '\u09B9') { // \u09b9\u09c3
      state.out.push('\u00fc'); state.buffer = '';
    } else if (isKar(c)) {
      const kar = replaceKar(c, false, state.buffer);
      convertBuffer(state);
      state.out.push(kar);
    } else if (c === B_HASANTA) {
      encounteredHasanta = true;
      state.buffer += B_HASANTA;
    } else if (c === B_DARI) {
      convertBuffer(state);
      state.out.push('|');
    } else if (c === B_DDARI) {
      convertBuffer(state);
      state.out.push('\\');
    } else if (c === ZWJ) {
      state.buffer += ZWJ;
    } else if (c === ZWNJ) {
      if (state.buffer.slice(-1) === B_HASANTA) {
        state.buffer = state.buffer.slice(0, -1);
        convertBuffer(state);
        state.out.push('&');
        encounteredHasanta = false;
      }
    } else if (encounteredHasanta) {
      state.buffer += c;
      encounteredHasanta = false;
    } else if ((c >= '\u0980' && c <= '\u09FF') ||
               c === '\u2018' || c === '\u2019' || c === '\u201c' || c === '\u201d') {
      convertBuffer(state);
      state.buffer += c;
    } else {
      convertBuffer(state);
      state.out.push(c);
    }
  }
  if (state.buffer !== '') convertBuffer(state);
  return state.out.join('');
}

// ---------------------------------------------------------------------------
// bijoyToUnicode: Bijoy 2000 codes -> Unicode Bengali text.
// Original inverse of the Poriborton table. Longest-match tokenisation over
// the inverted MAP, then reordering: pre-base kars (w, dagger, circumflex)
// move after their cluster, split o/ou-kars rejoin, reph moves before its
// cluster, phala codes attach to the preceding cluster.
// ---------------------------------------------------------------------------
let INV_MAP = null;
let INV_MAX_LEN = 0;
function buildInverse() {
  if (INV_MAP) return INV_MAP;
  if (typeof BIJOY_MAP === 'undefined') {
    throw new Error('BIJOY_MAP not loaded: load js/data.js before js/convert.js');
  }
  INV_MAP = {};
  for (const uni of Object.keys(BIJOY_MAP)) {
    const code = BIJOY_MAP[uni];
    if (!Object.prototype.hasOwnProperty.call(INV_MAP, code)) {
      INV_MAP[code] = uni; // first wins: 'q' -> single-letter \u09df (U+09DF)
    }
    if (code.length > INV_MAX_LEN) INV_MAX_LEN = code.length;
  }
  // Dari / double dari are handled by arms, not by the MAP, in Poriborton.
  INV_MAP['|'] = B_DARI;
  INV_MAP['\\'] = B_DDARI;
  return INV_MAP;
}

// First consonant of a conjunct has its own Bijoy code (consonant + hasant).
const CONJ_FIRST = {
  '\u00af': '\u09B8', '\u00a4': '\u09AE', '\u0161': '\u09A8', '\u203a': '\u09A8',
  '\u00ae': '\u09B7', '\u2022': '\u0999', '\u201d': '\u099A', '\u2122': '\u09A6', '\u02dc': '\u09A6'
};
// Standalone phala codes (only reached for conjuncts outside the MAP table):
// value = what to append to the preceding cluster.
const PHALA = {
  '\u00aa': B_RA_PHALA, '\u00ab': B_RA_PHALA, '\u00d6': B_RA_PHALA,
  '\u00a8': B_YA_PHALA,
  '\u00a1': B_BA_PHALA, '\u00a6': B_BA_PHALA, '^': B_BA_PHALA, '\u0178': B_BA_PHALA,
  '\u00ac': B_LA_PHALA, '\u00ad': B_LA_PHALA, '\u2212': B_LA_PHALA,
  '\u00a5': B_MA_PHALA, '\u00a7': B_MA_PHALA,
  '\u0153': B_NA_PHALA, '\u00a2': B_BHA_PHALA,
  '\u00bf': '\u09A4' + B_RA_PHALA, // tra
  '\u00a3': '\u09AD' + B_RA_PHALA  // bhra
};
// Second consonants of a conjunct (plain consonant, hasant already in the
// cluster from CONJ_FIRST): '\u2019' = tha, '\u2014' = ta, '\u2039' = ka, '\u0152' = kra.
const SECOND = {
  '\u2019': '\u09A5',
  '\u2014': '\u09A4',
  '\u2039': '\u0995',
  '\u0152': '\u0995' + B_RA_PHALA
};
// Single Bijoy codes that are a consonant + a kar in one glyph.
const CLUSTER_KAR = {
  '\u00b8': '\u0997' + B_U_KAR,   // gu
  '\u00ef': '\u09B6' + B_U_KAR,   // shu
  '\u00fb': '\u09B9' + B_U_KAR,   // hu
  '\u00fc': '\u09B9' + B_RRI_KAR  // hri
};
const KAR_U = { 'z': B_U_KAR, 'y': B_U_KAR, '\u2013': B_U_KAR, '\u201c': B_U_KAR };
const KAR_UU = { '\u0192': B_UU_KAR, '~': B_UU_KAR, '\u201a': B_UU_KAR };
const KAR_RRI = { '\u201e': B_RRI_KAR, '\u2026': B_RRI_KAR };

function bijoyToUnicode(input) {
  const inv = buildInverse();
  const clusters = [];
  let pendingI = false;   // 'w' seen: i-kar owed to the next cluster
  let pendingOi = false;  // '^' seen: oi-kar owed to the next cluster
  let pendingE = false;   // dagger/double-dagger seen: e-kar owed
  let owedKar = null;     // kar owed to the last cluster (applied when it closes)
  let ePendingOnLast = false; // the last cluster still owes its e-kar
  let lastWasCluster = false;
  let ampersandJustSeen = false; // '&' just emitted: next cluster gets ZWNJ

  function pushCluster(s) {
    // An explicit-hasanta '&' followed by a consonant cluster becomes
    // hasant + ZWNJ in Unicode (it stops conjunct formation).
    if (ampersandJustSeen && clusters.length && lastWasCluster) {
      clusters[clusters.length - 1] += ZWNJ;
    }
    ampersandJustSeen = false;
    clusters.push(s);
    lastWasCluster = true;
    if (pendingI) { owedKar = B_I_KAR; pendingI = false; }
    else if (pendingOi) { owedKar = B_OI_KAR; pendingOi = false; }
    else owedKar = null;
    ePendingOnLast = pendingE;
  }
  function flushOwedKar() {
    if (owedKar) {
      if (clusters.length && lastWasCluster) {
        clusters[clusters.length - 1] += owedKar;
      } else {
        clusters.push(owedKar);
        lastWasCluster = true;
      }
      owedKar = null;
    }
  }
  function resolveE() { // flush a pending e-kar onto the last cluster
    if (!pendingE) return;
    if (ePendingOnLast && clusters.length && lastWasCluster) {
      clusters[clusters.length - 1] += B_E_KAR;
    } else {
      clusters.push(B_E_KAR);
      lastWasCluster = true;
    }
    pendingE = false;
    ePendingOnLast = false;
  }
  // Before a token: settle a pending e-kar. A cluster token inherits the
  // e-kar (it belongs to the incoming cluster); any other token flushes it.
  function settleE(isClusterToken) {
    if (!pendingE) return;
    if (isClusterToken && !ePendingOnLast) return;
    resolveE();
  }
  function appendToLast(s) {
    if (clusters.length && lastWasCluster) clusters[clusters.length - 1] += s;
    else { clusters.push(s); lastWasCluster = true; }
  }

  const chars = Array.from(input);
  let i = 0;
  while (i < chars.length) {
    const c = chars[i];

    // --- split o-kar / ou-kar second halves: 'v' (aa) and '\u0160' (ou tail) ---
    if (c === 'v' || c === '\u0160') {
      flushOwedKar();
      ampersandJustSeen = false;
      if (pendingE) {
        const joined = c === 'v' ? B_O_KAR : B_OU_KAR;
        if (ePendingOnLast && clusters.length && lastWasCluster) {
          clusters[clusters.length - 1] += joined;
        } else {
          clusters.push(joined);
          lastWasCluster = true;
        }
        pendingE = false;
        ePendingOnLast = false;
      } else {
        appendToLast(c === 'v' ? B_AA_KAR : B_OU_KAR);
      }
      lastWasCluster = true;
      i++;
      continue;
    }

    // --- pre-base kars: i-kar, e-kar, oi-kar ---
    // '\u2020'/'\u2021' are the SAME kar (e-kar before its cluster); the forward
    // converter picks '\u2020' at a cluster front and '\u2021' after a consonant.
    // Likewise '\u02c6'/'\u2030' are both oi-kar before its cluster.
    if (c === 'w') { settleE(false); pendingI = true; i++; continue; }
    if (c === '\u2020' || c === '\u2021') { settleE(false); pendingE = true; ePendingOnLast = false; i++; continue; }
    if (c === '\u02c6' || c === '\u2030') { settleE(false); pendingOi = true; i++; continue; }

    // --- post-base kars: ii-kar ---
    if (c === 'x') {
      settleE(false);
      flushOwedKar();
      ampersandJustSeen = false;
      appendToLast(B_II_KAR);
      lastWasCluster = true;
      i++;
      continue;
    }

    // --- u / uu / rri kars (several Bijoy codes per kar) ---
    if (Object.prototype.hasOwnProperty.call(KAR_U, c) ||
        Object.prototype.hasOwnProperty.call(KAR_UU, c) ||
        Object.prototype.hasOwnProperty.call(KAR_RRI, c)) {
      settleE(false);
      flushOwedKar();
      ampersandJustSeen = false;
      appendToLast(KAR_U[c] || KAR_UU[c] || KAR_RRI[c]);
      lastWasCluster = true;
      i++;
      continue;
    }

    // --- reph: move ra+hasanta before the last cluster ---
    // A cluster continuation: does not settle a pending e-kar (it still
    // belongs to this cluster, e.g. "\u2020K\u00a9v" = \u09b0\u09cd\u0995\u09cb) and does not flush an
    // owed i/oi-kar (it still belongs after the whole cluster).
    if (c === '\u00a9') {
      if (clusters.length && lastWasCluster) {
        clusters[clusters.length - 1] = B_REPH + clusters[clusters.length - 1];
      } else {
        clusters.push(B_REPH);
        lastWasCluster = true;
      }
      i++;
      continue;
    }

    // --- trailing hasant ---
    // '&' is Bijoy's explicit-hasanta mark. The kar position closes here:
    // a pending e-kar / owed i-kar attaches before the hasant.
    // If a consonant cluster follows, the Unicode form is hasant + ZWNJ
    // (that is what stops the shaping engine forming a conjunct); at a
    // word end it is a plain hasant. The flag is consumed by pushCluster.
    if (c === '&') {
      settleE(false);
      flushOwedKar();
      appendToLast(B_HASANTA);
      lastWasCluster = true;
      ampersandJustSeen = true;
      i++;
      continue;
    }

    // --- '\u2018' (U+2018): the "ta + u-kar" of a "nta + u" cluster ---
    if (c === '\u2018') {
      settleE(false);
      flushOwedKar();
      appendToLast('\u09A4' + B_U_KAR);
      lastWasCluster = true;
      i++;
      continue;
    }

    // --- longest-match against the inverted MAP (up to 3 Bijoy chars) ---
    let matched = null;
    let matchedLen = 0;
    for (let len = Math.min(INV_MAX_LEN, chars.length - i); len >= 1; len--) {
      const cand = chars.slice(i, i + len).join('');
      if (Object.prototype.hasOwnProperty.call(inv, cand)) {
        matched = inv[cand];
        matchedLen = len;
        break;
      }
    }
    if (matched !== null) {
      settleE(true);
      flushOwedKar();
      pushCluster(matched);
      i += matchedLen;
      continue;
    }

    // --- conjunct-first codes: consonant + hasant, second part follows ---
    if (Object.prototype.hasOwnProperty.call(CONJ_FIRST, c)) {
      settleE(true);
      flushOwedKar();
      pushCluster(CONJ_FIRST[c] + B_HASANTA);
      i++;
      continue;
    }

    // --- standalone phala codes (conjuncts outside the table) ---
    // Cluster continuations: a pending e-kar still belongs to this cluster
    // (it combines with a following 'v' into o-kar), and an owed i/oi-kar
    // still belongs after the whole cluster.
    if (Object.prototype.hasOwnProperty.call(PHALA, c)) {
      // '\u00a8' (ya-phala) directly after a lone ra is the ZWJ form
      // (\u09b0 + ZWJ + \u09cd + \u09af, e.g. \u09b0\u200d\u09cd\u09af\u09be\u09ac): the plain form would have taken
      // the reph path instead, so the ZWJ is unambiguous here.
      if (c === '\u00a8' && clusters.length && lastWasCluster &&
          clusters[clusters.length - 1] === '\u09B0') {
        clusters[clusters.length - 1] += ZWJ;
      }
      appendToLast(PHALA[c]);
      lastWasCluster = true;
      ampersandJustSeen = false;
      i++;
      continue;
    }

    // --- second consonants of a conjunct (hasant already in the cluster) ---
    if (Object.prototype.hasOwnProperty.call(SECOND, c)) {
      appendToLast(SECOND[c]);
      lastWasCluster = true;
      ampersandJustSeen = false;
      i++;
      continue;
    }

    // --- '\u00e8': na-phala, but nna-phala after \u09a3 (cluster continuation) ---
    if (c === '\u00e8') {
      const lastC = clusters.length && lastWasCluster
        ? clusters[clusters.length - 1] : '';
      appendToLast(lastC.slice(-1) === '\u09A3' ? B_NNA_PHALA : B_NA_PHALA);
      lastWasCluster = true;
      ampersandJustSeen = false;
      i++;
      continue;
    }

    // --- single-code consonant + kar glyphs ---
    if (Object.prototype.hasOwnProperty.call(CLUSTER_KAR, c)) {
      settleE(true);
      flushOwedKar();
      pushCluster(CLUSTER_KAR[c]);
      i++;
      continue;
    }

    // --- anything else passes through (space, punctuation, ASCII, digits
    //     not in the table, ZWJ/ZWNJ, unknown symbols) ---
    settleE(false);
    flushOwedKar();
    ampersandJustSeen = false;
    if (pendingI) { clusters.push(B_I_KAR); pendingI = false; }
    if (pendingOi) { clusters.push(B_OI_KAR); pendingOi = false; }
    clusters.push(c);
    lastWasCluster = false;
    i++;
  }

  flushOwedKar();
  resolveE();
  if (pendingI) clusters.push(B_I_KAR);
  if (pendingOi) clusters.push(B_OI_KAR);
  return clusters.join('');
}

if (typeof module !== 'undefined') {
  module.exports = { unicodeToBijoy, bijoyToUnicode };
}
