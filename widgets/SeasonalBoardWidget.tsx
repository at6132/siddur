import { HStack, ProgressView, Rectangle, Spacer, Text, VStack } from '@expo/ui/swift-ui';
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

export type SeasonalBoardProps = {
  mode: 'shabbos' | 'fast' | 'omer' | 'default';
  title: string;
  line1: string;
  line2: string;
  line3: string;
  detail: string;
  progressPercent: number;
};

const SeasonalBoardWidget = (props: SeasonalBoardProps, _environment: WidgetEnvironment) => {
  'widget';
  // lightColors — forced light (Home glass panels)
  const bg = '#FFFFFF';
  const rose = '#D4A5B8';
  const roseLight = '#F5E6E8';
  const roseDeep = '#B88FA3';
  const ink = '#1A1A1A';
  const secondary = '#6A6A6A';
  const tertiary = '#9A9A9A';
  const track = '#EEEEEE';

  return (
    <VStack alignment="leading" spacing={8} modifiers={[
        containerBackground(bg, 'widget'),
        padding({ all: 16 }),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
      ]}>
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
    </VStack>
  );
};

export default createWidget('SeasonalBoardWidget', SeasonalBoardWidget, { mode: 'default', title: 'Today', line1: 'Hebrew date and zmanim', line2: 'Open the app once to refresh', line3: 'Location unlocks accurate times', detail: 'Widgets update after launch', progressPercent: 0 });
