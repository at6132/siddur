import fs from 'fs';

const path = 'app/siddur/SiddurReaderScreen.tsx';
let s = fs.readFileSync(path, 'utf8');

s = s.replace(/import \{ colors \} from '\.\.\/\.\.\/src\/design\/colors';\r?\n/, '');

if (!s.includes("import type { AppTheme }")) {
  s = s.replace(
    "import { useTheme } from '../../src/design/theme';",
    `import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';`,
  );
}

s = s.replace(/color=\{colors\.primary\.main\}/g, 'color={theme.colors.primary.main}');

const marker = 'const styles = StyleSheet.create({';
const idx = s.indexOf(marker);
if (idx < 0) {
  console.error('styles not found');
  process.exit(1);
}
const end = s.lastIndexOf('});');
if (end < idx) {
  console.error('end not found');
  process.exit(1);
}

let styleBody = s.slice(idx + marker.length, end);
styleBody = styleBody.replace(/\bcolors\./g, 'theme.colors.');
styleBody = styleBody.replace(
  /backgroundColor: 'rgba\(250, 249, 247, 0\.95\)'/g,
  'backgroundColor: theme.colors.background.secondary',
);
styleBody = styleBody.replace(
  /borderBottomColor: 'rgba\(0,0,0,0\.06\)'/g,
  'borderBottomColor: colorWithAlpha(theme.colors.text.primary, 0.06)',
);
styleBody = styleBody.replace(/shadowColor: '#000'/g, 'shadowColor: theme.colors.shadow.dark');

const fn = `function createReaderStyles(theme: AppTheme) {
  return StyleSheet.create({${styleBody}});
}
`;

s = s.slice(0, idx) + fn;

if (!s.includes('createReaderStyles(theme)')) {
  s = s.replace(
    "const serviceTitle = SERVICE_TITLES[service] || { english: service, hebrew: '' };",
    `const serviceTitle = SERVICE_TITLES[service] || { english: service, hebrew: '' };
  const styles = React.useMemo(() => createReaderStyles(theme), [theme]);`,
  );
}

fs.writeFileSync(path, s);
console.log('rewrote', path, 'bytes', s.length);
