# 🐾 HyperSquad Cat Clicker

A real-time, multi-cat clicker game powered by Firebase Realtime Database.

---

## 📁 Project Structure

```
HyperSquadDoneRoi/
├── index.html               # App shell, semantic HTML — no hardcoded cats
├── style.css                # Full design system (dark glassmorphism + neon)
├── js/
│   ├── firebase-config.js   # Firebase init + FirebaseService class
│   ├── cat-component.js     # CatComponent — UI + events for ONE cat
│   ├── game-manager.js      # GameManager — orchestrates everything
│   └── app.js               # Entry point
├── assets/
│   ├── cats/                # Cat images (tabby_normal.png, tabby_pop.png, …)
│   └── sounds/              # Optional pop sounds (.mp3 / .ogg)
└── README.md
```

---

## 🔥 Firebase Setup

### Step 1 — Create Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** → name it (e.g. `hypersquad-game`)
3. Disable Google Analytics if not needed → **Create project**

### Step 2 — Add a Web App

1. In Project Overview → click **</>** (Web icon)
2. Register app with nickname `hypersquad-web`
3. Copy the `firebaseConfig` object shown

### Step 3 — Enable Realtime Database

1. Left sidebar → **Build → Realtime Database**
2. Click **"Create Database"**
3. Choose a region (e.g. `us-central1`)
4. Start in **Test mode** (you'll secure it in Step 5)

### Step 4 — Paste Config

Open `js/firebase-config.js` and replace the placeholder `FIREBASE_CONFIG` object:

```js
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",
  authDomain:        "your-app.firebaseapp.com",
  databaseURL:       "https://your-app-default-rtdb.firebaseio.com",
  projectId:         "your-app",
  storageBucket:     "your-app.appspot.com",
  messagingSenderId: "1234567890",
  appId:             "1:1234567890:web:abc123",
};
```

### Step 5 — Security Rules

In Firebase Console → **Realtime Database → Rules**, paste:

```json
{
  "rules": {
    "scores": {
      "$catId": {
        ".read": true,
        ".write": "newData.hasChildren(['total', 'lastUpdated'])",
        "total": {
          // Point must be non-negative, can only increase, and max delta is +35 per write
          ".validate": "newData.isNumber() && newData.val() >= 0 && (!data.exists() || (newData.val() >= data.val() && newData.val() - data.val() <= 35))"
        },
        "lastUpdated": {
          // Server timestamp rate limit: Must wait at least 1500ms between score writes for each cat
          ".validate": "newData.isNumber() && newData.val() == now && (!data.exists() || now - data.val() >= 1500)"
        },
        "$other": {
          ".write": false,
          ".read":  false
        }
      }
    },
    "$other": {
      ".read":  false,
      ".write": false
    }
  }
}
```

> **Note:** If you want to prevent score manipulation, add Firebase Authentication
> and change `".write": true` to `".write": "auth != null"`.

---

## 🖼️ Cat Images

Place the following image files in `assets/cats/`:

| File                   | Cat       | State  |
|------------------------|-----------|--------|
| `tabby_normal.png`     | Tabby Meo | Idle   |
| `tabby_pop.png`        | Tabby Meo | Clicked |
| `black_normal.png`     | Midnight  | Idle   |
| `black_pop.png`        | Midnight  | Clicked |
| `white_normal.png`     | Snowball  | Idle   |
| `white_pop.png`        | Snowball  | Clicked |
| `calico_normal.png`    | Calico    | Idle   |
| `calico_pop.png`       | Calico    | Clicked |
| `siamese_normal.png`   | Siam      | Idle   |
| `siamese_pop.png`      | Siam      | Clicked |
| `fold_normal.png`      | Foldie    | Idle   |
| `fold_pop.png`         | Foldie    | Clicked |
| `chubby_normal.png`    | Chubbster | Idle   |
| `chubby_pop.png`       | Chubbster | Clicked |

> If an image fails to load, the card automatically shows the cat's emoji as fallback.

Recommended image size: **256×256 px** PNG with transparent background.

---

## 🚀 Running Locally

Because the project uses ES Modules (`type="module"`), you **cannot** open `index.html` directly from the filesystem. You need a local server:

```bash
# Option A: Node.js (npx)
npx -y serve .

# Option B: Python
python -m http.server 8080

# Option C: VS Code
# Install the "Live Server" extension → right-click index.html → "Open with Live Server"
```

---

## ➕ Adding More Cats

Open `js/game-manager.js` and add an object to `CAT_CONFIG`:

```js
{
  id:           "cat_tuxedo",   // unique Firebase key
  name:         "Tuxedo",       // display name
  emoji:        "🐈",           // fallback emoji
  normalImage:  "./assets/cats/tuxedo_normal.png",
  popImage:     "./assets/cats/tuxedo_pop.png",
  soundUrl:     "",             // optional: "./assets/sounds/pop_tuxedo.mp3"
  color:        "#ffffff",      // card accent / glow color
  gradientFrom: "#1a1a1a",      // card gradient start
  gradientTo:   "#000000",      // card gradient end
}
```

That's it — the UI, Firebase writes, and leaderboard all update automatically. ✅

---

## ⚡ Batching Strategy

| What                  | How                                         |
|-----------------------|---------------------------------------------|
| Click captured        | `localDelta[catId]++` (pure JS, instant)    |
| Flush interval        | Every **2500ms** via `setInterval`           |
| Firebase write        | `runTransaction` per cat → atomic increment |
| Concurrent users      | Transactions prevent race conditions         |
| Page close            | `beforeunload` triggers a final flush        |

Maximum Firebase operations per minute: `(60 / 2.5) × 7 = ~168` ops/min, regardless of click rate.

---

## 🏗️ Architecture

```
app.js
  └─ GameManager
        ├─ CAT_CONFIG[]         ← data-driven, add cats here
        ├─ CatComponent × 7    ← handles UI + events per cat
        │     ├─ render()
        │     ├─ #handleClick() → emits to GameManager
        │     ├─ setGlobalScore() ← receives from GameManager
        │     └─ #spawnParticle()
        ├─ #pendingDeltas{}    ← local click accumulator
        ├─ #flush() ↔ 2500ms   ← batch write to Firebase
        └─ FirebaseService
              ├─ init()
              ├─ onScoreUpdate() ← realtime listener
              ├─ getScoresOnce()
              └─ batchUpdate()  ← runTransaction per cat
```
