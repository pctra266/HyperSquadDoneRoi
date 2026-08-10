/**
 * app.js — Entry point
 * ─────────────────────────────────────────────────────────────────────────────
 * Bootstraps the GameManager after DOM is ready.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { GameManager } from "./game-manager.js";

// ── Intro splash ──────────────────────────────────────────────────────────────
function hideSplash() {
  const splash = document.getElementById("splash");
  if (splash) {
    splash.classList.add("fade-out");
    setTimeout(() => splash.remove(), 600);
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  const manager = new GameManager();

  try {
    await manager.init();
  } catch (err) {
    console.error("[App] Failed to initialise game:", err);
    const errBanner = document.getElementById("error-banner");
    if (errBanner) {
      errBanner.textContent = `⚠️ Không thể kết nối Firebase. Kiểm tra lại config. (${err.message})`;
      errBanner.style.display = "block";
    }
  } finally {
    hideSplash();
  }

  // Expose manager globally for debugging in browser console
  window.__game = manager;
});
