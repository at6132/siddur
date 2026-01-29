# Siddur - Modern Jewish Davening App

A notifications-first, widget-driven spiritual companion for Jewish women, built with Expo and React Native.

## Features

- **Intelligent Notifications**: Gentle, context-aware reminders for davening, Tehillim, and spiritual practices
- **Jewish Calendar Engine**: Offline-first calendar with zmanim calculations and spiritual cues
- **Liquid Glass Design**: Beautiful, modern UI with smooth animations
- **iOS Widgets**: Planned for future release (see WIDGETS.md)
- **Zero Guilt UX**: Supportive, pressure-free experience

## Tech Stack

- Expo (managed workflow, Expo Go compatible)
- TypeScript
- React Navigation
- hebcal (Jewish calendar)
- react-native-reanimated + react-native-animatable
- expo-notifications

## Expo Go Compatibility

✅ **Fully compatible with Expo Go** - All features work in Expo Go except:
- iOS Widgets (planned, see WIDGETS.md)

## Development

```bash
npm install
npm start          # Starts Expo and opens iOS simulator (if Xcode installed)
npm run start:dev  # Starts Expo with QR code menu (for Expo Go)
npm run ios        # Explicitly start iOS simulator
npm run android    # Start Android emulator
```

### iOS Setup

**For iOS Simulator (Mac only):**
1. Install Xcode from App Store
2. Install Xcode Command Line Tools: `xcode-select --install`
3. Run `npm start` - it will automatically open iOS simulator

**For Expo Go (any device):**
1. Install Expo Go app on your iPhone/iPad
2. Run `npm run start:dev`
3. Scan QR code with Expo Go app

**Note:** iOS simulator requires macOS and Xcode. On Windows/Linux, use Expo Go on a physical device.

## Project Structure

- `app/` - Screen components and navigation
- `src/` - Core logic (calendar, notifications, storage)
- `components/` - Reusable UI components
- `src/design/` - Design system (colors, typography, spacing)

## License

Private

