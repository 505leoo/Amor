# Project Structure — Amor App

## Root Layout
```
Love/
├── App.js                  # Root component, auth state, screen router, global providers
├── index.js                # Entry point
├── firebaseConfig.js       # Firebase init (Auth, Firestore, Storage, Functions)
├── Menu.js                 # Main menu with tabs/sub-tabs and creation flow
├── Player.js / PlayerManos.js / PlayerRemera.js  # Avatar components
├── Poster1.js / Frases.js / FrasesExpandida.js   # Decorative/content components
├── Coleccion.js / StickerSystem.js / Intro.js    # Feature screens at root level
├── CurrencyManager.js      # Virtual currency logic
├── *Context.js             # All React Contexts (Theme, Season, Debug, Trofeos, Music, NewIndicator)
│
├── menus/                  # All full-screen feature screens
├── pantallas/              # Auth screens (Login, Register)
├── components/             # Reusable UI components
├── utils/                  # Services and utilities
├── assets/                 # Images, fonts, sounds
├── fonts/                  # Custom fonts (Delius, Mensa, Omori)
├── functions/              # Firebase Cloud Functions (Node.js)
├── android/ / ios/         # Native build configs
└── scripts/                # Build/update scripts
```

## menus/ — Feature Screens
| File | Purpose |
|------|---------|
| Inicio.js | Main room / home screen |
| Hud.js | Top-left HUD (DNI card widget → navigates to Perfil) |
| Hud2.js | Top-right HUD (settings, buzón, friends buttons) |
| Botones.js / BotonesDerecha.js | Left/right action button panels |
| Pistas.js | 7-clue gift hunt game |
| Mensajes.js | In-app messaging |
| Buzon.js | Message inbox |
| Amistades.js | Friend/partner connections |
| Perfil.js | User profile |
| Vestuario.js | Avatar outfit customization |
| Trofeos.js | Trophy/achievement screen |
| Tienda.js | In-app store |
| Temas.js | Theme selector |
| Stickers.js | Sticker collection |
| Eventos.js | Events display |
| Ecos.js | Shared echoes/quotes |
| SeasonInfo.js | Season details (debug) |

## components/ — Reusable UI
| File | Purpose |
|------|---------|
| Toast.js | Animated toast notification (success/error, with progress bar) |
| Loading.js | Fade in/out loading overlay |
| RoomBackground.js | Static room background image |
| Guirladas.js | Decorative garland overlay |
| DevModeDot.js | Debug mode indicator dot |
| NewIndicator.js | Red dot badge for new content |
| CartaExpandida.js | Full-screen letter/card viewer |
| MusicPlayer.js | Background music player UI |
| TabButtons.js / TabEditor.js | Tab UI components used in Menu |
| EventCreator.js | Event creation component |
| ThemeParticles.js | Animated particle effects per theme |
| TrophyIcon.js | Trophy icon component |
| StickerUploader.js | Sticker upload UI |
| BackgroundWrapper.js | Wraps screens with themed background |

## utils/ — Services
| File | Purpose |
|------|---------|
| firebase.js | Post CRUD, image upload/delete, user data helpers |
| FirebaseService.js | Generic Firestore wrapper with AsyncStorage cache fallback |
| NotificationSystem.js | Pushy push notification system with rate limiting |
| PushyService.js | Pushy SDK wrapper |
| pushNotificationService.js | Additional notification helpers |
| eventBus.js | Simple event emitter for cross-component communication |
| authPersistence.js | Auth persistence helpers |
| trofeosDef.js | Trophy definitions and unlock logic |

## Context Providers (loaded in App.js, wrapping all screens)
```
ThemeProvider → SeasonProvider → DebugProvider → NewIndicatorProvider
  → TrofeosProvider → MusicProvider
```
Each exposes a custom hook: useTheme, useSeason, useDebug, useNewIndicator, useTrofeos, useMusicContext.

## Navigation Pattern
App.js uses a manual `currentScreen` state string (not React Navigation). Navigation is a stable `useRef` object with a `navigate(screenName, params)` function passed as prop to all screens. Screens are conditionally rendered with `{currentScreen === 'x' && <Screen />}`. Inicio is always mounted but hidden via `display: 'none'` style for performance.

## Firestore Collections
- `usuarios/{uid}` — user profile, tokens, stats, pista progress, trofeos
- `posts/` — shared posts with likes/comments
- `stickers/` — sticker definitions
- `season/current` — active season config
- `notification_limits/{fromId}_{toId}_{type}` — push notification rate limiting
