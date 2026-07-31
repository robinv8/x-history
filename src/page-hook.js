/**
 * Runs in page MAIN world — SPA hooks + navigation that X's router can see.
 */
(() => {
  if (window.__xhPageHookInstalled) return;
  window.__xhPageHookInstalled = true;

  const emit = () => {
    try {
      document.documentElement.setAttribute("data-xh-url", location.href);
      document.documentElement.dispatchEvent(
        new CustomEvent("xh-locationchange", {
          bubbles: true,
          detail: { href: location.href, pathname: location.pathname },
        }),
      );
    } catch {
      // ignore
    }
  };

  const wrap = (name) => {
    const orig = history[name];
    if (typeof orig !== "function") return;
    history[name] = function (...args) {
      const ret = orig.apply(this, args);
      queueMicrotask(emit);
      return ret;
    };
  };

  wrap("pushState");
  wrap("replaceState");
  window.addEventListener("popstate", emit);
  window.addEventListener("hashchange", emit);

  // Content script asks MAIN world to push/replace so the entry is on the
  // same History object X uses (isolated-world pushState breaks Back).
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "x-history") return;

    try {
      if (data.type === "xh-push" && data.url) {
        history.pushState(
          data.state != null ? data.state : { xhHistory: true },
          "",
          data.url,
        );
        emit();
      } else if (data.type === "xh-replace" && data.url) {
        history.replaceState(
          data.state != null ? data.state : { xhHistory: true },
          "",
          data.url,
        );
        emit();
      }
    } catch (err) {
      console.warn("[X History] main navigate failed", err);
    }
  });

  emit();
})();
