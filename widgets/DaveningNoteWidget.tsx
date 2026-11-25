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

export type DaveningNoteProps = {
  message: string;
  detail: string;
};

const DaveningNoteWidget = (props: DaveningNoteProps, _environment: WidgetEnvironment) => {
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
    <VStack
      alignment="center"
      spacing={6}
      modifiers={[
        containerBackground(roseLight, 'widget'),
        padding({ all: 16 }),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'center' }),
      ]}
    >
      <Text modifiers={[font({ size: 15, weight: 'medium', design: 'rounded' }), foregroundStyle(roseDeep)]}>
        {props.message}
      </Text>
      <Text modifiers={[font({ size: 12, weight: 'regular', design: 'rounded' }), foregroundStyle(secondary)]}>
        {props.detail}
      </Text>
    </VStack>
  );
};

export default createWidget('DaveningNoteWidget', DaveningNoteWidget, { message: 'Regular davening today', detail: 'Open calendar for details' });
