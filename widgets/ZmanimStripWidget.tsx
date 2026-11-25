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

export type ZmanimStripProps = {
  sunrise: string;
  shema: string;
  sunset: string;
};

const ZmanimStripWidget = (props: ZmanimStripProps, _environment: WidgetEnvironment) => {
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
    <HStack spacing={0} modifiers={[
        containerBackground(bg, 'widget'),
        padding({ all: 12 }),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'center' }),
      ]}>
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
    </HStack>
  );
};

export default createWidget('ZmanimStripWidget', ZmanimStripWidget, { sunrise: '--', shema: '--', sunset: '--' });
