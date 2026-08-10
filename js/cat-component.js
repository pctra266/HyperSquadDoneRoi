/**
 * cat-component.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CatComponent – Encapsulates all UI + event logic for ONE cat.
 *
 * Responsibilities:
 *  • Render the card DOM (image, name, score)
 *  • Handle click / touch events → emit to GameManager via callback
 *  • Play sound & animation on interaction
 *  • Update score display when GameManager pushes new data
 *  • Spawn floating "+1" particles on each click
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * @typedef {Object} CatConfig
 * @property {string}  id          - Unique Firebase key, e.g. "cat_tabby"
 * @property {string}  name        - Display name, e.g. "Tabby"
 * @property {string}  emoji       - Fallback emoji if image missing
 * @property {string}  normalImage - Path to idle sprite
 * @property {string}  popImage    - Path to open-mouth sprite
 * @property {string}  soundUrl    - Path to pop sound (empty string = no sound)
 * @property {string}  color       - CSS accent color for the card glow
 * @property {string}  gradientFrom - Card gradient start color
 * @property {string}  gradientTo   - Card gradient end color
 */

export class CatComponent {
  /** @type {CatConfig} */
  #config;
  /** @type {HTMLElement | null} */
  #element = null;
  /** @type {HTMLImageElement | null} */
  #normalImg = null;
  /** @type {HTMLImageElement | null} */
  #popImg = null;
  /** @type {HTMLSpanElement | null} */
  #scoreEl = null;
  /** @type {HTMLSpanElement | null} */
  #clicksEl = null;
  /** @type {AudioContext | null} */
  #audioCtx = null;
  /** @type {AudioBuffer | null} */
  #audioBuffer = null;
  /** @type {number} */
  #localScore = 0;
  /** @type {number} */
  #displayedScore = 0;
  /** @type {number | null} */
  #animFrame = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  #popTimeout = null;
  /** @type {number} */
  #lastSoundTime = 0;
  /** @type {(catId: string, delta: number) => void} */
  #onClickCallback;

  constructor(config, onClickCallback) {
    this.#config = config;
    this.#onClickCallback = onClickCallback;
    this.#preloadImages();
    this.#initAudio();
  }

  // ── Preload ───────────────────────────────────────────────────────────────
  #preloadImages() {
    if (this.#config.normalImage) {
      const img1 = new Image();
      img1.src = this.#config.normalImage;
    }
    if (this.#config.popImage) {
      const img2 = new Image();
      img2.src = this.#config.popImage;
    }
  }

  // ── Audio ─────────────────────────────────────────────────────────────────
  async #initAudio() {
    if (!this.#config.soundUrl) return;
    try {
      this.#audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const resp = await fetch(this.#config.soundUrl);
      const buf = await resp.arrayBuffer();
      this.#audioBuffer = await this.#audioCtx.decodeAudioData(buf);
    } catch {
      // Sound is optional — fail silently
      this.#audioBuffer = null;
    }
  }

  #playSound() {
    if (!this.#audioCtx || !this.#audioBuffer) return;
    // Resume context if suspended (browser autoplay policy)
    if (this.#audioCtx.state === "suspended") this.#audioCtx.resume();
    const src = this.#audioCtx.createBufferSource();
    src.buffer = this.#audioBuffer;
    src.connect(this.#audioCtx.destination);
    src.start(0);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  /**
   * Build and return the card DOM element.
   * @returns {HTMLElement}
   */
  render() {
    const { id, name, emoji, normalImage, popImage, color, gradientFrom, gradientTo } = this.#config;

    const card = document.createElement("div");
    card.className = "cat-card";
    card.id = `cat-card-${id}`;
    card.dataset.catId = id;
    card.style.setProperty("--cat-color", color);
    card.style.setProperty("--grad-from", gradientFrom);
    card.style.setProperty("--grad-to", gradientTo);

    // ── Image wrapper
    const imgWrap = document.createElement("div");
    imgWrap.className = "cat-img-wrap";

    // Normal Idle Image
    const normalImg = document.createElement("img");
    normalImg.className = "cat-img cat-img-normal";
    normalImg.id = `cat-img-normal-${id}`;
    normalImg.src = normalImage;
    normalImg.alt = name;
    normalImg.draggable = false;
    normalImg.onerror = () => {
      normalImg.style.display = "none";
      if (popImg) popImg.style.display = "none";
      emojiEl.style.display = "flex";
    };
    this.#normalImg = normalImg;

    // Pop Open Mouth Image (pre-rendered in DOM, toggled via CSS)
    const popImg = document.createElement("img");
    popImg.className = "cat-img cat-img-pop";
    popImg.id = `cat-img-pop-${id}`;
    popImg.src = popImage;
    popImg.alt = `${name} Pop`;
    popImg.draggable = false;
    this.#popImg = popImg;

    const emojiEl = document.createElement("span");
    emojiEl.className = "cat-emoji-fallback";
    emojiEl.textContent = emoji;
    emojiEl.style.display = "none";

    imgWrap.appendChild(normalImg);
    imgWrap.appendChild(popImg);
    imgWrap.appendChild(emojiEl);

    // ── Name tag
    const nameEl = document.createElement("div");
    nameEl.className = "cat-name";
    nameEl.textContent = name;

    // ── Score block
    const scoreBlock = document.createElement("div");
    scoreBlock.className = "cat-score-block";

    const scoreLabel = document.createElement("span");
    scoreLabel.className = "cat-score-label";
    scoreLabel.textContent = "TỔNG POP";

    const scoreEl = document.createElement("span");
    scoreEl.className = "cat-score";
    scoreEl.id = `cat-score-${id}`;
    scoreEl.textContent = "0";
    this.#scoreEl = scoreEl;

    scoreBlock.appendChild(scoreLabel);
    scoreBlock.appendChild(scoreEl);

    // ── Session clicks block
    const clicksBlock = document.createElement("div");
    clicksBlock.className = "cat-clicks-block";

    const clicksLabel = document.createElement("span");
    clicksLabel.className = "cat-clicks-label";
    clicksLabel.textContent = "POP CỦA TÔI";

    const clicksEl = document.createElement("span");
    clicksEl.className = "cat-clicks";
    clicksEl.id = `cat-clicks-${id}`;
    clicksEl.textContent = "0";
    this.#clicksEl = clicksEl;

    clicksBlock.appendChild(clicksLabel);
    clicksBlock.appendChild(clicksEl);

    // ── Assemble
    card.appendChild(imgWrap);
    card.appendChild(nameEl);
    card.appendChild(scoreBlock);
    card.appendChild(clicksBlock);

    this.#element = card;
    this.#bindEvents();
    return card;
  }

  // ── Event binding ─────────────────────────────────────────────────────────
  #bindEvents() {
    const el = this.#element;

    // Pointer events handle both mouse and touch (including multi-touch)
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault(); // prevent ghost mouse events on touch
      this.#handleClick(e);
    });

    // Prevent context menu on long-press (mobile)
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  #handleClick(e) {
    const now = performance.now();
    this.#localScore++;
    this.#onClickCallback(this.#config.id, 1);
    this.#animatePop(e);

    // Throttle audio execution to avoid AudioContext overflow under rapid autoclick
    if (now - this.#lastSoundTime > 40) {
      this.#playSound();
      this.#lastSoundTime = now;
    }

    this.#spawnParticle(e);
    this.#updateClicksDisplay();
  }

  // ── Animation ─────────────────────────────────────────────────────────────
  #animatePop(e) {
    if (!this.#element) return;

    this.#element.classList.add("is-popping");

    // Clear any existing timeout
    if (this.#popTimeout) clearTimeout(this.#popTimeout);

    this.#popTimeout = setTimeout(() => {
      if (this.#element) this.#element.classList.remove("is-popping");
    }, 150);
  }

  #spawnParticle(e) {
    if (!this.#element) return;

    // Cap max particle elements per card to 10 to prevent DOM thrashing
    const existing = this.#element.getElementsByClassName("pop-particle");
    if (existing.length >= 10) {
      existing[0].remove();
    }

    const rect = this.#element.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX ? e.clientX - rect.left : rect.width / 2));
    const y = Math.max(0, Math.min(rect.height, e.clientY ? e.clientY - rect.top : rect.height / 2));

    const p = document.createElement("span");
    p.className = "pop-particle";
    p.textContent = "+1";
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.color = this.#config.color;
    this.#element.appendChild(p);

    // Remove after animation ends (~800ms)
    p.addEventListener("animationend", () => p.remove(), { once: true });
  }

  // ── Score display ─────────────────────────────────────────────────────────
  /**
   * Called by GameManager when Firebase pushes a new global score.
   * Animates the number rolling up.
   * @param {number} newScore
   */
  setGlobalScore(newScore) {
    if (newScore === this.#displayedScore) return;

    // Cancel any ongoing animation
    if (this.#animFrame) cancelAnimationFrame(this.#animFrame);

    const start = this.#displayedScore;
    const end = newScore;
    const duration = 600; // ms
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);

      if (this.#scoreEl) {
        const formatted = current.toLocaleString();
        this.#scoreEl.textContent = formatted;
        this.#scoreEl.title = formatted;
        this.#scoreEl.dataset.length = String(formatted.length);
      }

      if (progress < 1) {
        this.#animFrame = requestAnimationFrame(tick);
      } else {
        this.#displayedScore = end;
        this.#animFrame = null;
      }
    };

    this.#animFrame = requestAnimationFrame(tick);
  }

  #updateClicksDisplay() {
    if (this.#clicksEl) {
      const formatted = this.#localScore.toLocaleString();
      this.#clicksEl.textContent = formatted;
      this.#clicksEl.title = formatted;
      this.#clicksEl.dataset.length = String(formatted.length);
    }
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  get id() { return this.#config.id; }
  get localScore() { return this.#localScore; }
  get element() { return this.#element; }

  // ── Destroy ───────────────────────────────────────────────────────────────
  destroy() {
    if (this.#popTimeout) clearTimeout(this.#popTimeout);
    if (this.#animFrame) cancelAnimationFrame(this.#animFrame);
    if (this.#audioCtx) this.#audioCtx.close();
    this.#element?.remove();
  }
}
