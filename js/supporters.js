/**
 * supporters.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Supporters & Subscribers Honor Wall
 *
 * Add new subscribers or commenters to this array!
 * Format:
 *   - Object: { name: "Name", badge: "Super Fan", icon: "⭐" }
 *   - String: "Name"
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const SUPPORTERS_LIST = [
  { name: "@Sovatpoor", badge: "Commenter", icon: "💬" },
  { name: "@vutuankiet0304", badge: "Commenter", icon: "💬" },
  { name: "Bá Đức Nguyễn", badge: "New Subscriber", icon: "🌟" },
  { name: "@Duyle78-j6e", badge: "Commenter", icon: "💬" },
  { name: "@1nhok938", badge: "Commenter", icon: "💬" },
  { name: "@DuongLe-s1q", badge: "Commenter", icon: "💬" },
  { name: "@tododoprince", badge: "Commenter", icon: "💬" },
  { name: "@hntuvu_real", badge: "Commenter", icon: "💬" },
  { name: "@once1n-a-bluemoon", badge: "Commenter", icon: "💬" },
  { name: "Hu_7", badge: "New Subscriber", icon: "🌟" },
  { name: "2AngG", badge: "New Subscriber", icon: "🌟" },
  { name: "Cahara", badge: "New Subscriber", icon: "🌟" },
  { name: "@Shihinailute1", badge: "Commenter", icon: "💬" },
  { name: "@cuong-9381", badge: "Commenter", icon: "💬" },
  { name: "@DungLee0711", badge: "Commenter", icon: "💬" },
  { name: "@deeper3184", badge: "Commenter", icon: "💬" },
  { name: "Hung Nguyen", badge: "New Subscriber", icon: "🌟" },
  { name: "@HuyNguyễnQuang-n2f", badge: "Commenter", icon: "💬" },
  { name: "@LươngOng-c6w", badge: "Commenter", icon: "💬" },
  { name: "@nềihnâux", badge: "Commenter", icon: "💬" },
  { name: "@TúHàLinhNguyễn", badge: "Commenter", icon: "💬" },
  { name: "@phamnguyen6070", badge: "Commenter", icon: "💬" },
  { name: "@nguyenhoangdinh4565", badge: "Commenter", icon: "💬" },
  { name: "@NguoiDanDat36", badge: "Commenter", icon: "💬" },
  { name: "@BuWi0", badge: "Commenter", icon: "💬" },
  { name: "@cacao5735", badge: "Commenter", icon: "💬" },
  { name: "@tlabckycho", badge: "Commenter", icon: "💬" },
  { name: "@HTANC2186", badge: "Commenter", icon: "💬" }
];

const BADGE_COLORS = [
  { border: "rgba(255, 95, 160, 0.4)", bg: "rgba(255, 95, 160, 0.1)", text: "#ff5fa0" },
  { border: "rgba(76, 201, 240, 0.4)", bg: "rgba(76, 201, 240, 0.1)", text: "#4cc9f0" },
  { border: "rgba(251, 191, 36, 0.4)", bg: "rgba(251, 191, 36, 0.1)", text: "#fbbf24" },
  { border: "rgba(155, 93, 229, 0.4)", bg: "rgba(155, 93, 229, 0.1)", text: "#9b5de5" },
  { border: "rgba(0, 245, 212, 0.4)", bg: "rgba(0, 245, 212, 0.1)", text: "#00f5d4" },
  { border: "rgba(255, 68, 68, 0.4)", bg: "rgba(255, 68, 68, 0.1)", text: "#ff4444" },
];

export function renderSupporters() {
  const container = document.getElementById("supporters-wall");
  const countEl = document.getElementById("supporters-count");
  if (!container) return;

  container.innerHTML = "";
  if (countEl) countEl.textContent = `${SUPPORTERS_LIST.length} thành viên`;

  SUPPORTERS_LIST.forEach((item, index) => {
    const isObj = typeof item === "object";
    const name = isObj ? item.name : item;
    const badgeText = isObj ? (item.badge || "Subscriber") : "Subscriber";
    const icon = isObj ? (item.icon || "⭐") : "⭐";

    const colorScheme = BADGE_COLORS[index % BADGE_COLORS.length];

    const chip = document.createElement("div");
    chip.className = "supporter-chip";
    chip.style.setProperty("--chip-border", colorScheme.border);
    chip.style.setProperty("--chip-bg", colorScheme.bg);
    chip.style.setProperty("--chip-color", colorScheme.text);

    chip.innerHTML = `
      <span class="supporter-icon">${icon}</span>
      <div class="supporter-info">
        <span class="supporter-name">${name}</span>
        <span class="supporter-badge">${badgeText}</span>
      </div>
      <span class="supporter-sparkle">✨</span>
    `;

    container.appendChild(chip);
  });
}
