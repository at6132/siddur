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

export type DaySheetProps = {
  hebrewDate: string;
  gregorianLabel: string;
  specialDay: string;
  daveningNote: string;
  sunrise: string;
  shema: string;
  sunset: string;
  tzeis: string;
  parsha: string;
};

const DaySheetWidget = (props: DaySheetProps, _environment: WidgetEnvironment) => {
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
    <VStack alignment="leading" spacing={10} modifiers={[
        containerBackground(bg, 'widget'),
        padding({ all: 16 }),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
      ]}>
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
    </VStack>
  );
};

export default createWidget('DaySheetWidget', DaySheetWidget, { hebrewDate: 'י״ד כסלו', gregorianLabel: 'Tuesday, November 24', specialDay: 'Weekday', daveningNote: 'Regular davening today', sunrise: '--', shema: '--', sunset: '--', tzeis: '--', parsha: 'Open app for location zmanim' });
