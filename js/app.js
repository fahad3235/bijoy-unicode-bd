// bijoy-unicode-bd -- UI glue. Pure ASCII; all Bengali text comes from
// js/i18n.js at runtime. Exposes window.__bijoy for smoke tests.
'use strict';

(function () {
  var STORE_KEY = 'bijoy-unicode-bd:v1';
  var BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea',
    '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];

  var $ = function (id) { return document.getElementById(id); };
  var inputEl = $('inputText');
  var outputEl = $('outputText');
  var state = { dir: 'b2u', lang: 'en', input: '' };

  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved) {
      if (saved.dir === 'b2u' || saved.dir === 'u2b') state.dir = saved.dir;
      if (saved.lang === 'en' || saved.lang === 'bn') state.lang = saved.lang;
      if (typeof saved.input === 'string') state.input = saved.input.slice(0, 200000);
    }
  } catch (e) { /* fresh start on bad storage */ }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) { /* storage may be unavailable; app still works */ }
  }
  function t(key) {
    var pair = I18N.strings[key];
    if (!pair) return key;
    return state.lang === 'bn' ? pair[1] : pair[0];
  }
  function fmt(key, n) {
    return t(key).replace('{n}', digits(n));
  }
  function digits(n) {
    var s = String(n);
    if (state.lang !== 'bn') return s;
    return s.replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }
  function convert(text, dir) {
    if (dir === 'b2u') return bijoyToUnicode(text);
    return unicodeToBijoy(text);
  }
  function countWords(s) {
    var w = s.trim().split(/\s+/).filter(function (x) { return x.length > 0; });
    return s.trim() === '' ? 0 : w.length;
  }

  function render() {
    var out = state.input === '' ? '' : convert(state.input, state.dir);
    outputEl.value = out;
    $('inputCount').textContent = fmt('chars', Array.from(state.input).length) +
      ' \u00b7 ' + fmt('words', countWords(state.input));
    $('outputCount').textContent = fmt('chars', Array.from(out).length) +
      ' \u00b7 ' + fmt('words', countWords(out));
    $('emptyHint').hidden = state.input !== '';
    $('emptyHint').textContent = t('empty');
    $('verifyResult').hidden = true;
    $('copyMsg').textContent = '';
    $('downloadBtn').disabled = state.input === '';
    $('copyBtn').disabled = state.input === '';
  }

  function applyLang() {
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    $('title').textContent = t('title');
    $('subtitle').textContent = t('subtitle');
    $('langBtn').textContent = t('lang_btn');
    $('dirB2U').textContent = t('dir_b2u');
    $('dirU2B').textContent = t('dir_u2b');
    $('swapBtn').textContent = t('swap');
    $('copyBtn').textContent = t('copy');
    $('clearBtn').textContent = t('clear');
    $('downloadBtn').textContent = t('download');
    $('uploadBtn').textContent = t('upload');
    $('verifyBtn').textContent = t('verify');
    $('samplesLabel').textContent = t('samples');
    $('sample1Btn').textContent = t('sample1');
    $('sample2Btn').textContent = t('sample2');
    $('sample3Btn').textContent = t('sample3');
    $('notesTitle').textContent = t('notes_title');
    var notes = I18N.notes[state.lang];
    $('notesList').innerHTML = '';
    notes.forEach(function (n) {
      var li = document.createElement('li');
      li.textContent = n;
      $('notesList').appendChild(li);
    });
    applyDirLabels();
    render();
  }

  function applyDirLabels() {
    var b2u = state.dir === 'b2u';
    $('inputLabel').textContent = b2u ? t('input_bijoy') : t('input_unicode');
    $('outputLabel').textContent = b2u ? t('output_unicode') : t('output_bijoy');
    inputEl.placeholder = b2u ? t('input_ph_bijoy') : t('input_ph_unicode');
    $('dirB2U').classList.toggle('active', b2u);
    $('dirU2B').classList.toggle('active', !b2u);
  }

  function setDir(dir) {
    state.dir = dir;
    applyDirLabels();
    render();
    save();
  }

  inputEl.addEventListener('input', function () {
    state.input = inputEl.value;
    render();
    save();
  });
  $('dirB2U').addEventListener('click', function () { setDir('b2u'); });
  $('dirU2B').addEventListener('click', function () { setDir('u2b'); });
  $('swapBtn').addEventListener('click', function () {
    var oldOut = outputEl.value;
    state.input = oldOut;
    inputEl.value = oldOut;
    setDir(state.dir === 'b2u' ? 'u2b' : 'b2u');
  });
  $('langBtn').addEventListener('click', function () {
    state.lang = state.lang === 'bn' ? 'en' : 'bn';
    applyLang();
    save();
  });
  $('clearBtn').addEventListener('click', function () {
    state.input = '';
    inputEl.value = '';
    inputEl.focus();
    render();
    save();
  });

  $('copyBtn').addEventListener('click', function () {
    var text = outputEl.value;
    if (!text) return;
    function done(ok) {
      $('copyMsg').textContent = ok ? t('copied') : t('copy_failed');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { done(true); },
        function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  });
  function fallbackCopy(text, done) {
    outputEl.focus();
    outputEl.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    outputEl.setSelectionRange(0, 0);
    done(ok);
  }

  $('downloadBtn').addEventListener('click', function () {
    var text = outputEl.value;
    if (!text) return;
    var name = state.dir === 'b2u' ? 'unicode-output.txt' : 'bijoy-output.txt';
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  $('uploadBtn').addEventListener('click', function () { $('fileInput').click(); });
  $('fileInput').addEventListener('change', function () {
    var file = $('fileInput').files && $('fileInput').files[0];
    $('fileInput').value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) {
      $('copyMsg').textContent = t('file_too_large');
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      state.input = String(reader.result || '');
      inputEl.value = state.input;
      render();
      save();
    };
    reader.onerror = function () { $('copyMsg').textContent = t('upload_error'); };
    reader.readAsText(file);
  });

  $('verifyBtn').addEventListener('click', function () {
    var el = $('verifyResult');
    if (!state.input) { el.hidden = true; return; }
    var back = convert(outputEl.value, state.dir === 'b2u' ? 'u2b' : 'b2u');
    var diff = 0;
    var max = Math.max(back.length, state.input.length);
    for (var i = 0; i < max; i++) {
      if (back[i] !== state.input[i]) diff++;
    }
    el.hidden = false;
    if (diff === 0) {
      el.textContent = t('verify_ok');
      el.className = 'verify ok';
    } else {
      el.textContent = t('verify_diff').replace('{n}', digits(diff));
      el.className = 'verify bad';
    }
  });

  [['sample1Btn', 0], ['sample2Btn', 1], ['sample3Btn', 2]].forEach(function (pair) {
    $(pair[0]).addEventListener('click', function () {
      var s = I18N.samples[pair[1]];
      state.input = state.dir === 'b2u' ? s.bij : s.uni;
      inputEl.value = state.input;
      inputEl.focus();
      render();
      save();
    });
  });

  // Restore saved input, then localise + convert.
  inputEl.value = state.input;
  applyLang();

  window.__bijoy = {
    state: state,
    convert: convert,
    unicodeToBijoy: unicodeToBijoy,
    bijoyToUnicode: bijoyToUnicode,
    setInput: function (text) {
      state.input = text;
      inputEl.value = text;
      render();
      save();
    },
    setDir: setDir
  };
})();
