# Project Structure

## Directory Layout

```
Love/
├── App.js                  # Root component — auth, navigation state machine, providers
├── index.js                # Expo entry point
├── firebaseConfig.js       # Firebase app/auth/db exports
├── Menu.js                 # Secondary menu screen
├── Intro.js                # Splash/intro animation screen
├── Coleccion.js            # Collectibles screen
├── Frases.js               # Phrases list screen
├── FrasesExpandida.js      # Expanded phrase view
├── Player.js               # Avatar body component
├── PlayerManos.js          # Avatar hands component
├── PlayerRemera.js         # Avatar shirt component
├── Poster1.js              # Poster display component
├── StickerSystem.js        # Sticker rendering system
├── CurrencyManager.js      # Virtual currency logic
├── MusicContext.js         # Global music player context
├── TrofeosContext.js       # Trophies/XP global context
├── NewIndicatorContext.js  # New-content badge context
│
├── menus/                  # Full-screen menu/feature screens
│   ├── Inicio.js           # Main home screen
│   ├── Pistas.js           # Clues game
│   ├── Ecos.js             # Echoes/memories
│   ├── Buzon.js            # Mailbox/letters
│   ├── Mensajes.js         # Messages
│   ├── Tienda.js           # Shop
│   ├── Trofeos.js          # Trophies
│   ├── Stickers.js         # Sticker gallery
│   ├── Vestuario.js        # Avatar wardrobe
│   ├── Perfil.js           # User profile
│   ├── Amistades.js        # Friendships
│   ├── Eventos.js          # Events
│   ├── Hud.js / Hud2.js    # HUD overlays
│   ├── Botones.js          # Button sets
│   └── BotonesDerecha.js   # Right-side buttons
│
├── Temporadas/             # Seasonal story content
│   ├── Temporadas.js       # Season selector screen
│   └── Temporada1/
│       ├── temporada1.js   # Season 1 main screen
│       ├── Eventos/        # Season 1 events
│       └── Tienda/         # Season 1 shop
│
├── pantallas/              # Auth screens
│   ├── Login.js
│   └── Register.js
│
├── components/             # Reusable UI components
│   ├── TabButtons.js       # Navigation tab bar
│   ├── TabEditor.js        # Editable tab bar
│   ├── CartaExpandida.js   # Expanded letter/card
│   ├── EventCreator.js     # Event creation UI
│   ├── Guirladas.js        # Decorative garland component
│   ├── Loading.js          # Fade transition overlay
│   ├── MusicPlayer.js      # Music player UI
│   ├── NewIndicator.js     # New-content badge dot
│   ├── RoomBackground.js   # Animated room background
│   ├── StickerUploader.js  # Sticker upload UI
│   ├── Toast.js            # Toast notification component
│   └── TrophyIcon.js       # Trophy icon display
│
├── utils/                  # Services and utilities
│   ├── firebase.js         # Firebase helper functions
│   ├── FirebaseService.js  # Higher-level Firebase service
│   ├── NotificationSystem.js # Push notification logic
│   ├── pushNotificationService.js # Expo push service
│   ├── PushyService.js     # Pushy SDK integration
│   ├── authPersistence.js  # Auth state persistence
│   ├── eventBus.js         # Simple event emitter
│   └── trofeosDef.js       # Trophy definitions/data
│
├── scripts/
│   └── actualizar.js       # OTA update / version bump script
│
├── functions/              # Firebase Cloud Functions
│   └── index.js
│
├── assets/                 # Static assets
│   ├── paredes/            # Background wall images
│   ├── menu/               # Menu images
│   ├── player/             # Avatar part images
│   ├── temporadas/         # Season book/logo images
│   ├── sounds/             # Audio files
│   ├── posters/            # Poster images
│   └── frases/             # Phrase images
│
└── fonts/                  # Custom fonts
    ├── Omori.ttf
    ├── Delius.ttf
    └── Mensa.ttf
```

## Architectural Patterns

### Navigation
- **Custom state-machine navigation** — no React Navigation library. `App.js` holds `currentScreen` state and renders screens conditionally with `{currentScreen === 'x' && <Screen />}`.
- `Inicio` is always mounted (hidden via `display: none`) to preserve state.
- Animated transitions use a `Loading` overlay (fade in/out) for specific route pairs defined in `ANIMATED_TRANSITIONS`.
- Navigation object `{ navigate }` is passed as a prop to every screen.

### State Management
- **React Context** for global state: `MusicContext`, `TrofeosContext`, `NewIndicatorContext`.
- Local `useState`/`useRef` for screen-level state.
- No Redux or Zustand.

### Data Layer
- **Firebase Firestore** for all persistent data (users, messages, stickers, events, trophies).
- **Firebase Auth** for authentication.
- `firebaseConfig.js` exports `auth` and `db` used directly in screens and utils.

### Component Relationships
- `App.js` → wraps everything in `NewIndicatorProvider > TrofeosProvider > MusicProvider`
- Screens receive `navigation` prop and call `navigation.navigate('screenName', params)`
- `TabButtons` is a shared nav component used across most screens
