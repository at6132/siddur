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

export type HebrewDateProps = {
  hebrewDate: string;
  jewishDateShort: string;
  badge: string;
};

const HebrewDateWidget = (props: HebrewDateProps, _environment: WidgetEnvironment) => {
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
    <VStack alignment="center" spacing={6} modifiers={[
        containerBackground(bg, 'widget'),
        padding({ all: 12 }),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'center' }),
      ]}>
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
    </VStack>
  );
};

export default createWidget('HebrewDateWidget', HebrewDateWidget, { hebrewDate: 'י״ד כסלו', jewishDateShort: 'Tuesday, November 24', badge: 'Weekday' });
