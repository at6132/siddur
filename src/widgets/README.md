# Widgets Module

## Status: Not Implemented

Widget functionality has been removed to maintain Expo Go compatibility.

## Future Implementation

See `WIDGETS.md` in the root directory for complete implementation guide.

## What Was Removed

- `WidgetDataService.ts` - Data bridge between app and widgets
- `WidgetUpdateService.ts` - Widget update scheduling
- `ios/widgets/*.swift` - Native iOS widget implementations

## Adding Widgets Back

When ready to implement widgets:

1. Follow the guide in `WIDGETS.md`
2. Create custom development build (cannot use Expo Go)
3. Implement native bridge module
4. Add widget extension in Xcode
5. Restore widget update calls in `App.tsx`

## Widget Requirements

- Custom development client (not Expo Go)
- App Groups configuration
- Native Swift code
- WidgetKit framework
