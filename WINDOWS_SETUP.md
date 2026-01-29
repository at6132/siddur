# Windows Development Setup

## Quick Start for Windows Users

You can build and test iOS apps on Windows using Expo Go! No Mac or Xcode needed.

### Step 1: Install Prerequisites

1. **Node.js** (v18 or later)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify: `node --version`

2. **Git** (if not already installed)
   - Download from [git-scm.com](https://git-scm.com/)

3. **Expo Go App** (on your iPhone/iPad)
   - Install from [App Store](https://apps.apple.com/app/expo-go/id982107779)

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Start Development Server

```bash
npm start
```

This will:
- Start Metro bundler
- Open Expo DevTools in your browser
- Show a QR code

### Step 4: Connect Your iPhone

1. Make sure your iPhone and Windows PC are on the **same WiFi network**
2. Open **Expo Go** app on your iPhone
3. Scan the QR code from the terminal or browser
4. Your app will load on your iPhone! 🎉

## Troubleshooting

### QR Code Not Scanning?

**Option 1: Use Tunnel Mode**
```bash
npm start -- --tunnel
```
This uses Expo's tunnel (works even on different networks, but slower)

**Option 2: Type URL Manually**
- In Expo Go app, tap "Enter URL manually"
- Type the URL shown in terminal (e.g., `exp://192.168.1.100:8081`)

### App Not Loading?

1. **Check WiFi**: Both devices must be on same network
2. **Check Firewall**: Windows Firewall might be blocking port 8081
   - Allow Node.js through firewall
3. **Try Tunnel Mode**: `npm start -- --tunnel`

### Hot Reload Not Working?

- Shake your iPhone (or press Cmd+D in simulator)
- Tap "Reload" in Expo Go menu

## Building for Production

Even on Windows, you can build iOS apps using **EAS Build** (Expo's cloud build service):

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build iOS app (runs on Expo's Mac servers)
eas build --platform ios
```

The build happens in the cloud - you don't need a Mac!

## Benefits of This Setup

✅ **No Mac Required** - Develop iOS apps on Windows  
✅ **Real Device Testing** - Test on actual iPhone  
✅ **Fast Iteration** - Hot reload, instant updates  
✅ **Free** - No Xcode, no Mac, no extra hardware  

## Next Steps

- Make changes to code → App updates automatically
- Test features on real device
- Build production app with EAS Build when ready

Happy coding! 🚀
