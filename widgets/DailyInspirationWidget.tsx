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

export type DailyInspirationProps = {
  hebrew: string;
  translation: string;
  source: string;
};

const DailyInspirationWidget = (props: DailyInspirationProps, _environment: WidgetEnvironment) => {
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
        padding({ all: 14 }),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'center' }),
      ]}>
      <Text modifiers={[font({ size: 18, weight: 'semibold', design: 'serif' }), foregroundStyle(ink)]}>
        {props.hebrew}
      </Text>
      <Text modifiers={[font({ size: 14, weight: 'regular', design: 'rounded' }), foregroundStyle(secondary)]}>
        {props.translation}
      </Text>
      <Text modifiers={[font({ size: 12, weight: 'medium', design: 'rounded' }), foregroundStyle(tertiary)]}>
        {props.source}
      </Text>
    </VStack>
  );
};

export default createWidget('DailyInspirationWidget', DailyInspirationWidget, { hebrew: "שִׁוִּיתִי ה' לְנֶגְדִּי תָמִיד", translation: 'I have set Hashem before me always.', source: 'Tehillim 16:8' });
