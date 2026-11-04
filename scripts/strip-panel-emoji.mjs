import fs from 'fs';

const p = 'app/home/components/PanelContentRenderer.tsx';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes("from '@expo/vector-icons'")) {
  s = s.replace(
    "import React from 'react';",
    "import React from 'react';\nimport { Ionicons } from '@expo/vector-icons';",
  );
}
if (!s.includes('getPanelIconName')) {
  s = s.replace(
    "import { LOCATION_REQUIRED_MESSAGE } from '../../../src/services/LocationAccess';",
    `import { LOCATION_REQUIRED_MESSAGE } from '../../../src/services/LocationAccess';
import { getPanelIconName } from '../utils/panelIcons';`,
  );
}

if (!s.includes('const iconColor')) {
  s = s.replace(
    '  const {\n    dayInfo, isEditing, navigation, styles, theme,',
    `  const {
    dayInfo, isEditing, navigation, styles, theme,`,
  );
  // Insert after destructuring assignment ends — find `} = ctx;` near start of function
  s = s.replace(
    /(export function renderPanelContent\([\s\S]*?\n  \} = ctx;\n)/,
    `$1  const iconColor = theme.colors.primary.dark;\n`,
  );
}

const reps = [
  [
    /\s*<Text style=\{\[styles\.inspirationIcon, half && styles\.halfEmoji\]\}>✨<\/Text>/g,
    '\n            <Ionicons name="sparkles-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.fastDayIcon, styles\.fastDayHalfIcon\]\}>🕯️<\/Text>/g,
    '\n                  <Ionicons name="moon-outline" size={18} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{styles\.fastDayIcon\}>🕯️<\/Text>/g,
    '\n                <Ionicons name="moon-outline" size={24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.greetingEmoji, half && styles\.halfEmoji\]\}>\{hour < 12 \? '🌅' : hour < 17 \? '☀️' : hour < 21 \? '🌆' : '🌙'\}<\/Text>/g,
    `\n            <Ionicons name={hour < 12 ? 'sunny-outline' : hour < 17 ? 'sunny' : hour < 21 ? 'partly-sunny-outline' : 'moon-outline'} size={half ? 18 : 24} color={iconColor} />`,
  ],
  [
    /\s*<Text style=\{\[styles\.shabbosIcon, half && styles\.halfEmoji\]\}>🕯️<\/Text>/g,
    '\n            <Ionicons name="flame-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.candleIcon, half && styles\.halfEmoji\]\}>🕯️<\/Text>/g,
    '\n            <Ionicons name="flame-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.roshChodeshIcon, half && styles\.halfEmoji\]\}>🌙<\/Text>/g,
    '\n            <Ionicons name="moon-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [/\? "Today! 🎂"/g, '? "Today!"'],
  [
    /\s*<Text style=\{\[styles\.birthdayIcon, half && styles\.halfEmoji\]\}>🎂<\/Text>/g,
    '\n            <Ionicons name="gift-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.yahrzeitIcon, half && styles\.halfEmoji\]\}>🕯️<\/Text>/g,
    '\n            <Ionicons name="flame-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.learningIcon, half && styles\.halfEmoji\]\}>📜<\/Text>/g,
    '\n            <Ionicons name="document-text-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.mussarIcon, half && styles\.halfEmoji\]\}>💎<\/Text>/g,
    '\n            <Ionicons name="diamond-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.thoughtIcon, half && styles\.halfEmoji\]\}>💡<\/Text>/g,
    '\n            <Ionicons name="bulb-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.learningIcon, half && styles\.halfEmoji\]\}>🌟<\/Text>/g,
    '\n            <Ionicons name="star-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.historyIcon, half && styles\.halfEmoji\]\}>📜<\/Text>/g,
    '\n            <Ionicons name="hourglass-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.storyIcon, half && styles\.halfEmoji\]\}>👤<\/Text>/g,
    '\n            <Ionicons name="person-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.mitzvahIcon, half && styles\.halfEmoji\]\}>⭐<\/Text>/g,
    '\n            <Ionicons name="star-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.middahIcon, half && styles\.halfEmoji\]\}>💪<\/Text>/g,
    '\n            <Ionicons name="fitness-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.gratitudeIcon, half && styles\.halfEmoji\]\}>🙏<\/Text>/g,
    '\n            <Ionicons name="heart-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.statsIcon, half && styles\.halfEmoji\]\}>📊<\/Text>/g,
    '\n            <Ionicons name="stats-chart-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.tzedakahIcon, half && styles\.halfEmoji\]\}>💰<\/Text>/g,
    '\n            <Ionicons name="cash-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.habitsIcon, half && styles\.halfEmoji\]\}>✓<\/Text>/g,
    '\n            <Ionicons name="checkmark-circle-outline" size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.communityIcon, half && styles\.halfEmoji\]\}>\{panelDef\?\.icon \|\| '👥'\}<\/Text>/g,
    '\n            <Ionicons name={getPanelIconName(panel.type)} size={half ? 18 : 24} color={iconColor} />',
  ],
  [
    /\s*<Text style=\{\[styles\.placeholderIcon, half && styles\.halfEmoji\]\}>\{panelDef\?\.icon \|\| '📦'\}<\/Text>/g,
    '\n            <Ionicons name={getPanelIconName(panel.type)} size={half ? 18 : 24} color={iconColor} />',
  ],
];

let hits = 0;
for (const [re, rep] of reps) {
  const m = s.match(re);
  if (m) {
    s = s.replace(re, rep);
    hits += m.length;
    console.log('hit', m.length, re.source.slice(0, 40));
  } else {
    console.log('miss', re.source.slice(0, 40));
  }
}

fs.writeFileSync(p, s);
console.log('hits', hits);
console.log('has iconColor', s.includes('const iconColor'));
console.log('remaining emoji-ish', [...s.matchAll(/[✨🕯️🌅☀️🌆🌙🎂📜💎💡🌟👤⭐💪🙏📊💰👥📦]/gu)].map((x) => x[0]));
