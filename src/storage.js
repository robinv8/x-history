/**
 * X History — local storage
 * Records post detail visits and list interactions (like / repost / reply / careful view).
 */
const XH_STORAGE_KEY = "xHistory";
const XH_MAX = 500;

/** Known source tags (stable for UI / filter). */
const XH_SOURCES = {
  detail: "detail",
  like: "like",
  repost: "repost",
  reply: "reply",
  view: "view",
  bookmark: "bookmark",
};

const XH_ACTION_KEYS = {
  detail: "openedAt",
  like: "likedAt",
  repost: "repostedAt",
  reply: "repliedAt",
  view: "viewedAt",
  bookmark: "bookmarkedAt",
};

const XHistoryStorage = {
  SOURCES: XH_SOURCES,
  ACTION_KEYS: XH_ACTION_KEYS,

  async getAll() {
    const data = await chrome.storage.local.get(XH_STORAGE_KEY);
    const store = data[XH_STORAGE_KEY] || {};
    // migrate: older versions stored { status: [], list: [] } or bare array
    let list;
    if (Array.isArray(store.status)) list = store.status;
    else if (Array.isArray(store)) list = store;
    else list = [];
    return list.map(normalizeItem);
  },

  async saveAll(items) {
    await chrome.storage.local.set({
      [XH_STORAGE_KEY]: { status: items.map(normalizeItem) },
    });
  },

  /**
   * Upsert by tweet id.
   * @param {object} item — must include id, url
   * @param {object} [opts]
   * @param {string} [opts.source] — XH_SOURCES value
   * @param {boolean} [opts.bump=true] — move to front / refresh visitedAt
   * @param {number} [opts.at] — timestamp
   */
  async upsert(item, opts = {}) {
    if (!item?.id || !item?.url) return null;

    const source = opts.source || XH_SOURCES.detail;
    const bump = opts.bump !== false;
    const at = typeof opts.at === "number" ? opts.at : Date.now();

    const list = await this.getAll();
    const existing = list.find((x) => x.id === String(item.id));

    const title = pickBetterText(item.title, existing?.title);
    const subtitle = pickBetterText(item.subtitle, existing?.subtitle);
    const author = item.author || existing?.author || "";
    const avatar = pickBetterAvatar(item.avatar, existing?.avatar);

    const sources = new Set([
      ...(existing?.sources || []),
      ...(Array.isArray(item.sources) ? item.sources : []),
      source,
    ]);
    // Legacy rows without sources: treat as detail
    if (existing && !existing.sources?.length && !item.sources?.length) {
      sources.add(XH_SOURCES.detail);
    }

    const actions = { ...(existing?.actions || {}) };
    if (item.actions && typeof item.actions === "object") {
      Object.assign(actions, item.actions);
    }
    const actionKey = XH_ACTION_KEYS[source];
    if (actionKey) actions[actionKey] = at;

    const firstSeenAt =
      existing?.firstSeenAt || existing?.visitedAt || item.firstSeenAt || at;

    // View-only re-hits: update viewedAt / sources but keep sort position
    // unless this is the first time we ever store the item.
    const shouldBump = bump || !existing;

    const next = {
      id: String(item.id),
      url: item.url || existing?.url || "",
      title: title || (author ? `@${author}` : "Post"),
      subtitle: subtitle || (author ? `@${author}` : ""),
      author,
      avatar,
      visitedAt: shouldBump ? at : existing?.visitedAt || at,
      firstSeenAt,
      sources: [...sources],
      actions,
    };

    const filtered = list.filter((x) => x.id !== next.id);
    if (shouldBump) filtered.unshift(next);
    else {
      // Keep previous index when not bumping
      const idx = list.findIndex((x) => x.id === next.id);
      if (idx >= 0) filtered.splice(idx, 0, next);
      else filtered.unshift(next);
    }

    await this.saveAll(filtered.slice(0, XH_MAX));
    return next;
  },

  async remove(id) {
    const list = await this.getAll();
    await this.saveAll(list.filter((x) => x.id !== String(id)));
  },

  async clear() {
    await this.saveAll([]);
  },
};

function normalizeItem(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      id: "",
      url: "",
      title: "",
      subtitle: "",
      author: "",
      avatar: "",
      visitedAt: 0,
      firstSeenAt: 0,
      sources: [],
      actions: {},
    };
  }
  const sources = Array.isArray(raw.sources)
    ? [...new Set(raw.sources.filter(Boolean))]
    : raw.id
      ? [XH_SOURCES.detail]
      : [];
  const actions =
    raw.actions && typeof raw.actions === "object" ? { ...raw.actions } : {};
  const visitedAt = Number(raw.visitedAt) || 0;
  return {
    id: String(raw.id || ""),
    url: raw.url || "",
    title: raw.title || "",
    subtitle: raw.subtitle || "",
    author: raw.author || "",
    avatar: raw.avatar || "",
    visitedAt,
    firstSeenAt: Number(raw.firstSeenAt) || visitedAt || 0,
    sources,
    actions,
  };
}

function pickBetterText(incoming, existing) {
  const a = (incoming || "").trim();
  const b = (existing || "").trim();
  if (!a) return b;
  if (!b) return a;
  if (a.length >= b.length) return a;
  return b;
}

function pickBetterAvatar(incoming, existing) {
  const a = (incoming || "").trim();
  const b = (existing || "").trim();
  if (a && /^https?:\/\//i.test(a)) return a;
  if (b && /^https?:\/\//i.test(b)) return b;
  return a || b || "";
}

globalThis.XHistoryStorage = XHistoryStorage;
