# RK Educare - Family Accounting (পারিবারিক আর্থিক হিসাব অ্যাপ)

A production-ready, double-entry family financial accounting and multi-currency expense management system built with React, TypeScript, Tailwind CSS, Dexie (IndexedDB), and Capacitor for Android native builds.

---

## 🌟 Key Features

- **Double-Entry Financial Engine**: Strict accounting equation enforcement ($Assets = Liabilities + Family\ Fund\ \&\ Equity$).
- **Multi-Calendar Display**: Live display of English Date, Bangla Gregorian Date, and Bangla Hijri Islamic Date.
- **Dynamic Percentage Allocations**: Custom percentage rule splits (e.g., 60/40, 50/30/20) with historical effective-date precedence.
- **Bilingual Interface**: Full support for Bengali (**বাংলা**) and English with seamless language switching.
- **100% Offline-First**: Complete client-side database storage via Dexie IndexedDB with optional Firebase multi-device sync.
- **Android Native Support**: Native Android build configurations powered by Capacitor.
- **Animated Farewell Scene**: Custom educational and family-oriented farewell animation upon logout.

---

## 🚀 Quick Start (Web Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build & Test
```bash
# Run accounting audit test suite
npm test

# Build production web bundle
npm run build
```

---

## 📱 Android Build & Installation

### Option 1: Native Capacitor Sync
```bash
# Sync web assets to Android native wrapper
npm run cap:build
```

### Option 2: Build APK with Android Studio / Gradle
```bash
cd android

# Build Debug APK
./gradlew assembleDebug
# Output APK: android/app/build/outputs/apk/debug/app-debug.apk

# Build Release Android App Bundle (AAB for Play Store)
./gradlew bundleRelease
# Output AAB: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📦 How to Upload / Push to GitHub

### Method A: One-Click Export from AI Studio (Recommended)
1. In Google AI Studio, open the **Settings / Menu** in the top-right corner.
2. Select **Export to GitHub** or **Download ZIP**.
3. Authorize your GitHub account to publish directly to a new repository.

### Method B: Manual Git Command Line Push
```bash
# 1. Initialize local repository
git init
git add .
git commit -m "Initial production release v2.0.0"

# 2. Add your GitHub repository URL
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY_NAME>.git

# 3. Rename default branch to main and push
git branch -M main
git push -u origin main
```

---

## 📄 License & Attribution
Designed & Developed for **RK Educare**. All rights reserved.
