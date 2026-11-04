/**
 * Auto-generated offline Mincha (Sefard/Sfard weekday).
 * Re-run: node scripts/build-mincha-offline.mjs --nusach=sfard
 * Source: Sefaria (CC-BY-SA) — https://sefaria.org
 */

export const MINCHA_OFFLINE_META = {
  "nusach": "sfard",
  "service": "mincha",
  "builtAt": "2026-08-12T14:33:39.372Z",
  "source": "Sefaria",
  "attribution": "Texts provided by Sefaria (sefaria.org) under CC-BY-SA — Siddur Sefard",
  "sections": [
    "mincha_korbanot",
    "mincha_ashrei",
    "mincha_amidah",
    "mincha_aleinu"
  ],
  "note": "Bundled RAW from Siddur Sefard Weekday Mincha. Korbanot is the pre-Ashrei Mincha recitation (Tzav, ketoret, Ana B'koach). OfflineMinchaService applies policy (מוריד הטל summer, etc.) + shared seasonal pipeline.",
  "sources": {
    "korbanot": "Siddur Sefard, Weekday Mincha, Korbanot → text before אשרי",
    "ashrei": "Siddur Sefard, Weekday Mincha, Korbanot → from אשרי",
    "amidah": "Siddur Sefard, Weekday Mincha, Amidah",
    "aleinu": "Siddur Ashkenaz, Weekday, Shacharit, Concluding Prayers, Alenu"
  }
} as const;
