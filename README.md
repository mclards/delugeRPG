# DelugeRPG Stealth Client & Hunter

[![Release](https://img.shields.io/badge/release-v1.4.2--stable-blue.svg)](https://github.com/mclards/delugeRPG/releases/tag/v1.4.2-stable)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-brightgreen.svg)](https://github.com/mclards/delugeRPG)
[![Engine](https://img.shields.io/badge/engine-Chromium%20142%20%7C%20Electron%2039-orange.svg)](https://github.com/mclards/delugeRPG)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

A hardened, standalone desktop gaming client and companion userscript for **DelugeRPG**. Designed for automated encounter scanning, intelligent target hunting, obstacle-aware map roaming, and humanized stealth behavior with anti-detection hardening.

---

## Table of Contents

- [Features](#features)
  - [1. Hardened Desktop Architecture](#1-hardened-desktop-architecture)
  - [2. Intelligent Target Hunting & Filtering](#2-intelligent-target-hunting--filtering)
  - [3. Humanized Stealth Roaming](#3-humanized-stealth-roaming)
  - [4. Seamless Form Typing & Input Handling](#4-seamless-form-typing--input-handling)
  - [5. Security Challenge & Captcha Guard](#5-security-challenge--captcha-guard)
- [Quick Start & Installation](#quick-start--installation)
  - [Option A: Standalone Executable (Recommended)](#option-a-standalone-executable-recommended)
  - [Option B: Run from Source (Development)](#option-b-run-from-source-development)
  - [Option C: Tampermonkey Userscript](#option-c-tampermonkey-userscript)
- [Controls & Shortcuts](#controls--shortcuts)
- [Configuration Reference](#configuration-reference)
- [Project Architecture](#project-architecture)
- [Verification & Test Suites](#verification--test-suites)
- [License](#license)

---

## Features

### 1. Hardened Desktop Architecture
- **Genuine Chrome Engine:** Full Chromium 142 User-Agent and Client Hints spoofing with native automation flags (`navigator.webdriver`) cleanly suppressed.
- **Network Privacy & SOCKS5:** Configurable proxy routing (SOCKS5/HTTP) with WebRTC leak prevention.
- **Session Isolation:** Runs inside a dedicated partition (`persist:delugerpg`) with a 1-click Clean Slate storage wipe.
- **In-DOM Dark Theme Modals:** All settings and confirmations use in-DOM modal dialogs, preventing Windows OS from detaching keyboard focus.

### 2. Intelligent Target Hunting & Filtering
- **6 Target Presets:**
  - `All Targets`: Captures Legendaries, Megas, and all checked variants.
  - `Legendaries Only`: Classic Legendaries, Ultra Beasts, and Paradox Pokemon.
  - `Megas & Rare`: Focuses on Mega Evolution lines and rare species.
  - `Variants Only`: Halts solely for active sprite variants.
  - `Legend + Megas`: Targets both Legendaries and Mega lines while ignoring standard variants.
  - `Custom`: Fully customizable whitelist and blacklist keywords.
- **10 Sprite Variants:** Filter by Normal, Shiny, Metallic, Ghostly, Dark, Shadow, Mirage, Chrome, Negative, and Retro. Unchecking Normal strictly skips normal species.
- **Common Pokemon Exclusion:** Species like Swablu, Rattata, and Chinchou are strictly ignored when species tiers are active, even if they appear with special variants.
- **Level Filters:** Filter encounters by minimum, maximum, or exact level with target-only or global scoping.

### 3. Humanized Stealth Roaming
- **4 Walking Patterns:**
  - `Wander`: Multi-directional natural exploration.
  - `Horizontal Line`: Left-to-right pacing with boundary reversal.
  - `Vertical Line`: Up-and-down pacing with boundary reversal.
  - `Square Patrol`: Closed rectangular survey loop.
- **Obstacle & Collision Evasion:** Detects wall obstacles and turns 90 degrees or reverses 180 degrees into open corridors.
- **Humanized Timing:** Jitter delays, micro-breaks, and idle pauses to mimic human playtime patterns.
- **Outside-Map Auto-Pause:** Automatically halts movement when navigating outside `/map` (PokeMart, PC, Profile, Battles).

### 4. Seamless Form Typing & Input Handling
- **Zero Input Interference:** Full physical keyboard input support inside PokeMart item quantity boxes, chat messages, and search fields.
- **No Focus Stealing:** Automatic suspension of movement and hotkeys whenever an input or textarea element is focused inside the game view.

### 5. Security Challenge & Captcha Guard
- **Captcha (/unlock) Detection:** Immediate emergency halt upon reaching DelugeRPG security challenges.
- **Audio Chime & Desktop Notification:** Alerts the player with a non-blocking audio chime and desktop notification so captchas can be solved manually with zero account risk.

---

## Quick Start & Installation

### Option A: Standalone Executable (Recommended)

Pre-built Windows binaries are available on the [Releases Page](https://github.com/mclards/delugeRPG/releases/tag/v1.0.0-stable):

1. **Setup Installer:** Download `DelugeRPG.Stealth.Client.Setup.1.0.0.exe` and run the installer.
2. **Portable Edition:** Download `DelugeRPG.Stealth.Client.1.0.0.exe` for a standalone single executable that requires no installation.

### Option B: Run from Source (Development)

**Prerequisites:** [Node.js](https://nodejs.org/) (v18 or higher) and npm.

```bash
# 1. Clone repository
git clone https://github.com/mclards/delugeRPG.git
cd delugeRPG/desktop-client

# 2. Install dependencies
npm install

# 3. Start development client
npm start
```

To build a fresh installer and portable `.exe`:
```bash
npm run dist
```
The compiled binaries will be output to `desktop-client/dist/`.

### Option C: Tampermonkey Userscript

If you prefer playing directly in Google Chrome or Microsoft Edge:
1. Install the [Tampermonkey extension](https://www.tampermonkey.net/).
2. Create a new userscript and paste the contents of [`pokefinder.user.js`](pokefinder.user.js).
3. Open `https://www.delugerpg.com/map` to begin.

---

## Controls & Shortcuts

| Action | Control / Shortcut | Description |
| :--- | :--- | :--- |
| **Play / Pause Hunting** | `Spacebar` or `F2` | Toggles automatic roaming on and off (disabled when typing). |
| **Zoom In** | `Ctrl` + `+` or `Ctrl` + `Wheel Up` | Increases game viewport zoom (up to 250%). |
| **Zoom Out** | `Ctrl` + `-` or `Ctrl` + `Wheel Down` | Decreases game viewport zoom (down to 50%). |
| **Reset Zoom** | `Ctrl` + `0` | Resets zoom to default (70%). |
| **Target Filter Modal** | Toolbar `Targets` Button | Opens species presets, variant toggles, and level filters. |
| **Sound Toggle** | Toolbar Speaker Icon | Toggles audio chimes on target find and captcha alerts. |
| **Quick Nav Menu** | Toolbar `DelugeRPG` Dropdown | Direct shortcuts to Maps, PokeMart, PC Boxes, Gyms, and Live Battles. |
| **Clean Slate** | Toolbar `Clean Slate` Button | Wipes all session cookies and cache to reset account identity. |
| **Proxy Settings** | Toolbar `Network` Button | Configures SOCKS5 or HTTP proxy with live IP detection. |

---

## Configuration Reference

Settings are persisted in `desktop-client/config.json`:

```json
{
  "network": {
    "useProxy": false,
    "proxyRules": "",
    "proxyBypass": "<local>"
  },
  "dummyAccount": {
    "username": "",
    "password": "",
    "autoLogin": false
  },
  "settings": {
    "autoCatch": false,
    "findLegendaries": true,
    "legendaryClassic": true,
    "legendaryUltraBeasts": true,
    "legendaryParadox": true,
    "findMegasAndGigantamax": false,
    "findAnySpecialVariant": true,
    "selectedVariants": [
      "Shiny", "Chrome", "Retro", "Metallic", "Shadow", "Ghostly", "Dark", "Mirage", "Negative"
    ],
    "customTargetList": "",
    "blacklistList": "",
    "enableLevelFilter": false,
    "levelFilterMode": "min",
    "levelFilterValue": 12,
    "levelFilterScope": "targets",
    "profile": "flagged_network_stealth",
    "walkMode": "wander",
    "targetPreset": "legendaries",
    "stepsPerDirection": 5,
    "baseDelay": 2100,
    "jitter": 550,
    "minSafetyFloor": 1700,
    "enableMicroBreaks": true,
    "enableIdlePauses": true,
    "soundAlert": true,
    "autoPauseOnTarget": true,
    "enableVariantFilter": true,
    "zoomFactor": 0.7
  }
}
```

---

## Project Architecture

```text
delugeRPG/
|-- desktop-client/          # Standalone Electron Stealth Client
|   |-- assets/              # Icons and client artwork
|   |-- app.html             # Host client UI layout, toolbar, and dark modals
|   |-- app.js               # Host controller, roaming cadence, and zoom dispatch
|   |-- game-preload.js      # Guest webview injection: target scanner and input guards
|   |-- main.js              # Electron main process, anti-detection flags, session hardening
|   |-- targets.js           # Target lists: Legendaries, Megas, Paradox, and Forms
|   |-- config.json          # Persistent configuration file
|   |-- package.json         # Electron and build scripts
|   |-- test_client.js       # Client core test suite
|   \-- test_duplicate_and_catch.js # Duplication avoidance & hardening suite
|-- docs/                    # Security audits, release notes & reference assets
|   |-- AUDIT_REPORT.md      # Comprehensive anti-cheat audit report
|   |-- AUDIT_VERIFICATION.md# Verification report
|   |-- RELEASE_NOTES.md     # Release history and changelog
|   |-- reference-targets/   # Target reference images
|   \-- screenshots/         # Captured encounter screenshots
|-- tests/                   # 27 automated unit and integration test suites
|   |-- test_settings_and_legendary_safety.js
|   |-- test_zoom_integration.js
|   \-- ...
|-- pokefinder.user.js       # Standalone Tampermonkey userscript edition
|-- launch.bat               # Windows quick-launch launcher
\-- launch_desktop_client.bat# Direct Electron client launcher
```

---

## Verification & Test Suites

The repository contains comprehensive automated test suites verifying navigation cadence, obstacle evasion, target priority, settings persistence, and 7-bit ASCII compliance:

```bash
# Run desktop client tests
node desktop-client/test_duplicate_and_catch.js
node desktop-client/test_client.js

# Run userscript and movement tests
node tests/test_settings_and_legendary_safety.js
node tests/test_zoom_integration.js
```

---

## License

This project is licensed under the [MIT License](LICENSE).
DelugeRPG is the property of its respective owners. This tool is intended for personal automation and development testing.
