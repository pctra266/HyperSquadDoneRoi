/**
 * game-manager.js
 * ─────────────────────────────────────────────────────────────────────────────
 * GameManager – Orchestrates the entire game.
 *
 * Responsibilities:
 *  • Define the CAT_CONFIG data array (add more cats here — zero HTML changes!)
 *  • Instantiate CatComponent for each cat and inject into DOM
 *  • Maintain a local delta queue for batching Firebase writes
 *  • Run the 2.5s flush interval → call FirebaseService.batchUpdate()
 *  • Receive real-time score updates from Firebase and push to each CatComponent
 *  • Maintain a mini leaderboard in the sidebar
 *  • Track total session clicks and global total score
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CatComponent }   from "./cat-component.js";
import { firebaseService } from "./firebase-config.js";

// ─────────────────────────────────────────────────────────────────────────────
// 🐱 CAT CONFIGURATION ARRAY — The single source of truth.
//    To add more cats: just push another object to this array.
//    The UI renders dynamically from this data.
// ─────────────────────────────────────────────────────────────────────────────
export const CAT_CONFIG = [
  {
    id:           "cat_tabby",
    name:         "Tabby Meo",
    emoji:        "🐱",
    normalImage:  "/cats/tabby_normal.png",
    popImage:     "/cats/tabby_pop.png",
    soundUrl:     "",
    color:        "#FF8C42",
    gradientFrom: "#2d1b0e",
    gradientTo:   "#1a0f05",
  },
  {
    id:           "cat_black",
    name:         "Midnight",
    emoji:        "🐈‍⬛",
    normalImage:  "/cats/black_normal.png",
    popImage:     "/cats/black_pop.png",
    soundUrl:     "",
    color:        "#9B5DE5",
    gradientFrom: "#1a0d2e",
    gradientTo:   "#0d0618",
  },
  {
    id:           "cat_white",
    name:         "Snowball",
    emoji:        "😸",
    normalImage:  "/cats/white_normal.png",
    popImage:     "/cats/white_pop.png",
    soundUrl:     "",
    color:        "#00D4FF",
    gradientFrom: "#0a1929",
    gradientTo:   "#030d14",
  },
  {
    id:           "cat_calico",
    name:         "Calico",
    emoji:        "🐾",
    normalImage:  "/cats/calico_normal.png",
    popImage:     "/cats/calico_pop.png",
    soundUrl:     "",
    color:        "#F72585",
    gradientFrom: "#2e0a1f",
    gradientTo:   "#1a050f",
  },
  {
    id:           "cat_siamese",
    name:         "Siam",
    emoji:        "😺",
    normalImage:  "/cats/siamese_normal.png",
    popImage:     "/cats/siamese_pop.png",
    soundUrl:     "",
    color:        "#4CC9F0",
    gradientFrom: "#061e2e",
    gradientTo:   "#020e17",
  },
  {
    id:           "cat_fold",
    name:         "Foldie",
    emoji:        "😻",
    normalImage:  "/cats/fold_normal.png",
    popImage:     "/cats/fold_pop.png",
    soundUrl:     "",
    color:        "#3BF4FB",
    gradientFrom: "#062024",
    gradientTo:   "#021013",
  },
  {
    id:           "cat_chubby",
    name:         "Chubbster",
    emoji:        "🐈",
    normalImage:  "/cats/chubby_normal.png",
    popImage:     "/cats/chubby_pop.png",
    soundUrl:     "",
    color:        "#FFD60A",
    gradientFrom: "#2a1f00",
    gradientTo:   "#151000",
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export class GameManager {
  /** @type {Map<string, CatComponent>} */
  #cats = new Map();

  /** @type {Record<string, number>}  — accumulated pending clicks, reset after flush */
  #pendingDeltas = {};

  /** @type {Record<string, number>}  — global scores from Firebase */
  #globalScores = {};

  /** @type {number} — session total clicks */
  #sessionClicks = 0;

  /** @type {ReturnType<typeof setInterval> | null} */
  #flushInterval = null;

  /** @type {boolean} */
  #flushing = false;

  // DOM refs
  #gridEl          = null;
  #totalClicksEl   = null;
  #totalScoreEl    = null;
  #leaderboardEl   = null;
  #connectionEl    = null;

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  async init() {
    this.#cacheDomRefs();
    this.#renderCats();

    // Start Firebase
    firebaseService.init();
    firebaseService.onScoreUpdate((scores) => this.#onRemoteScores(scores));

    // Initial fetch for immediate display
    try {
      const initial = await firebaseService.getScoresOnce();
      this.#onRemoteScores(initial);
    } catch (err) {
      console.warn("[GameManager] Could not fetch initial scores:", err);
    }

    // Start the flush loop every 2500ms
    this.#startFlushLoop();

    // Flush on page close / refresh
    window.addEventListener("beforeunload", () => this.#flush());

    // Update connection indicator
    this.#setConnected(true);

    console.info("[GameManager] Game ready. Cats:", this.#cats.size);
  }

  // ── DOM refs ──────────────────────────────────────────────────────────────
  #cacheDomRefs() {
    this.#gridEl        = document.getElementById("cats-grid");
    this.#totalClicksEl = document.getElementById("stat-total-clicks");
    this.#totalScoreEl  = document.getElementById("stat-total-score");
    this.#leaderboardEl = document.getElementById("leaderboard-list");
    this.#connectionEl  = document.getElementById("connection-status");
  }

  // ── Render cats into grid ─────────────────────────────────────────────────
  #renderCats() {
    if (!this.#gridEl) {
      console.error("[GameManager] #cats-grid element not found in DOM");
      return;
    }

    CAT_CONFIG.forEach((config) => {
      const cat = new CatComponent(config, (catId, delta) => this.#onCatClicked(catId, delta));
      this.#cats.set(config.id, cat);
      this.#gridEl.appendChild(cat.render());
      this.#pendingDeltas[config.id] = 0;
      this.#globalScores[config.id]  = 0;
    });
  }

  // ── Click handler (from CatComponent) ────────────────────────────────────
  #onCatClicked(catId, delta) {
    this.#pendingDeltas[catId] = (this.#pendingDeltas[catId] ?? 0) + delta;
    this.#sessionClicks        += delta;
    this.#updateSessionStats();
  }

  // ── Firebase flush loop ───────────────────────────────────────────────────
  #startFlushLoop() {
    this.#flushInterval = setInterval(() => this.#flush(), 2500);
  }

  async #flush() {
    if (this.#flushing) return; // guard against concurrent flushes

    // Snapshot and reset pending deltas atomically
    const snapshot = { ...this.#pendingDeltas };
    const hasData  = Object.values(snapshot).some((v) => v > 0);
    if (!hasData) return;

    // Reset immediately — new clicks accumulate in the fresh object
    CAT_CONFIG.forEach(({ id }) => { this.#pendingDeltas[id] = 0; });

    this.#flushing = true;
    try {
      await firebaseService.batchUpdate(snapshot);
    } catch (err) {
      // On failure, add back the snapshot deltas to avoid data loss
      console.warn("[GameManager] Flush failed, requeuing:", err);
      Object.entries(snapshot).forEach(([id, v]) => {
        this.#pendingDeltas[id] = (this.#pendingDeltas[id] ?? 0) + v;
      });
      this.#setConnected(false);
    } finally {
      this.#flushing = false;
    }
  }

  // ── Real-time score update from Firebase ──────────────────────────────────
  #onRemoteScores(scores) {
    this.#globalScores = scores;
    this.#setConnected(true);

    this.#cats.forEach((cat, id) => {
      cat.setGlobalScore(scores[id] ?? 0);
    });

    this.#updateTotalScore();
    this.#updateLeaderboard(scores);
  }

  // ── Stats UI ──────────────────────────────────────────────────────────────
  #updateSessionStats() {
    if (this.#totalClicksEl) {
      this.#totalClicksEl.textContent = this.#sessionClicks.toLocaleString();
    }
  }

  #updateTotalScore() {
    const total = Object.values(this.#globalScores).reduce((a, b) => a + b, 0);
    if (this.#totalScoreEl) {
      this.#totalScoreEl.textContent = total.toLocaleString();
    }
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────
  #updateLeaderboard(scores) {
    if (!this.#leaderboardEl) return;

    const sorted = CAT_CONFIG
      .map((c) => ({ ...c, score: scores[c.id] ?? 0 }))
      .sort((a, b) => b.score - a.score);

    this.#leaderboardEl.innerHTML = "";

    sorted.forEach((cat, idx) => {
      const li = document.createElement("li");
      li.className = "lb-item";
      li.innerHTML = `
        <span class="lb-rank">${idx + 1}</span>
        <span class="lb-emoji" style="color:${cat.color}">${cat.emoji}</span>
        <span class="lb-name">${cat.name}</span>
        <span class="lb-score" style="color:${cat.color}">${cat.score.toLocaleString()}</span>
      `;
      this.#leaderboardEl.appendChild(li);
    });
  }

  // ── Connection status ─────────────────────────────────────────────────────
  #setConnected(connected) {
    if (!this.#connectionEl) return;
    this.#connectionEl.className = connected ? "connected" : "disconnected";
    this.#connectionEl.textContent = connected ? "● LIVE" : "● OFFLINE";
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  destroy() {
    if (this.#flushInterval) clearInterval(this.#flushInterval);
    this.#flush();
    this.#cats.forEach((cat) => cat.destroy());
    firebaseService.destroy();
  }
}
