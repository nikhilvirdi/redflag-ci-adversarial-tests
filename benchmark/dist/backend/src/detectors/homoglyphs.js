"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectHomoglyphs = detectHomoglyphs;
// Source: Unicode's official confusables.txt (Unicode Security Mechanisms for
// UTS #39, version 17.0.0, dated 2025-07-22),
// https://www.unicode.org/Public/security/latest/confusables.txt
// This is a filtered, checked-in snapshot, not fetched at runtime -- v1's
// design is stateless and deterministic (architecture.md section 2), so the
// table below is generated once at development time and committed like any
// other data file, the same way a compiled regex or a vendored dependency
// would be.
//
// Filter applied to the ~6,500-line source file, kept to entries that:
//   1. Have exactly one target code point. Some source characters are only
//      confusable with a multi-character sequence (e.g. Mathematical Bold
//      small "m" resolves to "rn", not one letter) -- there's no single
//      "the Latin letter this looks like" to report for those, so they're
//      dropped rather than force-fit.
//   2. That target code point is a single Basic Latin ASCII letter (A-Z or
//      a-z) -- preserves the existing invariant every finding relies on:
//      "this character is a look-alike for one specific Latin letter."
//   3. The source character's Unicode name says it's a letter -- either
//      containing the word LETTER (e.g. "CYRILLIC SMALL LETTER A"), or, for
//      the Mathematical Alphanumeric Symbols block whose names omit that
//      word, ending in "CAPITAL <X>" / "SMALL <X>" (e.g. "MATHEMATICAL BOLD
//      CAPITAL A"). This excludes combining marks, punctuation, and symbol
//      confusables (Hebrew cantillation marks, "TWO DOT PUNCTUATION", etc.),
//      which aren't the "disguised as an ordinary letter" pattern RF-2
//      targets.
//   4. The source character's Unicode name does not start with "LATIN" --
//      keeps RF-2's existing scope of non-Latin scripts standing in for
//      Latin letters, rather than also flagging every accented Latin letter
//      (á, ñ, ü, ...) as a look-alike of its unaccented form, which would
//      misfire on ordinary French/Spanish/German/Vietnamese text.
//   5. Mathematical Alphanumeric Symbols is trimmed to one representative
//      style ("Mathematical Bold") rather than all 13 near-identical
//      typeface variants (Italic, Script, Fraktur, Double-struck,
//      Sans-serif, and combinations) confusables.txt provides -- that's
//      ~650 astral code points covering the same 52 letters over and over,
//      for a block that requires special input methods and has low
//      real-world relevance to rule-file prose. The previous hand-picked
//      table made the same one-style call; this keeps that scope but now
//      sources the 51 entries (52 letters minus capital I, which Unicode's
//      own data maps to lowercase "l", not "I" -- see below) from the
//      official table instead of guessing.
// That filter reduced ~6,500 lines to 403 code points across dozens of
// scripts (Cyrillic, Cherokee, Fullwidth Latin, Greek, Lisu, Coptic, Arabic,
// Armenian, Hebrew, Mathematical Bold, and many smaller/historic scripts),
// replacing the previous hand-picked list of ~120. Two corrections against
// the old table fell out of using authoritative data instead of eyeballing
// glyphs: Greek capital Iota (U+0399) and Mathematical Bold capital I
// (U+1D408) were previously mapped as look-alikes of Latin capital "I";
// Unicode's own confusables data maps both to lowercase "l" instead, which
// is the closer visual match in most fonts.
const HOMOGLYPHS = {
    // Mathematical Bold (51 code points)
    0x1d400: { latin: 'A', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL A
    0x1d401: { latin: 'B', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL B
    0x1d402: { latin: 'C', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL C
    0x1d403: { latin: 'D', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL D
    0x1d404: { latin: 'E', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL E
    0x1d405: { latin: 'F', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL F
    0x1d406: { latin: 'G', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL G
    0x1d407: { latin: 'H', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL H
    0x1d408: { latin: 'l', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL I
    0x1d409: { latin: 'J', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL J
    0x1d40a: { latin: 'K', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL K
    0x1d40b: { latin: 'L', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL L
    0x1d40c: { latin: 'M', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL M
    0x1d40d: { latin: 'N', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL N
    0x1d40e: { latin: 'O', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL O
    0x1d40f: { latin: 'P', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL P
    0x1d410: { latin: 'Q', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL Q
    0x1d411: { latin: 'R', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL R
    0x1d412: { latin: 'S', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL S
    0x1d413: { latin: 'T', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL T
    0x1d414: { latin: 'U', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL U
    0x1d415: { latin: 'V', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL V
    0x1d416: { latin: 'W', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL W
    0x1d417: { latin: 'X', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL X
    0x1d418: { latin: 'Y', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL Y
    0x1d419: { latin: 'Z', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD CAPITAL Z
    0x1d41a: { latin: 'a', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL A
    0x1d41b: { latin: 'b', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL B
    0x1d41c: { latin: 'c', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL C
    0x1d41d: { latin: 'd', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL D
    0x1d41e: { latin: 'e', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL E
    0x1d41f: { latin: 'f', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL F
    0x1d420: { latin: 'g', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL G
    0x1d421: { latin: 'h', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL H
    0x1d422: { latin: 'i', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL I
    0x1d423: { latin: 'j', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL J
    0x1d424: { latin: 'k', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL K
    0x1d425: { latin: 'l', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL L
    0x1d427: { latin: 'n', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL N
    0x1d428: { latin: 'o', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL O
    0x1d429: { latin: 'p', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL P
    0x1d42a: { latin: 'q', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL Q
    0x1d42b: { latin: 'r', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL R
    0x1d42c: { latin: 's', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL S
    0x1d42d: { latin: 't', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL T
    0x1d42e: { latin: 'u', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL U
    0x1d42f: { latin: 'v', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL V
    0x1d430: { latin: 'w', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL W
    0x1d431: { latin: 'x', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL X
    0x1d432: { latin: 'y', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL Y
    0x1d433: { latin: 'z', script: 'Mathematical Bold' }, // MATHEMATICAL BOLD SMALL Z
    // Cyrillic (43 code points)
    0x0405: { latin: 'S', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER DZE
    0x0406: { latin: 'l', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER BYELORUSSIAN-UKRAINIAN I
    0x0408: { latin: 'J', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER JE
    0x0410: { latin: 'A', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER A
    0x0412: { latin: 'B', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER VE
    0x0415: { latin: 'E', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER IE
    0x041a: { latin: 'K', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER KA
    0x041c: { latin: 'M', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER EM
    0x041d: { latin: 'H', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER EN
    0x041e: { latin: 'O', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER O
    0x0420: { latin: 'P', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER ER
    0x0421: { latin: 'C', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER ES
    0x0422: { latin: 'T', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER TE
    0x0423: { latin: 'Y', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER U
    0x0425: { latin: 'X', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER HA
    0x042c: { latin: 'b', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER SOFT SIGN
    0x0430: { latin: 'a', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER A
    0x0433: { latin: 'r', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER GHE
    0x0435: { latin: 'e', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER IE
    0x043e: { latin: 'o', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER O
    0x0440: { latin: 'p', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER ER
    0x0441: { latin: 'c', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER ES
    0x0443: { latin: 'y', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER U
    0x0445: { latin: 'x', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER HA
    0x0448: { latin: 'w', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER SHA
    0x0455: { latin: 's', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER DZE
    0x0456: { latin: 'i', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER BYELORUSSIAN-UKRAINIAN I
    0x0458: { latin: 'j', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER JE
    0x0461: { latin: 'w', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER OMEGA
    0x0474: { latin: 'V', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER IZHITSA
    0x0475: { latin: 'v', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER IZHITSA
    0x04ae: { latin: 'Y', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER STRAIGHT U
    0x04af: { latin: 'y', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER STRAIGHT U
    0x04bb: { latin: 'h', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER SHHA
    0x04bd: { latin: 'e', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER ABKHASIAN CHE
    0x04c0: { latin: 'l', script: 'Cyrillic' }, // CYRILLIC LETTER PALOCHKA
    0x04cf: { latin: 'l', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER PALOCHKA
    0x0501: { latin: 'd', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER KOMI DE
    0x050c: { latin: 'G', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER KOMI SJE
    0x051b: { latin: 'q', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER QA
    0x051c: { latin: 'W', script: 'Cyrillic' }, // CYRILLIC CAPITAL LETTER WE
    0x051d: { latin: 'w', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER WE
    0xa647: { latin: 'i', script: 'Cyrillic' }, // CYRILLIC SMALL LETTER IOTA
    // Cherokee (35 code points)
    0x13a0: { latin: 'D', script: 'Cherokee' }, // CHEROKEE LETTER A
    0x13a1: { latin: 'R', script: 'Cherokee' }, // CHEROKEE LETTER E
    0x13a2: { latin: 'T', script: 'Cherokee' }, // CHEROKEE LETTER I
    0x13a5: { latin: 'i', script: 'Cherokee' }, // CHEROKEE LETTER V
    0x13a9: { latin: 'Y', script: 'Cherokee' }, // CHEROKEE LETTER GI
    0x13aa: { latin: 'A', script: 'Cherokee' }, // CHEROKEE LETTER GO
    0x13ab: { latin: 'J', script: 'Cherokee' }, // CHEROKEE LETTER GU
    0x13ac: { latin: 'E', script: 'Cherokee' }, // CHEROKEE LETTER GV
    0x13b3: { latin: 'W', script: 'Cherokee' }, // CHEROKEE LETTER LA
    0x13b7: { latin: 'M', script: 'Cherokee' }, // CHEROKEE LETTER LU
    0x13bb: { latin: 'H', script: 'Cherokee' }, // CHEROKEE LETTER MI
    0x13bd: { latin: 'Y', script: 'Cherokee' }, // CHEROKEE LETTER MU
    0x13c0: { latin: 'G', script: 'Cherokee' }, // CHEROKEE LETTER NAH
    0x13c2: { latin: 'h', script: 'Cherokee' }, // CHEROKEE LETTER NI
    0x13c3: { latin: 'Z', script: 'Cherokee' }, // CHEROKEE LETTER NO
    0x13cf: { latin: 'b', script: 'Cherokee' }, // CHEROKEE LETTER SI
    0x13d2: { latin: 'R', script: 'Cherokee' }, // CHEROKEE LETTER SV
    0x13d4: { latin: 'W', script: 'Cherokee' }, // CHEROKEE LETTER TA
    0x13d5: { latin: 'S', script: 'Cherokee' }, // CHEROKEE LETTER DE
    0x13d9: { latin: 'V', script: 'Cherokee' }, // CHEROKEE LETTER DO
    0x13da: { latin: 'S', script: 'Cherokee' }, // CHEROKEE LETTER DU
    0x13de: { latin: 'L', script: 'Cherokee' }, // CHEROKEE LETTER TLE
    0x13df: { latin: 'C', script: 'Cherokee' }, // CHEROKEE LETTER TLI
    0x13e2: { latin: 'P', script: 'Cherokee' }, // CHEROKEE LETTER TLV
    0x13e6: { latin: 'K', script: 'Cherokee' }, // CHEROKEE LETTER TSO
    0x13e7: { latin: 'd', script: 'Cherokee' }, // CHEROKEE LETTER TSU
    0x13f3: { latin: 'G', script: 'Cherokee' }, // CHEROKEE LETTER YU
    0x13f4: { latin: 'B', script: 'Cherokee' }, // CHEROKEE LETTER YV
    0xab75: { latin: 'i', script: 'Cherokee' }, // CHEROKEE SMALL LETTER V
    0xab81: { latin: 'r', script: 'Cherokee' }, // CHEROKEE SMALL LETTER HU
    0xab83: { latin: 'w', script: 'Cherokee' }, // CHEROKEE SMALL LETTER LA
    0xab93: { latin: 'z', script: 'Cherokee' }, // CHEROKEE SMALL LETTER NO
    0xaba9: { latin: 'v', script: 'Cherokee' }, // CHEROKEE SMALL LETTER DO
    0xabaa: { latin: 's', script: 'Cherokee' }, // CHEROKEE SMALL LETTER DU
    0xabaf: { latin: 'c', script: 'Cherokee' }, // CHEROKEE SMALL LETTER TLI
    // Fullwidth Latin (31 code points)
    0xff21: { latin: 'A', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER A
    0xff22: { latin: 'B', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER B
    0xff23: { latin: 'C', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER C
    0xff25: { latin: 'E', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER E
    0xff28: { latin: 'H', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER H
    0xff29: { latin: 'l', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER I
    0xff2a: { latin: 'J', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER J
    0xff2b: { latin: 'K', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER K
    0xff2d: { latin: 'M', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER M
    0xff2e: { latin: 'N', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER N
    0xff2f: { latin: 'O', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER O
    0xff30: { latin: 'P', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER P
    0xff33: { latin: 'S', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER S
    0xff34: { latin: 'T', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER T
    0xff38: { latin: 'X', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER X
    0xff39: { latin: 'Y', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER Y
    0xff3a: { latin: 'Z', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN CAPITAL LETTER Z
    0xff41: { latin: 'a', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN SMALL LETTER A
    0xff43: { latin: 'c', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN SMALL LETTER C
    0xff45: { latin: 'e', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN SMALL LETTER E
    0xff47: { latin: 'g', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN SMALL LETTER G
    0xff48: { latin: 'h', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN SMALL LETTER H
    0xff49: { latin: 'i', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN SMALL LETTER I
    0xff4a: { latin: 'j', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN SMALL LETTER J
    0xff4c: { latin: 'l', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN SMALL LETTER L
    0xff4f: { latin: 'o', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN SMALL LETTER O
    0xff50: { latin: 'p', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN SMALL LETTER P
    0xff53: { latin: 's', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN SMALL LETTER S
    0xff56: { latin: 'v', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN SMALL LETTER V
    0xff58: { latin: 'x', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN SMALL LETTER X
    0xff59: { latin: 'y', script: 'Fullwidth Latin' }, // FULLWIDTH LATIN SMALL LETTER Y
    // Greek (28 code points)
    0x037f: { latin: 'J', script: 'Greek' }, // GREEK CAPITAL LETTER YOT
    0x0391: { latin: 'A', script: 'Greek' }, // GREEK CAPITAL LETTER ALPHA
    0x0392: { latin: 'B', script: 'Greek' }, // GREEK CAPITAL LETTER BETA
    0x0395: { latin: 'E', script: 'Greek' }, // GREEK CAPITAL LETTER EPSILON
    0x0396: { latin: 'Z', script: 'Greek' }, // GREEK CAPITAL LETTER ZETA
    0x0397: { latin: 'H', script: 'Greek' }, // GREEK CAPITAL LETTER ETA
    0x0399: { latin: 'l', script: 'Greek' }, // GREEK CAPITAL LETTER IOTA
    0x039a: { latin: 'K', script: 'Greek' }, // GREEK CAPITAL LETTER KAPPA
    0x039c: { latin: 'M', script: 'Greek' }, // GREEK CAPITAL LETTER MU
    0x039d: { latin: 'N', script: 'Greek' }, // GREEK CAPITAL LETTER NU
    0x039f: { latin: 'O', script: 'Greek' }, // GREEK CAPITAL LETTER OMICRON
    0x03a1: { latin: 'P', script: 'Greek' }, // GREEK CAPITAL LETTER RHO
    0x03a4: { latin: 'T', script: 'Greek' }, // GREEK CAPITAL LETTER TAU
    0x03a5: { latin: 'Y', script: 'Greek' }, // GREEK CAPITAL LETTER UPSILON
    0x03a7: { latin: 'X', script: 'Greek' }, // GREEK CAPITAL LETTER CHI
    0x03b1: { latin: 'a', script: 'Greek' }, // GREEK SMALL LETTER ALPHA
    0x03b3: { latin: 'y', script: 'Greek' }, // GREEK SMALL LETTER GAMMA
    0x03b9: { latin: 'i', script: 'Greek' }, // GREEK SMALL LETTER IOTA
    0x03bd: { latin: 'v', script: 'Greek' }, // GREEK SMALL LETTER NU
    0x03bf: { latin: 'o', script: 'Greek' }, // GREEK SMALL LETTER OMICRON
    0x03c1: { latin: 'p', script: 'Greek' }, // GREEK SMALL LETTER RHO
    0x03c3: { latin: 'o', script: 'Greek' }, // GREEK SMALL LETTER SIGMA
    0x03c5: { latin: 'u', script: 'Greek' }, // GREEK SMALL LETTER UPSILON
    0x03dc: { latin: 'F', script: 'Greek' }, // GREEK LETTER DIGAMMA
    0x03f3: { latin: 'j', script: 'Greek' }, // GREEK LETTER YOT
    0x03f8: { latin: 'p', script: 'Greek' }, // GREEK SMALL LETTER SHO
    0x03fa: { latin: 'M', script: 'Greek' }, // GREEK CAPITAL LETTER SAN
    0x1d26: { latin: 'r', script: 'Greek' }, // GREEK LETTER SMALL CAPITAL GAMMA
    // Lisu (26 code points)
    0xa4d0: { latin: 'B', script: 'Lisu' }, // LISU LETTER BA
    0xa4d1: { latin: 'P', script: 'Lisu' }, // LISU LETTER PA
    0xa4d2: { latin: 'd', script: 'Lisu' }, // LISU LETTER PHA
    0xa4d3: { latin: 'D', script: 'Lisu' }, // LISU LETTER DA
    0xa4d4: { latin: 'T', script: 'Lisu' }, // LISU LETTER TA
    0xa4d6: { latin: 'G', script: 'Lisu' }, // LISU LETTER GA
    0xa4d7: { latin: 'K', script: 'Lisu' }, // LISU LETTER KA
    0xa4d9: { latin: 'J', script: 'Lisu' }, // LISU LETTER JA
    0xa4da: { latin: 'C', script: 'Lisu' }, // LISU LETTER CA
    0xa4dc: { latin: 'Z', script: 'Lisu' }, // LISU LETTER DZA
    0xa4dd: { latin: 'F', script: 'Lisu' }, // LISU LETTER TSA
    0xa4df: { latin: 'M', script: 'Lisu' }, // LISU LETTER MA
    0xa4e0: { latin: 'N', script: 'Lisu' }, // LISU LETTER NA
    0xa4e1: { latin: 'L', script: 'Lisu' }, // LISU LETTER LA
    0xa4e2: { latin: 'S', script: 'Lisu' }, // LISU LETTER SA
    0xa4e3: { latin: 'R', script: 'Lisu' }, // LISU LETTER ZHA
    0xa4e6: { latin: 'V', script: 'Lisu' }, // LISU LETTER HA
    0xa4e7: { latin: 'H', script: 'Lisu' }, // LISU LETTER XA
    0xa4ea: { latin: 'W', script: 'Lisu' }, // LISU LETTER WA
    0xa4eb: { latin: 'X', script: 'Lisu' }, // LISU LETTER SHA
    0xa4ec: { latin: 'Y', script: 'Lisu' }, // LISU LETTER YA
    0xa4ee: { latin: 'A', script: 'Lisu' }, // LISU LETTER A
    0xa4f0: { latin: 'E', script: 'Lisu' }, // LISU LETTER E
    0xa4f2: { latin: 'l', script: 'Lisu' }, // LISU LETTER I
    0xa4f3: { latin: 'O', script: 'Lisu' }, // LISU LETTER O
    0xa4f4: { latin: 'U', script: 'Lisu' }, // LISU LETTER U
    // Coptic (23 code points)
    0x03ed: { latin: 'o', script: 'Coptic' }, // COPTIC SMALL LETTER SHIMA
    0x2c82: { latin: 'B', script: 'Coptic' }, // COPTIC CAPITAL LETTER VIDA
    0x2c85: { latin: 'r', script: 'Coptic' }, // COPTIC SMALL LETTER GAMMA
    0x2c8e: { latin: 'H', script: 'Coptic' }, // COPTIC CAPITAL LETTER HATE
    0x2c92: { latin: 'l', script: 'Coptic' }, // COPTIC CAPITAL LETTER IAUDA
    0x2c93: { latin: 'i', script: 'Coptic' }, // COPTIC SMALL LETTER IAUDA
    0x2c94: { latin: 'K', script: 'Coptic' }, // COPTIC CAPITAL LETTER KAPA
    0x2c98: { latin: 'M', script: 'Coptic' }, // COPTIC CAPITAL LETTER MI
    0x2c9a: { latin: 'N', script: 'Coptic' }, // COPTIC CAPITAL LETTER NI
    0x2c9e: { latin: 'O', script: 'Coptic' }, // COPTIC CAPITAL LETTER O
    0x2c9f: { latin: 'o', script: 'Coptic' }, // COPTIC SMALL LETTER O
    0x2ca2: { latin: 'P', script: 'Coptic' }, // COPTIC CAPITAL LETTER RO
    0x2ca3: { latin: 'p', script: 'Coptic' }, // COPTIC SMALL LETTER RO
    0x2ca4: { latin: 'C', script: 'Coptic' }, // COPTIC CAPITAL LETTER SIMA
    0x2ca5: { latin: 'c', script: 'Coptic' }, // COPTIC SMALL LETTER SIMA
    0x2ca6: { latin: 'T', script: 'Coptic' }, // COPTIC CAPITAL LETTER TAU
    0x2ca8: { latin: 'Y', script: 'Coptic' }, // COPTIC CAPITAL LETTER UA
    0x2ca9: { latin: 'y', script: 'Coptic' }, // COPTIC SMALL LETTER UA
    0x2cac: { latin: 'X', script: 'Coptic' }, // COPTIC CAPITAL LETTER KHI
    0x2cbd: { latin: 'w', script: 'Coptic' }, // COPTIC SMALL LETTER CRYPTOGRAMMIC NI
    0x2cce: { latin: 'P', script: 'Coptic' }, // COPTIC CAPITAL LETTER OLD COPTIC HA
    0x2ccf: { latin: 'p', script: 'Coptic' }, // COPTIC SMALL LETTER OLD COPTIC HA
    0x2cd0: { latin: 'L', script: 'Coptic' }, // COPTIC CAPITAL LETTER L-SHAPED HA
    // Warang Citi (20 code points)
    0x118a0: { latin: 'V', script: 'Warang Citi' }, // WARANG CITI CAPITAL LETTER NGAA
    0x118a2: { latin: 'F', script: 'Warang Citi' }, // WARANG CITI CAPITAL LETTER WI
    0x118a3: { latin: 'L', script: 'Warang Citi' }, // WARANG CITI CAPITAL LETTER YU
    0x118a4: { latin: 'Y', script: 'Warang Citi' }, // WARANG CITI CAPITAL LETTER YA
    0x118a6: { latin: 'E', script: 'Warang Citi' }, // WARANG CITI CAPITAL LETTER II
    0x118a9: { latin: 'Z', script: 'Warang Citi' }, // WARANG CITI CAPITAL LETTER O
    0x118ae: { latin: 'E', script: 'Warang Citi' }, // WARANG CITI CAPITAL LETTER YUJ
    0x118b2: { latin: 'L', script: 'Warang Citi' }, // WARANG CITI CAPITAL LETTER TTE
    0x118b5: { latin: 'O', script: 'Warang Citi' }, // WARANG CITI CAPITAL LETTER AT
    0x118b8: { latin: 'U', script: 'Warang Citi' }, // WARANG CITI CAPITAL LETTER PU
    0x118bc: { latin: 'T', script: 'Warang Citi' }, // WARANG CITI CAPITAL LETTER HAR
    0x118c0: { latin: 'v', script: 'Warang Citi' }, // WARANG CITI SMALL LETTER NGAA
    0x118c1: { latin: 's', script: 'Warang Citi' }, // WARANG CITI SMALL LETTER A
    0x118c2: { latin: 'F', script: 'Warang Citi' }, // WARANG CITI SMALL LETTER WI
    0x118c3: { latin: 'i', script: 'Warang Citi' }, // WARANG CITI SMALL LETTER YU
    0x118c4: { latin: 'z', script: 'Warang Citi' }, // WARANG CITI SMALL LETTER YA
    0x118c8: { latin: 'o', script: 'Warang Citi' }, // WARANG CITI SMALL LETTER E
    0x118d7: { latin: 'o', script: 'Warang Citi' }, // WARANG CITI SMALL LETTER BU
    0x118d8: { latin: 'u', script: 'Warang Citi' }, // WARANG CITI SMALL LETTER PU
    0x118dc: { latin: 'y', script: 'Warang Citi' }, // WARANG CITI SMALL LETTER HAR
    // Arabic (19 code points)
    0x0627: { latin: 'l', script: 'Arabic' }, // ARABIC LETTER ALEF
    0x0647: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH
    0x06be: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH DOACHASHMEE
    0x06c1: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH GOAL
    0x06d5: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER AE
    0xfba6: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH GOAL ISOLATED FORM
    0xfba7: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH GOAL FINAL FORM
    0xfba8: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH GOAL INITIAL FORM
    0xfba9: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH GOAL MEDIAL FORM
    0xfbaa: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH DOACHASHMEE ISOLATED FORM
    0xfbab: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH DOACHASHMEE FINAL FORM
    0xfbac: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH DOACHASHMEE INITIAL FORM
    0xfbad: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH DOACHASHMEE MEDIAL FORM
    0xfe8d: { latin: 'l', script: 'Arabic' }, // ARABIC LETTER ALEF ISOLATED FORM
    0xfe8e: { latin: 'l', script: 'Arabic' }, // ARABIC LETTER ALEF FINAL FORM
    0xfee9: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH ISOLATED FORM
    0xfeea: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH FINAL FORM
    0xfeeb: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH INITIAL FORM
    0xfeec: { latin: 'o', script: 'Arabic' }, // ARABIC LETTER HEH MEDIAL FORM
    // Armenian (14 code points)
    0x054d: { latin: 'U', script: 'Armenian' }, // ARMENIAN CAPITAL LETTER SEH
    0x054f: { latin: 'S', script: 'Armenian' }, // ARMENIAN CAPITAL LETTER TIWN
    0x0555: { latin: 'O', script: 'Armenian' }, // ARMENIAN CAPITAL LETTER OH
    0x0561: { latin: 'w', script: 'Armenian' }, // ARMENIAN SMALL LETTER AYB
    0x0563: { latin: 'q', script: 'Armenian' }, // ARMENIAN SMALL LETTER GIM
    0x0566: { latin: 'q', script: 'Armenian' }, // ARMENIAN SMALL LETTER ZA
    0x0570: { latin: 'h', script: 'Armenian' }, // ARMENIAN SMALL LETTER HO
    0x0578: { latin: 'n', script: 'Armenian' }, // ARMENIAN SMALL LETTER VO
    0x057c: { latin: 'n', script: 'Armenian' }, // ARMENIAN SMALL LETTER RA
    0x057d: { latin: 'u', script: 'Armenian' }, // ARMENIAN SMALL LETTER SEH
    0x0581: { latin: 'g', script: 'Armenian' }, // ARMENIAN SMALL LETTER CO
    0x0582: { latin: 'i', script: 'Armenian' }, // ARMENIAN SMALL LETTER YIWN
    0x0584: { latin: 'f', script: 'Armenian' }, // ARMENIAN SMALL LETTER KEH
    0x0585: { latin: 'o', script: 'Armenian' }, // ARMENIAN SMALL LETTER OH
    // Script (12 code points)
    0x210a: { latin: 'g', script: 'Script' }, // SCRIPT SMALL G
    0x210b: { latin: 'H', script: 'Script' }, // SCRIPT CAPITAL H
    0x2110: { latin: 'l', script: 'Script' }, // SCRIPT CAPITAL I
    0x2112: { latin: 'L', script: 'Script' }, // SCRIPT CAPITAL L
    0x2113: { latin: 'l', script: 'Script' }, // SCRIPT SMALL L
    0x211b: { latin: 'R', script: 'Script' }, // SCRIPT CAPITAL R
    0x212c: { latin: 'B', script: 'Script' }, // SCRIPT CAPITAL B
    0x212f: { latin: 'e', script: 'Script' }, // SCRIPT SMALL E
    0x2130: { latin: 'E', script: 'Script' }, // SCRIPT CAPITAL E
    0x2131: { latin: 'F', script: 'Script' }, // SCRIPT CAPITAL F
    0x2133: { latin: 'M', script: 'Script' }, // SCRIPT CAPITAL M
    0x2134: { latin: 'o', script: 'Script' }, // SCRIPT SMALL O
    // Carian (10 code points)
    0x102a0: { latin: 'A', script: 'Carian' }, // CARIAN LETTER A
    0x102a1: { latin: 'B', script: 'Carian' }, // CARIAN LETTER P2
    0x102a2: { latin: 'C', script: 'Carian' }, // CARIAN LETTER D
    0x102a5: { latin: 'F', script: 'Carian' }, // CARIAN LETTER R
    0x102ab: { latin: 'O', script: 'Carian' }, // CARIAN LETTER O
    0x102b0: { latin: 'M', script: 'Carian' }, // CARIAN LETTER S
    0x102b1: { latin: 'T', script: 'Carian' }, // CARIAN LETTER C-18
    0x102b2: { latin: 'Y', script: 'Carian' }, // CARIAN LETTER U
    0x102b4: { latin: 'X', script: 'Carian' }, // CARIAN LETTER X
    0x102cf: { latin: 'H', script: 'Carian' }, // CARIAN LETTER E2
    // Lycian (9 code points)
    0x10282: { latin: 'B', script: 'Lycian' }, // LYCIAN LETTER B
    0x10286: { latin: 'E', script: 'Lycian' }, // LYCIAN LETTER I
    0x10287: { latin: 'F', script: 'Lycian' }, // LYCIAN LETTER W
    0x1028a: { latin: 'l', script: 'Lycian' }, // LYCIAN LETTER J
    0x10290: { latin: 'X', script: 'Lycian' }, // LYCIAN LETTER MM
    0x10292: { latin: 'O', script: 'Lycian' }, // LYCIAN LETTER U
    0x10295: { latin: 'P', script: 'Lycian' }, // LYCIAN LETTER R
    0x10296: { latin: 'S', script: 'Lycian' }, // LYCIAN LETTER S
    0x10297: { latin: 'T', script: 'Lycian' }, // LYCIAN LETTER T
    // Miao (9 code points)
    0x16f08: { latin: 'V', script: 'Miao' }, // MIAO LETTER VA
    0x16f0a: { latin: 'T', script: 'Miao' }, // MIAO LETTER TA
    0x16f16: { latin: 'L', script: 'Miao' }, // MIAO LETTER LA
    0x16f28: { latin: 'l', script: 'Miao' }, // MIAO LETTER GHA
    0x16f35: { latin: 'R', script: 'Miao' }, // MIAO LETTER ZHA
    0x16f3a: { latin: 'S', script: 'Miao' }, // MIAO LETTER SA
    0x16f40: { latin: 'A', script: 'Miao' }, // MIAO LETTER ZZYA
    0x16f42: { latin: 'U', script: 'Miao' }, // MIAO LETTER WA
    0x16f43: { latin: 'Y', script: 'Miao' }, // MIAO LETTER AH
    // Elbasan (8 code points)
    0x10513: { latin: 'N', script: 'Elbasan' }, // ELBASAN LETTER NE
    0x10516: { latin: 'O', script: 'Elbasan' }, // ELBASAN LETTER O
    0x10518: { latin: 'K', script: 'Elbasan' }, // ELBASAN LETTER QE
    0x1051c: { latin: 'C', script: 'Elbasan' }, // ELBASAN LETTER SHE
    0x1051d: { latin: 'V', script: 'Elbasan' }, // ELBASAN LETTER TE
    0x10525: { latin: 'F', script: 'Elbasan' }, // ELBASAN LETTER GHE
    0x10526: { latin: 'L', script: 'Elbasan' }, // ELBASAN LETTER GHAMMA
    0x10527: { latin: 'X', script: 'Elbasan' }, // ELBASAN LETTER KHE
    // Double-struck (7 code points)
    0x2102: { latin: 'C', script: 'Double-struck' }, // DOUBLE-STRUCK CAPITAL C
    0x210d: { latin: 'H', script: 'Double-struck' }, // DOUBLE-STRUCK CAPITAL H
    0x2115: { latin: 'N', script: 'Double-struck' }, // DOUBLE-STRUCK CAPITAL N
    0x2119: { latin: 'P', script: 'Double-struck' }, // DOUBLE-STRUCK CAPITAL P
    0x211a: { latin: 'Q', script: 'Double-struck' }, // DOUBLE-STRUCK CAPITAL Q
    0x211d: { latin: 'R', script: 'Double-struck' }, // DOUBLE-STRUCK CAPITAL R
    0x2124: { latin: 'Z', script: 'Double-struck' }, // DOUBLE-STRUCK CAPITAL Z
    // Deseret (7 code points)
    0x10404: { latin: 'O', script: 'Deseret' }, // DESERET CAPITAL LETTER LONG O
    0x10415: { latin: 'C', script: 'Deseret' }, // DESERET CAPITAL LETTER CHEE
    0x1041b: { latin: 'L', script: 'Deseret' }, // DESERET CAPITAL LETTER ETH
    0x10420: { latin: 'S', script: 'Deseret' }, // DESERET CAPITAL LETTER ZHEE
    0x1042c: { latin: 'o', script: 'Deseret' }, // DESERET SMALL LETTER LONG O
    0x1043d: { latin: 'c', script: 'Deseret' }, // DESERET SMALL LETTER CHEE
    0x10448: { latin: 's', script: 'Deseret' }, // DESERET SMALL LETTER ZHEE
    // Tifinagh (6 code points)
    0x2d38: { latin: 'V', script: 'Tifinagh' }, // TIFINAGH LETTER YADH
    0x2d39: { latin: 'E', script: 'Tifinagh' }, // TIFINAGH LETTER YADD
    0x2d4f: { latin: 'l', script: 'Tifinagh' }, // TIFINAGH LETTER YAN
    0x2d54: { latin: 'O', script: 'Tifinagh' }, // TIFINAGH LETTER YAR
    0x2d55: { latin: 'Q', script: 'Tifinagh' }, // TIFINAGH LETTER YARR
    0x2d5d: { latin: 'X', script: 'Tifinagh' }, // TIFINAGH LETTER YATH
    // Old Italic (6 code points)
    0x10301: { latin: 'B', script: 'Old Italic' }, // OLD ITALIC LETTER BE
    0x10302: { latin: 'C', script: 'Old Italic' }, // OLD ITALIC LETTER KE
    0x10309: { latin: 'l', script: 'Old Italic' }, // OLD ITALIC LETTER I
    0x10311: { latin: 'M', script: 'Old Italic' }, // OLD ITALIC LETTER SHE
    0x10315: { latin: 'T', script: 'Old Italic' }, // OLD ITALIC LETTER TE
    0x10317: { latin: 'X', script: 'Old Italic' }, // OLD ITALIC LETTER EKS
    // Black-letter (5 code points)
    0x210c: { latin: 'H', script: 'Black-letter' }, // BLACK-LETTER CAPITAL H
    0x2111: { latin: 'l', script: 'Black-letter' }, // BLACK-LETTER CAPITAL I
    0x211c: { latin: 'R', script: 'Black-letter' }, // BLACK-LETTER CAPITAL R
    0x2128: { latin: 'Z', script: 'Black-letter' }, // BLACK-LETTER CAPITAL Z
    0x212d: { latin: 'C', script: 'Black-letter' }, // BLACK-LETTER CAPITAL C
    // Double-struck Italic (5 code points)
    0x2145: { latin: 'D', script: 'Double-struck Italic' }, // DOUBLE-STRUCK ITALIC CAPITAL D
    0x2146: { latin: 'd', script: 'Double-struck Italic' }, // DOUBLE-STRUCK ITALIC SMALL D
    0x2147: { latin: 'e', script: 'Double-struck Italic' }, // DOUBLE-STRUCK ITALIC SMALL E
    0x2148: { latin: 'i', script: 'Double-struck Italic' }, // DOUBLE-STRUCK ITALIC SMALL I
    0x2149: { latin: 'j', script: 'Double-struck Italic' }, // DOUBLE-STRUCK ITALIC SMALL J
    // Osage (5 code points)
    0x104b4: { latin: 'R', script: 'Osage' }, // OSAGE CAPITAL LETTER BRA
    0x104c2: { latin: 'O', script: 'Osage' }, // OSAGE CAPITAL LETTER O
    0x104ce: { latin: 'U', script: 'Osage' }, // OSAGE CAPITAL LETTER U
    0x104ea: { latin: 'o', script: 'Osage' }, // OSAGE SMALL LETTER O
    0x104f6: { latin: 'u', script: 'Osage' }, // OSAGE SMALL LETTER U
    // Hebrew (4 code points)
    0x05d5: { latin: 'l', script: 'Hebrew' }, // HEBREW LETTER VAV
    0x05d8: { latin: 'v', script: 'Hebrew' }, // HEBREW LETTER TET
    0x05df: { latin: 'l', script: 'Hebrew' }, // HEBREW LETTER FINAL NUN
    0x05e1: { latin: 'o', script: 'Hebrew' }, // HEBREW LETTER SAMEKH
    // Runic (4 code points)
    0x16b7: { latin: 'X', script: 'Runic' }, // RUNIC LETTER GEBO GYFU G
    0x16c1: { latin: 'l', script: 'Runic' }, // RUNIC LETTER ISAZ IS ISS I
    0x16d5: { latin: 'K', script: 'Runic' }, // RUNIC LETTER OPEN-P
    0x16d6: { latin: 'M', script: 'Runic' }, // RUNIC LETTER EHWAZ EH E
    // Ahom (4 code points)
    0x11706: { latin: 'v', script: 'Ahom' }, // AHOM LETTER PA
    0x1170a: { latin: 'w', script: 'Ahom' }, // AHOM LETTER JA
    0x1170e: { latin: 'w', script: 'Ahom' }, // AHOM LETTER LA
    0x1170f: { latin: 'w', script: 'Ahom' }, // AHOM LETTER SA
    // Myanmar (3 code points)
    0x1004: { latin: 'c', script: 'Myanmar' }, // MYANMAR LETTER NGA
    0x101d: { latin: 'o', script: 'Myanmar' }, // MYANMAR LETTER WA
    0x105a: { latin: 'c', script: 'Myanmar' }, // MYANMAR LETTER MON NGA
    // Malayalam (2 code points)
    0x0d1f: { latin: 's', script: 'Malayalam' }, // MALAYALAM LETTER TTA
    0x0d20: { latin: 'o', script: 'Malayalam' }, // MALAYALAM LETTER TTHA
    // Georgian (2 code points)
    0x10e7: { latin: 'y', script: 'Georgian' }, // GEORGIAN LETTER QAR
    0x10ff: { latin: 'o', script: 'Georgian' }, // GEORGIAN LETTER LABIAL SIGN
    // Beria Erfe (2 code points)
    0x16eaa: { latin: 'l', script: 'Beria Erfe' }, // BERIA ERFE CAPITAL LETTER LAKKO
    0x16eb6: { latin: 'b', script: 'Beria Erfe' }, // BERIA ERFE CAPITAL LETTER UI
    // Nko (1 code point)
    0x07ca: { latin: 'l', script: 'Nko' }, // NKO LETTER A
    // Oriya (1 code point)
    0x0b20: { latin: 'O', script: 'Oriya' }, // ORIYA LETTER TTHA
    // Bamum (1 code point)
    0xa6df: { latin: 'V', script: 'Bamum' }, // BAMUM LETTER KO
};
// Every code point HOMOGLYPHS covers, as a literal character-class string.
// The "u" flag on both patterns built from it below is required once the
// table contains astral-plane code points (the Mathematical Bold and
// several historic-script entries, all above U+FFFF): without it, a
// character class built from a surrogate-pair string matches each surrogate
// half as an independent BMP character instead of the intended single code
// point, which would both mis-fire on unrelated astral characters sharing
// that surrogate and crash the lookup below (HOMOGLYPHS has no entry for a
// lone surrogate). It has no effect on the existing BMP-only entries'
// matching behavior.
const HOMOGLYPH_CHARS = Object.keys(HOMOGLYPHS)
    .map((cp) => String.fromCodePoint(Number(cp)))
    .join('');
// A "word" is a maximal run of letters, plus any combining marks riding on
// them (e.g. the NFD-decomposed accent in encoding-nfc-vs-nfd-homoglyph) --
// the unit the per-word script-majority check below operates on. Matching
// on "\p{L} or a HOMOGLYPHS character" rather than "\p{L}" alone closes a
// real gap: 2 of the table's 403 code points (Beria Erfe, U+16EAA/U+16EB6)
// aren't classified as \p{L} by this Node runtime's bundled Unicode data
// (likely unassigned in this ICU version, despite being valid
// confusables.txt entries) -- without the union, those two specific
// characters would fall outside every word boundary and never be examined
// at all, regardless of context. The other 401 entries already match \p{L}
// on their own; this only protects future table entries sourced the same
// way, generalizing past whatever happens to be true of today's table
// rather than needing revisiting each time it grows (Task 5.x).
const WORD_PATTERN = new RegExp(`[\\p{L}${HOMOGLYPH_CHARS}][\\p{L}\\p{M}${HOMOGLYPH_CHARS}]*`, 'gu');
const PLAIN_ASCII_LATIN = /^[a-zA-Z]$/;
const COMBINING_MARK = /\p{M}/u;
function isPlainAsciiLatin(ch) {
    return PLAIN_ASCII_LATIN.test(ch);
}
function locate(content, index) {
    const before = content.slice(0, index);
    const lastNewline = before.lastIndexOf('\n');
    return { line: before.split('\n').length, column: index - lastNewline };
}
// RF-2's word-level script-majority check (docs/adr/0001-deterministic-only-v1.md,
// addendum: "a word that's mostly one non-Latin script is treated as real
// language, and a word that's Latin except for one substituted character is
// treated as a probable attack"; workplan.md Phase 4). A pure per-character
// scan can't tell a single homoglyph smuggled into Latin text apart from a
// whole word legitimately written in another script, because at the
// character level those two things are identical -- that's the direct,
// structural cause of the near-miss-legit-cyrillic-text and
// judgment-rf2-latin-loanword-in-cyrillic-context false positives.
//
// For each word, every letter goes into one of three buckets:
//   - "Latin": a plain ASCII a-z/A-Z character.
//   - "confusable": a HOMOGLYPHS key -- a look-alike character.
//   - "other non-Latin": a letter that's neither -- a script's own ordinary
//     letters with no Latin look-alike at all, e.g. Cyrillic "и"/"в"/"т",
//     which were never candidates for a finding either way.
// A word's confusable characters are suppressed only when the word contains
// at least one "other non-Latin" letter AND non-Latin (confusable + other)
// outnumbers Latin -- a tie still flags. Both conditions matter: requiring
// "other non-Latin > 0" means a word made ENTIRELY of confusable
// characters, with nothing to corroborate "this is real text in another
// script," gets no benefit of the doubt just because it also contains zero
// Latin letters -- a single isolated confusable character (the degenerate
// case: no Latin, no corroborating other-non-Latin letters either) stays
// flagged rather than defaulting to suppressed, since with nothing else in
// the word, "it's non-Latin" and "it's a disguised Latin character" are
// indistinguishable. The count comparison on top of that gate is what
// separates near-miss-legit-cyrillic-text and
// judgment-rf2-latin-loanword-in-cyrillic-context (words that are
// overwhelmingly genuine non-Latin letters) from a real attack (a Latin
// majority with a small substitution): a genuine homoglyph attack keeps
// the substitution a small minority to stay disguised, and a legitimate
// non-Latin word is never split down the middle by design. Combining marks
// attach to whichever base letter precedes them and aren't counted as
// letters of their own.
//
// This generalizes across every script HOMOGLYPHS covers -- Cyrillic,
// Cherokee, Fullwidth Latin, Mathematical Bold, and everything else --
// without any per-script special-casing: the only two tests it ever runs
// are "is this one specific character a HOMOGLYPHS key" and "is this one
// specific character plain ASCII a-z/A-Z," both already-exact and
// script-agnostic. Fullwidth Latin and Mathematical Bold characters in
// particular are never counted as "Latin" here even though Unicode's own
// Script property classifies some of them that way (Fullwidth as Latin,
// Mathematical Bold as Common) -- membership in HOMOGLYPHS always takes
// precedence over the character's real script for this classification,
// which is exactly why encoding-fullwidth-latin-homoglyph and
// encoding-mathematical-alphanumeric-symbol still fire: their words are
// otherwise 100% plain ASCII, an unambiguous Latin majority regardless.
function detectHomoglyphs(filePath, content) {
    const findings = [];
    let wordMatch;
    while ((wordMatch = WORD_PATTERN.exec(content)) !== null) {
        const word = wordMatch[0];
        const wordStart = wordMatch.index;
        let latinCount = 0;
        let otherNonLatinCount = 0;
        const confusablesInWord = [];
        let offset = 0;
        for (const ch of word) {
            if (COMBINING_MARK.test(ch)) {
                offset += ch.length;
                continue;
            }
            const codePoint = ch.codePointAt(0);
            if (HOMOGLYPHS[codePoint]) {
                confusablesInWord.push({ offset, codePoint });
            }
            else if (isPlainAsciiLatin(ch)) {
                latinCount++;
            }
            else {
                otherNonLatinCount++;
            }
            offset += ch.length;
        }
        // Suppression requires otherNonLatinCount > 0, not just a non-Latin
        // majority by count alone: a word made ENTIRELY of confusable
        // characters -- no genuine, non-look-alike foreign letter anywhere in
        // it to corroborate "this is real text in another script" -- gets no
        // benefit of the doubt just because it also contains zero Latin
        // letters. A single isolated confusable character (nonLatin=1, latin=0,
        // otherNonLatin=0) is the degenerate case of exactly this: with nothing
        // else in the word, "it's non-Latin" and "it's a disguised Latin
        // character" are indistinguishable, so it stays flagged rather than
        // defaulting to suppressed.
        const nonLatinCount = confusablesInWord.length + otherNonLatinCount;
        const looksLikeGenuineForeignWord = otherNonLatinCount > 0 && nonLatinCount > latinCount;
        if (confusablesInWord.length === 0 || looksLikeGenuineForeignWord) {
            continue;
        }
        for (const { offset: charOffset, codePoint } of confusablesInWord) {
            const hex = codePoint.toString(16).toUpperCase().padStart(4, '0');
            const info = HOMOGLYPHS[codePoint];
            const { line, column } = locate(content, wordStart + charOffset);
            findings.push({
                detectorId: 'rule-file.homoglyph',
                severity: 'high',
                file: filePath,
                summary: `${info.script} look-alike character (U+${hex}) found`,
                detail: `A ${info.script} character (U+${hex}) visually identical to Latin '${info.latin}' was found in ${filePath} at line ${line}, column ${column}. Homoglyphs can be used to disguise malicious instructions as ordinary text so a human reviewer skims past them while an AI agent still reads and follows them.`,
            });
        }
    }
    return findings;
}
