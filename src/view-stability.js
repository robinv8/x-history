/**
 * Pure helpers that keep the Local History overlay from thrashing
 * while X's SPA layout settles. Loaded before content.js (same isolated world).
 */
const XHistoryViewStability = {
  /**
   * Signature of the visible list. Equal signatures mean the DOM rewrite can
   * be skipped (rewriting retriggers [data-xh-fresh] entrance animations).
   */
  listSignature(items, extras) {
    const extra = extras || {};
    const rows = (items || []).map((it) => [
      String(it.id || ""),
      Number(it.visitedAt) || 0,
      String(it.title || ""),
      String(it.avatar || ""),
      Array.isArray(it.sources) ? it.sources.join(",") : "",
    ]);
    return JSON.stringify([
      rows,
      extra.q || "",
      extra.sourceFilter || "",
      extra.lang || "",
      Number(extra.allCount) || 0,
      Number(extra.visibleCount) || rows.length,
    ]);
  },

  boxesEqual(a, b, eps) {
    const tol = typeof eps === "number" ? eps : 0.5;
    if (!a || !b) return false;
    return (
      Math.abs(a.top - b.top) <= tol &&
      Math.abs(a.left - b.left) <= tol &&
      Math.abs(a.width - b.width) <= tol &&
      Math.abs(a.height - b.height) <= tol
    );
  },

  /**
   * If the primary column is mid-transition (no usable anchor) and we already
   * have a stable box, keep it so the overlay does not jump to a fallback.
   */
  settleLayout(measured, lastStable) {
    if (!measured) return lastStable || null;
    if (!measured.fromAnchor && lastStable) return lastStable;
    return {
      top: measured.top,
      left: measured.left,
      width: measured.width,
      height: measured.height,
    };
  },

  themeSignature(tokens, bg, textColor) {
    return JSON.stringify([tokens || {}, bg || "", textColor || ""]);
  },

  /**
   * True when every recorded mutation lives inside our overlay — the host
   * MutationObserver should ignore those so list paints don't re-layout.
   */
  mutationsAreInsideOverlay(mutations, pageId) {
    if (!pageId || !mutations || !mutations.length) return false;
    return mutations.every((m) => {
      let node = m && m.target;
      while (node) {
        if (node.id === pageId) return true;
        node = node.parentElement || node.parentNode;
      }
      return false;
    });
  },
};

if (typeof globalThis !== "undefined") {
  globalThis.XHistoryViewStability = XHistoryViewStability;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = XHistoryViewStability;
}
