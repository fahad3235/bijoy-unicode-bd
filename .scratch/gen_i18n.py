#!/usr/bin/env python3
"""Generate js/i18n.js (EN/BN UI strings + sample texts) as pure ASCII.

Strings are typed in UTF-8 here (.scratch/ is never pushed); the emitted
js/i18n.js uses \\uXXXX escapes only, so the factory push stays ASCII-safe.
"""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent

STRINGS = {
    "title": ["Bijoy ↔ Unicode Converter", "বিজয় ↔ ইউনিকোড কনভার্টার"],
    "subtitle": [
        "Convert SutonnyMJ (Bijoy 2000) text to Unicode Bangla — and back. "
        "Runs 100% in your browser; nothing is uploaded.",
        "সুতন্নীএমজে (বিজয় ২০০০) লেখা ইউনিকোড বাংলায় রূপান্তর করুন — "
        "এবং উল্টোটাও। সবকিছু আপনার ব্রাউজারেই হয়; কিছুই আপলোড হয় না।",
    ],
    "dir_b2u": ["Bijoy → Unicode", "বিজয় → ইউনিকোড"],
    "dir_u2b": ["Unicode → Bijoy", "ইউনিকোড → বিজয়"],
    "swap": ["Swap direction", "দিক বদলান"],
    "input_bijoy": [
        "Bijoy text — paste SutonnyMJ text (it looks like English letters)",
        "বিজয় লেখা — সুতন্নীএমজে লেখা দিন (ইংরেজি অক্ষরের মতো দেখাবে)",
    ],
    "input_unicode": ["Unicode Bangla text", "ইউনিকোড বাংলা লেখা"],
    "output_unicode": [
        "Unicode Bangla — ready to post, email or search anywhere",
        "ইউনিকোড বাংলা — যেকোনো জায়গায় পোস্ট, ইমেইল বা খোঁজার জন্য প্রস্তুত",
    ],
    "output_bijoy": [
        "Bijoy text — set the font to SutonnyMJ in Word / Photoshop",
        "বিজয় লেখা — Word / Photoshop-এ ফন্ট SutonnyMJ করে দিন",
    ],
    "input_ph_bijoy": [
        "Paste Bijoy text here… e.g. Avwg evsjvq Mvb MvB",
        "এখানে বিজয় লেখা দিন… যেমন Avwg evsjvq Mvb MvB",
    ],
    "input_ph_unicode": [
        "Paste Unicode Bangla here… e.g. আমি বাংলায় গান গাই",
        "এখানে ইউনিকোড বাংলা লেখা দিন… যেমন আমি বাংলায় গান গাই",
    ],
    "copy": ["Copy result", "ফল কপি করুন"],
    "copied": ["Copied!", "কপি হয়েছে!"],
    "copy_failed": ["Copy failed — select the text manually.",
                    "কপি হয়নি — লেখাটি নিজে সিলেক্ট করে কপি করুন।"],
    "clear": ["Clear", "মুছুন"],
    "download": ["Download .txt", ".txt ডাউনলোড"],
    "upload": ["Open .txt file", ".txt ফাইল খুলুন"],
    "verify": ["Verify round-trip", "রাউন্ড-ট্রিপ যাচাই"],
    "verify_ok": [
        "Round-trip exact — converting the result back returns the same text.",
        "রাউন্ড-ট্রিপ নিখুঁত — ফলাফল উল্টো রূপান্তর করলে একই লেখা ফিরে আসে।",
    ],
    "verify_diff": [
        "Round-trip differs in {n} place(s). Usually this is a ZWNJ/ZWJ, a "
        "symbol like & or \\, or a conjunct outside the table — see notes.",
        "রাউন্ড-ট্রিপ {n} জায়গায় আলাদা। সাধারণত ZWNJ/ZWJ, & বা \\-এর মতো "
        "চিহ্ন, অথবা তালিকার বাইরের যুক্তাক্ষর — নিচের নোট দেখুন।",
    ],
    "samples": ["Try a sample:", "নমুনা দেখুন:"],
    "sample1": ["Famous line", "জনপ্রিয় লাইন"],
    "sample2": ["Paragraph", "অনুচ্ছেদ"],
    "sample3": ["Conjuncts", "যুক্তাক্ষর"],
    "chars": ["{n} characters", "{n} অক্ষর"],
    "words": ["{n} words", "{n} শব্দ"],
    "empty": ["Type or paste text above to convert.",
              "রূপান্তরের জন্য উপরে লেখা দিন।"],
    "notes_title": ["Good to know", "জেনে রাখুন"],
    "upload_error": ["Could not read that file as text.",
                     "ফাইলটি লেখা হিসেবে পড়া যায়নি।"],
    "file_too_large": ["File is larger than 1 MB.", "ফাইল ১ MB-এর বেশি।"],
    "lang_btn": ["বাংলা", "English"],
}

NOTES = {
    "en": [
        "SutonnyMJ (Bijoy 2000) table only. Other Bijoy fonts (Boishakhi, "
        "Bongshi, BornoSoft) use different codes and will come out wrong.",
        "In Bijoy the kars ি, ে and ৈ are typed before the consonant, ো and ৌ "
        "are split around it, and reph is typed after it. The converter moves "
        "them to their Unicode places.",
        "English mixed into Bijoy text reads as Bangla glyphs — convert "
        "Bangla passages only. Digits 0–9 become Bengali numerals.",
        "A conjunct outside the table (~190 covered) is written with a "
        "visible hasant instead of being guessed. Rare symbols shared with "
        "punctuation (&, \\, |, ^) may not survive a round-trip.",
        "য়, ড় and ঢ় always come out in their single-letter spellings.",
    ],
    "bn": [
        "শুধু সুতন্নীএমজে (বিজয় ২০০০) তালিকা। অন্য বিজয় ফন্ট (বৈশাখী, বংশী, "
        "বর্ণসফট) আলাদা কোড ব্যবহার করে, ফল ভুল আসবে।",
        "বিজয়ে ি, ে ও ৈ কার ব্যঞ্জনের আগে, ো ও ৌ কার দুই ভাগে ব্যঞ্জনের "
        "দুই পাশে, আর রেফ পরে লেখা হয়। কনভার্টার এগুলোকে ইউনিকোডের "
        "জায়গায় বসিয়ে দেয়।",
        "বিজয় লেখার ভেতরে ইংরেজি থাকলে তা বাংলা অক্ষর হিসেবে পড়া হবে — "
        "শুধু বাংলা অংশ রূপান্তর করুন। ০–৯ সংখ্যা বাংলা সংখ্যা হয়ে যায়।",
        "তালিকার বাইরের যুক্তাক্ষর (~১৯০টি আছে) অনুমান না করে দৃশ্যমান হসন্ত "
        "দিয়ে লেখা হয়। যতিচিহ্নের সঙ্গে ভাগ করা কিছু চিহ্ন (&, \\, |, ^) "
        "রাউন্ড-ট্রিপে নাও টিকতে পারে।",
        "য়, ড় ও ঢ় সবসময় একক-অক্ষরের বানানে আসে।",
    ],
}

SAMPLES = [
    {"name": "sample1",
     "uni": "আমি বাংলা\u09df গান গাই",
     "bij": "Avwg evsjvq Mvb MvB"},
    {"name": "sample2",
     "uni": "বাংলা আমার ভাষা। আমি বাংলা\u09df দেখি স্বপ্ন!",
     "bij": "evsjv Avgvi fvlv| Avwg evsjvq †`wL ¯^cœ!"},
    {"name": "sample3",
     "uni": "কিন্তু ক্ষমা ধর্ম প্রকাশ সংখ্যা বিদ্যুৎ",
     "bij": "wKš‘ ¶gv ag© cÖKvk msL¨v we`¨yr"},
]


def main() -> None:
    payload = {"strings": STRINGS, "notes": NOTES, "samples": SAMPLES}
    js = ("// GENERATED by .scratch/gen_i18n.py. Do not hand-edit.\n"
          "// Pure ASCII (non-ASCII as \\uXXXX escapes).\n"
          "'use strict';\n"
          "const I18N = " + json.dumps(payload, ensure_ascii=True, indent=1) + ";\n"
          "if (typeof module !== 'undefined') module.exports = { I18N };\n")
    (OUT / "js/i18n.js").write_text(js, encoding="ascii")
    print(f"wrote js/i18n.js ({(OUT / 'js/i18n.js').stat().st_size} bytes)")


if __name__ == "__main__":
    main()
