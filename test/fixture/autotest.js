(() => {
  "use strict";

  const statusEl = document.getElementById("fixture-status");
  const result = {
    navPresent: false,
    listWrites: 0,
    listWritesAfterEnter: 0,
    pageMounts: 0,
    cellsAfterEnter: 0,
    cellsAfterSearch: 0,
    cellsAfterClear: 0,
    ok: false,
    error: "",
  };

  const origInnerHTML = Object.getOwnPropertyDescriptor(
    Element.prototype,
    "innerHTML",
  );
  Object.defineProperty(Element.prototype, "innerHTML", {
    get() {
      return origInnerHTML.get.call(this);
    },
    set(value) {
      if (this.getAttribute && this.getAttribute("data-xh-list") !== null) {
        result.listWrites += 1;
      }
      return origInnerHTML.set.call(this, value);
    },
    configurable: true,
  });

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (n.id === "x-history-page") result.pageMounts += 1;
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  function setStatus(extra) {
    if (statusEl) {
      statusEl.textContent = JSON.stringify({ ...result, ...extra }, null, 2);
    }
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function run() {
    try {
      await sleep(80);
      const nav = document.getElementById("x-history-nav-item");
      result.navPresent = !!nav;
      if (!nav) throw new Error("Local History nav item was not injected");

      nav.click();
      await sleep(700);

      const page = document.getElementById("x-history-page");
      if (!page) throw new Error("History page did not mount");
      result.listWritesAfterEnter = result.listWrites;
      result.cellsAfterEnter = page.querySelectorAll(".xh-cell").length;

      const search = page.querySelector("[data-xh-search]");
      if (!search) throw new Error("Search input missing");
      search.focus();
      search.value = "Bob";
      search.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(250);
      result.cellsAfterSearch = page.querySelectorAll(".xh-cell").length;

      search.value = "";
      search.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(250);
      result.cellsAfterClear = page.querySelectorAll(".xh-cell").length;

      result.ok =
        result.navPresent &&
        result.pageMounts === 1 &&
        result.listWritesAfterEnter === 1 &&
        result.listWrites === 3 &&
        result.cellsAfterEnter === 3 &&
        result.cellsAfterSearch === 1 &&
        result.cellsAfterClear === 3;

      if (!result.ok) {
        result.error =
          "Unexpected paint/search counts (enter must write the list once; search/clear once each)";
      }
    } catch (err) {
      result.error = String(err && err.message ? err.message : err);
      result.ok = false;
    }
    setStatus();
    document.documentElement.setAttribute(
      "data-xh-fixture-result",
      JSON.stringify(result),
    );
    document.title = result.ok ? "FIXTURE_OK" : "FIXTURE_FAIL";
  }

  if (new URLSearchParams(location.search).get("autotest") === "1") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => setTimeout(run, 50));
    } else {
      setTimeout(run, 50);
    }
  } else {
    setStatus({ hint: "Click Local History" });
  }
})();
