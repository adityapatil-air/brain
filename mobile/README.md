# ASHA Care Mobile App

Native Android/iOS application built with Expo React Native.

## Quick Start (Next 10 mins!)

### 1. Install Expo CLI
```bash
npm install -g eas-cli expo-cli
```

### 2. Install Dependencies
```bash
cd mobile
npm install
```

### 3. Setup Environment
```bash
cp .env.local.example .env.local
```

### 4. Start Dev Server
```bash
npm run start
```

Then:
- **Scan QR code** with Expo Go app on your Android phone
- OR **Press 'a'** to open Android emulator

## Build APK for Phone

### Option 1: Quick Local Build (Recommended for demo)
```bash
cd mobile
npx eas build --platform android --local
```

### Option 2: Cloud Build (Expo handles everything)
```bash
cd mobile
eas build --platform android --profile preview
```

The APK will download and you can install it on any Android device:
```bash
adb install app-release.apk
```

## Features Demo

✅ Voice recording (Hindi, Hinglish, Marathi, English)
✅ Symptoms detection  
✅ Clinical assessment  
✅ Visit history  
✅ Real-time Supabase sync

## Structure

```
mobile/
├── app/
│   ├── _layout.tsx       # Navigation
│   ├── index.tsx         # Home
│   ├── visit.tsx         # Voice recording
│   └── history.tsx       # Visit history
├── app.json              # Expo config
├── package.json
└── .env.local           # Your API keys
```

## Troubleshooting

**"Android SDK not found"**
- Install Android Studio or set `$ANDROID_SDK_ROOT`

**"Module not found"**
```bash
cd mobile && npm install
```

**Rebuild native modules**
```bash
npm run prebuild
```
