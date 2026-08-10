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

  // ── Donate widget toggle ────────────────────────────────────────────────
  const donateBtn   = document.getElementById("donate-toggle-btn");
  const donatePanel = document.getElementById("donate-panel");

  if (donateBtn && donatePanel) {
    donateBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = donatePanel.classList.toggle("is-open");
      donateBtn.setAttribute("aria-expanded", isOpen);
      donatePanel.setAttribute("aria-hidden", !isOpen);
    });

    // Click ngoài widget → đóng panel
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#donate-widget")) {
        donatePanel.classList.remove("is-open");
        donateBtn.setAttribute("aria-expanded", "false");
        donatePanel.setAttribute("aria-hidden", "true");
      }
    });

    // ESC → đóng panel
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && donatePanel.classList.contains("is-open")) {
        donatePanel.classList.remove("is-open");
        donateBtn.setAttribute("aria-expanded", "false");
        donatePanel.setAttribute("aria-hidden", "true");
        donateBtn.focus();
      }
    });
  }

  // Expose manager globally for debugging in browser console
  window.__game = manager;
});
