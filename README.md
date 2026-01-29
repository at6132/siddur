# 24/7 - Modern Jewish Davening App

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
npm start              # Starts Expo dev server (shows QR code for Expo Go)
npm run start:tunnel   # Use tunnel mode if connection fails (Windows fix)
npm run start:lan      # Force LAN mode
npm run android        # Start Android emulator (if Android Studio installed)
npm run ios            # Start iOS simulator (Mac only, requires Xcode)
npm run web            # Open in web browser
```

### Running on iOS (Windows/Linux)

**Using Expo Go (Recommended for Windows):**
1. Install **Expo Go** app on your iPhone/iPad from App Store
2. Run `npm start` - Metro bundler will start
3. Scan the QR code shown in terminal/browser with Expo Go app
4. Your app will load on your iOS device!

**Benefits of Expo Go:**
- ✅ Works on Windows/Linux (no Mac needed!)
- ✅ Test on real iOS device
- ✅ Hot reload and fast refresh
- ✅ No build process needed

**Note:** iOS Simulator requires macOS and Xcode. On Windows, Expo Go is the way to go!

**Connection Issues?** If you get "could not connect to server" error:
- Try `npm run start:tunnel` (bypasses firewall/network issues)
- See `WINDOWS_SETUP.md` for detailed troubleshooting

## Project Structure

- `app/` - Screen components and navigation
- `src/` - Core logic (calendar, notifications, storage)
- `components/` - Reusable UI components
- `src/design/` - Design system (colors, typography, spacing)

## License

Private

