/**
 * js/env.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Đọc Firebase config từ Vite Environment Variables (import.meta.env).
 *
 * Local dev  → values đến từ .env.local (gitignored)
 * Vercel     → values đến từ Project Settings → Environment Variables
 *
 * ❌ KHÔNG hardcode key ở đây — file này ĐƯỢC commit lên git.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Kiểm tra biến bắt buộc, cảnh báo ngay khi thiếu
const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_DATABASE_URL",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
];

const missing = required.filter((key) => !import.meta.env[key]);
if (missing.length > 0) {
  console.error(
    `[env.js] ❌ Missing environment variables:\n  ${missing.join("\n  ")}\n` +
    `Local: add them to .env.local\nVercel: add them in Project Settings → Environment Variables`
  );
}

export const FIREBASE_CONFIG = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
