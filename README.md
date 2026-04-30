<img title="logo" src="icon.png" alt="" align="left" width="100" height="100" style="margin-right: 15px;" data-align="center">

---

# Xenia Dashboard

An advanced, feature-rich frontend for the **Xenia Xbox 360 Emulator**, designed to provide a nostalgic, console-grade experience on modern PCs. This dashboard bridges the gap between raw emulation and a polished media library.

---
<p align="center">
  <a href ="https://github.com/ALHROOBIX/Xenia-Dashboard/releases/latest"> <img src= "https://img.shields.io/github/downloads/ALHROOBIX/Xenia-Dashboard/total?style=social&label=Total%20Downloads&logo=github" height="40"></a>
  <a href ="https://github.com/ALHROOBIX/Xenia-Dashboard/releases/latest"> <img src="https://img.shields.io/github/v/release/ALHROOBIX/Xenia-Dashboard?style=social&label=Latest%20Release&logo=github" height="40"></a>
  </p>

<div align="center">

[![Support me on Ko-fi](https://img.shields.io/badge/Support%20me%20on%20Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/alhroobixi)

</div>


  
---
<dev align="center">
<h3>Dashboard</h3>
<img src="Screenshot/dashboard.png">
<h3>Achievement</h3>
<img src="Screenshot/achievement.png">
<h3>Game List</h3>
<img src="Screenshot/game-list.png">

</dev>

---

# Special Thanks

## 🌟 The Emulation Pioneers

This project stands on the shoulders of giants. Special thanks to these incredible communities:

<div align="center">

| Project | Description | Link |
|---------|-------------|------|
| **Xenia Project** | Mainline Xbox 360 Emulator Research | [🔗](https://github.com/xenia-project/xenia) |
| **Xenia Canary** | Experimental fork with advanced features | [🔗](https://github.com/xenia-canary/xenia-canary) |
| **Game Patches** | Community repository for game fixes | [🔗](https://github.com/xenia-canary/game-patches) |
| **x360db** | Essential metadata provider | [🔗](https://github.com/xenia-manager/x360db) |
| **SteamGridDB** | High-quality game covers API | [🔗](https://www.steamgriddb.com/) |
| **Electron** | Core framework for GUI | [🔗](https://www.electronjs.org/) |
| **Alpine.js** | Minimal JavaScript framework | [🔗](https://github.com/alpinejs/alpine) |

</div>

## 🛠️ Core Libraries & Tools

<div align="center">

| Library/Tool | Purpose | Link |
|--------------|---------|------|
| **SDL** | Controller input and hardware abstraction | [🔗](https://www.libsdl.org/) |
| **abgx360** | Binary scanning & Title ID verification | [🔗](https://github.com/BakasuraRCE/abgx360) |
| **TOMKit** | TOML configuration management | [🔗](https://github.com/python-poetry/tomlkit) |

</div>

> **📝 Note:** The **abgx360** tool is an external, independent utility and is not affiliated with this project. It is used solely as a third-party scanning engine to improve the accuracy of game identification.

---

<div align="center">
  <h2>⚠️ Disclaimer</h2>
  <p><strong>This project is a third-party frontend and is not affiliated with the official Xenia Project or Microsoft.</strong></p>
</div>
---

## 🚀 Installation & Setup The themes | التثبيت وأعداد الثيم

| How to Install | طريقة التثبيت |
| :--- | ---: |
| 1. Download the theme file from the Releases tab.<br>2. Extract the `NEX-metro` folder into the `systems` folder located inside your main **Xenia Dashboard** directory.<br>3. Launch the Xenia Dashboard program.<br>4. Go to **Settings > Themes**.<br>5. You will see the new theme there; select it to apply! | <div dir="rtl">1. قم بتحميل ملف الثيم.<br>2. استخرج المجلد `NEX-metro` بداخل مجلد `systems` الموجود في مسار برنامج **Xenia Dashboard** الأساسي.<br>3. قم بتشغيل برنامج Xenia Dashboard.<br>4. اذهب إلى **الإعدادات (Settings) > الثيمات (Themes)**.<br>5. سوف يظهر الثيم الجديد هناك، قم باختياره لتفعيله فوراً!</div> |
<br/>
<div align="center">

| Download Link |
|---------------|
| 🔗 [Download Theme](https://github.com/0xErrorVoid/Xenia-Dashboard-Metro-ui-Theme/releases/tag/v.1) |

</div>
<blockquote>
  💡 <b>Note:</b> Players can now design their own custom themes! You have full freedom to customize the Xenia Dashboard interface to your liking and share your creations with the community.<br><br>
  ⚠️ <b>Important Warning:</b> For your safety, only download and use themes from trusted creators and sources.
</blockquote>
<div dir="rtl" align="right">
  <blockquote>
    💡 <b>ملاحظة:</b> أصبح الآن بإمكان اللاعبين تصميم ثيماتهم (Themes) الخاصة بحرية تامة! يمكنك تخصيص واجهة Xenia Dashboard بالكامل لتناسب ذوقك، ومشاركة إبداعاتك مع مجتمع اللاعبين.<br><br>
    ⚠️ <b>تنبيه هام:</b> لضمان أمانك، لا تقم بتحميل أو استخدام أي ثيمات إلا من أشخاص ومصادر موثوقة.
  </blockquote>
</div>
---

## ✨ Key Features

### 🗂️ **Intelligent Library Management**
- **Automated Game Scanning:** Detects `.iso`, `.xex`, `.zar`, `GOD`, and `XBLA` files
- **abgx360 Integration:** Low-level analysis for accurate Title ID identification
- **Dual-Source Metadata:** Fetches artwork from SteamGridDB API or local database
- **Compatibility Reports:** Real-time status from official Xenia compatibility tracker

### ⚡ **Advanced Emulator Optimization**
- **Dynamic Patch Manager:** Download, install, and toggle game-specific patches
- **Per-Game Configuration:** Unique `.toml` files for individual Title IDs
- **One-Click Updates:** Automatic Xenia Canary updates for Windows and Linux
- **Deep Personalization:** 13 color zones, custom wallpapers, and theme customization
- **Immersive Audio:** UI sound effects, navigation sounds, and background music
- **Virtual Keyboard:** Xbox 360-style keyboard for search functionality

---

## 📥 Download abgx360

<p align="center">
  <strong>Essential for accurate game identification</strong>
</p>

<div align="center">

| Platform | Download Link | Release Name |
|----------|---------------|--------------|
| **Windows** | [Download](https://www.hadzz.com/abgx/download.php) | `CLI - abgx360_v1.0.7_cli.zip` |
| **Linux** | [Download](https://www.hadzz.com/abgx/download.php) | `CLI - abgx360-1.0.7.tar.gz` |

</div>

### 🐧 Linux Installation Instructions

```bash
# Step 1: Install dependencies
sudo apt-get install libcurl4-openssl-dev zlib1g-dev

# Step 2: Compile and install
./configure
make
sudo make install
```

---

## 🎮 Controls & Navigation

<div align="center">

| Input | Action |
|-------|---------|
| **D-Pad / Sticks** | Navigate Menus & Keyboard |
| **(A) / Enter** | Select / Launch Game |
| **R3** | Search filter games |
| **(B) / Backspace** | Go Back / Close Panel |
| **(X)** | Save Config / Manage Patches | 💾 |
| **(Y)** | Delete / Reset / Update / Change Avatar |
| **(LB) / (L)** | Open Per-Game Configuration |
| **(RB) / (R)** | Toggle Game Info | ℹ️ |
| **Tab / (Start+LB)** | Open Xenia Guide Overlay |
| **LT** | Translate description to Arabic |
| **L3 or Z** | Scan `.zar` games for Title ID |

</div>

---

## 🚀 Getting Started

### 1. **Installation & Environment**
- **Windows:** Download `Xenia Dashboard.exe`
- **Linux:** Download `Xenia Dashboard.AppImage`
- **Location:** Place in a dedicated folder with write permissions (avoid *Program Files*)

### 2. **Core Configuration**
1. Launch the application
2. Navigate to **Core Settings**
3. Set **Xenia Path** to your `xenia_canary.exe` (use built-in download if needed)
4. Set **Game Folder** to your game directory
5. Choose **Metadata Source** (SteamGridDB or Local Database)

### 3. **Initial Library Scan**
- Automatic scan begins when paths are set
- For unrecognized games: Press **(Back)** on game tile for deep binary scan

### 4. **Customizing Your Experience**
- Modify colors in **Interface Colors** menu
- Enable/configure audio in **Sound Settings**

---

## 📥 Download Xenia Dashboard

<div align="center">

| Platform | Download |
|----------|----------|
| **Windows** | [![Download Windows](https://img.shields.io/badge/Download-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/ALHROOBIX/Xenia-Dashboard/releases/latest) |
| **Linux** | [![Download Linux](https://img.shields.io/badge/Download-Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://github.com/ALHROOBIX/Xenia-Dashboard/releases/latest) |

</div>

---

## 🛠️ Technical Overview

- **Architecture:** Electron-based for cross-platform compatibility
- **Frontend:** Alpine.js for responsive, lightweight UI
- **Storage:** electron-store for persistent configurations
- **Input:** SDL library for precise gamepad navigation

---

## 💖 Support My Work

<div align="center">

<p>If you enjoy using Xenia Dashboard, consider supporting development!</p>

[![Support me on Ko-fi](https://img.shields.io/badge/Support%20me%20on%20Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/alhroobixi)

</div>

---
