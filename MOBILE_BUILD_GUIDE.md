# SafeRoute Mobile Apps - Build Guide

## 📱 Overview

This guide covers building the **Driver** and **Parent** mobile apps for Android (APK) and iOS (IPA).

### Apps Status

| App | Platform | Status | API URL |
|-----|----------|--------|---------|
| **Driver** | Android/iOS | ✅ Ready | `https://saferouteapi-production.up.railway.app/api` |
| **Parent** | Android/iOS | ✅ Ready | `https://saferouteapi-production.up.railway.app/api` |

---

## 🚀 Quick Build Steps

### Prerequisites

1. **Expo Account**: Sign up at https://expo.dev
2. **EAS CLI**: Install with `npm install -g eas-cli`
3. **Login**: Run `eas login` and enter credentials

### Step 1: Setup EAS Projects

#### Driver App

```bash
cd apps/driver

# Initialize EAS project (first time only)
eas init

# Or configure if already exists
eas build:configure
```

**When prompted:**
- Select "Create a new project"
- Name: "SafeRoute Driver"
- Slug: "saferoute-driver"

**Copy the Project ID** and update `app.json`:
```json
{
  "extra": {
    "eas": {
      "projectId": "your-actual-project-id-here"
    }
  },
  "updates": {
    "url": "https://u.expo.dev/your-actual-project-id-here"
  }
}
```

#### Parent App

```bash
cd apps/parent

# Initialize EAS project (first time only)
eas init

# Or configure if already exists
eas build:configure
```

**When prompted:**
- Select "Create a new project"
- Name: "SafeRoute Parent"
- Slug: "saferoute-parent"

**Copy the Project ID** and update `app.json`.

---

### Step 2: Build Android APK (Easiest)

#### Driver App APK

```bash
cd apps/driver

# Build APK (preview - internal distribution)
eas build --platform android --profile preview

# Or build for production
eas build --platform android --profile production
```

#### Parent App APK

```bash
cd apps/parent

# Build APK (preview - internal distribution)
eas build --platform android --profile preview

# Or build for production
eas build --platform android --profile production
```

**Build Output:**
- APK will be available for download from Expo dashboard
- Or use `eas build:download` to download locally

---

### Step 3: Build iOS IPA (Requires Apple Developer Account)

#### Prerequisites
- Apple Developer Account ($99/year)
- App Store Connect setup

#### Driver App IPA

```bash
cd apps/driver

# Build IPA
eas build --platform ios --profile production
```

#### Parent App IPA

```bash
cd apps/parent

# Build IPA
eas build --platform ios --profile production
```

**Note:** First iOS build requires:
1. Registering bundle IDs in Apple Developer Portal
2. Creating provisioning profiles
3. EAS handles this automatically, but may take longer

---

## ⚙️ Environment Variables

### For EAS Builds (Production)

Set these in your EAS project settings:

1. Go to https://expo.dev
2. Select your project
3. Go to **"Project Settings"** → **"Environment Variables"**
4. Add:

| Variable | Value |
|----------|-------|
| `EXPO_PUBLIC_API_URL` | `https://saferouteapi-production.up.railway.app/api` |

Or set via CLI:

```bash
cd apps/driver
eas env:create EXPO_PUBLIC_API_URL=https://saferouteapi-production.up.railway.app/api --scope project

cd apps/parent
eas env:create EXPO_PUBLIC_API_URL=https://saferouteapi-production.up.railway.app/api --scope project
```

---

## 📦 Build Profiles Explained

### `eas.json` Profiles

| Profile | Use Case | Output |
|---------|----------|--------|
| `development` | Local testing with dev client | Development build |
| `preview` | Internal testing | APK (Android) |
| `production` | App Store release | AAB/APK (Android), IPA (iOS) |

---

## 🧪 Testing Builds

### Android APK Testing

1. Download APK from Expo dashboard
2. Transfer to Android device
3. Install and test
4. Or use `eas build:download` and drag to emulator

### iOS IPA Testing

1. Build completes
2. Install via TestFlight (recommended)
3. Or use development builds for testing

---

## 🔄 Over-the-Air (OTA) Updates

Both apps support Expo Updates for quick fixes without app store review.

### Publish an Update

```bash
cd apps/driver

# Publish OTA update
eas update --channel production --message "Bug fixes"

cd apps/parent
eas update --channel production --message "Bug fixes"
```

**Users get updates automatically on next app launch!**

---

## 📱 App Store Submission

### Android (Google Play Store)

1. Build production AAB:
   ```bash
   eas build --platform android --profile production
   ```
2. Download AAB from Expo
3. Upload to Google Play Console
4. Follow Play Store review process

### iOS (App Store)

1. Build production IPA:
   ```bash
   eas build --platform ios --profile production
   ```
2. Upload to App Store Connect via EAS:
   ```bash
   eas submit --platform ios
   ```
3. Or download and upload via Transporter app
4. Complete App Store review process

---

## 🚨 Common Issues & Fixes

### Issue: "Project ID not found"
**Fix:** Run `eas init` in the app directory first.

### Issue: Build fails with API errors
**Fix:** Check `EXPO_PUBLIC_API_URL` is set correctly in EAS environment variables.

### Issue: Location permissions not working
**Fix:** Ensure `app.json` has correct location permissions (already configured).

### Issue: App crashes on launch
**Fix:** 
1. Check API URL is reachable
2. Verify all dependencies installed: `npm install`
3. Clear cache: `expo start --clear`

---

## 📋 Phase 2 Completion Checklist

### Mobile Apps Deployment

- [ ] Create Expo account
- [ ] Install EAS CLI
- [ ] Initialize Driver EAS project
- [ ] Initialize Parent EAS project
- [ ] Set `EXPO_PUBLIC_API_URL` environment variable
- [ ] Build Driver APK (preview)
- [ ] Build Parent APK (preview)
- [ ] Test apps on Android devices
- [ ] Build Driver IPA (if Apple Developer account available)
- [ ] Build Parent IPA (if Apple Developer account available)
- [ ] Submit to app stores (optional)

### Backend Verification

- [ ] API responding correctly
- [ ] WebSocket connections working
- [ ] GPS tracking functional
- [ ] Notifications working

---

## 🎯 Production URLs

| Service | URL |
|---------|-----|
| **API** | `https://saferouteapi-production.up.railway.app` |
| **Admin Panel** | `https://saferouteadmin-production.up.railway.app` |
| **Driver App API** | `https://saferouteapi-production.up.railway.app/api` |
| **Parent App API** | `https://saferouteapi-production.up.railway.app/api` |

---

## 🆘 Support

**Expo Documentation**: https://docs.expo.dev
**EAS Build Docs**: https://docs.expo.dev/build/introduction/
**Expo Forums**: https://forums.expo.dev

---

**Ready to build? Start with Step 1 above!**
