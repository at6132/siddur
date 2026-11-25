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

export type PracticeHubProps = {
  tehillimPercent: number;
  tehillimLabel: string;
  daveningStreak: number;
  brachosCount: number;
  brachosCap: number;
  goalsCompleted: number;
  goalsTotal: number;
};

const PracticeHubWidget = (props: PracticeHubProps, _environment: WidgetEnvironment) => {
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
    <VStack alignment="leading" spacing={14} modifiers={[
        containerBackground(bg, 'widget'),
        padding({ all: 16 }),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
      ]}>
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
    </VStack>
  );
};

export default createWidget('PracticeHubWidget', PracticeHubWidget, { tehillimPercent: 0, tehillimLabel: '0 of 22 today', daveningStreak: 0, brachosCount: 0, brachosCap: 100, goalsCompleted: 0, goalsTotal: 0 });
