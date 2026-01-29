# iOS Widgets Implementation Guide

## Status
Widgets are **planned but not yet implemented**. The app is currently Expo Go compatible without widgets.

## Why Widgets Require Custom Development Build

iOS widgets require:
- Native Swift code (WidgetKit framework)
- App Groups for data sharing between app and widgets
- Custom development client or bare workflow (cannot use Expo Go)

## Implementation Plan (Future)

### Phase 1: Setup Custom Development Client

1. **Create development build:**
   ```bash
   eas build --profile development --platform ios
   ```

2. **Install on device** and use `expo start --dev-client`

### Phase 2: Create Widget Extension

1. **Add iOS widget extension in Xcode:**
   - File → New → Target → Widget Extension
   - Name: "SiddurWidgets"
   - Language: Swift
   - Include Configuration Intent: No

2. **Configure App Groups:**
   - Add App Group capability: `group.com.siddur.app`
   - Enable for both main app and widget extension

### Phase 3: Implement Widget Data Bridge

Create `src/widgets/WidgetDataService.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

// Bridge to native module for App Group storage
export class WidgetDataService {
  static async updateWidgetData(data: WidgetData): Promise<void> {
    // Save to AsyncStorage (for app use)
    await AsyncStorage.setItem('widget_data', JSON.stringify(data));
    
    // Save to App Group (for widget access)
    // Requires native module: WidgetDataBridge
    if (NativeModules.WidgetDataBridge) {
      await NativeModules.WidgetDataBridge.saveWidgetData(JSON.stringify(data));
    }
  }
}
```

### Phase 4: Create Native Bridge Module

Create `ios/WidgetDataBridge.swift`:

```swift
import Foundation
import React

@objc(WidgetDataBridge)
class WidgetDataBridge: NSObject {
  @objc
  func saveWidgetData(_ data: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let sharedDefaults = UserDefaults(suiteName: "group.com.siddur.app") else {
      rejecter("ERROR", "Failed to access App Group", nil)
      return
    }
    sharedDefaults.set(data, forKey: "widget_data")
    WidgetCenter.shared.reloadAllTimelines()
    resolver(nil)
  }
}
```

### Phase 5: Widget Types to Implement

1. **Today Widget** (`ios/widgets/TodayWidget.swift`)
   - Jewish date
   - Spiritual cue
   - Shabbos indicator

2. **Omer Widget** (`ios/widgets/OmerWidget.swift`)
   - Current Omer day
   - Counted status
   - Only visible during Omer period

3. **Tehillim Widget** (optional)
   - Quick access to Tehillim reader
   - One-tap open

### Phase 6: Update App.tsx

```typescript
import { WidgetUpdateService } from './src/widgets/WidgetUpdateService';

useEffect(() => {
  // Update widgets when app becomes active
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      WidgetUpdateService.updateOnAppActive();
    }
  });
  
  WidgetUpdateService.schedulePeriodicUpdates();
  
  return () => subscription.remove();
}, []);
```

## Widget Data Structure

```typescript
interface WidgetData {
  jewishDate: string;
  jewishDateShort: string;
  spiritualCue?: string;
  minchaTime?: string;
  isShabbos: boolean;
  omerDay?: number;
  omerCounted: boolean;
  hasHabitMark: boolean;
}
```

## References

- [Expo Custom Development Client](https://docs.expo.dev/development/build/)
- [WidgetKit Documentation](https://developer.apple.com/documentation/widgetkit)
- [App Groups Guide](https://developer.apple.com/documentation/xcode/configuring-app-groups)

## Notes

- Widgets are a **critical feature** per PRD but deferred for MVP
- App is fully functional without widgets
- Widgets enhance the "widgets are first-class" principle from PRD
- Consider implementing after core app is stable and tested
