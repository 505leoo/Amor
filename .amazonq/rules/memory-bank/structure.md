# Project Structure

## Directory Layout
```
Love/
├── App.js                  # Root: auth, Firestore readiness, screen routing, context providers
├── index.js                # Entry point
├── Menu.js                 # Settings/navigation overlay (tabs + sub-tabs)
├── Intro.js                # Splash/intro animation screen
├── Coleccion.js            # Photo memory collection
├── Player.js               # Media player screen
├── StickerSystem.js        # Sticker logic
├── CurrencyManager.js      # Virtual currency (dinero) logic
├── firebaseConfig.js       # Firebase app init (auth + db exports)
│
├── menus/                  # Full-screen feature screens
│   ├── Inicio.js           # Main home screen (room UI)
│   ├── Pistas.js           # 7-clue gift hunt game
│   ├── Ecos.js             # Emotional journal
│   ├── Buzon.js            # Private inbox
│   ├── Tienda.js           # Shop
│   ├── Trofeos.js          # Trophies
│   ├── Stickers.js         # Sticker browser
│   ├── Temas.js            # Theme selector
│   ├── Perfil.js           # User profile
│   ├── SeasonInfo.js       # Seasonal content
│   ├── Mensajes.js         # Editable message widget
│   ├── Hud.js / Hud2.js    # HUD overlays on home screen
│   ├── Botones.js / BotonesDerecha.js  # Navigation button bars
│   ├── Amistades.js        # Friends/connections module
│   └── Eventos.js          # Events module
│
├── components/             # Reusable UI components
│   ├── ThemeParticles.js   # Animated particle backgrounds (5 themes)
│   ├── BackgroundWrapper.js
│   ├── MusicPlayer.js
│   ├── TabButtons.js / TabEditor.js
│   ├── EventCreator.js
│   ├── StickerUploader.js
│   ├── NewIndicator.js
│   └── TrophyIcon.js
│
├── utils/                  # Services and utilities
│   ├── firebase.js         # Firestore/Storage CRUD (posts, images)
│   ├── FirebaseService.js  # Additional Firebase helpers
│   ├── NotificationSystem.js  # Push notification class (Pushy + throttling)
│   ├── PushyService.js     # Pushy SDK wrapper
│   ├── pushNotificationService.js
│   ├── authPersistence.js  # Auth state helpers
│   ├── dniUsuario.js       # Unique user ID assignment
│   ├── eventBus.js         # Simple event emitter
│   └── trofeosDef.js       # Trophy definitions
│
├── pantallas/              # Auth screens
│   ├── Login.js
│   └── Register.js
│
├── assets/                 # Static assets
│   ├── menu/               # UI images (backgrounds, icons)
│   ├── sounds/             # Audio files
│   └── *.png               # App icons, splash
│
├── fonts/                  # Custom fonts
│   ├── Omori.ttf           # Primary display font
│   └── Mensa.ttf
│
├── functions/              # Firebase Cloud Functions (Node.js)
│   └── index.js
│
└── android/ ios/           # Native platform projects
```

## Core Architecture

### Screen Navigation
App.js manages a custom `currentScreen` state string instead of React Navigation. Screens are conditionally rendered with `{currentScreen === 'x' && <Screen />}`. Navigation is passed as `navigation={{ navigate: navigateToScreen }}`.

### Context Providers (App.js wraps all screens)
- `ThemeProvider` — active visual theme
- `SeasonProvider` — seasonal content
- `DebugProvider` — developer debug mode
- `NewIndicatorProvider` — new content badges
- `TrofeosProvider` — trophy state
- `MusicProvider` — background music

### Data Layer
- Firebase Auth for authentication
- Firestore `usuarios/{uid}` as the primary user document
- Firestore `posts`, `stickers`, `notification_limits` collections
- Firebase Storage for images (`posts/`, sticker URLs)
- Pushy for push notifications (token stored as `pushyToken` / `MyPushyToken` in user doc)

### Partner Linking
Users are linked via `usuarios/{uid}.pareja = partnerUid`. All partner-targeted features (notifications, shared content) use this field.
