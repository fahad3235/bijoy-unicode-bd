// bijoy-unicode-bd -- node unit tests.
// Ground truth: pairs extracted from OpenBangla Poriborton
// tests/bijoy2000.rs (MIT) + hand-checked extras. Every pair is checked in
// BOTH directions, plus round-trips and edge cases. Pure ASCII file: all
// Bengali strings live in the generated *.json files (see .scratch/gen.py).
// Usage: node tests/convert.test.js
'use strict';

global.BIJOY_MAP = require('../js/data.js').BIJOY_MAP;
const { unicodeToBijoy, bijoyToUnicode } = require('../js/convert.js');
const pairs = require('./poriborton-pairs.json').pairs;
const extra = require('./extra-pairs.json').pairs;

let pass = 0;
let fail = 0;
const failures = [];
function check(name, got, want) {
  if (got === want) { pass++; }
  else {
    fail++;
    if (failures.length < 25) {
      failures.push(name + '\n  got:  ' + JSON.stringify(got) +
        '\n  want: ' + JSON.stringify(want));
    }
  }
}

// --- 1. Poriborton corpus, forward: unicode -> bijoy ---
for (const [uni, bij] of pairs) {
  check('U2B ' + JSON.stringify(uni), unicodeToBijoy(uni), bij);
}
// --- 2. Poriborton corpus, reverse: bijoy -> unicode ---
// One exception: the punctuation pair whose Unicode side contains a literal
// backslash. In Bijoy a backslash IS the double-dari code, so B2U reads it
// as \u0965; Poriborton only asserts the U2B passthrough direction for it.
for (const [uni, bij] of pairs) {
  if (uni.includes('\\')) continue;
  check('B2U ' + JSON.stringify(bij), bijoyToUnicode(bij), uni);
}
// --- 3. Round-trips on the corpus (same backslash exception on the U leg) ---
for (const [uni, bij] of pairs) {
  if (!uni.includes('\\')) {
    check('RT-U ' + JSON.stringify(uni), bijoyToUnicode(unicodeToBijoy(uni)), uni);
  }
  check('RT-B ' + JSON.stringify(bij), unicodeToBijoy(bijoyToUnicode(bij)), bij);
}
// --- 4. Hand-checked extras, both directions + round-trip ---
for (const [uni, bij] of extra) {
  check('X-U2B ' + JSON.stringify(uni), unicodeToBijoy(uni), bij);
  check('X-B2U ' + JSON.stringify(bij), bijoyToUnicode(bij), uni);
  check('X-RT-U ' + JSON.stringify(uni), bijoyToUnicode(unicodeToBijoy(uni)), uni);
  check('X-RT-B ' + JSON.stringify(bij), unicodeToBijoy(bijoyToUnicode(bij)), bij);
}

// --- 5. Edge cases (ASCII-only) ---
check('empty U2B', unicodeToBijoy(''), '');
check('empty B2U', bijoyToUnicode(''), '');
check('ASCII passthrough U2B', unicodeToBijoy('Hello 123!'), 'Hello 123!');
// Bijoy reads every Latin letter as a glyph: "Hello" decodes as Bengali.
check('B2U reads Latin as Bijoy', bijoyToUnicode('Hello 123!'),
  '\u0990\u09ac\u09b7\u09b7\u09dc \u09e7\u09e8\u09e9!');
check('B2U reads Latin as Bijoy', bijoyToUnicode('K'), '\u0995');
check('U2B single vowel', unicodeToBijoy('\u0985'), 'A');
check('B2U single vowel', bijoyToUnicode('A'), '\u0985');
// Decomposed nukta spellings normalise to the single letter (U2B only).
check('nukta ya normalises', unicodeToBijoy('\u09af\u09bc'), 'q');
check('nukta rra normalises', unicodeToBijoy('\u09a1\u09bc'), 'o');
check('nukta rha normalises', unicodeToBijoy('\u09a2\u09bc'), 'p');

const total = pairs.length * 4 - 2 + extra.length * 4 + 10; // -2: backslash pair skips B2U + RT-U
console.log(pass + ' passed, ' + fail + ' failed (' + total + ' checks)');
if (failures.length) {
  console.log('\nFirst failures:\n' + failures.join('\n\n'));
  process.exit(1);
}
console.log('ALL GREEN');
