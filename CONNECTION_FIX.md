# Connection Fix: "Could not connect to server"

## The Problem

Your app is trying to connect to `127.0.0.1:8081` (localhost), which your iPhone can't reach. It needs your Windows PC's actual IP address (like `192.168.1.100:8081`).

## Quick Fix: Use Tunnel Mode

**Stop your current `npm start` (Ctrl+C), then:**

```bash
npm run start:tunnel
```

This bypasses the IP issue entirely by using Expo's servers.

## Alternative: Force LAN Mode

If tunnel mode doesn't work, force Expo to use your LAN IP:

```bash
npm start -- --lan
```

Then look for a line like:
```
Metro waiting on exp://192.168.1.XXX:8081
```

Use that IP address (not 127.0.0.1).

## Find Your Windows IP Address

1. Open Command Prompt
2. Type: `ipconfig`
3. Look for "IPv4 Address" under your WiFi adapter
4. It will be something like `192.168.1.100`

## Manual Fix: Set Host Explicitly

If Expo keeps using localhost, you can force it:

```bash
# Replace 192.168.1.100 with YOUR actual IP
npx expo start --host 192.168.1.100
```

## Why This Happens

- Windows sometimes reports localhost incorrectly to Expo
- Firewall might be blocking network discovery
- Router configuration issues

## Best Solution for Windows

**Use tunnel mode** - it's the most reliable:

```bash
npm run start:tunnel
```

First time will ask for Expo login (free account).
