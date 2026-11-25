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

export type NextZmanProps = {
  label: string;
  time: string;
  countdown: string;
};

const NextZmanWidget = (props: NextZmanProps, _environment: WidgetEnvironment) => {
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
    <VStack alignment="leading" spacing={4} modifiers={[
        containerBackground(bg, 'widget'),
        padding({ all: 14 }),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
      ]}>
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
    </VStack>
  );
};

export default createWidget('NextZmanWidget', NextZmanWidget, { label: 'Sof Zman Shema', time: '--', countdown: 'Open app' });
