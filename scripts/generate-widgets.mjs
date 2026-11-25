/**
 * iOS widgets styled like in-app Home glass panels.
 * Colors from src/design/colors.ts (light). Type roles: serif ≈ Cormorant/Frank Ruhl, rounded ≈ Nunito.
 */
import fs from 'fs';
import path from 'path';

const dir = 'widgets';
fs.mkdirSync(dir, { recursive: true });

const header = `import { HStack, ProgressView, Rectangle, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  padding,
  progressViewStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
`;

/** Brand tokens inlined — widget runtime cannot import app modules. */
const chrome = `  // lightColors — forced light (Home glass panels)
  const bg = '#FFFFFF';
  const rose = '#D4A5B8';
  const roseLight = '#F5E6E8';
  const roseDeep = '#B88FA3';
  const ink = '#1A1A1A';
  const secondary = '#6A6A6A';
  const tertiary = '#9A9A9A';
  const track = '#EEEEEE';
`;

function write(name, propsType, propsFields, body, initial) {
  const content = `${header}
export type ${propsType} = ${propsFields};

const ${name} = (props: ${propsType}, _environment: WidgetEnvironment) => {
  'widget';
${chrome}
  return (
${body}
  );
};

export default createWidget('${name}', ${name}, ${initial});
`;
  fs.writeFileSync(path.join(dir, `${name}.tsx`), content);
  console.log('wrote', name);
}

const shell = (pad = 14) => `[
        containerBackground(bg, 'widget'),
        padding({ all: ${pad} }),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'center' }),
      ]`;

const shellTop = (pad = 14) => `[
        containerBackground(bg, 'widget'),
        padding({ all: ${pad} }),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
      ]`;

// —— Small: Hebrew date (Home date panel) ——
write(
  'HebrewDateWidget',
  'HebrewDateProps',
  `{
  hebrewDate: string;
  jewishDateShort: string;
  badge: string;
}`,
  `    <VStack alignment="center" spacing={6} modifiers={${shell(12)}}>
      <Text modifiers={[font({ size: 22, weight: 'bold', design: 'serif' }), foregroundStyle(ink)]}>
        {props.hebrewDate}
      </Text>
      <Rectangle modifiers={[frame({ width: 36, height: 2 }), foregroundStyle(rose)]} />
      <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(secondary)]}>
        {props.jewishDateShort}
      </Text>
      <Text modifiers={[font({ size: 11, weight: 'semibold', design: 'rounded' }), foregroundStyle(roseDeep)]}>
        {props.badge}
      </Text>
    </VStack>`,
  `{ hebrewDate: 'י״ד כסלו', jewishDateShort: 'Tuesday, November 24', badge: 'Weekday' }`
);

// —— Small: Next zman ——
write(
  'NextZmanWidget',
  'NextZmanProps',
  `{
  label: string;
  time: string;
  countdown: string;
}`,
  `    <VStack alignment="leading" spacing={4} modifiers={${shellTop(14)}}>
      <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>
        {props.label}
      </Text>
      <Spacer minLength={4} />
      <Text modifiers={[font({ size: 28, weight: 'bold', design: 'serif' }), foregroundStyle(ink)]}>
        {props.time}
      </Text>
      <Text modifiers={[font({ size: 13, weight: 'medium', design: 'rounded' }), foregroundStyle(roseDeep)]}>
        {props.countdown}
      </Text>
    </VStack>`,
  `{ label: 'Sof Zman Shema', time: '--', countdown: 'Open app' }`
);

// —— Small: Tehillim streak ——
write(
  'TehillimStreakWidget',
  'TehillimStreakProps',
  `{
  streak: number;
  percentComplete: number;
  subtitle: string;
}`,
  `    <VStack alignment="leading" spacing={4} modifiers={${shellTop(14)}}>
      <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>
        Tehillim
      </Text>
      <Spacer minLength={2} />
      <Text modifiers={[font({ size: 34, weight: 'bold', design: 'serif' }), foregroundStyle(ink)]}>
        {String(props.streak)}
      </Text>
      <Text modifiers={[font({ size: 13, weight: 'regular', design: 'rounded' }), foregroundStyle(secondary)]}>
        {props.subtitle}
      </Text>
      <Text modifiers={[font({ size: 12, weight: 'semibold', design: 'rounded' }), foregroundStyle(roseDeep)]}>
        {props.percentComplete}% today
      </Text>
    </VStack>`,
  `{ streak: 0, percentComplete: 0, subtitle: 'day streak' }`
);

// —— Small: Candles ——
write(
  'CandlesWidget',
  'CandlesProps',
  `{
  title: string;
  time: string;
  countdown: string;
  mode: 'candles' | 'havdalah' | 'idle';
}`,
  `    <VStack alignment="leading" spacing={4} modifiers={${shellTop(14)}}>
      <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>
        {props.title}
      </Text>
      <Spacer minLength={4} />
      <Text modifiers={[font({ size: 26, weight: 'bold', design: 'serif' }), foregroundStyle(ink)]}>
        {props.time}
      </Text>
      <Text modifiers={[font({ size: 13, weight: 'medium', design: 'rounded' }), foregroundStyle(roseDeep)]}>
        {props.countdown}
      </Text>
    </VStack>`,
  `{ title: 'Candles', time: '--', countdown: 'Open app', mode: 'idle' }`
);

// —— Small: Omer / Brachos ——
write(
  'OmerBrachosWidget',
  'OmerBrachosProps',
  `{
  mode: 'omer' | 'brachos';
  title: string;
  value: string;
  subtitle: string;
}`,
  `    <VStack alignment="leading" spacing={4} modifiers={${shellTop(14)}}>
      <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>
        {props.title}
      </Text>
      <Spacer minLength={2} />
      <Text modifiers={[font({ size: 34, weight: 'bold', design: 'serif' }), foregroundStyle(ink)]}>
        {props.value}
      </Text>
      <Text modifiers={[font({ size: 13, weight: 'regular', design: 'rounded' }), foregroundStyle(secondary)]}>
        {props.subtitle}
      </Text>
    </VStack>`,
  `{ mode: 'brachos', title: 'Brachos', value: '0', subtitle: 'of 100 today' }`
);

// —— Medium: Daily Inspiration (Home inspiration_quote) ——
write(
  'DailyInspirationWidget',
  'DailyInspirationProps',
  `{
  hebrew: string;
  translation: string;
  source: string;
}`,
  `    <VStack alignment="center" spacing={6} modifiers={${shell(14)}}>
      <Text modifiers={[font({ size: 18, weight: 'semibold', design: 'serif' }), foregroundStyle(ink)]}>
        {props.hebrew}
      </Text>
      <Text modifiers={[font({ size: 14, weight: 'regular', design: 'rounded' }), foregroundStyle(secondary)]}>
        {props.translation}
      </Text>
      <Text modifiers={[font({ size: 12, weight: 'medium', design: 'rounded' }), foregroundStyle(tertiary)]}>
        {props.source}
      </Text>
    </VStack>`,
  `{ hebrew: "שִׁוִּיתִי ה' לְנֶגְדִּי תָמִיד", translation: 'I have set Hashem before me always.', source: 'Tehillim 16:8' }`
);

// —— Medium: Zmanim strip (Home zmanim panel) ——
write(
  'ZmanimStripWidget',
  'ZmanimStripProps',
  `{
  sunrise: string;
  shema: string;
  sunset: string;
}`,
  `    <HStack spacing={0} modifiers={${shell(12)}}>
      <VStack alignment="center" spacing={4} modifiers={[frame({ maxWidth: Infinity })]}>
        <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>
          Sunrise
        </Text>
        <Text modifiers={[font({ size: 17, weight: 'semibold', design: 'rounded' }), foregroundStyle(ink)]}>
          {props.sunrise}
        </Text>
      </VStack>
      <Rectangle modifiers={[frame({ width: 1, height: 30 }), foregroundStyle(track)]} />
      <VStack alignment="center" spacing={4} modifiers={[frame({ maxWidth: Infinity })]}>
        <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>
          Shema
        </Text>
        <Text modifiers={[font({ size: 17, weight: 'semibold', design: 'rounded' }), foregroundStyle(ink)]}>
          {props.shema}
        </Text>
      </VStack>
      <Rectangle modifiers={[frame({ width: 1, height: 30 }), foregroundStyle(track)]} />
      <VStack alignment="center" spacing={4} modifiers={[frame({ maxWidth: Infinity })]}>
        <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>
          Sunset
        </Text>
        <Text modifiers={[font({ size: 17, weight: 'semibold', design: 'rounded' }), foregroundStyle(ink)]}>
          {props.sunset}
        </Text>
      </VStack>
    </HStack>`,
  `{ sunrise: '--', shema: '--', sunset: '--' }`
);

// —— Medium: Davening note (rose wash like Home) ——
write(
  'DaveningNoteWidget',
  'DaveningNoteProps',
  `{
  message: string;
  detail: string;
}`,
  `    <VStack
      alignment="center"
      spacing={6}
      modifiers={[
        containerBackground(roseLight, 'widget'),
        padding({ all: 16 }),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'center' }),
      ]}
    >
      <Text modifiers={[font({ size: 15, weight: 'medium', design: 'rounded' }), foregroundStyle(roseDeep)]}>
        {props.message}
      </Text>
      <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(secondary)]}>
        {props.detail}
      </Text>
    </VStack>`,
  `{ message: 'Regular davening today', detail: 'Open calendar for details' }`
);

// —— Medium: Tehillim today (Home tehillim card) ——
write(
  'TehillimTodayWidget',
  'TehillimTodayProps',
  `{
  completed: number;
  total: number;
  percentComplete: number;
  nextPerek: string;
  dayName: string;
}`,
  `    <VStack alignment="leading" spacing={8} modifiers={${shellTop(14)}}>
      <HStack modifiers={[frame({ maxWidth: Infinity })]}>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 17, weight: 'semibold', design: 'serif' }), foregroundStyle(ink)]}>
            {props.dayName} Tehillim
          </Text>
          <Text modifiers={[font({ size: 13, weight: 'regular', design: 'rounded' }), foregroundStyle(secondary)]}>
            {props.nextPerek}
          </Text>
        </VStack>
        <Spacer />
        <Text modifiers={[font({ size: 14, weight: 'bold', design: 'rounded' }), foregroundStyle(roseDeep)]}>
          {props.percentComplete}%
        </Text>
      </HStack>
      <ProgressView
        value={props.percentComplete / 100}
        modifiers={[progressViewStyle('linear'), tint(rose), frame({ maxWidth: Infinity })]}
      />
      <Text modifiers={[font({ size: 11, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>
        {props.completed} of {props.total} today
      </Text>
    </VStack>`,
  `{ completed: 0, total: 22, percentComplete: 0, nextPerek: '22 chapters waiting', dayName: 'Yom Shlishi' }`
);

// —— Medium: Shabbos times ——
write(
  'ShabbosTimesWidget',
  'ShabbosTimesProps',
  `{
  candles: string;
  havdalah: string;
  parsha: string;
}`,
  `    <VStack alignment="leading" spacing={10} modifiers={${shellTop(14)}}>
      <Text modifiers={[font({ size: 17, weight: 'semibold', design: 'serif' }), foregroundStyle(ink)]}>
        Shabbos
      </Text>
      <HStack spacing={16} modifiers={[frame({ maxWidth: Infinity })]}>
        <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>
            Candles
          </Text>
          <Text modifiers={[font({ size: 18, weight: 'semibold', design: 'rounded' }), foregroundStyle(ink)]}>
            {props.candles}
          </Text>
        </VStack>
        <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>
            Havdalah
          </Text>
          <Text modifiers={[font({ size: 18, weight: 'semibold', design: 'rounded' }), foregroundStyle(ink)]}>
            {props.havdalah}
          </Text>
        </VStack>
      </HStack>
      <Text modifiers={[font({ size: 13, weight: 'medium', design: 'rounded' }), foregroundStyle(roseDeep)]}>
        {props.parsha}
      </Text>
    </VStack>`,
  `{ candles: '--', havdalah: '--', parsha: 'This week' }`
);

// —— Large: Day sheet ——
write(
  'DaySheetWidget',
  'DaySheetProps',
  `{
  hebrewDate: string;
  gregorianLabel: string;
  specialDay: string;
  daveningNote: string;
  sunrise: string;
  shema: string;
  sunset: string;
  tzeis: string;
  parsha: string;
}`,
  `    <VStack alignment="leading" spacing={10} modifiers={${shellTop(16)}}>
      <VStack alignment="center" spacing={6} modifiers={[frame({ maxWidth: Infinity })]}>
        <Text modifiers={[font({ size: 26, weight: 'bold', design: 'serif' }), foregroundStyle(ink)]}>
          {props.hebrewDate}
        </Text>
        <Rectangle modifiers={[frame({ width: 40, height: 2 }), foregroundStyle(rose)]} />
        <Text modifiers={[font({ size: 14, weight: 'regular', design: 'rounded' }), foregroundStyle(secondary)]}>
          {props.gregorianLabel}
        </Text>
        <Text modifiers={[font({ size: 12, weight: 'semibold', design: 'rounded' }), foregroundStyle(roseDeep)]}>
          {props.specialDay}
        </Text>
      </VStack>
      <Text modifiers={[font({ size: 14, weight: 'medium', design: 'rounded' }), foregroundStyle(roseDeep)]}>
        {props.daveningNote}
      </Text>
      <Text modifiers={[font({ size: 13, weight: 'regular', design: 'rounded' }), foregroundStyle(secondary)]}>
        {props.parsha}
      </Text>
      <HStack spacing={0} modifiers={[frame({ maxWidth: Infinity })]}>
        <VStack alignment="center" spacing={3} modifiers={[frame({ maxWidth: Infinity })]}>
          <Text modifiers={[font({ size: 11, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>Sunrise</Text>
          <Text modifiers={[font({ size: 15, weight: 'semibold', design: 'rounded' }), foregroundStyle(ink)]}>{props.sunrise}</Text>
        </VStack>
        <Rectangle modifiers={[frame({ width: 1, height: 28 }), foregroundStyle(track)]} />
        <VStack alignment="center" spacing={3} modifiers={[frame({ maxWidth: Infinity })]}>
          <Text modifiers={[font({ size: 11, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>Shema</Text>
          <Text modifiers={[font({ size: 15, weight: 'semibold', design: 'rounded' }), foregroundStyle(ink)]}>{props.shema}</Text>
        </VStack>
        <Rectangle modifiers={[frame({ width: 1, height: 28 }), foregroundStyle(track)]} />
        <VStack alignment="center" spacing={3} modifiers={[frame({ maxWidth: Infinity })]}>
          <Text modifiers={[font({ size: 11, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>Sunset</Text>
          <Text modifiers={[font({ size: 15, weight: 'semibold', design: 'rounded' }), foregroundStyle(ink)]}>{props.sunset}</Text>
        </VStack>
        <Rectangle modifiers={[frame({ width: 1, height: 28 }), foregroundStyle(track)]} />
        <VStack alignment="center" spacing={3} modifiers={[frame({ maxWidth: Infinity })]}>
          <Text modifiers={[font({ size: 11, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>Tzeis</Text>
          <Text modifiers={[font({ size: 15, weight: 'semibold', design: 'rounded' }), foregroundStyle(ink)]}>{props.tzeis}</Text>
        </VStack>
      </HStack>
    </VStack>`,
  `{ hebrewDate: 'י״ד כסלו', gregorianLabel: 'Tuesday, November 24', specialDay: 'Weekday', daveningNote: 'Regular davening today', sunrise: '--', shema: '--', sunset: '--', tzeis: '--', parsha: 'Open app for location zmanim' }`
);

// —— Large: Practice hub ——
write(
  'PracticeHubWidget',
  'PracticeHubProps',
  `{
  tehillimPercent: number;
  tehillimLabel: string;
  daveningStreak: number;
  brachosCount: number;
  brachosCap: number;
  goalsCompleted: number;
  goalsTotal: number;
}`,
  `    <VStack alignment="leading" spacing={14} modifiers={${shellTop(16)}}>
      <Text modifiers={[font({ size: 20, weight: 'semibold', design: 'serif' }), foregroundStyle(ink)]}>
        Practice
      </Text>
      <VStack alignment="leading" spacing={6} modifiers={[frame({ maxWidth: Infinity })]}>
        <HStack modifiers={[frame({ maxWidth: Infinity })]}>
          <Text modifiers={[font({ size: 15, weight: 'semibold', design: 'serif' }), foregroundStyle(ink)]}>
            Tehillim
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 14, weight: 'bold', design: 'rounded' }), foregroundStyle(roseDeep)]}>
            {props.tehillimPercent}%
          </Text>
        </HStack>
        <ProgressView
          value={props.tehillimPercent / 100}
          modifiers={[progressViewStyle('linear'), tint(rose), frame({ maxWidth: Infinity })]}
        />
        <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>
          {props.tehillimLabel}
        </Text>
      </VStack>
      <HStack spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
        <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>Davening</Text>
          <Text modifiers={[font({ size: 24, weight: 'bold', design: 'serif' }), foregroundStyle(ink)]}>{String(props.daveningStreak)}</Text>
          <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(secondary)]}>day streak</Text>
        </VStack>
        <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>Brachos</Text>
          <Text modifiers={[font({ size: 24, weight: 'bold', design: 'serif' }), foregroundStyle(ink)]}>{props.brachosCount}/{props.brachosCap}</Text>
        </VStack>
        <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>Goals</Text>
          <Text modifiers={[font({ size: 24, weight: 'bold', design: 'serif' }), foregroundStyle(ink)]}>{props.goalsCompleted}/{props.goalsTotal}</Text>
        </VStack>
      </HStack>
    </VStack>`,
  `{ tehillimPercent: 0, tehillimLabel: '0 of 22 today', daveningStreak: 0, brachosCount: 0, brachosCap: 100, goalsCompleted: 0, goalsTotal: 0 }`
);

// —— Large: Seasonal board ——
write(
  'SeasonalBoardWidget',
  'SeasonalBoardProps',
  `{
  mode: 'shabbos' | 'fast' | 'omer' | 'default';
  title: string;
  line1: string;
  line2: string;
  line3: string;
  detail: string;
  progressPercent: number;
}`,
  `    <VStack alignment="leading" spacing={8} modifiers={${shellTop(16)}}>
      <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(tertiary)]}>
        {props.mode === 'fast' ? 'Fast day' : props.mode === 'omer' ? 'Sefiras HaOmer' : props.mode === 'shabbos' ? 'Shabbos' : 'This week'}
      </Text>
      <Text modifiers={[font({ size: 26, weight: 'bold', design: 'serif' }), foregroundStyle(ink)]}>
        {props.title}
      </Text>
      <Rectangle modifiers={[frame({ width: 40, height: 2 }), foregroundStyle(rose)]} />
      <Text modifiers={[font({ size: 16, weight: 'semibold', design: 'serif' }), foregroundStyle(ink)]}>
        {props.line1}
      </Text>
      <Text modifiers={[font({ size: 14, weight: 'regular', design: 'rounded' }), foregroundStyle(secondary)]}>
        {props.line2}
      </Text>
      <Text modifiers={[font({ size: 14, weight: 'regular', design: 'rounded' }), foregroundStyle(secondary)]}>
        {props.line3}
      </Text>
      <Text modifiers={[font({ size: 13, weight: 'medium', design: 'rounded' }), foregroundStyle(roseDeep)]}>
        {props.detail}
      </Text>
      <ProgressView
        value={props.progressPercent / 100}
        modifiers={[progressViewStyle('linear'), tint(rose), frame({ maxWidth: Infinity })]}
      />
    </VStack>`,
  `{ mode: 'default', title: 'Today', line1: 'Hebrew date and zmanim', line2: 'Open the app once to refresh', line3: 'Location unlocks accurate times', detail: 'Widgets update after launch', progressPercent: 0 }`
);

console.log('done');
