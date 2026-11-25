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

export type ShabbosTimesProps = {
  candles: string;
  havdalah: string;
  parsha: string;
};

const ShabbosTimesWidget = (props: ShabbosTimesProps, _environment: WidgetEnvironment) => {
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
        padding({ all: 14 }),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
      ]}>
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
    </VStack>
  );
};

export default createWidget('ShabbosTimesWidget', ShabbosTimesWidget, { candles: '--', havdalah: '--', parsha: 'This week' });
