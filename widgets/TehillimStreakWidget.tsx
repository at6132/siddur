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

export type TehillimStreakProps = {
  streak: number;
  percentComplete: number;
  subtitle: string;
};

const TehillimStreakWidget = (props: TehillimStreakProps, _environment: WidgetEnvironment) => {
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
    </VStack>
  );
};

export default createWidget('TehillimStreakWidget', TehillimStreakWidget, { streak: 0, percentComplete: 0, subtitle: 'day streak' });
