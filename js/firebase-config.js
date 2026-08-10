/**
 * firebase-config.js
 * ─────────────────────────────────────────────────────────────────────────────
 * FirebaseService – Handles ALL Firebase interactions.
 *
 * Design decisions:
 *  • Uses Firebase Realtime Database (REST + SDK) for low-latency counters.
 *  • `batchUpdate(deltas)` uses `runTransaction` per node so concurrent users
 *    never overwrite each other (optimistic concurrency, server-side merge).
 *  • Exposes an `onScoreUpdate(callback)` subscription so any module can
 *    react to remote changes without tight coupling.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── 🔐 Config được load từ js/env.js (file bị .gitignore) ──────────────────
//  Xem js/env.example.js để biết cấu trúc.
//  Chưa có file? Chạy: copy js\env.example.js js\env.js  (Windows)
//                       cp  js/env.example.js  js/env.js  (Mac/Linux)
// ─────────────────────────────────────────────────────────────────────────────
import { FIREBASE_CONFIG } from "./env.js";

import { initializeApp }           from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  runTransaction,
  update,
  get,
}                                  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ─────────────────────────────────────────────────────────────────────────────
class FirebaseService {
  /** @type {ReturnType<typeof getDatabase>} */
  #db = null;
  /** @type {Function[]} — score-update subscribers */
  #subscribers = [];
  /** @type {import('firebase/database').Unsubscribe | null} */
  #unsubscribeListener = null;

  // ── Initialise ────────────────────────────────────────────────────────────
  init() {
    const app = initializeApp(FIREBASE_CONFIG);
    this.#db  = getDatabase(app);
    console.info("[FirebaseService] Connected to Realtime Database.");
    return this;
  }

  // ── Subscribe to live score changes ───────────────────────────────────────
  /**
   * Subscribe to real-time score updates.
   * @param {function(Record<string, number>): void} callback
   *   Called with { catId: totalScore, … } on every remote update.
   */
  onScoreUpdate(callback) {
    if (typeof callback !== "function") throw new TypeError("callback must be a function");
    this.#subscribers.push(callback);

    // Attach (or reuse) the single onValue listener
    if (!this.#unsubscribeListener) {
      const scoresRef = ref(this.#db, "scores");
      this.#unsubscribeListener = onValue(scoresRef, (snapshot) => {
        const data = snapshot.val() ?? {};
        // Flatten: { cat_tabby: { total: 123 } } → { cat_tabby: 123 }
        const flat = Object.fromEntries(
          Object.entries(data).map(([id, val]) => [id, val?.total ?? 0])
        );
        this.#subscribers.forEach((fn) => fn(flat));
      });
    }
  }

  // ── Fetch once (for initial load before real-time kicks in) ───────────────
  async getScoresOnce() {
    const scoresRef = ref(this.#db, "scores");
    const snapshot  = await get(scoresRef);
    const data      = snapshot.val() ?? {};
    return Object.fromEntries(
      Object.entries(data).map(([id, val]) => [id, val?.total ?? 0])
    );
  }

  // ── Batch-update scores ───────────────────────────────────────────────────
  /**
   * Atomically increment each cat's score by its pending delta.
   * Uses `runTransaction` per node → safe for concurrent users.
   *
   * @param {Record<string, number>} deltas  — { catId: clicksToAdd, … }
   */
  async batchUpdate(deltas) {
    const entries = Object.entries(deltas).filter(([, v]) => v > 0);
    if (entries.length === 0) return;

    const promises = entries.map(([catId, delta]) => {
      const catRef = ref(this.#db, `scores/${catId}/total`);
      return runTransaction(catRef, (currentValue) => {
        return (currentValue ?? 0) + delta;
      });
    });

    try {
      await Promise.all(promises);
    } catch (err) {
      console.error("[FirebaseService] batchUpdate failed:", err);
      // Re-throw so GameManager can handle retry logic if desired
      throw err;
    }
  }

  // ── Teardown ──────────────────────────────────────────────────────────────
  destroy() {
    if (this.#unsubscribeListener) {
      this.#unsubscribeListener();
      this.#unsubscribeListener = null;
    }
    this.#subscribers = [];
  }
}

// Singleton export
export const firebaseService = new FirebaseService();
