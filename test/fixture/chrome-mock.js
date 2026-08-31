(() => {
  "use strict";

  const now = Date.now();
  const store = {
    xHistory: {
      status: [
        {
          id: "111",
          url: "https://x.com/alice/status/111",
          title: "Hello from Alice",
          subtitle: "@alice",
          author: "alice",
          avatar: "",
          visitedAt: now,
          firstSeenAt: now,
          sources: ["detail"],
          actions: { openedAt: now },
        },
        {
          id: "222",
          url: "https://x.com/bob/status/222",
          title: "Bob liked this",
          subtitle: "@bob",
          author: "bob",
          avatar: "",
          visitedAt: now - 3600_000,
          firstSeenAt: now - 3600_000,
          sources: ["like"],
          actions: { likedAt: now - 3600_000 },
        },
        {
          id: "333",
          url: "https://x.com/cara/status/333",
          title: "Careful read on Cara",
          subtitle: "@cara",
          author: "cara",
          avatar: "",
          visitedAt: now - 86_400_000,
          firstSeenAt: now - 86_400_000,
          sources: ["view"],
          actions: { viewedAt: now - 86_400_000 },
        },
      ],
    },
  };

  const changeListeners = [];

  window.chrome = {
    runtime: {
      onMessage: { addListener() {} },
      sendMessage() {},
    },
    storage: {
      local: {
        get(key) {
          if (typeof key === "string") {
            return Promise.resolve({ [key]: store[key] });
          }
          if (Array.isArray(key)) {
            const out = {};
            for (const k of key) out[k] = store[k];
            return Promise.resolve(out);
          }
          return Promise.resolve({ ...store });
        },
        set(obj) {
          Object.assign(store, obj);
          return Promise.resolve();
        },
      },
      onChanged: {
        addListener(fn) {
          changeListeners.push(fn);
        },
      },
    },
  };

  window.__xhFixtureStore = store;
  window.__xhFixtureEmitStorage = (changes) => {
    for (const fn of changeListeners) fn(changes, "local");
  };
})();
