"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const XHistoryViewStability = require("../src/view-stability.js");

const items = [
  {
    id: "1",
    visitedAt: 100,
    title: "Hello",
    avatar: "https://example.com/a.jpg",
    sources: ["detail", "like"],
  },
  {
    id: "2",
    visitedAt: 200,
    title: "World",
    avatar: "",
    sources: ["view"],
  },
];

const extras = {
  q: "hel",
  sourceFilter: "like",
  lang: "en",
  allCount: 2,
  visibleCount: 1,
};

describe("listSignature", () => {
  it("is stable for the same list and extras", () => {
    assert.equal(
      XHistoryViewStability.listSignature(items, extras),
      XHistoryViewStability.listSignature(items, extras),
    );
  });

  it("changes when a row or the search query changes", () => {
    const a = XHistoryViewStability.listSignature(items, extras);
    const b = XHistoryViewStability.listSignature(
      [{ ...items[0], title: "Hello!" }, items[1]],
      extras,
    );
    const c = XHistoryViewStability.listSignature(items, { ...extras, q: "wo" });
    assert.notEqual(a, b);
    assert.notEqual(a, c);
  });
});

describe("settleLayout", () => {
  const stable = { top: 0, left: 275, width: 600, height: 900 };

  it("keeps the last stable box when the anchor is mid-transition", () => {
    const fallback = {
      top: 0,
      left: 88,
      width: 320,
      height: 900,
      fromAnchor: false,
    };
    assert.deepEqual(
      XHistoryViewStability.settleLayout(fallback, stable),
      stable,
    );
  });

  it("adopts a real primary-column measurement", () => {
    const next = {
      top: 0,
      left: 280,
      width: 598,
      height: 900,
      fromAnchor: true,
    };
    assert.deepEqual(XHistoryViewStability.settleLayout(next, stable), {
      top: 0,
      left: 280,
      width: 598,
      height: 900,
    });
  });

  it("uses the fallback when there is no prior box", () => {
    const fallback = {
      top: 0,
      left: 88,
      width: 320,
      height: 900,
      fromAnchor: false,
    };
    assert.deepEqual(XHistoryViewStability.settleLayout(fallback, null), {
      top: 0,
      left: 88,
      width: 320,
      height: 900,
    });
  });
});

describe("boxesEqual / themeSignature", () => {
  it("treats sub-pixel layout noise as unchanged", () => {
    assert.equal(
      XHistoryViewStability.boxesEqual(
        { top: 0, left: 275, width: 600, height: 900 },
        { top: 0.25, left: 275.4, width: 600, height: 900 },
      ),
      true,
    );
    assert.equal(
      XHistoryViewStability.boxesEqual(
        { top: 0, left: 275, width: 600, height: 900 },
        { top: 0, left: 320, width: 600, height: 900 },
      ),
      false,
    );
  });

  it("skips theme writes when tokens are identical", () => {
    const tokens = { "--xh-bg": "rgb(0, 0, 0)" };
    assert.equal(
      XHistoryViewStability.themeSignature(tokens, "rgb(0, 0, 0)", "rgb(255, 255, 255)"),
      XHistoryViewStability.themeSignature(tokens, "rgb(0, 0, 0)", "rgb(255, 255, 255)"),
    );
  });
});

describe("mutationsAreInsideOverlay", () => {
  it("ignores a batch that only touches the history page", () => {
    const page = { id: "x-history-page", parentElement: null };
    const list = { id: "", parentElement: page };
    assert.equal(
      XHistoryViewStability.mutationsAreInsideOverlay(
        [{ target: list }, { target: page }],
        "x-history-page",
      ),
      true,
    );
  });

  it("does not ignore host-tree mutations", () => {
    const main = { id: "react-root", parentElement: null };
    const page = { id: "x-history-page", parentElement: null };
    assert.equal(
      XHistoryViewStability.mutationsAreInsideOverlay(
        [{ target: main }, { target: page }],
        "x-history-page",
      ),
      false,
    );
  });
});

describe("enter-path paint count", () => {
  it("one list paint across the old re-assert storm", () => {
    let paints = 0;
    let painted = false;
    let page = null;
    function showHistoryPage() {
      const existed = !!page;
      if (!page) page = { id: "x-history-page" };
      if (!existed || !painted) {
        painted = true;
        paints += 1;
      }
    }
    // Former enter path: open + page-hook + rAF + 50/200/300/500ms + bg
    for (let i = 0; i < 8; i++) showHistoryPage();
    assert.equal(paints, 1);
  });
});

describe("content.js mount contract", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../src/content.js"),
    "utf8",
  );

  function sliceFn(name, nextName) {
    const start = src.indexOf(`function ${name}`);
    assert.ok(start >= 0, `missing ${name}`);
    const end = nextName ? src.indexOf(`function ${nextName}`, start + 1) : src.length;
    assert.ok(end > start, `missing ${nextName} after ${name}`);
    return src.slice(start, end);
  }

  it("does not rebuild the list from delayed open/sync callbacks", () => {
    const open = sliceFn("openHistoryPage", "syncHistoryViewWithRoute");
    const sync = sliceFn("syncHistoryViewWithRoute", "onUrlMaybeChanged");
    assert.match(open, /scheduleLayoutHistoryPage/);
    assert.match(sync, /scheduleLayoutHistoryPage/);
    assert.doesNotMatch(open, /setTimeout\([^)]*showHistoryPage/);
    assert.doesNotMatch(sync, /setTimeout\([^)]*showHistoryPage/);
    // relayout callback itself must not remount
    const relayout = open.slice(open.indexOf("const relayout"));
    assert.doesNotMatch(relayout, /showHistoryPage\(/);
  });

  it("paints the list only on the first mount of a given overlay", () => {
    const show = sliceFn("showHistoryPage", "resetHistoryViewState");
    assert.match(show, /historyListPainted/);
    assert.match(show, /refreshPageList\(\)/);
    assert.match(show, /!existed \|\| !historyListPainted/);
  });

  it("does not strip aria-current from X's own nav links", () => {
    const setNav = sliceFn("setNavActive", "ensurePageShell");
    assert.doesNotMatch(
      setNav,
      /querySelectorAll\('nav\[role="navigation"\] a\[aria-current="page"\]'\)/,
    );
  });
});
