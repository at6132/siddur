/**
 * Auto-generated offline Maariv (Sefard/Sfard weekday).
 * Re-run: node scripts/build-maariv-offline.mjs
 * Source: Sefaria (CC-BY-SA) — https://sefaria.org
 */

export const MAARIV_OFFLINE_META = {
  "nusach": "sfard",
  "service": "maariv",
  "builtAt": "2026-08-12T15:39:49.003Z",
  "source": "Sefaria",
  "attribution": "Texts provided by Sefaria (sefaria.org) under CC-BY-SA — Siddur Sefard",
  "sections": [
    "maariv_shema",
    "maariv_amidah",
    "maariv_motzaei",
    "maariv_omer",
    "maariv_aleinu"
  ],
  "note": "Bundled RAW from Siddur Sefard Weekday Maariv. Aleinu/L'David from Weekday Shacharit (Sefard Maariv tree has no standalone Aleinu). OfflineMaarivService applies shared Amidah pipeline + calendar gates.",
  "sources": {
    "maariv_shema": [
      "Siddur Sefard, Weekday Maariv, The Shema"
    ],
    "maariv_amidah": [
      "Siddur Sefard, Weekday Maariv, Amidah"
    ],
    "maariv_motzaei": [
      "Siddur Sefard, Weekday Maariv, Motzaei Shabbat"
    ],
    "maariv_omer": [
      "Siddur Sefard, Weekday Maariv, Sefirat HaOmer"
    ],
    "maariv_aleinu": [
      "Siddur Sefard, Weekday Shacharit, Aleinu",
      "Siddur Sefard, Weekday Shacharit, L'David Hashem"
    ]
  }
} as const;
