## DelugeRPG Stealth Client v1.0.0 (Stable Release)

Standalone, hardened desktop gaming client for DelugeRPG featuring intelligent encounter detection, zero-loss input routing, configurable target filtering, and stealth roaming.

### Key Highlights & Features:

#### 1. Hardened Desktop Architecture
- **Genuine Chrome Engine:** Chromium 142 User-Agent and client-hints spoofing with automation features cleanly suppressed.
- **Network Privacy:** SOCKS5 and HTTP proxy support with WebRTC leak prevention.
- **Session Isolation:** Persistent partition (`persist:delugerpg`) with one-click clean-slate data wiping.

#### 2. Smooth Input & Form Interactivity
- **Guest Input Routing:** Full keyboard typing support inside PokeMart quantity boxes, chat, and form fields with zero focus drops or focus stealing.
- **In-DOM Modal Flow:** Replaced all native Windows dialogs (`alert()`, `confirm()`) with sleek in-DOM dark theme modals to preserve OS keyboard routing.

#### 3. Intelligent Target Hunting & Filtering
- **6 Target Presets:** All Targets, Legendaries Only, Megas Only, Variants Only, Legendaries + Megas, and Custom.
- **Species & Sprite Variant Filters:** Filter by 10 distinct sprite variants (Normal, Shiny, Metallic, Ghostly, Dark, Shadow, Mirage, Chrome, Negative, Retro). Normal variants can be toggled on or off with strict enforcement.
- **Common Pokemon Exclusion:** Common wild Pokemon (Swablu, Rattata, etc.) are strictly skipped when legendary/mega hunting, even if they have special variants.
- **Level Filters:** Filter encounters by minimum, maximum, or exact level with target-only or global scoping.

#### 4. Stealth Roaming & Safety
- **Anti-Stuck & Cadence Roaming:** Intelligent obstacle evasion with customizable roaming patterns (Wander, Horizontal Line, Vertical Line, Square Patrol).
- **Security Challenge Guard:** Immediate halting and chime/desktop alert upon reaching `/unlock` or captcha security challenges for manual completion.
- **Smart Pokeball Selection:** Context-aware Pokeball auto-selection with safety fallbacks.

### Installation & Downloads
- **Setup Installer (Recommended):** Download `DelugeRPG.Stealth.Client.Setup.1.0.0.exe`
- **Portable Edition:** Download `DelugeRPG.Stealth.Client.1.0.0.exe`

