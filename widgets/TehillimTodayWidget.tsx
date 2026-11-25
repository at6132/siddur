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

export type TehillimTodayProps = {
  completed: number;
  total: number;
  percentComplete: number;
  nextPerek: string;
  dayName: string;
};

const TehillimTodayWidget = (props: TehillimTodayProps, _environment: WidgetEnvironment) => {
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
        padding({ all: 14 }),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
      ]}>
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
    </VStack>
  );
};

export default createWidget('TehillimTodayWidget', TehillimTodayWidget, { completed: 0, total: 22, percentComplete: 0, nextPerek: '22 chapters waiting', dayName: 'Yom Shlishi' });
