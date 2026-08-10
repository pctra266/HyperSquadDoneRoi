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
  #img = null;
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
  /** @type {(catId: string, delta: number) => void} */
  #onClickCallback;

  /**
   * @param {CatConfig}  config
   * @param {Function}   onClickCallback — called with (catId, delta=1) on each tap
   */
  constructor(config, onClickCallback) {
    this.#config          = config;
    this.#onClickCallback = onClickCallback;
    this.#initAudio();
  }

  // ── Audio ─────────────────────────────────────────────────────────────────
  async #initAudio() {
    if (!this.#config.soundUrl) return;
    try {
      this.#audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const resp     = await fetch(this.#config.soundUrl);
      const buf      = await resp.arrayBuffer();
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
    const { id, name, emoji, normalImage, color, gradientFrom, gradientTo } = this.#config;

    const card = document.createElement("div");
    card.className  = "cat-card";
    card.id         = `cat-card-${id}`;
    card.dataset.catId = id;
    card.style.setProperty("--cat-color", color);
    card.style.setProperty("--grad-from", gradientFrom);
    card.style.setProperty("--grad-to",   gradientTo);

    // ── Image wrapper
    const imgWrap = document.createElement("div");
    imgWrap.className = "cat-img-wrap";

    const img = document.createElement("img");
    img.className = "cat-img";
    img.id        = `cat-img-${id}`;
    img.src       = normalImage;
    img.alt       = name;
    img.draggable = false;
    // Fallback to emoji if image fails
    img.onerror   = () => { img.style.display = "none"; emojiEl.style.display = "flex"; };
    this.#img = img;

    const emojiEl = document.createElement("span");
    emojiEl.className    = "cat-emoji-fallback";
    emojiEl.textContent  = emoji;
    emojiEl.style.display = "none";

    imgWrap.appendChild(img);
    imgWrap.appendChild(emojiEl);

    // ── Name tag
    const nameEl = document.createElement("div");
    nameEl.className = "cat-name";
    nameEl.textContent = name;

    // ── Score block
    const scoreBlock = document.createElement("div");
    scoreBlock.className = "cat-score-block";

    const scoreLabel = document.createElement("span");
    scoreLabel.className   = "cat-score-label";
    scoreLabel.textContent = "GLOBAL";

    const scoreEl = document.createElement("span");
    scoreEl.className   = "cat-score";
    scoreEl.id          = `cat-score-${id}`;
    scoreEl.textContent = "0";
    this.#scoreEl = scoreEl;

    scoreBlock.appendChild(scoreLabel);
    scoreBlock.appendChild(scoreEl);

    // ── Session clicks block
    const clicksBlock = document.createElement("div");
    clicksBlock.className = "cat-clicks-block";

    const clicksLabel = document.createElement("span");
    clicksLabel.className   = "cat-clicks-label";
    clicksLabel.textContent = "MY CLICKS";

    const clicksEl = document.createElement("span");
    clicksEl.className   = "cat-clicks";
    clicksEl.id          = `cat-clicks-${id}`;
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
    this.#localScore++;
    this.#onClickCallback(this.#config.id, 1);
    this.#animatePop(e);
    this.#playSound();
    this.#spawnParticle(e);
    this.#updateClicksDisplay();
  }

  // ── Animation ─────────────────────────────────────────────────────────────
  #animatePop(e) {
    if (!this.#img) return;

    // Switch to pop image
    this.#img.src = this.#config.popImage;
    this.#element.classList.add("is-popping");

    // Clear any existing timeout
    if (this.#popTimeout) clearTimeout(this.#popTimeout);

    this.#popTimeout = setTimeout(() => {
      if (this.#img) this.#img.src = this.#config.normalImage;
      this.#element.classList.remove("is-popping");
    }, 150);
  }

  #spawnParticle(e) {
    const rect     = this.#element.getBoundingClientRect();
    const x        = e.clientX - rect.left;
    const y        = e.clientY - rect.top;

    const p = document.createElement("span");
    p.className    = "pop-particle";
    p.textContent  = "+1";
    p.style.left   = `${x}px`;
    p.style.top    = `${y}px`;
    p.style.color  = this.#config.color;
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

    const start      = this.#displayedScore;
    const end        = newScore;
    const duration   = 600; // ms
    const startTime  = performance.now();

    const tick = (now) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = Math.round(start + (end - start) * eased);

      if (this.#scoreEl) {
        this.#scoreEl.textContent = current.toLocaleString();
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
      this.#clicksEl.textContent = this.#localScore.toLocaleString();
    }
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  get id()          { return this.#config.id; }
  get localScore()  { return this.#localScore; }
  get element()     { return this.#element; }

  // ── Destroy ───────────────────────────────────────────────────────────────
  destroy() {
    if (this.#popTimeout) clearTimeout(this.#popTimeout);
    if (this.#animFrame)  cancelAnimationFrame(this.#animFrame);
    if (this.#audioCtx)   this.#audioCtx.close();
    this.#element?.remove();
  }
}
