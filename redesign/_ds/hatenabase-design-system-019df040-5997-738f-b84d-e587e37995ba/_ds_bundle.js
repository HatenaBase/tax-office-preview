/* @ds-bundle: {"format":3,"namespace":"HatenabaseDesignSystem_019df0","components":[],"sourceHashes":{"case-study-v2/deck-stage.js":"ad1c016a6256","flyer-deck/deck-stage.js":"ad1c016a6256","slides/AgendaSlide.jsx":"f8556cbf9bd6","slides/ServiceSlide.jsx":"f6e759222237","slides/StatsSlide.jsx":"2839e901dd99","slides/ThankYouSlide.jsx":"18b0669816c7","slides/TitleSlide.jsx":"e6f32d916248","ui_kits/corporate-site/CTA.jsx":"773eb5cbc51a","ui_kits/corporate-site/Cases.jsx":"8a88b315e990","ui_kits/corporate-site/Faq.jsx":"98f5aa0e6583","ui_kits/corporate-site/Header.jsx":"610d4f7a88db","ui_kits/corporate-site/Hero.jsx":"81ac5c63a3fb","ui_kits/corporate-site/Pain.jsx":"6115a953dc8c","ui_kits/corporate-site/Services.jsx":"a0887a790826","ui_kits/corporate-site/Stats.jsx":"078196178c34"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.HatenabaseDesignSystem_019df0 = window.HatenabaseDesignSystem_019df0 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// case-study-v2/deck-stage.js
try { (() => {
/**
 * <deck-stage> — reusable web component for HTML decks.
 *
 * Handles:
 *  (a) speaker notes — reads <script type="application/json" id="speaker-notes">
 *      and posts {slideIndexChanged: N} to the parent window on nav.
 *  (b) keyboard navigation — ←/→, PgUp/PgDn, Space, Home/End, number keys.
 *  (c) press R to reset to slide 0 (with a tasteful keyboard hint).
 *  (d) bottom-center overlay showing slide count + hints, fades out on idle.
 *  (e) auto-scaling — inner canvas is a fixed design size (default 1920×1080)
 *      scaled with `transform: scale()` to fit the viewport, letterboxed.
 *      Set the `noscale` attribute to render at authored size (1:1) — the
 *      PPTX exporter sets this so its DOM capture sees unscaled geometry.
 *  (f) print — `@media print` lays every slide out as its own page at the
 *      design size, so the browser's Print → Save as PDF produces a clean
 *      one-page-per-slide PDF with no extra setup.
 *
 * Slides are HIDDEN, not unmounted. Non-active slides stay in the DOM with
 * `visibility: hidden` + `opacity: 0`, so their state (videos, iframes,
 * form inputs, React trees) is preserved across navigation.
 *
 * Lifecycle event — the component dispatches a `slidechange` CustomEvent on
 * itself whenever the active slide changes (including the initial mount).
 * The event bubbles and composes out of shadow DOM, so you can listen on
 * the <deck-stage> element or on document:
 *
 *   document.querySelector('deck-stage').addEventListener('slidechange', (e) => {
 *     e.detail.index         // new 0-based index
 *     e.detail.previousIndex // previous index, or -1 on init
 *     e.detail.total         // total slide count
 *     e.detail.slide         // the new active slide element
 *     e.detail.previousSlide // the prior slide element, or null on init
 *     e.detail.reason        // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
 *   });
 *
 * Persistence: none at the deck level. The host app keeps the current slide
 * in its own URL (?slide=) and re-delivers it via location.hash on load, so a
 * bare load with no hash always starts at slide 1.
 *
 * Usage:
 *   <deck-stage width="1920" height="1080">
 *     <section data-label="Title">...</section>
 *     <section data-label="Agenda">...</section>
 *   </deck-stage>
 *
 * Slides are the direct element children of <deck-stage>. Each slide is
 * automatically tagged with:
 *   - data-screen-label="NN Label"   (1-indexed, for comment flow)
 *   - data-om-validate="no_overflowing_text,no_overlapping_text,slide_sized_text"
 */

(() => {
  const DESIGN_W_DEFAULT = 1920;
  const DESIGN_H_DEFAULT = 1080;
  const OVERLAY_HIDE_MS = 1800;
  const VALIDATE_ATTR = 'no_overflowing_text,no_overlapping_text,slide_sized_text';
  const pad2 = n => String(n).padStart(2, '0');
  const stylesheet = `
    :host {
      position: fixed;
      inset: 0;
      display: block;
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      overflow: hidden;
    }

    .stage {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .canvas {
      position: relative;
      transform-origin: center center;
      flex-shrink: 0;
      background: #fff;
      will-change: transform;
    }

    /* Slides live in light DOM (via <slot>) so authored CSS still applies.
       We absolutely position each slotted child to stack them. */
    ::slotted(*) {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
    }
    ::slotted([data-deck-active]) {
      opacity: 1;
      pointer-events: auto;
      visibility: visible;
    }

    /* Tap zones for mobile — back/forward thirds like Stories.
       Transparent, no visible UI, don't block the overlay. */
    .tapzones {
      position: fixed;
      inset: 0;
      display: flex;
      z-index: 2147482000;
      pointer-events: none;
    }
    .tapzone {
      flex: 1;
      pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
    }
    /* Only activate tap zones on coarse pointers (touch devices). */
    @media (hover: hover) and (pointer: fine) {
      .tapzones { display: none; }
    }

    .overlay {
      position: fixed;
      left: 50%;
      bottom: 22px;
      transform: translate(-50%, 6px) scale(0.92);
      filter: blur(6px);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: #000;
      color: #fff;
      border-radius: 999px;
      font-size: 12px;
      font-feature-settings: "tnum" 1;
      letter-spacing: 0.01em;
      opacity: 0;
      pointer-events: none;
      transition: opacity 260ms ease, transform 260ms cubic-bezier(.2,.8,.2,1), filter 260ms ease;
      transform-origin: center bottom;
      z-index: 2147483000;
      user-select: none;
    }
    .overlay[data-visible] {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, 0) scale(1);
      filter: blur(0);
    }

    .btn {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      margin: 0;
      padding: 0;
      color: inherit;
      font: inherit;
      cursor: default;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 28px;
      min-width: 28px;
      border-radius: 999px;
      color: rgba(255,255,255,0.72);
      transition: background 140ms ease, color 140ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .btn:active { background: rgba(255,255,255,0.18); }
    .btn:focus { outline: none; }
    .btn:focus-visible { outline: none; }
    .btn::-moz-focus-inner { border: 0; }
    .btn svg { width: 14px; height: 14px; display: block; }
    .btn.reset {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.02em;
      padding: 0 10px 0 12px;
      gap: 6px;
      color: rgba(255,255,255,0.72);
    }
    .btn.reset .kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 10px;
      line-height: 1;
      color: rgba(255,255,255,0.88);
      background: rgba(255,255,255,0.12);
      border-radius: 4px;
    }

    .count {
      font-variant-numeric: tabular-nums;
      color: #fff;
      font-weight: 500;
      padding: 0 8px;
      min-width: 42px;
      text-align: center;
      font-size: 12px;
    }
    .count .sep { color: rgba(255,255,255,0.45); margin: 0 3px; font-weight: 400; }
    .count .total { color: rgba(255,255,255,0.55); }

    .divider {
      width: 1px;
      height: 14px;
      background: rgba(255,255,255,0.18);
      margin: 0 2px;
    }

    /* ── Print: one page per slide, no chrome ────────────────────────────
       The screen layout stacks every slide at inset:0 inside a scaled
       canvas; for print we want them in document flow at the authored
       design size so the browser paginates one slide per sheet. The
       @page size is set from the width/height attributes via the inline
       <style id="deck-stage-print-page"> that connectedCallback injects
       into <head> (the @page at-rule has no effect inside shadow DOM). */
    @media print {
      :host {
        position: static;
        inset: auto;
        background: none;
        overflow: visible;
        color: inherit;
      }
      .stage { position: static; display: block; }
      .canvas {
        transform: none !important;
        width: auto !important;
        height: auto !important;
        background: none;
        will-change: auto;
      }
      ::slotted(*) {
        position: relative !important;
        inset: auto !important;
        width: var(--deck-design-w) !important;
        height: var(--deck-design-h) !important;
        box-sizing: border-box !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto;
        break-after: page;
        page-break-after: always;
        break-inside: avoid;
        overflow: hidden;
      }
      ::slotted(*:last-child) {
        break-after: auto;
        page-break-after: auto;
      }
      .overlay, .tapzones { display: none !important; }
    }
  `;
  class DeckStage extends HTMLElement {
    static get observedAttributes() {
      return ['width', 'height', 'noscale'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._index = 0;
      this._slides = [];
      this._notes = [];
      this._hideTimer = null;
      this._mouseIdleTimer = null;
      this._onKey = this._onKey.bind(this);
      this._onResize = this._onResize.bind(this);
      this._onSlotChange = this._onSlotChange.bind(this);
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onTapBack = this._onTapBack.bind(this);
      this._onTapForward = this._onTapForward.bind(this);
    }
    get designWidth() {
      return parseInt(this.getAttribute('width'), 10) || DESIGN_W_DEFAULT;
    }
    get designHeight() {
      return parseInt(this.getAttribute('height'), 10) || DESIGN_H_DEFAULT;
    }
    connectedCallback() {
      this._render();
      this._loadNotes();
      this._syncPrintPageRule();
      window.addEventListener('keydown', this._onKey);
      window.addEventListener('resize', this._onResize);
      window.addEventListener('mousemove', this._onMouseMove, {
        passive: true
      });
      // Initial collection + layout happens via slotchange, which fires on mount.
    }
    disconnectedCallback() {
      window.removeEventListener('keydown', this._onKey);
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('mousemove', this._onMouseMove);
      if (this._hideTimer) clearTimeout(this._hideTimer);
      if (this._mouseIdleTimer) clearTimeout(this._mouseIdleTimer);
    }
    attributeChangedCallback() {
      if (this._canvas) {
        this._canvas.style.width = this.designWidth + 'px';
        this._canvas.style.height = this.designHeight + 'px';
        this._canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
        this._canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
        this._fit();
        this._syncPrintPageRule();
      }
    }
    _render() {
      const style = document.createElement('style');
      style.textContent = stylesheet;
      const stage = document.createElement('div');
      stage.className = 'stage';
      const canvas = document.createElement('div');
      canvas.className = 'canvas';
      canvas.style.width = this.designWidth + 'px';
      canvas.style.height = this.designHeight + 'px';
      canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
      canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
      const slot = document.createElement('slot');
      slot.addEventListener('slotchange', this._onSlotChange);
      canvas.appendChild(slot);
      stage.appendChild(canvas);

      // Tap zones (mobile): left third = back, right third = forward.
      const tapzones = document.createElement('div');
      tapzones.className = 'tapzones export-hidden';
      tapzones.setAttribute('aria-hidden', 'true');
      tapzones.setAttribute('data-noncommentable', '');
      const tzBack = document.createElement('div');
      tzBack.className = 'tapzone tapzone--back';
      const tzMid = document.createElement('div');
      tzMid.className = 'tapzone tapzone--mid';
      tzMid.style.pointerEvents = 'none';
      const tzFwd = document.createElement('div');
      tzFwd.className = 'tapzone tapzone--fwd';
      tzBack.addEventListener('click', this._onTapBack);
      tzFwd.addEventListener('click', this._onTapForward);
      tapzones.append(tzBack, tzMid, tzFwd);

      // Overlay: compact, solid black, with clickable controls.
      const overlay = document.createElement('div');
      overlay.className = 'overlay export-hidden';
      overlay.setAttribute('role', 'toolbar');
      overlay.setAttribute('aria-label', 'Deck controls');
      overlay.setAttribute('data-noncommentable', '');
      overlay.innerHTML = `
        <button class="btn prev" type="button" aria-label="Previous slide" title="Previous (←)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>
        </button>
        <span class="count" aria-live="polite"><span class="current">1</span><span class="sep">/</span><span class="total">1</span></span>
        <button class="btn next" type="button" aria-label="Next slide" title="Next (→)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
        </button>
        <span class="divider"></span>
        <button class="btn reset" type="button" aria-label="Reset to first slide" title="Reset (R)">Reset<span class="kbd">R</span></button>
      `;
      overlay.querySelector('.prev').addEventListener('click', () => this._go(this._index - 1, 'click'));
      overlay.querySelector('.next').addEventListener('click', () => this._go(this._index + 1, 'click'));
      overlay.querySelector('.reset').addEventListener('click', () => this._go(0, 'click'));
      this._root.append(style, stage, tapzones, overlay);
      this._canvas = canvas;
      this._slot = slot;
      this._overlay = overlay;
      this._countEl = overlay.querySelector('.current');
      this._totalEl = overlay.querySelector('.total');
    }

    /** @page must live in the document stylesheet — it's a no-op inside
     *  shadow DOM. Inject/update a single <head> style tag so the print
     *  sheet matches the design size and Save-as-PDF yields one slide per
     *  page with no margins. */
    _syncPrintPageRule() {
      const id = 'deck-stage-print-page';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
        document.head.appendChild(tag);
      }
      tag.textContent = '@page { size: ' + this.designWidth + 'px ' + this.designHeight + 'px; margin: 0; } ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; overflow: visible !important; height: auto !important; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }';
    }
    _onSlotChange() {
      this._collectSlides();
      this._restoreIndex();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'init'
      });
      this._fit();
    }
    _collectSlides() {
      const assigned = this._slot.assignedElements({
        flatten: true
      });
      this._slides = assigned.filter(el => {
        // Skip template/style/script nodes even if someone slots them.
        const tag = el.tagName;
        return tag !== 'TEMPLATE' && tag !== 'SCRIPT' && tag !== 'STYLE';
      });
      this._slides.forEach((slide, i) => {
        const n = i + 1;
        // Determine a label for comment flow: prefer explicit data-label,
        // then an existing data-screen-label, then first heading, else "Slide".
        let label = slide.getAttribute('data-label');
        if (!label) {
          const existing = slide.getAttribute('data-screen-label');
          if (existing) {
            // Strip any leading number the author may have included.
            label = existing.replace(/^\s*\d+\s*/, '').trim() || existing;
          }
        }
        if (!label) {
          const h = slide.querySelector('h1, h2, h3, [data-title]');
          if (h) label = (h.textContent || '').trim().slice(0, 40);
        }
        if (!label) label = 'Slide';
        slide.setAttribute('data-screen-label', `${pad2(n)} ${label}`);

        // Validation attribute for comment flow / auto-checks.
        if (!slide.hasAttribute('data-om-validate')) {
          slide.setAttribute('data-om-validate', VALIDATE_ATTR);
        }
        slide.setAttribute('data-deck-slide', String(i));
      });
      if (this._totalEl) this._totalEl.textContent = String(this._slides.length || 1);
      if (this._index >= this._slides.length) this._index = Math.max(0, this._slides.length - 1);
    }
    _loadNotes() {
      const tag = document.getElementById('speaker-notes');
      if (!tag) {
        this._notes = [];
        return;
      }
      try {
        const parsed = JSON.parse(tag.textContent || '[]');
        if (Array.isArray(parsed)) this._notes = parsed;
      } catch (e) {
        console.warn('[deck-stage] Failed to parse #speaker-notes JSON:', e);
        this._notes = [];
      }
    }
    _restoreIndex() {
      // The host's ?slide= param is delivered as a #<int> hash (1-indexed) on
      // the iframe src. No hash → slide 1; the deck itself keeps no position
      // state across loads.
      const h = (location.hash || '').match(/^#(\d+)$/);
      if (h) {
        const n = parseInt(h[1], 10) - 1;
        if (n >= 0 && n < this._slides.length) this._index = n;
      }
    }
    _applyIndex({
      showOverlay = true,
      broadcast = true,
      reason = 'init'
    } = {}) {
      if (!this._slides.length) return;
      const prev = this._prevIndex == null ? -1 : this._prevIndex;
      const curr = this._index;
      // Keep the iframe's own hash in sync so an in-iframe location.reload()
      // (reload banner path in viewer-handle.ts) lands on the current slide,
      // not the stale deep-link hash from initial load.
      try {
        history.replaceState(null, '', '#' + (curr + 1));
      } catch (e) {}
      this._slides.forEach((s, i) => {
        if (i === curr) s.setAttribute('data-deck-active', '');else s.removeAttribute('data-deck-active');
      });
      if (this._countEl) this._countEl.textContent = String(curr + 1);
      if (broadcast) {
        // (1) Legacy: host-window postMessage for speaker-notes renderers.
        try {
          window.postMessage({
            slideIndexChanged: curr
          }, '*');
        } catch (e) {}

        // (2) In-page CustomEvent on the <deck-stage> element itself.
        //     Bubbles and composes out of shadow DOM so slide code can listen:
        //       document.querySelector('deck-stage').addEventListener('slidechange', e => {
        //         e.detail.index, e.detail.previousIndex, e.detail.total, e.detail.slide, e.detail.reason
        //       });
        const detail = {
          index: curr,
          previousIndex: prev,
          total: this._slides.length,
          slide: this._slides[curr] || null,
          previousSlide: prev >= 0 ? this._slides[prev] || null : null,
          reason: reason // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
        };
        this.dispatchEvent(new CustomEvent('slidechange', {
          detail,
          bubbles: true,
          composed: true
        }));
      }
      this._prevIndex = curr;
      if (showOverlay) this._flashOverlay();
    }
    _flashOverlay() {
      if (!this._overlay) return;
      this._overlay.setAttribute('data-visible', '');
      if (this._hideTimer) clearTimeout(this._hideTimer);
      this._hideTimer = setTimeout(() => {
        this._overlay.removeAttribute('data-visible');
      }, OVERLAY_HIDE_MS);
    }
    _fit() {
      if (!this._canvas) return;
      // PPTX export sets noscale so the DOM capture sees authored-size
      // geometry — the scaled canvas is in shadow DOM, so the exporter's
      // resetTransformSelector can't reach .canvas.style.transform directly.
      if (this.hasAttribute('noscale')) {
        this._canvas.style.transform = 'none';
        return;
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / this.designWidth, vh / this.designHeight);
      this._canvas.style.transform = `scale(${s})`;
    }
    _onResize() {
      this._fit();
    }
    _onMouseMove() {
      // Keep overlay visible while mouse moves; hide after idle.
      this._flashOverlay();
    }
    _onTapBack(e) {
      e.preventDefault();
      this._go(this._index - 1, 'tap');
    }
    _onTapForward(e) {
      e.preventDefault();
      this._go(this._index + 1, 'tap');
    }
    _onKey(e) {
      // Ignore when the user is typing.
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      let handled = true;
      if (key === 'ArrowRight' || key === 'PageDown' || key === ' ' || key === 'Spacebar') {
        this._go(this._index + 1, 'keyboard');
      } else if (key === 'ArrowLeft' || key === 'PageUp') {
        this._go(this._index - 1, 'keyboard');
      } else if (key === 'Home') {
        this._go(0, 'keyboard');
      } else if (key === 'End') {
        this._go(this._slides.length - 1, 'keyboard');
      } else if (key === 'r' || key === 'R') {
        this._go(0, 'keyboard');
      } else if (/^[0-9]$/.test(key)) {
        // 1..9 jump to that slide; 0 jumps to 10.
        const n = key === '0' ? 9 : parseInt(key, 10) - 1;
        if (n < this._slides.length) this._go(n, 'keyboard');
      } else {
        handled = false;
      }
      if (handled) {
        e.preventDefault();
        this._flashOverlay();
      }
    }
    _go(i, reason = 'api') {
      if (!this._slides.length) return;
      const clamped = Math.max(0, Math.min(this._slides.length - 1, i));
      if (clamped === this._index) {
        this._flashOverlay();
        return;
      }
      this._index = clamped;
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason
      });
    }

    // Public API ------------------------------------------------------------

    /** Current slide index (0-based). */
    get index() {
      return this._index;
    }
    /** Total slide count. */
    get length() {
      return this._slides.length;
    }
    /** Programmatically navigate. */
    goTo(i) {
      this._go(i, 'api');
    }
    next() {
      this._go(this._index + 1, 'api');
    }
    prev() {
      this._go(this._index - 1, 'api');
    }
    reset() {
      this._go(0, 'api');
    }
  }
  if (!customElements.get('deck-stage')) {
    customElements.define('deck-stage', DeckStage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "case-study-v2/deck-stage.js", error: String((e && e.message) || e) }); }

// flyer-deck/deck-stage.js
try { (() => {
/**
 * <deck-stage> — reusable web component for HTML decks.
 *
 * Handles:
 *  (a) speaker notes — reads <script type="application/json" id="speaker-notes">
 *      and posts {slideIndexChanged: N} to the parent window on nav.
 *  (b) keyboard navigation — ←/→, PgUp/PgDn, Space, Home/End, number keys.
 *  (c) press R to reset to slide 0 (with a tasteful keyboard hint).
 *  (d) bottom-center overlay showing slide count + hints, fades out on idle.
 *  (e) auto-scaling — inner canvas is a fixed design size (default 1920×1080)
 *      scaled with `transform: scale()` to fit the viewport, letterboxed.
 *      Set the `noscale` attribute to render at authored size (1:1) — the
 *      PPTX exporter sets this so its DOM capture sees unscaled geometry.
 *  (f) print — `@media print` lays every slide out as its own page at the
 *      design size, so the browser's Print → Save as PDF produces a clean
 *      one-page-per-slide PDF with no extra setup.
 *
 * Slides are HIDDEN, not unmounted. Non-active slides stay in the DOM with
 * `visibility: hidden` + `opacity: 0`, so their state (videos, iframes,
 * form inputs, React trees) is preserved across navigation.
 *
 * Lifecycle event — the component dispatches a `slidechange` CustomEvent on
 * itself whenever the active slide changes (including the initial mount).
 * The event bubbles and composes out of shadow DOM, so you can listen on
 * the <deck-stage> element or on document:
 *
 *   document.querySelector('deck-stage').addEventListener('slidechange', (e) => {
 *     e.detail.index         // new 0-based index
 *     e.detail.previousIndex // previous index, or -1 on init
 *     e.detail.total         // total slide count
 *     e.detail.slide         // the new active slide element
 *     e.detail.previousSlide // the prior slide element, or null on init
 *     e.detail.reason        // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
 *   });
 *
 * Persistence: none at the deck level. The host app keeps the current slide
 * in its own URL (?slide=) and re-delivers it via location.hash on load, so a
 * bare load with no hash always starts at slide 1.
 *
 * Usage:
 *   <deck-stage width="1920" height="1080">
 *     <section data-label="Title">...</section>
 *     <section data-label="Agenda">...</section>
 *   </deck-stage>
 *
 * Slides are the direct element children of <deck-stage>. Each slide is
 * automatically tagged with:
 *   - data-screen-label="NN Label"   (1-indexed, for comment flow)
 *   - data-om-validate="no_overflowing_text,no_overlapping_text,slide_sized_text"
 */

(() => {
  const DESIGN_W_DEFAULT = 1920;
  const DESIGN_H_DEFAULT = 1080;
  const OVERLAY_HIDE_MS = 1800;
  const VALIDATE_ATTR = 'no_overflowing_text,no_overlapping_text,slide_sized_text';
  const pad2 = n => String(n).padStart(2, '0');
  const stylesheet = `
    :host {
      position: fixed;
      inset: 0;
      display: block;
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      overflow: hidden;
    }

    .stage {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .canvas {
      position: relative;
      transform-origin: center center;
      flex-shrink: 0;
      background: #fff;
      will-change: transform;
    }

    /* Slides live in light DOM (via <slot>) so authored CSS still applies.
       We absolutely position each slotted child to stack them. */
    ::slotted(*) {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
    }
    ::slotted([data-deck-active]) {
      opacity: 1;
      pointer-events: auto;
      visibility: visible;
    }

    /* Tap zones for mobile — back/forward thirds like Stories.
       Transparent, no visible UI, don't block the overlay. */
    .tapzones {
      position: fixed;
      inset: 0;
      display: flex;
      z-index: 2147482000;
      pointer-events: none;
    }
    .tapzone {
      flex: 1;
      pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
    }
    /* Only activate tap zones on coarse pointers (touch devices). */
    @media (hover: hover) and (pointer: fine) {
      .tapzones { display: none; }
    }

    .overlay {
      position: fixed;
      left: 50%;
      bottom: 22px;
      transform: translate(-50%, 6px) scale(0.92);
      filter: blur(6px);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: #000;
      color: #fff;
      border-radius: 999px;
      font-size: 12px;
      font-feature-settings: "tnum" 1;
      letter-spacing: 0.01em;
      opacity: 0;
      pointer-events: none;
      transition: opacity 260ms ease, transform 260ms cubic-bezier(.2,.8,.2,1), filter 260ms ease;
      transform-origin: center bottom;
      z-index: 2147483000;
      user-select: none;
    }
    .overlay[data-visible] {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, 0) scale(1);
      filter: blur(0);
    }

    .btn {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      margin: 0;
      padding: 0;
      color: inherit;
      font: inherit;
      cursor: default;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 28px;
      min-width: 28px;
      border-radius: 999px;
      color: rgba(255,255,255,0.72);
      transition: background 140ms ease, color 140ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .btn:active { background: rgba(255,255,255,0.18); }
    .btn:focus { outline: none; }
    .btn:focus-visible { outline: none; }
    .btn::-moz-focus-inner { border: 0; }
    .btn svg { width: 14px; height: 14px; display: block; }
    .btn.reset {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.02em;
      padding: 0 10px 0 12px;
      gap: 6px;
      color: rgba(255,255,255,0.72);
    }
    .btn.reset .kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 10px;
      line-height: 1;
      color: rgba(255,255,255,0.88);
      background: rgba(255,255,255,0.12);
      border-radius: 4px;
    }

    .count {
      font-variant-numeric: tabular-nums;
      color: #fff;
      font-weight: 500;
      padding: 0 8px;
      min-width: 42px;
      text-align: center;
      font-size: 12px;
    }
    .count .sep { color: rgba(255,255,255,0.45); margin: 0 3px; font-weight: 400; }
    .count .total { color: rgba(255,255,255,0.55); }

    .divider {
      width: 1px;
      height: 14px;
      background: rgba(255,255,255,0.18);
      margin: 0 2px;
    }

    /* ── Print: one page per slide, no chrome ────────────────────────────
       The screen layout stacks every slide at inset:0 inside a scaled
       canvas; for print we want them in document flow at the authored
       design size so the browser paginates one slide per sheet. The
       @page size is set from the width/height attributes via the inline
       <style id="deck-stage-print-page"> that connectedCallback injects
       into <head> (the @page at-rule has no effect inside shadow DOM). */
    @media print {
      :host {
        position: static;
        inset: auto;
        background: none;
        overflow: visible;
        color: inherit;
      }
      .stage { position: static; display: block; }
      .canvas {
        transform: none !important;
        width: auto !important;
        height: auto !important;
        background: none;
        will-change: auto;
      }
      ::slotted(*) {
        position: relative !important;
        inset: auto !important;
        width: var(--deck-design-w) !important;
        height: var(--deck-design-h) !important;
        box-sizing: border-box !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto;
        break-after: page;
        page-break-after: always;
        break-inside: avoid;
        overflow: hidden;
      }
      ::slotted(*:last-child) {
        break-after: auto;
        page-break-after: auto;
      }
      .overlay, .tapzones { display: none !important; }
    }
  `;
  class DeckStage extends HTMLElement {
    static get observedAttributes() {
      return ['width', 'height', 'noscale'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._index = 0;
      this._slides = [];
      this._notes = [];
      this._hideTimer = null;
      this._mouseIdleTimer = null;
      this._onKey = this._onKey.bind(this);
      this._onResize = this._onResize.bind(this);
      this._onSlotChange = this._onSlotChange.bind(this);
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onTapBack = this._onTapBack.bind(this);
      this._onTapForward = this._onTapForward.bind(this);
    }
    get designWidth() {
      return parseInt(this.getAttribute('width'), 10) || DESIGN_W_DEFAULT;
    }
    get designHeight() {
      return parseInt(this.getAttribute('height'), 10) || DESIGN_H_DEFAULT;
    }
    connectedCallback() {
      this._render();
      this._loadNotes();
      this._syncPrintPageRule();
      window.addEventListener('keydown', this._onKey);
      window.addEventListener('resize', this._onResize);
      window.addEventListener('mousemove', this._onMouseMove, {
        passive: true
      });
      // Initial collection + layout happens via slotchange, which fires on mount.
    }
    disconnectedCallback() {
      window.removeEventListener('keydown', this._onKey);
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('mousemove', this._onMouseMove);
      if (this._hideTimer) clearTimeout(this._hideTimer);
      if (this._mouseIdleTimer) clearTimeout(this._mouseIdleTimer);
    }
    attributeChangedCallback() {
      if (this._canvas) {
        this._canvas.style.width = this.designWidth + 'px';
        this._canvas.style.height = this.designHeight + 'px';
        this._canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
        this._canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
        this._fit();
        this._syncPrintPageRule();
      }
    }
    _render() {
      const style = document.createElement('style');
      style.textContent = stylesheet;
      const stage = document.createElement('div');
      stage.className = 'stage';
      const canvas = document.createElement('div');
      canvas.className = 'canvas';
      canvas.style.width = this.designWidth + 'px';
      canvas.style.height = this.designHeight + 'px';
      canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
      canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
      const slot = document.createElement('slot');
      slot.addEventListener('slotchange', this._onSlotChange);
      canvas.appendChild(slot);
      stage.appendChild(canvas);

      // Tap zones (mobile): left third = back, right third = forward.
      const tapzones = document.createElement('div');
      tapzones.className = 'tapzones export-hidden';
      tapzones.setAttribute('aria-hidden', 'true');
      tapzones.setAttribute('data-noncommentable', '');
      const tzBack = document.createElement('div');
      tzBack.className = 'tapzone tapzone--back';
      const tzMid = document.createElement('div');
      tzMid.className = 'tapzone tapzone--mid';
      tzMid.style.pointerEvents = 'none';
      const tzFwd = document.createElement('div');
      tzFwd.className = 'tapzone tapzone--fwd';
      tzBack.addEventListener('click', this._onTapBack);
      tzFwd.addEventListener('click', this._onTapForward);
      tapzones.append(tzBack, tzMid, tzFwd);

      // Overlay: compact, solid black, with clickable controls.
      const overlay = document.createElement('div');
      overlay.className = 'overlay export-hidden';
      overlay.setAttribute('role', 'toolbar');
      overlay.setAttribute('aria-label', 'Deck controls');
      overlay.setAttribute('data-noncommentable', '');
      overlay.innerHTML = `
        <button class="btn prev" type="button" aria-label="Previous slide" title="Previous (←)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>
        </button>
        <span class="count" aria-live="polite"><span class="current">1</span><span class="sep">/</span><span class="total">1</span></span>
        <button class="btn next" type="button" aria-label="Next slide" title="Next (→)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
        </button>
        <span class="divider"></span>
        <button class="btn reset" type="button" aria-label="Reset to first slide" title="Reset (R)">Reset<span class="kbd">R</span></button>
      `;
      overlay.querySelector('.prev').addEventListener('click', () => this._go(this._index - 1, 'click'));
      overlay.querySelector('.next').addEventListener('click', () => this._go(this._index + 1, 'click'));
      overlay.querySelector('.reset').addEventListener('click', () => this._go(0, 'click'));
      this._root.append(style, stage, tapzones, overlay);
      this._canvas = canvas;
      this._slot = slot;
      this._overlay = overlay;
      this._countEl = overlay.querySelector('.current');
      this._totalEl = overlay.querySelector('.total');
    }

    /** @page must live in the document stylesheet — it's a no-op inside
     *  shadow DOM. Inject/update a single <head> style tag so the print
     *  sheet matches the design size and Save-as-PDF yields one slide per
     *  page with no margins. */
    _syncPrintPageRule() {
      const id = 'deck-stage-print-page';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
        document.head.appendChild(tag);
      }
      tag.textContent = '@page { size: ' + this.designWidth + 'px ' + this.designHeight + 'px; margin: 0; } ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; overflow: visible !important; height: auto !important; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }';
    }
    _onSlotChange() {
      this._collectSlides();
      this._restoreIndex();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'init'
      });
      this._fit();
    }
    _collectSlides() {
      const assigned = this._slot.assignedElements({
        flatten: true
      });
      this._slides = assigned.filter(el => {
        // Skip template/style/script nodes even if someone slots them.
        const tag = el.tagName;
        return tag !== 'TEMPLATE' && tag !== 'SCRIPT' && tag !== 'STYLE';
      });
      this._slides.forEach((slide, i) => {
        const n = i + 1;
        // Determine a label for comment flow: prefer explicit data-label,
        // then an existing data-screen-label, then first heading, else "Slide".
        let label = slide.getAttribute('data-label');
        if (!label) {
          const existing = slide.getAttribute('data-screen-label');
          if (existing) {
            // Strip any leading number the author may have included.
            label = existing.replace(/^\s*\d+\s*/, '').trim() || existing;
          }
        }
        if (!label) {
          const h = slide.querySelector('h1, h2, h3, [data-title]');
          if (h) label = (h.textContent || '').trim().slice(0, 40);
        }
        if (!label) label = 'Slide';
        slide.setAttribute('data-screen-label', `${pad2(n)} ${label}`);

        // Validation attribute for comment flow / auto-checks.
        if (!slide.hasAttribute('data-om-validate')) {
          slide.setAttribute('data-om-validate', VALIDATE_ATTR);
        }
        slide.setAttribute('data-deck-slide', String(i));
      });
      if (this._totalEl) this._totalEl.textContent = String(this._slides.length || 1);
      if (this._index >= this._slides.length) this._index = Math.max(0, this._slides.length - 1);
    }
    _loadNotes() {
      const tag = document.getElementById('speaker-notes');
      if (!tag) {
        this._notes = [];
        return;
      }
      try {
        const parsed = JSON.parse(tag.textContent || '[]');
        if (Array.isArray(parsed)) this._notes = parsed;
      } catch (e) {
        console.warn('[deck-stage] Failed to parse #speaker-notes JSON:', e);
        this._notes = [];
      }
    }
    _restoreIndex() {
      // The host's ?slide= param is delivered as a #<int> hash (1-indexed) on
      // the iframe src. No hash → slide 1; the deck itself keeps no position
      // state across loads.
      const h = (location.hash || '').match(/^#(\d+)$/);
      if (h) {
        const n = parseInt(h[1], 10) - 1;
        if (n >= 0 && n < this._slides.length) this._index = n;
      }
    }
    _applyIndex({
      showOverlay = true,
      broadcast = true,
      reason = 'init'
    } = {}) {
      if (!this._slides.length) return;
      const prev = this._prevIndex == null ? -1 : this._prevIndex;
      const curr = this._index;
      // Keep the iframe's own hash in sync so an in-iframe location.reload()
      // (reload banner path in viewer-handle.ts) lands on the current slide,
      // not the stale deep-link hash from initial load.
      try {
        history.replaceState(null, '', '#' + (curr + 1));
      } catch (e) {}
      this._slides.forEach((s, i) => {
        if (i === curr) s.setAttribute('data-deck-active', '');else s.removeAttribute('data-deck-active');
      });
      if (this._countEl) this._countEl.textContent = String(curr + 1);
      if (broadcast) {
        // (1) Legacy: host-window postMessage for speaker-notes renderers.
        try {
          window.postMessage({
            slideIndexChanged: curr
          }, '*');
        } catch (e) {}

        // (2) In-page CustomEvent on the <deck-stage> element itself.
        //     Bubbles and composes out of shadow DOM so slide code can listen:
        //       document.querySelector('deck-stage').addEventListener('slidechange', e => {
        //         e.detail.index, e.detail.previousIndex, e.detail.total, e.detail.slide, e.detail.reason
        //       });
        const detail = {
          index: curr,
          previousIndex: prev,
          total: this._slides.length,
          slide: this._slides[curr] || null,
          previousSlide: prev >= 0 ? this._slides[prev] || null : null,
          reason: reason // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
        };
        this.dispatchEvent(new CustomEvent('slidechange', {
          detail,
          bubbles: true,
          composed: true
        }));
      }
      this._prevIndex = curr;
      if (showOverlay) this._flashOverlay();
    }
    _flashOverlay() {
      if (!this._overlay) return;
      this._overlay.setAttribute('data-visible', '');
      if (this._hideTimer) clearTimeout(this._hideTimer);
      this._hideTimer = setTimeout(() => {
        this._overlay.removeAttribute('data-visible');
      }, OVERLAY_HIDE_MS);
    }
    _fit() {
      if (!this._canvas) return;
      // PPTX export sets noscale so the DOM capture sees authored-size
      // geometry — the scaled canvas is in shadow DOM, so the exporter's
      // resetTransformSelector can't reach .canvas.style.transform directly.
      if (this.hasAttribute('noscale')) {
        this._canvas.style.transform = 'none';
        return;
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / this.designWidth, vh / this.designHeight);
      this._canvas.style.transform = `scale(${s})`;
    }
    _onResize() {
      this._fit();
    }
    _onMouseMove() {
      // Keep overlay visible while mouse moves; hide after idle.
      this._flashOverlay();
    }
    _onTapBack(e) {
      e.preventDefault();
      this._go(this._index - 1, 'tap');
    }
    _onTapForward(e) {
      e.preventDefault();
      this._go(this._index + 1, 'tap');
    }
    _onKey(e) {
      // Ignore when the user is typing.
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      let handled = true;
      if (key === 'ArrowRight' || key === 'PageDown' || key === ' ' || key === 'Spacebar') {
        this._go(this._index + 1, 'keyboard');
      } else if (key === 'ArrowLeft' || key === 'PageUp') {
        this._go(this._index - 1, 'keyboard');
      } else if (key === 'Home') {
        this._go(0, 'keyboard');
      } else if (key === 'End') {
        this._go(this._slides.length - 1, 'keyboard');
      } else if (key === 'r' || key === 'R') {
        this._go(0, 'keyboard');
      } else if (/^[0-9]$/.test(key)) {
        // 1..9 jump to that slide; 0 jumps to 10.
        const n = key === '0' ? 9 : parseInt(key, 10) - 1;
        if (n < this._slides.length) this._go(n, 'keyboard');
      } else {
        handled = false;
      }
      if (handled) {
        e.preventDefault();
        this._flashOverlay();
      }
    }
    _go(i, reason = 'api') {
      if (!this._slides.length) return;
      const clamped = Math.max(0, Math.min(this._slides.length - 1, i));
      if (clamped === this._index) {
        this._flashOverlay();
        return;
      }
      this._index = clamped;
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason
      });
    }

    // Public API ------------------------------------------------------------

    /** Current slide index (0-based). */
    get index() {
      return this._index;
    }
    /** Total slide count. */
    get length() {
      return this._slides.length;
    }
    /** Programmatically navigate. */
    goTo(i) {
      this._go(i, 'api');
    }
    next() {
      this._go(this._index + 1, 'api');
    }
    prev() {
      this._go(this._index - 1, 'api');
    }
    reset() {
      this._go(0, 'api');
    }
  }
  if (!customElements.get('deck-stage')) {
    customElements.define('deck-stage', DeckStage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flyer-deck/deck-stage.js", error: String((e && e.message) || e) }); }

// slides/AgendaSlide.jsx
try { (() => {
/* global React */
function AgendaSlide() {
  const items = [{
    n: '01',
    t: 'ビジョン',
    h: '弊社が目指す世界'
  }, {
    n: '02',
    t: '会社紹介',
    h: 'Hatenabase の概要'
  }, {
    n: '03',
    t: '事業内容',
    h: '3つの事業構成'
  }, {
    n: '04',
    t: '弊社の特徴',
    h: '会計×開発の融合'
  }, {
    n: '05',
    t: '提案の柱',
    h: 'ProSet による経理AX'
  }, {
    n: '06',
    t: '体制・進め方',
    h: '伴走の仕組み'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "slide s-content",
    "data-screen-label": "03 Agenda"
  }, /*#__PURE__*/React.createElement("img", {
    className: "s-logo",
    src: "../assets/logo/hatenabase-logo.png",
    alt: "Hatenabase"
  }), /*#__PURE__*/React.createElement("div", {
    className: "s-section"
  }, "\u76EE\u6B21 / Agenda"), /*#__PURE__*/React.createElement("h2", {
    className: "s-content__title"
  }, "\u672C\u65E5\u304A\u8A71\u3057\u3059\u308B\u5185\u5BB9"), /*#__PURE__*/React.createElement("p", {
    className: "s-content__sub"
  }, "\u63D0\u6848\u306E\u5168\u4F53\u50CF\u30926\u3064\u306E\u7AE0\u306B\u5206\u3051\u3066\u3054\u8AAC\u660E\u3057\u307E\u3059\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "agenda"
  }, items.map(x => /*#__PURE__*/React.createElement("div", {
    className: "agenda__row",
    key: x.n
  }, /*#__PURE__*/React.createElement("span", {
    className: "agenda__num"
  }, x.n), /*#__PURE__*/React.createElement("span", {
    className: "agenda__t"
  }, x.t), /*#__PURE__*/React.createElement("span", {
    className: "agenda__hint"
  }, x.h)))), /*#__PURE__*/React.createElement("div", {
    className: "s-num"
  }, "03 / 15"), /*#__PURE__*/React.createElement("div", {
    className: "s-copy"
  }, "\xA92026 Hatenabase, inc."));
}
window.AgendaSlide = AgendaSlide;
})(); } catch (e) { __ds_ns.__errors.push({ path: "slides/AgendaSlide.jsx", error: String((e && e.message) || e) }); }

// slides/ServiceSlide.jsx
try { (() => {
/* global React */
function ServiceSlide() {
  const items = [{
    n: '01',
    t: 'DX事業',
    d: 'kintone・Salesforce 導入と業務BPRをワンストップで提供。設計から運用定着まで内製チームが伴走。',
    r: '構成比 50–55%',
    saas: ['kintone', 'salesforce']
  }, {
    n: '02',
    t: '会計コンサル',
    d: '経理AX支援と資金調達。freee・OBC との協業による経理プロセスの自動化を実現。',
    r: '構成比 30–35%',
    saas: ['freee', 'kanjo', 'bakuraku']
  }, {
    n: '03',
    t: '研修・人材育成',
    d: '有償研修・自治体連携・BPOワーカー育成によるバックオフィス人材の供給。',
    r: '構成比 10–15%',
    saas: []
  }];
  const map = {
    freee: '../assets/saas-logos/freee.svg',
    kintone: '../assets/saas-logos/kintone.png',
    salesforce: '../assets/saas-logos/salesforce.jpg',
    bakuraku: '../assets/saas-logos/bakuraku.png',
    kanjo: '../assets/saas-logos/kanjo-bugyo.png'
  };
  return /*#__PURE__*/React.createElement("section", {
    className: "slide s-content",
    "data-screen-label": "06 Services"
  }, /*#__PURE__*/React.createElement("img", {
    className: "s-logo",
    src: "../assets/logo/hatenabase-logo.png",
    alt: "Hatenabase"
  }), /*#__PURE__*/React.createElement("div", {
    className: "s-section"
  }, "\u4E8B\u696D\u5185\u5BB9 / Services"), /*#__PURE__*/React.createElement("h2", {
    className: "s-content__title"
  }, "3\u3064\u306E\u4E8B\u696D\u3092\u5185\u88FD\u3067\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "s-content__sub"
  }, "BIG4\u306B\u306F\u306A\u3044\u958B\u767A\u529B\u3001SIer\u306B\u306F\u306A\u3044\u4F1A\u8A08\u77E5\u898B\u3001\u73FE\u5834\u306B\u5165\u308A\u8FBC\u3080BPR\u63A8\u9032\u529B\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "s3"
  }, items.map(x => /*#__PURE__*/React.createElement("div", {
    className: "c",
    key: x.n
  }, /*#__PURE__*/React.createElement("div", {
    className: "c__num"
  }, x.n), /*#__PURE__*/React.createElement("h3", {
    className: "c__t"
  }, x.t), /*#__PURE__*/React.createElement("p", {
    className: "c__d"
  }, x.d), x.saas.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "c__saas"
  }, x.saas.map(s => /*#__PURE__*/React.createElement("img", {
    src: map[s],
    alt: s,
    key: s
  }))), /*#__PURE__*/React.createElement("div", {
    className: "c__r"
  }, x.r)))), /*#__PURE__*/React.createElement("div", {
    className: "s-num"
  }, "06 / 15"), /*#__PURE__*/React.createElement("div", {
    className: "s-copy"
  }, "\xA92026 Hatenabase, inc."));
}
window.ServiceSlide = ServiceSlide;
})(); } catch (e) { __ds_ns.__errors.push({ path: "slides/ServiceSlide.jsx", error: String((e && e.message) || e) }); }

// slides/StatsSlide.jsx
try { (() => {
/* global React */
function StatsSlide() {
  return /*#__PURE__*/React.createElement("section", {
    className: "slide s-content",
    "data-screen-label": "12 Stats"
  }, /*#__PURE__*/React.createElement("img", {
    className: "s-logo",
    src: "../assets/logo/hatenabase-logo.png",
    alt: "Hatenabase"
  }), /*#__PURE__*/React.createElement("div", {
    className: "s-section"
  }, "\u5B9F\u7E3E / Track Record"), /*#__PURE__*/React.createElement("h2", {
    className: "s-content__title"
  }, "\u6570\u5B57\u3067\u898B\u308B\u3001Hatenabase\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "s-content__sub"
  }, "2026\u5E744\u6708\u6642\u70B9\u3002\u7D99\u7D9A\u652F\u63F4\u3092\u542B\u3080\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "stats4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "it"
  }, /*#__PURE__*/React.createElement("div", {
    className: "it__n"
  }, "150", /*#__PURE__*/React.createElement("span", {
    className: "it__u"
  }, "+")), /*#__PURE__*/React.createElement("div", {
    className: "it__l"
  }, "DX\u5C0E\u5165\u652F\u63F4\u5B9F\u7E3E")), /*#__PURE__*/React.createElement("div", {
    className: "it"
  }, /*#__PURE__*/React.createElement("div", {
    className: "it__n"
  }, "98", /*#__PURE__*/React.createElement("span", {
    className: "it__u"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "it__l"
  }, "\u7D99\u7D9A\u7387")), /*#__PURE__*/React.createElement("div", {
    className: "it"
  }, /*#__PURE__*/React.createElement("div", {
    className: "it__n"
  }, "5", /*#__PURE__*/React.createElement("span", {
    className: "it__u"
  }, "SaaS")), /*#__PURE__*/React.createElement("div", {
    className: "it__l"
  }, "\u516C\u5F0F\u30D1\u30FC\u30C8\u30CA\u30FC")), /*#__PURE__*/React.createElement("div", {
    className: "it"
  }, /*#__PURE__*/React.createElement("div", {
    className: "it__n"
  }, "3", /*#__PURE__*/React.createElement("span", {
    className: "it__u"
  }, "\u4E8B\u696D")), /*#__PURE__*/React.createElement("div", {
    className: "it__l"
  }, "\u5185\u88FD\u3067\u4FDD\u6709"))), /*#__PURE__*/React.createElement("div", {
    className: "flow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "n"
  }, "SaaS \u5C0E\u5165"), /*#__PURE__*/React.createElement("div", {
    className: "arr"
  }), /*#__PURE__*/React.createElement("div", {
    className: "n"
  }, "\u696D\u52D9BPR"), /*#__PURE__*/React.createElement("div", {
    className: "arr"
  }), /*#__PURE__*/React.createElement("div", {
    className: "n dark"
  }, "AI\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u9023\u643A"), /*#__PURE__*/React.createElement("div", {
    className: "arr"
  }), /*#__PURE__*/React.createElement("div", {
    className: "n"
  }, "\u81EA\u5F8B\u578B\u30D0\u30C3\u30AF\u30AA\u30D5\u30A3\u30B9")), /*#__PURE__*/React.createElement("p", {
    className: "flow-cap"
  }, "\u5F0A\u793E\u306F4\u30B9\u30C6\u30C3\u30D7\u3092\u5358\u72EC\u30D9\u30F3\u30C0\u30FC\u3067\u5B9F\u884C\u53EF\u80FD\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "s-num"
  }, "12 / 15"), /*#__PURE__*/React.createElement("div", {
    className: "s-copy"
  }, "\xA92026 Hatenabase, inc."));
}
window.StatsSlide = StatsSlide;
})(); } catch (e) { __ds_ns.__errors.push({ path: "slides/StatsSlide.jsx", error: String((e && e.message) || e) }); }

// slides/ThankYouSlide.jsx
try { (() => {
/* global React */
function ThankYouSlide() {
  return /*#__PURE__*/React.createElement("section", {
    className: "slide s-thanks",
    "data-screen-label": "15 Thank You"
  }, /*#__PURE__*/React.createElement("img", {
    className: "s-logo s-logo--white",
    src: "../assets/logo/hatenabase-logo.png",
    alt: "Hatenabase"
  }), /*#__PURE__*/React.createElement("h1", {
    className: "s-thanks__h"
  }, "Thank you."), /*#__PURE__*/React.createElement("p", {
    className: "s-thanks__sub"
  }, "\u7D4C\u7406AX\u306E\u7B2C\u4E00\u6B69\u3092\u3001Hatenabase \u3068\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "s-thanks__contact"
  }, /*#__PURE__*/React.createElement("span", null, "info@hatenabase.jp"), /*#__PURE__*/React.createElement("span", null, "https://hatenabase.jp")), /*#__PURE__*/React.createElement("div", {
    className: "s-num s-num--white"
  }, "15 / 15"), /*#__PURE__*/React.createElement("div", {
    className: "s-copy s-copy--white"
  }, "\xA92026 Hatenabase, inc."));
}
window.ThankYouSlide = ThankYouSlide;
})(); } catch (e) { __ds_ns.__errors.push({ path: "slides/ThankYouSlide.jsx", error: String((e && e.message) || e) }); }

// slides/TitleSlide.jsx
try { (() => {
/* global React */
function TitleSlide() {
  return /*#__PURE__*/React.createElement("section", {
    className: "slide s-title",
    "data-screen-label": "01 Title"
  }, /*#__PURE__*/React.createElement("div", {
    className: "s-title__bg",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 1280 720",
    preserveAspectRatio: "xMidYMid slice"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
    id: "tg1",
    cx: "0.85",
    cy: "0.2",
    r: "0.6"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#1a4775",
    stopOpacity: "1"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#0A2846",
    stopOpacity: "0"
  }))), /*#__PURE__*/React.createElement("rect", {
    width: "1280",
    height: "720",
    fill: "url(#tg1)"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "540",
    x2: "1280",
    y2: "440",
    stroke: "#fff",
    strokeOpacity: "0.05"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "580",
    x2: "1280",
    y2: "500",
    stroke: "#fff",
    strokeOpacity: "0.04"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "1080",
    cy: "180",
    r: "180",
    fill: "#fff",
    fillOpacity: "0.03"
  }))), /*#__PURE__*/React.createElement("img", {
    className: "s-logo s-logo--white",
    src: "../assets/logo/hatenabase-logo.png",
    alt: "Hatenabase"
  }), /*#__PURE__*/React.createElement("p", {
    className: "s-title__eyebrow"
  }, "Sales Proposal \xB7 2026"), /*#__PURE__*/React.createElement("h1", {
    className: "s-title__h1"
  }, "\u7D4C\u7406AX\u306B\u3088\u308B", /*#__PURE__*/React.createElement("br", null), "\u30D0\u30C3\u30AF\u30AA\u30D5\u30A3\u30B9\u306E\u81EA\u5F8B\u5316\u63D0\u6848"), /*#__PURE__*/React.createElement("p", {
    className: "s-title__sub"
  }, "SaaS\u3092\u300CAI\u306E\u5916\u90E8\u8A18\u61B6\u300D\u3068\u3057\u3066\u6D3B\u7528\u3057\u3001\u81EA\u5F8B\u578B\u30D0\u30C3\u30AF\u30AA\u30D5\u30A3\u30B9\u3092\u69CB\u7BC9\u3059\u308B\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "s-title__meta"
  }, /*#__PURE__*/React.createElement("span", null, "Hatenabase, inc."), /*#__PURE__*/React.createElement("span", null, "2026.05.04")), /*#__PURE__*/React.createElement("div", {
    className: "s-copy s-copy--white"
  }, "\xA92026 Hatenabase, inc."));
}
window.TitleSlide = TitleSlide;
})(); } catch (e) { __ds_ns.__errors.push({ path: "slides/TitleSlide.jsx", error: String((e && e.message) || e) }); }

// ui_kits/corporate-site/CTA.jsx
try { (() => {
/* global React */

function CTA() {
  return /*#__PURE__*/React.createElement("section", {
    className: "hb-cta-band",
    id: "cta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-container hb-cta-band__inner"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "h-heading hb-cta-band__title"
  }, "\u7D4C\u7406AX\u306E\u7B2C\u4E00\u6B69\u3092\u3001", /*#__PURE__*/React.createElement("br", null), "Hatenabase \u3068\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "t-lead"
  }, "60\u5206\u306E\u7121\u6599\u76F8\u8AC7\u3067\u3001\u73FE\u72B6\u3068\u6253\u3061\u624B\u3092\u6574\u7406\u3057\u307E\u3059\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "hb-cta-band__actions"
  }, /*#__PURE__*/React.createElement("a", {
    className: "hb-btn hb-btn--primary hb-btn--lg",
    href: "#"
  }, "\u7121\u6599\u76F8\u8AC7\u306F\u3053\u3061\u3089"), /*#__PURE__*/React.createElement("a", {
    className: "hb-btn hb-btn--outline hb-btn--lg",
    href: "#"
  }, "\u8CC7\u6599\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9"))));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    className: "hb-footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-container hb-footer__inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-footer__col"
  }, /*#__PURE__*/React.createElement("img", {
    className: "hb-footer__logo",
    src: "../../assets/logo/hatenabase-logo.png",
    alt: "Hatenabase"
  }), /*#__PURE__*/React.createElement("p", {
    className: "hb-footer__tag"
  }, "AI\u3067\u3001\u30D0\u30C3\u30AF\u30AA\u30D5\u30A3\u30B9\u3092\u81EA\u5F8B\u3055\u305B\u308B\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "hb-footer__col"
  }, /*#__PURE__*/React.createElement("p", {
    className: "hb-footer__h"
  }, "\u30B5\u30FC\u30D3\u30B9"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "DX\u4E8B\u696D\uFF08kintone / Salesforce\uFF09"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "\u4F1A\u8A08\u30B3\u30F3\u30B5\u30EB\u30C6\u30A3\u30F3\u30B0"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "\u7814\u4FEE\u30FB\u4EBA\u6750\u80B2\u6210"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "ProSet")), /*#__PURE__*/React.createElement("div", {
    className: "hb-footer__col"
  }, /*#__PURE__*/React.createElement("p", {
    className: "hb-footer__h"
  }, "\u4F1A\u793E\u60C5\u5831"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "\u4F1A\u793E\u6982\u8981"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "\u63A1\u7528\u60C5\u5831"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "\u304A\u554F\u3044\u5408\u308F\u305B"))), /*#__PURE__*/React.createElement("div", {
    className: "hb-footer__bottom"
  }, /*#__PURE__*/React.createElement("span", null, "\xA92026 Hatenabase, inc."), /*#__PURE__*/React.createElement("span", {
    className: "hb-footer__legal"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u30DD\u30EA\u30B7\u30FC"), " \xB7 ", /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "\u5229\u7528\u898F\u7D04"))));
}
window.CTA = CTA;
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/corporate-site/CTA.jsx", error: String((e && e.message) || e) }); }

// ui_kits/corporate-site/Cases.jsx
try { (() => {
/* global React */

function Cases() {
  const items = [{
    sec: '製造業',
    t: 'kintone × freee で月次決算を10日→3日に短縮',
    tag: 'DX × 会計',
    saas: ['kintone', 'freee']
  }, {
    sec: '士業事務所',
    t: 'AIエージェント導入による経理業務の自律化',
    tag: '経理AX',
    saas: ['freee', 'kanjo']
  }, {
    sec: '自治体連携',
    t: 'BPOワーカー育成プログラムの設計・運営',
    tag: '研修',
    saas: []
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "hb-cases",
    id: "case"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-container"
  }, /*#__PURE__*/React.createElement("p", {
    className: "t-eyebrow"
  }, "Case Studies"), /*#__PURE__*/React.createElement("h2", {
    className: "h-heading"
  }, "\u5C0E\u5165\u4E8B\u4F8B"), /*#__PURE__*/React.createElement("div", {
    className: "hb-cases__grid"
  }, items.map((x, i) => /*#__PURE__*/React.createElement("article", {
    className: "hb-case",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-case__media",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-case__placeholder"
  }, x.sec)), /*#__PURE__*/React.createElement("div", {
    className: "hb-case__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-case__meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "hb-case__tag"
  }, x.tag), /*#__PURE__*/React.createElement("span", {
    className: "hb-case__sec"
  }, x.sec)), /*#__PURE__*/React.createElement("h3", {
    className: "hb-case__title"
  }, x.t), x.saas.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "hb-case__saas"
  }, x.saas.map(s => /*#__PURE__*/React.createElement(SaasLogo, {
    key: s,
    name: s
  }))), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "hb-case__more"
  }, "\u4E8B\u4F8B\u3092\u8AAD\u3080 ", /*#__PURE__*/React.createElement("span", {
    className: "arr"
  }, "\u2192"))))))));
}
window.Cases = Cases;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/corporate-site/Cases.jsx", error: String((e && e.message) || e) }); }

// ui_kits/corporate-site/Faq.jsx
try { (() => {
/* global React */
const {
  useState: _useState
} = React;
function Faq() {
  const [open, setOpen] = _useState(0);
  const items = [{
    q: '相談は無料ですか。',
    a: '初回の60分無料相談を実施しています。現状ヒアリングと、可能な範囲での方向性のご提示までを含みます。'
  }, {
    q: 'kintone と Salesforce のどちらを選ぶべきか分かりません。',
    a: '事業規模・既存システム・将来の拡張性をふまえ、当社で要件整理から伴走します。中立的な比較レポートをご提供します。'
  }, {
    q: '研修事業は単独で依頼できますか。',
    a: 'はい。有償研修・自治体連携プログラム・BPOワーカー育成は単独でのご依頼に対応しています。'
  }, {
    q: '対応エリアは限定されますか。',
    a: '全国対応です。オンラインを基本とし、必要に応じて現地訪問も可能です。'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "hb-faq",
    id: "faq"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-container hb-faq__inner"
  }, /*#__PURE__*/React.createElement("p", {
    className: "t-eyebrow"
  }, "FAQ"), /*#__PURE__*/React.createElement("h2", {
    className: "h-heading"
  }, "\u3088\u304F\u3042\u308B\u3054\u8CEA\u554F"), /*#__PURE__*/React.createElement("div", {
    className: "hb-faq__list"
  }, items.map((x, i) => /*#__PURE__*/React.createElement("button", {
    className: "hb-faq__item " + (open === i ? "is-open" : ""),
    key: i,
    onClick: () => setOpen(open === i ? -1 : i)
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-faq__row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "hb-faq__q"
  }, x.q), /*#__PURE__*/React.createElement("span", {
    className: "hb-faq__icon"
  }, open === i ? '−' : '+')), open === i && /*#__PURE__*/React.createElement("p", {
    className: "hb-faq__a"
  }, x.a))))));
}
window.Faq = Faq;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/corporate-site/Faq.jsx", error: String((e && e.message) || e) }); }

// ui_kits/corporate-site/Header.jsx
try { (() => {
/* global React */
const {
  useState
} = React;
function Header() {
  return /*#__PURE__*/React.createElement("header", {
    className: "hb-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-container hb-header__inner"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "hb-header__logo"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/hatenabase-logo.png",
    alt: "Hatenabase"
  })), /*#__PURE__*/React.createElement("nav", {
    className: "hb-header__nav"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#service"
  }, "\u30B5\u30FC\u30D3\u30B9"), /*#__PURE__*/React.createElement("a", {
    href: "#case"
  }, "\u5C0E\u5165\u4E8B\u4F8B"), /*#__PURE__*/React.createElement("a", {
    href: "#about"
  }, "\u4F1A\u793E\u6982\u8981"), /*#__PURE__*/React.createElement("a", {
    href: "#faq"
  }, "FAQ"), /*#__PURE__*/React.createElement("a", {
    href: "#cta",
    className: "hb-btn hb-btn--primary hb-btn--sm"
  }, "\u7121\u6599\u76F8\u8AC7"))));
}
window.Header = Header;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/corporate-site/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/corporate-site/Hero.jsx
try { (() => {
/* global React */

function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    className: "hb-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-hero__bg",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 1440 720",
    preserveAspectRatio: "xMidYMid slice"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "g1",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#0A2846",
    stopOpacity: "0.06"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#0A2846",
    stopOpacity: "0"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "g2",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#0A2846",
    stopOpacity: "0.10"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#0A2846",
    stopOpacity: "0"
  }))), /*#__PURE__*/React.createElement("circle", {
    cx: "1180",
    cy: "220",
    r: "320",
    fill: "url(#g1)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "1300",
    cy: "180",
    r: "160",
    fill: "url(#g2)"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "640",
    x2: "1440",
    y2: "540",
    stroke: "#0A2846",
    strokeOpacity: "0.06",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "660",
    x2: "1440",
    y2: "600",
    stroke: "#0A2846",
    strokeOpacity: "0.04",
    strokeWidth: "1"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "hb-container hb-hero__inner"
  }, /*#__PURE__*/React.createElement("p", {
    className: "t-eyebrow"
  }, "Hatenabase, inc."), /*#__PURE__*/React.createElement("h1", {
    className: "h-hero hb-hero__title"
  }, "AI\u3067\u3001", /*#__PURE__*/React.createElement("br", null), "\u30D0\u30C3\u30AF\u30AA\u30D5\u30A3\u30B9\u3092", /*#__PURE__*/React.createElement("br", null), "\u81EA\u5F8B\u3055\u305B\u308B\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "t-lead hb-hero__lead"
  }, "freee\u30FBkintone\u7B49\u306ESaaS\u3092\u300CAI\u306E\u5916\u90E8\u8A18\u61B6\u300D\u3068\u3057\u3066\u6D3B\u7528\u3057\u3001", /*#__PURE__*/React.createElement("br", null), "\u81EA\u5F8B\u578B\u30D0\u30C3\u30AF\u30AA\u30D5\u30A3\u30B9\u3092\u69CB\u7BC9\u3059\u308B\u30B3\u30F3\u30B5\u30EB\u30C6\u30A3\u30F3\u30B0\u30D5\u30A1\u30FC\u30E0\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "hb-hero__cta"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#cta",
    className: "hb-btn hb-btn--primary"
  }, "\u7121\u6599\u76F8\u8AC7\u306F\u3053\u3061\u3089"), /*#__PURE__*/React.createElement("a", {
    href: "#service",
    className: "hb-btn hb-btn--ghost"
  }, "\u30B5\u30FC\u30D3\u30B9\u3092\u898B\u308B ", /*#__PURE__*/React.createElement("span", {
    className: "arr"
  }, "\u2192")))));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/corporate-site/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/corporate-site/Pain.jsx
try { (() => {
/* global React */

function Pain() {
  const items = [{
    n: '01',
    t: '経理が属人化し、月次が遅延する'
  }, {
    n: '02',
    t: 'SaaSを導入したが、活用しきれていない'
  }, {
    n: '03',
    t: 'AIを使いたいが、どこから始めるべきか不明'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "hb-pain"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-container"
  }, /*#__PURE__*/React.createElement("p", {
    className: "t-eyebrow"
  }, "Pain Points"), /*#__PURE__*/React.createElement("h2", {
    className: "h-heading"
  }, "\u3053\u3093\u306A\u8AB2\u984C\u3001\u3042\u308A\u307E\u305B\u3093\u304B\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "hb-pain__grid"
  }, items.map(x => /*#__PURE__*/React.createElement("div", {
    className: "hb-pain__item",
    key: x.n
  }, /*#__PURE__*/React.createElement("span", {
    className: "hb-pain__num"
  }, x.n), /*#__PURE__*/React.createElement("p", {
    className: "hb-pain__text"
  }, x.t))))));
}
window.Pain = Pain;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/corporate-site/Pain.jsx", error: String((e && e.message) || e) }); }

// ui_kits/corporate-site/Services.jsx
try { (() => {
/* global React */

function SaasLogo({
  name
}) {
  const map = {
    freee: {
      src: '../../assets/saas-logos/freee.svg',
      label: 'freee'
    },
    kintone: {
      src: '../../assets/saas-logos/kintone.png',
      label: 'kintone'
    },
    salesforce: {
      src: '../../assets/saas-logos/salesforce.jpg',
      label: 'Salesforce'
    },
    bakuraku: {
      src: '../../assets/saas-logos/bakuraku.png',
      label: 'バクラク'
    },
    kanjo: {
      src: '../../assets/saas-logos/kanjo-bugyo.png',
      label: '勘定奉行'
    }
  };
  const m = map[name];
  if (!m) return null;
  return /*#__PURE__*/React.createElement("img", {
    className: "hb-saas-logo",
    src: m.src,
    alt: m.label,
    title: m.label
  });
}
function Services() {
  const items = [{
    n: '01',
    tag: 'DX事業',
    t: 'kintone・Salesforce 導入と業務BPR',
    d: '業務要件の棚卸しから設計・実装・運用定着まで、現場に入り込んでBPRを推進。',
    saas: ['kintone', 'salesforce'],
    ratio: '50–55%'
  }, {
    n: '02',
    tag: '会計コンサルティング',
    t: '経理AX支援と資金調達',
    d: 'freee・OBC との協業による経理プロセスの自動化。資金調達支援まで一気通貫。',
    saas: ['freee', 'kanjo', 'bakuraku'],
    ratio: '30–35%'
  }, {
    n: '03',
    tag: '研修・人材育成',
    t: 'バックオフィス人材の供給',
    d: '有償研修・自治体連携・BPOワーカー育成によるバックオフィス人材の供給。',
    saas: [],
    ratio: '10–15%'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "hb-services",
    id: "service"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-container"
  }, /*#__PURE__*/React.createElement("p", {
    className: "t-eyebrow"
  }, "Services"), /*#__PURE__*/React.createElement("h2", {
    className: "h-heading"
  }, "3\u3064\u306E\u4E8B\u696D\u3092\u5185\u88FD\u3067\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "t-lead hb-services__lead"
  }, "BIG4\u306B\u306F\u306A\u3044\u958B\u767A\u529B\u3001SIer\u306B\u306F\u306A\u3044\u4F1A\u8A08\u77E5\u898B\u3001\u73FE\u5834\u306B\u5165\u308A\u8FBC\u3080BPR\u63A8\u9032\u529B\u3002", /*#__PURE__*/React.createElement("br", null), "\u3053\u306E3\u3064\u3092\u5185\u88FD\u3067\u6301\u3064\u552F\u4E00\u306E\u30D9\u30F3\u30C0\u30FC\u3067\u3059\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "hb-services__grid"
  }, items.map(x => /*#__PURE__*/React.createElement("article", {
    className: "hb-svc-card",
    key: x.n
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-svc-card__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "hb-svc-card__num"
  }, x.n), /*#__PURE__*/React.createElement("span", {
    className: "hb-svc-card__ratio"
  }, "\u69CB\u6210\u6BD4 ", x.ratio)), /*#__PURE__*/React.createElement("p", {
    className: "hb-svc-card__tag"
  }, x.tag), /*#__PURE__*/React.createElement("h3", {
    className: "h-subheading hb-svc-card__title"
  }, x.t), /*#__PURE__*/React.createElement("p", {
    className: "hb-svc-card__desc"
  }, x.d), x.saas.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "hb-svc-card__saas"
  }, x.saas.map(s => /*#__PURE__*/React.createElement(SaasLogo, {
    key: s,
    name: s
  }))), /*#__PURE__*/React.createElement("a", {
    className: "hb-svc-card__more",
    href: "#"
  }, "\u8A73\u3057\u304F\u898B\u308B ", /*#__PURE__*/React.createElement("span", {
    className: "arr"
  }, "\u2192")))))));
}
window.Services = Services;
window.SaasLogo = SaasLogo;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/corporate-site/Services.jsx", error: String((e && e.message) || e) }); }

// ui_kits/corporate-site/Stats.jsx
try { (() => {
/* global React */

function Stats() {
  const items = [{
    n: '150',
    u: '+',
    l: 'DX導入支援実績'
  }, {
    n: '98',
    u: '%',
    l: '継続率'
  }, {
    n: '5',
    u: 'SaaS',
    l: '公式パートナー'
  }, {
    n: '3',
    u: '事業',
    l: '内製で保有'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "hb-stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-container"
  }, /*#__PURE__*/React.createElement("p", {
    className: "t-eyebrow"
  }, "Track Record"), /*#__PURE__*/React.createElement("h2", {
    className: "h-heading"
  }, "\u6570\u5B57\u3067\u898B\u308B\u3001Hatenabase\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "hb-stats__grid"
  }, items.map((x, i) => /*#__PURE__*/React.createElement("div", {
    className: "hb-stats__item",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "hb-stats__num"
  }, x.n, /*#__PURE__*/React.createElement("span", {
    className: "hb-stats__unit"
  }, x.u)), /*#__PURE__*/React.createElement("div", {
    className: "hb-stats__label"
  }, x.l))))));
}
window.Stats = Stats;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/corporate-site/Stats.jsx", error: String((e && e.message) || e) }); }

})();
