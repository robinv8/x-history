(() => {
  "use strict";

  const NAV_ID = "x-history-nav-item";
  const PAGE_ID = "x-history-page";
  // Use hash on a real X page so refresh never hits "page doesn't exist".
  // /i/xh-history is NOT a real X route and 404s on full reload.
  const HISTORY_HASH = "xh-history";

  let lastHref = "";
  let lastRecordedId = "";
  let historyViewActive = false;
  let pollTimer = null;
  const pendingRecordTimers = [];
  /** Prevent re-opening history while we clear #xh-history after side-nav click */
  let exitHistoryLock = false;
  /** History panel search query */
  let searchQuery = "";
  let searchDebounce = null;
  /** History panel source filter: "" | detail | like | repost | reply | view | bookmark */
  let sourceFilter = "";

  // Focus / capture runtime (accuracy-first)
  let lastDetailSig = "";
  let focusRawId = null;
  let focusCommittedId = null;
  let focusRawSince = 0;
  let focusCommittedSince = 0;
  let focusHardLockId = null;
  let focusHardLockUntil = 0;
  let focusDwellArmedFor = null;
  let focusLastScrollY = 0;
  let focusLastScrollT = 0;
  let focusScrollSpeed = 0;
  let focusRaf = 0;
  let focusIo = null;
  let lastViewRecorded = Object.create(null); // id -> ts
  let lastActionRecorded = Object.create(null); // `${id}:${source}` -> ts
  let repostMenuArticle = null;
  let repostMenuUntil = 0;

  // ——— i18n ———

  const I18N = {
    en: {
      nav: "History",
      title: "History",
      clear: "Clear",
      clearAria: "Clear history",
      clearConfirm: "Clear all browsing history?",
      emptyTitle: "No history yet",
      emptyDesc:
        "Posts you open, like, repost, reply to, or carefully read will show up here.",
      filterAll: "All",
      filterDetail: "Opened",
      filterLike: "Liked",
      filterRepost: "Reposted",
      filterReply: "Replied",
      filterView: "Read",
      filterBookmark: "Saved",
      sourceDetail: "Opened",
      sourceLike: "Liked",
      sourceRepost: "Reposted",
      sourceReply: "Replied",
      sourceView: "Read",
      sourceBookmark: "Saved",
      emptySearchTitle: "No results",
      emptySearchDesc: "Try a different name or keyword.",
      searchPlaceholder: "Search history",
      searchAria: "Search history",
      remove: "Remove from history",
      noTitle: "(No title)",
      tweetOf: (a) => `Post by @${a}`,
      tweetDetail: "Post",
      justNow: "now",
      minutes: (n) => `${n}m`,
      hours: (n) => `${n}h`,
      days: (n) => `${n}d`,
      docTitle: "History / X",
    },
    zh: {
      nav: "历史",
      title: "历史",
      clear: "清空",
      clearAria: "清空历史",
      clearConfirm: "清空全部浏览历史？",
      emptyTitle: "还没有历史记录",
      emptyDesc:
        "打开详情、点赞、转发、回复，或认真读过的帖会出现在这里。",
      filterAll: "全部",
      filterDetail: "打开过",
      filterLike: "赞过",
      filterRepost: "转发",
      filterReply: "回复",
      filterView: "读过",
      filterBookmark: "书签",
      sourceDetail: "打开",
      sourceLike: "赞",
      sourceRepost: "转",
      sourceReply: "回",
      sourceView: "读",
      sourceBookmark: "藏",
      emptySearchTitle: "没有匹配结果",
      emptySearchDesc: "试试其他用户名或关键词。",
      searchPlaceholder: "搜索历史",
      searchAria: "搜索历史",
      remove: "从历史中移除",
      noTitle: "(无标题)",
      tweetOf: (a) => `@${a} 的推文`,
      tweetDetail: "推文详情",
      justNow: "刚刚",
      minutes: (n) => `${n} 分钟`,
      hours: (n) => `${n} 小时`,
      days: (n) => `${n} 天`,
      docTitle: "历史 / X",
    },
    "zh-tw": {
      nav: "紀錄",
      title: "紀錄",
      clear: "清除",
      clearAria: "清除紀錄",
      clearConfirm: "清除全部瀏覽紀錄？",
      emptyTitle: "尚無紀錄",
      emptyDesc:
        "開啟詳情、按讚、轉發、回覆，或認真讀過的貼文會出現在這裡。",
      filterAll: "全部",
      filterDetail: "開啟",
      filterLike: "按讚",
      filterRepost: "轉發",
      filterReply: "回覆",
      filterView: "讀過",
      filterBookmark: "書籤",
      sourceDetail: "開啟",
      sourceLike: "讚",
      sourceRepost: "轉",
      sourceReply: "回",
      sourceView: "讀",
      sourceBookmark: "藏",
      emptySearchTitle: "沒有符合的結果",
      emptySearchDesc: "試試其他使用者名稱或關鍵字。",
      searchPlaceholder: "搜尋紀錄",
      searchAria: "搜尋紀錄",
      remove: "從紀錄中移除",
      noTitle: "(無標題)",
      tweetOf: (a) => `@${a} 的貼文`,
      tweetDetail: "貼文詳情",
      justNow: "剛剛",
      minutes: (n) => `${n} 分鐘`,
      hours: (n) => `${n} 小時`,
      days: (n) => `${n} 天`,
      docTitle: "紀錄 / X",
    },
    ja: {
      nav: "履歴",
      title: "履歴",
      clear: "消去",
      clearAria: "履歴を消去",
      clearConfirm: "閲覧履歴をすべて消去しますか？",
      emptyTitle: "履歴はまだありません",
      emptyDesc:
        "開いた・いいね・リポスト・返信・しっかり読んだポストがここに表示されます。",
      filterAll: "すべて",
      filterDetail: "開いた",
      filterLike: "いいね",
      filterRepost: "リポスト",
      filterReply: "返信",
      filterView: "読んだ",
      filterBookmark: "保存",
      sourceDetail: "開",
      sourceLike: "いいね",
      sourceRepost: "RP",
      sourceReply: "返信",
      sourceView: "読",
      sourceBookmark: "保存",
      emptySearchTitle: "結果なし",
      emptySearchDesc: "別のキーワードを試してください。",
      searchPlaceholder: "履歴を検索",
      searchAria: "履歴を検索",
      remove: "履歴から削除",
      noTitle: "(無題)",
      tweetOf: (a) => `@${a} のポスト`,
      tweetDetail: "ポスト",
      justNow: "今",
      minutes: (n) => `${n}分`,
      hours: (n) => `${n}時間`,
      days: (n) => `${n}日`,
      docTitle: "履歴 / X",
    },
    ko: {
      nav: "기록",
      title: "기록",
      clear: "지우기",
      clearAria: "기록 지우기",
      clearConfirm: "모든 방문 기록을 지울까요?",
      emptyTitle: "기록이 없습니다",
      emptyDesc:
        "열거나 좋아요·리포스트·답글·꼼꼼히 읽은 게시물이 여기에 표시됩니다.",
      filterAll: "전체",
      filterDetail: "열람",
      filterLike: "좋아요",
      filterRepost: "리포스트",
      filterReply: "답글",
      filterView: "읽음",
      filterBookmark: "북마크",
      sourceDetail: "열람",
      sourceLike: "좋아요",
      sourceRepost: "RP",
      sourceReply: "답글",
      sourceView: "읽음",
      sourceBookmark: "북마크",
      emptySearchTitle: "결과 없음",
      emptySearchDesc: "다른 키워드를 시도해 보세요.",
      searchPlaceholder: "기록 검색",
      searchAria: "기록 검색",
      remove: "기록에서 삭제",
      noTitle: "(제목 없음)",
      tweetOf: (a) => `@${a} 님의 게시물`,
      tweetDetail: "게시물",
      justNow: "지금",
      minutes: (n) => `${n}분`,
      hours: (n) => `${n}시간`,
      days: (n) => `${n}일`,
      docTitle: "기록 / X",
    },
    es: {
      nav: "Historial",
      title: "Historial",
      clear: "Borrar",
      clearAria: "Borrar historial",
      clearConfirm: "¿Borrar todo el historial?",
      emptyTitle: "Aún no hay historial",
      emptyDesc:
        "Aparecerán posts que abras, des con me gusta, repostees, respondas o leas con atención.",
      filterAll: "Todos",
      filterDetail: "Abiertos",
      filterLike: "Me gusta",
      filterRepost: "Repost",
      filterReply: "Respuestas",
      filterView: "Leídos",
      filterBookmark: "Guardados",
      sourceDetail: "Abierto",
      sourceLike: "Like",
      sourceRepost: "Repost",
      sourceReply: "Reply",
      sourceView: "Leído",
      sourceBookmark: "Guardado",
      emptySearchTitle: "Sin resultados",
      emptySearchDesc: "Prueba con otro nombre o palabra.",
      searchPlaceholder: "Buscar en el historial",
      searchAria: "Buscar en el historial",
      remove: "Quitar del historial",
      noTitle: "(Sin título)",
      tweetOf: (a) => `Post de @${a}`,
      tweetDetail: "Post",
      justNow: "ahora",
      minutes: (n) => `${n} min`,
      hours: (n) => `${n} h`,
      days: (n) => `${n} d`,
      docTitle: "Historial / X",
    },
    fr: {
      nav: "Historique",
      title: "Historique",
      clear: "Effacer",
      clearAria: "Effacer l’historique",
      clearConfirm: "Effacer tout l’historique ?",
      emptyTitle: "Pas encore d’historique",
      emptyDesc:
        "Les posts ouverts, aimés, repostés, auxquels vous répondez ou que vous lisez apparaîtront ici.",
      filterAll: "Tous",
      filterDetail: "Ouverts",
      filterLike: "Aimés",
      filterRepost: "Repost",
      filterReply: "Réponses",
      filterView: "Lus",
      filterBookmark: "Enregistrés",
      sourceDetail: "Ouvert",
      sourceLike: "Like",
      sourceRepost: "Repost",
      sourceReply: "Réponse",
      sourceView: "Lu",
      sourceBookmark: "Enreg.",
      emptySearchTitle: "Aucun résultat",
      emptySearchDesc: "Essayez un autre mot-clé.",
      searchPlaceholder: "Rechercher dans l’historique",
      searchAria: "Rechercher dans l’historique",
      remove: "Retirer de l’historique",
      noTitle: "(Sans titre)",
      tweetOf: (a) => `Post de @${a}`,
      tweetDetail: "Post",
      justNow: "maintenant",
      minutes: (n) => `${n} min`,
      hours: (n) => `${n} h`,
      days: (n) => `${n} j`,
      docTitle: "Historique / X",
    },
    de: {
      nav: "Verlauf",
      title: "Verlauf",
      clear: "Löschen",
      clearAria: "Verlauf löschen",
      clearConfirm: "Gesamten Verlauf löschen?",
      emptyTitle: "Noch kein Verlauf",
      emptyDesc:
        "Geöffnete, gelikte, repostete, beantwortete oder aufmerksam gelesene Posts erscheinen hier.",
      filterAll: "Alle",
      filterDetail: "Geöffnet",
      filterLike: "Geliked",
      filterRepost: "Repost",
      filterReply: "Antworten",
      filterView: "Gelesen",
      filterBookmark: "Gespeichert",
      sourceDetail: "Geöffnet",
      sourceLike: "Like",
      sourceRepost: "Repost",
      sourceReply: "Antwort",
      sourceView: "Gelesen",
      sourceBookmark: "Gespeichert",
      emptySearchTitle: "Keine Ergebnisse",
      emptySearchDesc: "Anderen Suchbegriff versuchen.",
      searchPlaceholder: "Verlauf durchsuchen",
      searchAria: "Verlauf durchsuchen",
      remove: "Aus Verlauf entfernen",
      noTitle: "(Kein Titel)",
      tweetOf: (a) => `Post von @${a}`,
      tweetDetail: "Post",
      justNow: "jetzt",
      minutes: (n) => `${n} Min.`,
      hours: (n) => `${n} Std.`,
      days: (n) => `${n} T.`,
      docTitle: "Verlauf / X",
    },
    pt: {
      nav: "Histórico",
      title: "Histórico",
      clear: "Limpar",
      clearAria: "Limpar histórico",
      clearConfirm: "Limpar todo o histórico?",
      emptyTitle: "Ainda sem histórico",
      emptyDesc:
        "Posts que você abrir, curtir, repostar, responder ou ler com atenção aparecem aqui.",
      filterAll: "Todos",
      filterDetail: "Abertos",
      filterLike: "Curtidos",
      filterRepost: "Repost",
      filterReply: "Respostas",
      filterView: "Lidos",
      filterBookmark: "Salvos",
      sourceDetail: "Aberto",
      sourceLike: "Like",
      sourceRepost: "Repost",
      sourceReply: "Resposta",
      sourceView: "Lido",
      sourceBookmark: "Salvo",
      emptySearchTitle: "Sem resultados",
      emptySearchDesc: "Tente outro nome ou palavra.",
      searchPlaceholder: "Buscar no histórico",
      searchAria: "Buscar no histórico",
      remove: "Remover do histórico",
      noTitle: "(Sem título)",
      tweetOf: (a) => `Post de @${a}`,
      tweetDetail: "Post",
      justNow: "agora",
      minutes: (n) => `${n} min`,
      hours: (n) => `${n} h`,
      days: (n) => `${n} d`,
      docTitle: "Histórico / X",
    },
    ru: {
      nav: "История",
      title: "История",
      clear: "Очистить",
      clearAria: "Очистить историю",
      clearConfirm: "Очистить всю историю?",
      emptyTitle: "Истории пока нет",
      emptyDesc:
        "Здесь появятся посты, которые вы открыли, лайкнули, сделали репост, ответили или внимательно прочитали.",
      filterAll: "Все",
      filterDetail: "Открытые",
      filterLike: "Лайки",
      filterRepost: "Репосты",
      filterReply: "Ответы",
      filterView: "Прочитанные",
      filterBookmark: "Закладки",
      sourceDetail: "Открыт",
      sourceLike: "Лайк",
      sourceRepost: "Репост",
      sourceReply: "Ответ",
      sourceView: "Чтение",
      sourceBookmark: "Закладка",
      emptySearchTitle: "Ничего не найдено",
      emptySearchDesc: "Попробуйте другой запрос.",
      searchPlaceholder: "Поиск по истории",
      searchAria: "Поиск по истории",
      remove: "Удалить из истории",
      noTitle: "(Без названия)",
      tweetOf: (a) => `Пост @${a}`,
      tweetDetail: "Пост",
      justNow: "сейчас",
      minutes: (n) => `${n} мин`,
      hours: (n) => `${n} ч`,
      days: (n) => `${n} д`,
      docTitle: "История / X",
    },
    ar: {
      nav: "السجل",
      title: "السجل",
      clear: "مسح",
      clearAria: "مسح السجل",
      clearConfirm: "هل تريد مسح كل السجل؟",
      emptyTitle: "لا يوجد سجل بعد",
      emptyDesc:
        "ستظهر هنا المنشورات التي تفتحها أو تعجب بها أو تعيد نشرها أو ترد عليها أو تقرأها بتمعن.",
      filterAll: "الكل",
      filterDetail: "مفتوح",
      filterLike: "إعجاب",
      filterRepost: "إعادة نشر",
      filterReply: "رد",
      filterView: "مقروء",
      filterBookmark: "محفوظ",
      sourceDetail: "فتح",
      sourceLike: "إعجاب",
      sourceRepost: "إعادة",
      sourceReply: "رد",
      sourceView: "قراءة",
      sourceBookmark: "حفظ",
      emptySearchTitle: "لا نتائج",
      emptySearchDesc: "جرّب كلمة أخرى.",
      searchPlaceholder: "البحث في السجل",
      searchAria: "البحث في السجل",
      remove: "إزالة من السجل",
      noTitle: "(بدون عنوان)",
      tweetOf: (a) => `منشور @${a}`,
      tweetDetail: "منشور",
      justNow: "الآن",
      minutes: (n) => `${n} د`,
      hours: (n) => `${n} س`,
      days: (n) => `${n} ي`,
      docTitle: "السجل / X",
    },
  };

  function detectLang() {
    const raw = (
      document.documentElement.lang ||
      document.querySelector('meta[http-equiv="content-language"]')?.content ||
      navigator.language ||
      "en"
    ).toLowerCase();

    if (I18N[raw]) return raw;
    if (raw.startsWith("zh-tw") || raw.startsWith("zh-hk") || raw === "zh-hant") {
      return "zh-tw";
    }
    if (raw.startsWith("zh")) return "zh";

    const base = raw.split("-")[0];
    if (I18N[base]) return base;

    // Infer from X's own nav labels when lang attr is missing/wrong
    const home = document.querySelector(
      'a[href="/home"], a[data-testid="AppTabBar_Home_Link"]',
    );
    const t = (home?.textContent || "").replace(/\s+/g, " ").trim();
    if (/首页|主页/.test(t)) return "zh";
    if (/首頁|主頁/.test(t)) return "zh-tw";
    if (/ホーム/.test(t)) return "ja";
    if (/홈/.test(t)) return "ko";
    if (/Inicio/i.test(t) && !/Home/i.test(t)) return "es";
    if (/Accueil/i.test(t)) return "fr";
    if (/Startseite/i.test(t)) return "de";

    return "en";
  }

  function t(key, ...args) {
    const pack = I18N[detectLang()] || I18N.en;
    const v = pack[key] ?? I18N.en[key];
    return typeof v === "function" ? v(...args) : v;
  }

  function applyNavLabelText(root = document.getElementById(NAV_ID)) {
    if (!root) return;
    const label = t("nav");
    root.querySelectorAll("[data-xh-label]").forEach((el) => {
      el.textContent = label;
    });
    if (root.tagName === "A") root.setAttribute("aria-label", label);
    root.setAttribute("aria-label", label);
    const link = root.tagName === "A" ? root : root.querySelector("a");
    if (link) link.setAttribute("aria-label", label);
  }

  // ——— MAIN-world navigation (so Back stack matches X) ———

  function mainNavigate(type, url, state) {
    window.postMessage(
      {
        source: "x-history",
        type, // "xh-push" | "xh-replace"
        url,
        state: state ?? { xhHistory: true },
      },
      "*",
    );
  }

  /**
   * Always open History on the Home shell (`/home#xh-history`) so it is not
   * stacked on Chat / full-width layouts. Hash keeps refresh from 404-ing.
   */
  function historyPageUrl() {
    return `${location.origin}/home#${HISTORY_HASH}`;
  }

  function isOnHomePath() {
    return normalizePath(location.pathname) === "/home";
  }

  /** If history hash is on a non-home route (legacy), move to /home#xh-history */
  function ensureHistoryHomeShell() {
    if (!isHistoryRoute()) return false;
    if (isOnHomePath()) return false;
    mainNavigate("xh-replace", historyPageUrl(), { xhHistory: true });
    return true;
  }

  function hashIsHistory(hash = location.hash) {
    const h = String(hash || "")
      .replace(/^#/, "")
      .replace(/^\//, "");
    return h === HISTORY_HASH;
  }

  // ——— Theme ———

  function parseRgb(input) {
    if (!input) return null;
    const m = String(input).match(
      /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i,
    );
    if (!m) return null;
    return {
      r: Number(m[1]),
      g: Number(m[2]),
      b: Number(m[3]),
      a: 1,
    };
  }

  function isTransparent(color) {
    if (!color || color === "transparent") return true;
    const m = String(color).match(
      /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?/i,
    );
    if (!m) return false;
    return m[4] !== undefined && Number(m[4]) === 0;
  }

  function firstOpaqueBg(el, depth = 8) {
    let cur = el;
    for (let i = 0; i < depth && cur; i++) {
      const bg = getComputedStyle(cur).backgroundColor;
      if (!isTransparent(bg)) return bg;
      cur = cur.parentElement;
    }
    return null;
  }

  function luminance(rgb) {
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  }

  function sampleTheme() {
    const root = document.documentElement;
    const body = document.body;
    if (!body) return;

    const primary = document.querySelector('[data-testid="primaryColumn"]');
    const bg =
      firstOpaqueBg(primary) ||
      firstOpaqueBg(body) ||
      getComputedStyle(body).backgroundColor ||
      "rgb(255, 255, 255)";

    const textEl =
      document.querySelector('nav[role="navigation"] a span') ||
      document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"] span') ||
      document.querySelector("main span") ||
      body;
    let textColor = getComputedStyle(textEl).color || "rgb(15, 20, 25)";

    const rgb = parseRgb(bg) || { r: 255, g: 255, b: 255 };
    const lum = luminance(rgb);
    const isDark = lum < 90;

    // Force readable text if sampling failed (e.g. white text on white)
    const textRgb = parseRgb(textColor);
    if (textRgb) {
      const textLum = luminance(textRgb);
      if (isDark && textLum < 100) textColor = "rgb(231, 233, 234)";
      if (!isDark && textLum > 180) textColor = "rgb(15, 20, 25)";
    } else {
      textColor = isDark ? "rgb(231, 233, 234)" : "rgb(15, 20, 25)";
    }

    let muted;
    let border;
    let hover;
    let headerBg;

    if (lum < 25) {
      // Lights out
      muted = "rgb(113, 118, 123)";
      border = "rgb(47, 51, 54)";
      hover = "rgba(255, 255, 255, 0.03)";
      headerBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.65)`;
    } else if (isDark) {
      // Dim
      muted = "rgb(139, 152, 165)";
      border = "rgb(56, 68, 77)";
      hover = "rgba(255, 255, 255, 0.03)";
      headerBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.75)`;
    } else {
      muted = "rgb(83, 100, 113)";
      border = "rgb(239, 243, 244)";
      hover = "rgba(0, 0, 0, 0.03)";
      headerBg = `rgba(255, 255, 255, 0.85)`;
    }

    let accent = "rgb(29, 155, 240)";
    const accentEl =
      document.querySelector('[data-testid="SideNav_NewTweet_Button"]') ||
      document.querySelector('a[href="/compose/post"]') ||
      document.querySelector('[data-testid="tweetButtonInline"]');
    if (accentEl) {
      const bgA = getComputedStyle(accentEl).backgroundColor;
      if (!isTransparent(bgA)) accent = bgA;
    }

    const tokens = {
      "--xh-bg": bg,
      "--xh-text": textColor,
      "--xh-muted": muted,
      "--xh-border": border,
      "--xh-hover": hover,
      "--xh-header-bg": headerBg,
      "--xh-accent": accent,
    };

    // Apply on :root AND the page node (page had local defaults that shadowed root)
    const page = document.getElementById(PAGE_ID);
    for (const [k, v] of Object.entries(tokens)) {
      root.style.setProperty(k, v);
      if (page) page.style.setProperty(k, v);
    }

    root.setAttribute("data-xh-theme", isDark ? "dark" : "light");
    if (page) {
      page.style.backgroundColor = bg;
      page.style.color = textColor;
    }
  }

  // ——— URL helpers ———

  function normalizePath(pathname) {
    try {
      return decodeURIComponent(pathname || "").replace(/\/+$/, "") || "/";
    } catch {
      return (pathname || "").replace(/\/+$/, "") || "/";
    }
  }

  function isHistoryRoute() {
    return hashIsHistory(location.hash);
  }

  function parseStatus(pathnameOrUrl) {
    let path = pathnameOrUrl || "";
    if (/^https?:\/\//i.test(path)) {
      try {
        path = new URL(path).pathname;
      } catch {
        /* keep */
      }
    }
    path = normalizePath(path);
    let m = path.match(/^\/i\/web\/status\/(\d+)/);
    if (m) return { id: m[1], author: "" };
    m = path.match(/^\/([^/]+)\/status\/(\d+)/);
    if (m) return { id: m[2], author: m[1] === "i" ? "" : m[1] };
    return null;
  }

  function statusUrl(id, author) {
    if (author) return `${location.origin}/${author}/status/${id}`;
    return `${location.origin}/i/web/status/${id}`;
  }

  // ——— Record / article meta ———

  /** Accuracy-first focus + view thresholds */
  const FOCUS_CFG = {
    readLineRatio: 0.38,
    minIntersection: 0.45,
    minVisiblePx: 120,
    scoreGapPx: 48,
    debounceMs: 800,
    dwellMs: 3000,
    vFast: 1.0, // px/ms — above this, freeze / clear raw focus
    hardLockTtlMs: 8000,
    viewCooldownMs: 10 * 60 * 1000,
    actionCooldownMs: 2500,
    viewEnabled: true,
    debug:
      typeof localStorage !== "undefined" &&
      localStorage.getItem("xhFocusDebug") === "1",
  };

  function upgradeAvatarUrl(url) {
    if (!url) return "";
    return String(url)
      .replace(/_mini\.(jpg|jpeg|png|webp)/i, "_bigger.$1")
      .replace(/_normal\.(jpg|jpeg|png|webp)/i, "_bigger.$1")
      .replace(/_x96\.(jpg|jpeg|png|webp)/i, "_bigger.$1");
  }

  function extractAvatarUrl(article, author) {
    if (!article) return "";

    const candidates = [
      article.querySelector('[data-testid="Tweet-User-Avatar"] img'),
      article.querySelector('[data-testid^="UserAvatar-Container"] img'),
      article.querySelector(
        'div[data-testid="UserAvatar-Container-' + (author || "") + '"] img',
      ),
      ...article.querySelectorAll('img[src*="profile_images"]'),
      ...article.querySelectorAll('img[src*="pbs.twimg.com"]'),
    ].filter(Boolean);

    for (const img of candidates) {
      const src = img.currentSrc || img.src || img.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) continue;
      if (/\/media\//i.test(src) || /\/emoji\//i.test(src)) continue;
      if (/profile_images/i.test(src) || /twimg\.com\/.*profile/i.test(src)) {
        return upgradeAvatarUrl(src);
      }
    }

    const bgNodes = article.querySelectorAll(
      '[data-testid="Tweet-User-Avatar"] div, [data-testid^="UserAvatar-Container"] div',
    );
    for (const node of bgNodes) {
      const bg = getComputedStyle(node).backgroundImage || "";
      const m = bg.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/i);
      if (m && /profile_images/i.test(m[1])) {
        return upgradeAvatarUrl(m[1]);
      }
    }

    return "";
  }

  function findPrimaryColumn() {
    return (
      document.querySelector('[data-testid="primaryColumn"]') ||
      document.querySelector('[role="main"]') ||
      document.querySelector("main") ||
      null
    );
  }

  function stickyHeaderOffset(column) {
    let offset = 0;
    const banner =
      document.querySelector('[data-testid="primaryColumn"] h2[role="heading"]')
        ?.closest?.("div") ||
      column?.querySelector?.('[data-testid="ScrollSnap-List"]')?.parentElement;
    // Prefer measuring X's sticky top bars inside the column
    const stickies = column
      ? column.querySelectorAll('[style*="position: sticky"], [style*="position:sticky"]')
      : [];
    for (const el of stickies) {
      const r = el.getBoundingClientRect();
      if (r.top <= 8 && r.height > 0 && r.height < 120) {
        offset = Math.max(offset, r.bottom);
      }
    }
    if (!offset) {
      // Fallback: typical top app bar ~53px
      offset = 53;
    }
    void banner;
    return offset;
  }

  /**
   * Resolve tweet id/author from an article card (list or detail).
   * Prefers the status time-link, then any /status/ link that isn't media-only.
   */
  function parseStatusFromArticle(article) {
    if (!article) return null;

    const timeLink = article.querySelector('a[href*="/status/"] time')?.closest("a");
    if (timeLink) {
      const p = parseStatus(timeLink.getAttribute("href") || "");
      if (p) return p;
    }

    const anchors = article.querySelectorAll('a[href*="/status/"]');
    let fallback = null;
    for (const a of anchors) {
      const href = a.getAttribute("href") || "";
      if (/\/status\/\d+\/(photo|video|analytics)/i.test(href)) {
        const p = parseStatus(href.replace(/\/(photo|video|analytics).*$/i, ""));
        if (p && !fallback) fallback = p;
        continue;
      }
      const p = parseStatus(href);
      if (p) return p;
    }
    return fallback;
  }

  function extractMetaFromArticle(article, parsedHint) {
    const parsed = parsedHint || parseStatusFromArticle(article);
    if (!parsed) return null;

    let title = "";
    let subtitle = "";
    let author = parsed.author || "";
    let avatar = "";

    if (article) {
      // Prefer primary tweet text, not quoted nested text when possible
      const textEl =
        article.querySelector('[data-testid="tweetText"]') ||
        article.querySelector('[data-testid="tweetText"] span');
      if (textEl) {
        title = (textEl.innerText || textEl.textContent || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 160);
      }
      if (!title) {
        if (article.querySelector('[data-testid="tweetPhoto"]')) title = "[图片]";
        else if (article.querySelector("video")) title = "[视频]";
      }
      const userName = article.querySelector('[data-testid="User-Name"]');
      if (userName) {
        const raw = userName.innerText || userName.textContent || "";
        const handleMatch = raw.match(/@(\w+)/);
        if (handleMatch) {
          author = handleMatch[1];
          subtitle = `@${handleMatch[1]}`;
        }
      }
      avatar = extractAvatarUrl(article, author);
    }

    if (!title && document.title) {
      const docT = document.title.replace(/\s*[|/].*$/, "").trim();
      const quote = docT.match(/[“"](.+?)[”"]/);
      if (quote) title = quote[1].slice(0, 160);
      else if (docT && !/^X$/.test(docT)) title = docT.slice(0, 160);
    }
    if (!title) title = author ? t("tweetOf", author) : t("tweetDetail");
    if (!subtitle && author) subtitle = `@${author}`;

    return {
      id: parsed.id,
      url: statusUrl(parsed.id, author || parsed.author),
      title,
      subtitle,
      author,
      avatar,
    };
  }

  function extractStatusMeta(parsed) {
    const column = findPrimaryColumn() || document;
    // Detail page: first main tweet in column
    const article =
      column.querySelector('article[data-testid="tweet"]') ||
      document.querySelector('article[data-testid="tweet"]');
    return (
      extractMetaFromArticle(article, parsed) || {
        id: parsed.id,
        url: statusUrl(parsed.id, parsed.author),
        title: parsed.author ? t("tweetOf", parsed.author) : t("tweetDetail"),
        subtitle: parsed.author ? `@${parsed.author}` : "",
        author: parsed.author || "",
        avatar: "",
      }
    );
  }

  async function recordMeta(meta, source, opts = {}) {
    if (!meta?.id || !meta?.url) return null;
    if (isHistoryRoute() || historyViewActive) return null;

    const src = source || XHistoryStorage.SOURCES.detail;
    const bump = opts.bump !== false;
    // Dedupe noisy repeats (esp. like toggles / focus dwell ticks)
    const key = `${meta.id}:${src}`;
    const now = Date.now();
    const cooldown =
      src === XHistoryStorage.SOURCES.view
        ? FOCUS_CFG.viewCooldownMs
        : FOCUS_CFG.actionCooldownMs;
    if (!opts.force && lastActionRecorded[key] && now - lastActionRecorded[key] < cooldown) {
      // Still allow meta enrichment for detail hydration
      if (src !== XHistoryStorage.SOURCES.detail) return null;
    }
    lastActionRecorded[key] = now;
    if (src === XHistoryStorage.SOURCES.view) {
      lastViewRecorded[meta.id] = now;
    }

    try {
      return await XHistoryStorage.upsert(meta, {
        source: src,
        bump,
        at: now,
      });
    } catch (err) {
      console.warn("[X History] record failed", err);
      return null;
    }
  }

  async function maybeRecord(force) {
    if (isHistoryRoute() || historyViewActive) return;
    try {
      const parsed = parseStatus(location.pathname);
      if (!parsed) return;
      const meta = extractStatusMeta(parsed);
      const sig = `${meta.id}:${meta.title}:${meta.avatar || ""}`;
      if (!force && sig === lastDetailSig) return;
      lastDetailSig = sig;
      lastRecordedId = meta.id;
      await recordMeta(meta, XHistoryStorage.SOURCES.detail, {
        bump: true,
        force: true,
      });
    } catch (err) {
      console.warn("[X History] detail record failed", err);
    }
  }

  function scheduleRecord() {
    if (isHistoryRoute() || historyViewActive) return;
    maybeRecord(false);
    while (pendingRecordTimers.length) clearTimeout(pendingRecordTimers.pop());
    [200, 600, 1200, 2500, 4500].forEach((ms, i, arr) => {
      pendingRecordTimers.push(
        setTimeout(() => maybeRecord(i === arr.length - 1), ms),
      );
    });
  }

  // ——— Focus engine (accuracy-first) ———
  // X scrolls inside nested containers — do NOT rely on window.scroll alone.

  let focusScrollRoots = new Set();
  let focusMetricY = 0;
  let focusHardLockMetricY = 0;
  let focusDebugLineEl = null;
  let focusTickTimer = 0;

  function isFocusDebugOn() {
    try {
      return (
        FOCUS_CFG.debug ||
        (typeof localStorage !== "undefined" &&
          localStorage.getItem("xhFocusDebug") === "1")
      );
    } catch {
      return !!FOCUS_CFG.debug;
    }
  }

  function listTweetArticles() {
    const col = findPrimaryColumn();
    const root = col || document;
    return [...root.querySelectorAll('article[data-testid="tweet"]')];
  }

  /** Viewport clip (screen space) — independent of primaryColumn document height */
  function getReadViewport() {
    const vv = window.visualViewport;
    const top = vv ? vv.offsetTop : 0;
    const height = vv ? vv.height : window.innerHeight;
    const width = vv ? vv.width : window.innerWidth;
    const col = findPrimaryColumn();
    let headerPad = 0;
    if (col) headerPad = stickyHeaderOffset(col);
    // Also clamp to column's horizontal band when available
    let left = 0;
    let right = width;
    if (col) {
      const cr = col.getBoundingClientRect();
      if (cr.width >= 100) {
        left = Math.max(0, cr.left);
        right = Math.min(width, cr.right);
      }
    }
    const contentTop = top + Math.max(headerPad, 0);
    const contentBottom = top + height;
    const contentH = Math.max(80, contentBottom - contentTop);
    const readY = contentTop + contentH * FOCUS_CFG.readLineRatio;
    return {
      top: contentTop,
      bottom: contentBottom,
      left,
      right,
      height: contentH,
      width: Math.max(0, right - left),
      readY,
    };
  }

  /**
   * Metric that changes when the *timeline* scrolls (nested or window).
   * First visible article top is a stable proxy for virtualized feeds.
   */
  function sampleTimelineMetric() {
    const articles = listTweetArticles();
    for (const a of articles) {
      const r = a.getBoundingClientRect();
      if (r.height > 8 && r.bottom > 0 && r.top < window.innerHeight) {
        return r.top;
      }
    }
    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  function scoreArticleForFocus(article, vp) {
    const r = article.getBoundingClientRect();
    if (r.height < 8 || r.width < 8) return null;

    // Must overlap viewport content band
    const top = Math.max(r.top, vp.top);
    const bottom = Math.min(r.bottom, vp.bottom);
    const visibleH = Math.max(0, bottom - top);
    if (visibleH <= 0) return null;

    // Horizontal: mostly inside main column
    if (vp.width > 0) {
      const midX = (r.left + r.right) / 2;
      if (midX < vp.left - 20 || midX > vp.right + 20) return null;
    }

    // Reading line must fall inside the card (core accuracy rule)
    if (vp.readY < r.top - 1 || vp.readY > r.bottom + 1) return null;

    const minPx = Math.min(FOCUS_CFG.minVisiblePx, r.height * 0.35);
    if (visibleH < minPx) return null;

    const ratio = visibleH / r.height;
    // Allow tall cards that are only partially on screen if the line is well inside
    const inset = Math.min(vp.readY - r.top, r.bottom - vp.readY);
    if (ratio < 0.2 && inset < 40) return null;

    // Score: prefer line deep inside card + more visible area (lower is better)
    const edgePenalty = inset < 16 ? 24 : 0;
    const score = -inset * 2 + edgePenalty - visibleH * 0.015;

    return { article, visibleH, ratio, inset, score };
  }

  function pickRawFocusCandidate() {
    if (isHistoryRoute() || historyViewActive) return null;

    // Fast scroll: freeze claiming (hard-lock still handled outside)
    if (focusScrollSpeed > FOCUS_CFG.vFast) return null;

    const vp = getReadViewport();
    const scored = [];

    for (const article of listTweetArticles()) {
      if (article.querySelector('[data-testid="placementTracking"]')) continue;
      const vis = scoreArticleForFocus(article, vp);
      if (!vis) continue;
      const parsed = parseStatusFromArticle(article);
      if (!parsed) continue;
      scored.push({ ...vis, id: parsed.id });
    }

    if (!scored.length) return null;
    scored.sort((a, b) => a.score - b.score);
    const best = scored[0];
    const second = scored[1];
    // Ambiguous only when two cards both contain the line with near scores
    if (
      second &&
      Math.abs(second.score - best.score) < FOCUS_CFG.scoreGapPx &&
      Math.abs(second.inset - best.inset) < 20
    ) {
      return null;
    }
    return best;
  }

  function pickRawFocusId() {
    const now = Date.now();
    const geometric = pickRawFocusCandidate();
    const geoId = geometric?.id || null;

    // Hard-lock: keep until TTL, but release early if user clearly scrolled away
    if (focusHardLockId && now < focusHardLockUntil) {
      const metric = sampleTimelineMetric();
      const scrolledAway =
        Math.abs(metric - focusHardLockMetricY) > 280 &&
        geoId &&
        geoId !== focusHardLockId;
      if (!scrolledAway) return focusHardLockId;
      // release
      focusHardLockId = null;
      focusHardLockUntil = 0;
    }

    return geoId;
  }

  function clearFocusDebugOutlines() {
    document.querySelectorAll("[data-xh-focus-outline]").forEach((el) => {
      el.removeAttribute("data-xh-focus-outline");
      el.style.removeProperty("outline");
      el.style.removeProperty("outline-offset");
    });
  }

  function ensureFocusDebugLine(vp) {
    if (!isFocusDebugOn()) {
      if (focusDebugLineEl) {
        focusDebugLineEl.remove();
        focusDebugLineEl = null;
      }
      return;
    }
    if (!focusDebugLineEl) {
      focusDebugLineEl = document.createElement("div");
      focusDebugLineEl.id = "xh-focus-read-line";
      focusDebugLineEl.style.cssText =
        "position:fixed;left:0;right:0;height:0;border-top:1px dashed rgba(29,155,240,0.75);" +
        "z-index:2147483646;pointer-events:none;opacity:0.9;";
      document.documentElement.appendChild(focusDebugLineEl);
    }
    focusDebugLineEl.style.top = `${Math.round(vp.readY)}px`;
    if (vp.left || vp.right) {
      focusDebugLineEl.style.left = `${Math.round(vp.left)}px`;
      focusDebugLineEl.style.right = `${Math.round(window.innerWidth - vp.right)}px`;
    }
  }

  function findArticleById(id) {
    if (!id) return null;
    for (const article of listTweetArticles()) {
      const p = parseStatusFromArticle(article);
      if (p?.id === id) return article;
    }
    return null;
  }

  /**
   * Always re-paint against live DOM (virtual list recycles nodes).
   * committed = solid blue; raw-only (pending debounce) = dashed cyan.
   */
  function paintFocusDebug(rawId, committedId) {
    if (!isFocusDebugOn()) {
      clearFocusDebugOutlines();
      if (focusDebugLineEl) {
        focusDebugLineEl.remove();
        focusDebugLineEl = null;
      }
      return;
    }

    ensureFocusDebugLine(getReadViewport());
    clearFocusDebugOutlines();

    const paint = (id, dashed) => {
      const article = findArticleById(id);
      if (!article) return;
      article.setAttribute("data-xh-focus-outline", dashed ? "raw" : "committed");
      article.style.outline = dashed
        ? "2px dashed rgba(0, 200, 255, 0.9)"
        : "2px solid rgba(29,155,240,0.95)";
      article.style.outlineOffset = "-2px";
    };

    if (committedId) paint(committedId, false);
    if (rawId && rawId !== committedId) paint(rawId, true);
  }

  function hardLockFocus(id) {
    if (!id) return;
    focusHardLockId = String(id);
    focusHardLockUntil = Date.now() + FOCUS_CFG.hardLockTtlMs;
    focusHardLockMetricY = sampleTimelineMetric();
    focusRawId = focusHardLockId;
    focusRawSince = Date.now();
    focusCommittedId = focusHardLockId;
    focusCommittedSince = Date.now();
    focusDwellArmedFor = null;
    paintFocusDebug(focusRawId, focusCommittedId);
  }

  function tickFocus() {
    focusRaf = 0;
    if (isHistoryRoute() || historyViewActive) {
      focusRawId = null;
      focusCommittedId = null;
      paintFocusDebug(null, null);
      return;
    }

    // Nested scroll speed via timeline metric (not window.scrollY)
    const metric = sampleTimelineMetric();
    const t = performance.now();
    if (focusLastScrollT) {
      const dy = Math.abs(metric - focusMetricY);
      const dt = Math.max(1, t - focusLastScrollT);
      // Only treat as motion if geometry actually moved
      if (dy > 0.5) {
        const inst = dy / dt;
        focusScrollSpeed = focusScrollSpeed * 0.55 + inst * 0.45;
      }
    }
    focusMetricY = metric;
    focusLastScrollY = metric;
    focusLastScrollT = t;

    const now = Date.now();
    const raw = pickRawFocusId();

    if (raw !== focusRawId) {
      focusRawId = raw;
      focusRawSince = now;
    }

    if (
      focusRawId &&
      now - focusRawSince >= FOCUS_CFG.debounceMs &&
      focusRawId !== focusCommittedId
    ) {
      focusCommittedId = focusRawId;
      focusCommittedSince = now;
      focusDwellArmedFor = focusCommittedId;
    } else if (!focusRawId) {
      if (!focusHardLockId || now >= focusHardLockUntil) {
        if (focusCommittedId && now - focusRawSince > 400) {
          focusCommittedId = null;
          focusCommittedSince = 0;
          focusDwellArmedFor = null;
        }
      }
    }

    // Debug paint every frame so outline tracks live DOM + scroll
    paintFocusDebug(focusRawId, focusCommittedId);

    // Careful-read view record
    if (
      FOCUS_CFG.viewEnabled &&
      focusDwellArmedFor &&
      focusCommittedId === focusDwellArmedFor &&
      now - focusCommittedSince >= FOCUS_CFG.dwellMs &&
      focusScrollSpeed <= FOCUS_CFG.vFast * 0.45
    ) {
      const id = focusCommittedId;
      const last = lastViewRecorded[id] || 0;
      if (now - last >= FOCUS_CFG.viewCooldownMs) {
        const article = findArticleById(id);
        const meta = extractMetaFromArticle(article, { id, author: "" });
        if (meta) {
          recordMeta(meta, XHistoryStorage.SOURCES.view, { bump: false });
        }
      }
      focusDwellArmedFor = null;
    }
  }

  function scheduleFocusTick() {
    if (focusRaf) return;
    focusRaf = requestAnimationFrame(tickFocus);
  }

  function onFocusScrollEvent() {
    scheduleFocusTick();
  }

  function bindScrollRoot(el) {
    if (!el || focusScrollRoots.has(el)) return;
    focusScrollRoots.add(el);
    el.addEventListener("scroll", onFocusScrollEvent, {
      passive: true,
      capture: true,
    });
  }

  function discoverScrollRoots() {
    bindScrollRoot(window);
    bindScrollRoot(document);
    bindScrollRoot(document.documentElement);
    bindScrollRoot(document.body);

    const col = findPrimaryColumn();
    const seeds = [
      col,
      document.querySelector('[data-testid="primaryColumn"]'),
      document.querySelector('main[role="main"]'),
      document.querySelector("[data-testid='cellInnerDiv']")?.parentElement,
    ].filter(Boolean);

    for (const seed of seeds) {
      let el = seed;
      for (let i = 0; i < 12 && el; i++) {
        try {
          const st = getComputedStyle(el);
          const oy = st.overflowY;
          if (
            (oy === "auto" || oy === "scroll" || oy === "overlay") &&
            el.scrollHeight > el.clientHeight + 20
          ) {
            bindScrollRoot(el);
          }
        } catch {
          /* ignore */
        }
        el = el.parentElement;
      }
    }

    // Any scrollable under main (X often uses a tall region)
    document.querySelectorAll("main div").forEach((div) => {
      if (focusScrollRoots.size > 24) return;
      try {
        const st = getComputedStyle(div);
        if (
          (st.overflowY === "auto" ||
            st.overflowY === "scroll" ||
            st.overflowY === "overlay") &&
          div.scrollHeight > div.clientHeight + 40 &&
          div.clientHeight > 200
        ) {
          bindScrollRoot(div);
        }
      } catch {
        /* ignore */
      }
    });
  }

  function startFocusEngine() {
    focusMetricY = sampleTimelineMetric();
    focusLastScrollY = focusMetricY;
    focusLastScrollT = performance.now();

    discoverScrollRoots();

    // Capture-phase scroll on document catches bubbling from nested roots
    document.addEventListener("scroll", onFocusScrollEvent, {
      passive: true,
      capture: true,
    });
    window.addEventListener("scroll", onFocusScrollEvent, {
      passive: true,
      capture: true,
    });
    // Wheel/touch: X may scroll without a scroll event on window
    window.addEventListener("wheel", scheduleFocusTick, {
      passive: true,
      capture: true,
    });
    window.addEventListener("touchmove", scheduleFocusTick, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", scheduleFocusTick, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleFocusTick);
      window.visualViewport.addEventListener("scroll", scheduleFocusTick);
    }

    // High-frequency poll — primary fix for virtualized / nested scroll
    if (focusTickTimer) clearInterval(focusTickTimer);
    focusTickTimer = setInterval(() => {
      focusScrollSpeed *= 0.55;
      if (focusScrollSpeed < 0.04) focusScrollSpeed = 0;
      // Re-discover scroll roots occasionally (SPA layout swaps)
      if (Math.random() < 0.05) discoverScrollRoots();
      scheduleFocusTick();
    }, 100);

    if (focusIo) {
      try {
        focusIo.disconnect();
      } catch {
        /* ignore */
      }
    }
    focusIo = new MutationObserver(() => scheduleFocusTick());
    focusIo.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    document.addEventListener("selectionchange", () => {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return;
      const node = sel.anchorNode;
      const el = node?.nodeType === 1 ? node : node?.parentElement;
      const article = el?.closest?.('article[data-testid="tweet"]');
      if (!article) return;
      const parsed = parseStatusFromArticle(article);
      if (!parsed) return;
      hardLockFocus(parsed.id);
      focusDwellArmedFor = parsed.id;
      focusCommittedSince = Date.now() - Math.floor(FOCUS_CFG.dwellMs * 0.4);
    });

    scheduleFocusTick();
  }

  // ——— Interaction capture (L0) ———

  function closestTweetArticle(el) {
    return el?.closest?.('article[data-testid="tweet"]') || null;
  }

  function isInteractiveInTweet(el) {
    if (!el || !el.closest) return null;
    // Like / unlike
    if (el.closest('[data-testid="like"], [data-testid="unlike"]')) {
      return { source: XHistoryStorage.SOURCES.like, phase: "done" };
    }
    // Reply opens composer — count as intent
    if (el.closest('[data-testid="reply"]')) {
      return { source: XHistoryStorage.SOURCES.reply, phase: "done" };
    }
    // Bookmark
    if (
      el.closest(
        '[data-testid="bookmark"], [data-testid="removeBookmark"]',
      )
    ) {
      return { source: XHistoryStorage.SOURCES.bookmark, phase: "done" };
    }
    // Retweet button opens menu — wait for confirm
    if (el.closest('[data-testid="retweet"], [data-testid="unretweet"]')) {
      return { source: XHistoryStorage.SOURCES.repost, phase: "menu" };
    }
    // Confirmed repost / quote from menu
    if (
      el.closest(
        '[data-testid="retweetConfirm"], [data-testid="unretweetConfirm"]',
      )
    ) {
      return { source: XHistoryStorage.SOURCES.repost, phase: "done" };
    }
    // Quote tweet menu item (testid varies; also match role=menuitem text later)
    const menuitem = el.closest('[role="menuitem"], [role="menuitemcheckbox"]');
    if (menuitem) {
      const label = (
        menuitem.getAttribute("data-testid") ||
        menuitem.textContent ||
        ""
      ).toLowerCase();
      if (
        /retweetconfirm|unretweetconfirm|repost|reposted|quote|转贴|转推|轉發|引用|リポスト|인용/.test(
          label,
        ) ||
        menuitem.getAttribute("data-testid") === "retweetConfirm" ||
        menuitem.getAttribute("data-testid") === "unretweetConfirm"
      ) {
        return { source: XHistoryStorage.SOURCES.repost, phase: "done" };
      }
    }
    // Show more / expand text — careful read signal
    if (el.closest('[data-testid="tweet-text-show-more-link"]')) {
      return { source: XHistoryStorage.SOURCES.view, phase: "soft" };
    }
    const showMore = el.closest('[role="button"]');
    if (showMore && closestTweetArticle(showMore)) {
      const tx = (showMore.textContent || "").trim();
      if (
        /^(show more|显示更多|顯示更多|さらに表示|더 보기|mostrar más|afficher plus|mehr anzeigen|…|...)$/i.test(
          tx,
        ) ||
        /show more|显示更多|顯示更多/i.test(tx)
      ) {
        return { source: XHistoryStorage.SOURCES.view, phase: "soft" };
      }
    }
    // Photo / video open
    if (
      el.closest(
        '[data-testid="tweetPhoto"], [data-testid="videoPlayer"], a[href*="/photo/"], a[href*="/video/"]',
      )
    ) {
      return { source: XHistoryStorage.SOURCES.view, phase: "soft" };
    }
    return null;
  }

  async function captureFromArticle(article, source, opts = {}) {
    if (!article || !source) return;
    const meta = extractMetaFromArticle(article);
    if (!meta) return;
    hardLockFocus(meta.id);
    const bump = source !== XHistoryStorage.SOURCES.view;
    await recordMeta(meta, source, { bump, force: opts.force });
  }

  function onDocClickCapture(e) {
    if (isHistoryRoute() || historyViewActive) return;
    const tEl = e.target;
    if (!tEl || !tEl.closest) return;

    // Repost confirm may be outside the article (portaled menu)
    const action = isInteractiveInTweet(tEl);
    if (!action) return;

    let article = closestTweetArticle(tEl);

    if (action.phase === "menu" && action.source === XHistoryStorage.SOURCES.repost) {
      if (article) {
        repostMenuArticle = article;
        repostMenuUntil = Date.now() + 12_000;
      }
      return;
    }

    if (!article && action.source === XHistoryStorage.SOURCES.repost) {
      if (repostMenuArticle && Date.now() < repostMenuUntil) {
        article = repostMenuArticle;
      }
    }

    if (!article) return;

    if (action.phase === "soft") {
      // Soft signals: hard-lock focus + accelerate dwell, don't immediately force-write
      // unless show-more / media (then write view once)
      const parsed = parseStatusFromArticle(article);
      if (!parsed) return;
      hardLockFocus(parsed.id);
      focusDwellArmedFor = parsed.id;
      focusCommittedSince = Date.now() - Math.floor(FOCUS_CFG.dwellMs * 0.55);
      // Media / show-more: record careful view immediately (still accuracy-gated by cooldown)
      captureFromArticle(article, XHistoryStorage.SOURCES.view, { force: false });
      return;
    }

    if (action.source === XHistoryStorage.SOURCES.repost) {
      repostMenuArticle = null;
      repostMenuUntil = 0;
    }

    captureFromArticle(article, action.source);
  }

  function onVideoPlay(e) {
    if (isHistoryRoute() || historyViewActive) return;
    const video = e.target;
    if (!video || video.tagName !== "VIDEO") return;
    // Ignore tiny preview blips
    if (video.paused) return;
    const article = closestTweetArticle(video);
    if (!article) return;
    const parsed = parseStatusFromArticle(article);
    if (!parsed) return;
    hardLockFocus(parsed.id);
    // Require short play before counting as view
    const start = Date.now();
    const check = () => {
      if (video.paused || video.ended) return;
      if (Date.now() - start < 1500) {
        setTimeout(check, 400);
        return;
      }
      captureFromArticle(article, XHistoryStorage.SOURCES.view);
    };
    setTimeout(check, 400);
  }

  function startInteractionCapture() {
    document.addEventListener("click", onDocClickCapture, true);
    document.addEventListener("play", onVideoPlay, true);
  }

  /** Public debug helper */
  function getFocusedTweetId() {
    return focusCommittedId;
  }
  try {
    globalThis.__xhGetFocusedTweetId = getFocusedTweetId;
    globalThis.__xhFocusCfg = FOCUS_CFG;
  } catch {
    /* ignore */
  }

  // ——— Utils ———

  function formatTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const now = Date.now();
    const diff = Math.max(0, now - ts);
    if (diff < 60_000) return t("justNow");
    if (diff < 3_600_000) return t("minutes", Math.floor(diff / 60_000));
    if (diff < 86_400_000) return t("hours", Math.floor(diff / 3_600_000));
    if (diff < 86_400_000 * 7) return t("days", Math.floor(diff / 86_400_000));
    try {
      const lang = detectLang();
      const locale =
        lang === "zh" ? "zh-CN" : lang === "zh-tw" ? "zh-TW" : lang;
      return d.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
      });
    } catch {
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function avatarLetter(item) {
    const s = (item.author || item.subtitle || item.title || "?").replace(
      /^@/,
      "",
    );
    return (s[0] || "?").toUpperCase();
  }

  // ——— History page ———
  // Overlay on top of the current layout (home / chat / …). Do NOT inject into
  // React's primaryColumn or hide its children — that breaks layouts like Chat.

  function findContentAnchor() {
    return (
      document.querySelector('[data-testid="primaryColumn"]') ||
      document.querySelector('[role="main"]') ||
      document.querySelector("main") ||
      null
    );
  }

  let layoutRaf = 0;

  function layoutHistoryPage() {
    const page = document.getElementById(PAGE_ID);
    if (!page || !historyViewActive) return;

    const anchor = findContentAnchor();
    const nav =
      document.querySelector('header[role="banner"]') ||
      document.querySelector('nav[role="navigation"]');

    let top = 0;
    let left = 0;
    let width = Math.min(600, window.innerWidth);
    let height = window.innerHeight;

    if (anchor) {
      const r = anchor.getBoundingClientRect();
      // If anchor is effectively empty/zero (layout mid-transition), fall back
      if (r.width >= 200 && r.height >= 100) {
        top = Math.max(0, r.top);
        left = Math.max(0, r.left);
        width = r.width;
        height = Math.max(200, window.innerHeight - top);
      } else if (nav) {
        const nr = nav.getBoundingClientRect();
        left = nr.right;
        width = Math.min(600, window.innerWidth - left);
        height = window.innerHeight;
      }
    } else if (nav) {
      const nr = nav.getBoundingClientRect();
      left = nr.right;
      width = Math.max(320, window.innerWidth - left);
      height = window.innerHeight;
    }

    page.style.position = "fixed";
    page.style.top = `${top}px`;
    page.style.left = `${left}px`;
    page.style.width = `${width}px`;
    page.style.height = `${height}px`;
    page.style.zIndex = "5";
    page.style.overflow = "auto";
    page.style.boxSizing = "border-box";
  }

  function scheduleLayoutHistoryPage() {
    if (layoutRaf) cancelAnimationFrame(layoutRaf);
    layoutRaf = requestAnimationFrame(() => {
      layoutRaf = 0;
      layoutHistoryPage();
    });
  }

  function setNavActive(active) {
    const item = document.getElementById(NAV_ID);
    if (!item) return;
    item.classList.toggle("xh-nav-active", active);
    // Also toggle on row wrapper if id is on the <a>
    const row = item.closest?.("nav[role='navigation'] > *") || item.parentElement;
    if (row && row !== item) row.classList.toggle("xh-nav-row-active", active);

    if (active) {
      item.setAttribute("aria-current", "page");
      document
        .querySelectorAll('nav[role="navigation"] a[aria-current="page"]')
        .forEach((a) => {
          if (a.id !== NAV_ID) a.removeAttribute("aria-current");
        });
    } else {
      item.removeAttribute("aria-current");
    }
    // Prefer class over inline fontWeight so icon-rail CSS isn't overridden
    item.querySelectorAll("[data-xh-label]").forEach((span) => {
      span.classList.toggle("xh-label-active", active);
    });
  }

  function ensurePageShell() {
    let page = document.getElementById(PAGE_ID);
    if (page) return page;

    page = document.createElement("div");
    page.id = PAGE_ID;
    page.className = "xh-page";
    page.setAttribute("aria-label", t("title"));
    page.innerHTML = `
      <div class="xh-page-inner">
        <div class="xh-top" role="banner">
          <div class="xh-top-row">
            <h2 class="xh-top-title" role="heading" aria-level="1"></h2>
            <button type="button" class="xh-clear-btn" data-xh-clear>
              <span></span>
            </button>
          </div>
          <div class="xh-search">
            <svg class="xh-search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M10.25 3.75a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm-8.5 6.5a8.5 8.5 0 1 1 15.176 5.262l4.531 4.53-1.414 1.415-4.53-4.531A8.5 8.5 0 0 1 1.75 10.25z"/>
            </svg>
            <input type="search" class="xh-search-input" data-xh-search autocomplete="off" spellcheck="false" />
            <button type="button" class="xh-search-clear" data-xh-search-clear hidden aria-label="Clear">×</button>
          </div>
          <div class="xh-filters" data-xh-filters role="toolbar"></div>
        </div>
        <section class="xh-section" aria-label="" tabindex="-1">
          <div class="xh-stream" data-xh-list></div>
        </section>
      </div>
    `;
    applyPageChrome(page);

    const searchInput = page.querySelector("[data-xh-search]");
    if (searchInput) {
      searchInput.value = searchQuery;
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value || "";
        const clearBtn = page.querySelector("[data-xh-search-clear]");
        if (clearBtn) clearBtn.hidden = !searchQuery.trim();
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => refreshPageList(), 120);
      });
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (searchQuery) {
            e.preventDefault();
            e.stopPropagation();
            searchQuery = "";
            searchInput.value = "";
            const clearBtn = page.querySelector("[data-xh-search-clear]");
            if (clearBtn) clearBtn.hidden = true;
            refreshPageList();
          }
        }
      });
    }

    page.addEventListener("click", async (e) => {
      if (e.target.closest("[data-xh-search-clear]")) {
        e.preventDefault();
        searchQuery = "";
        const input = page.querySelector("[data-xh-search]");
        if (input) {
          input.value = "";
          input.focus();
        }
        const clearBtn = page.querySelector("[data-xh-search-clear]");
        if (clearBtn) clearBtn.hidden = true;
        refreshPageList();
        return;
      }
      if (e.target.closest("[data-xh-clear]")) {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(t("clearConfirm"))) {
          await XHistoryStorage.clear();
          searchQuery = "";
          sourceFilter = "";
          const input = page.querySelector("[data-xh-search]");
          if (input) input.value = "";
          await refreshPageList();
        }
        return;
      }
      const filterBtn = e.target.closest("[data-xh-filter]");
      if (filterBtn) {
        e.preventDefault();
        e.stopPropagation();
        sourceFilter = filterBtn.getAttribute("data-xh-filter") || "";
        applyPageChrome(page);
        await refreshPageList();
        return;
      }
      const del = e.target.closest("[data-xh-del]");
      if (del) {
        e.preventDefault();
        e.stopPropagation();
        await XHistoryStorage.remove(del.getAttribute("data-xh-del"));
        await refreshPageList();
        return;
      }
      // Tweet links: dismiss overlay; Back returns to path#xh-history
      const hit = e.target.closest("a.xh-cell-hit");
      if (hit) {
        historyViewActive = false;
        document.documentElement.removeAttribute("data-xh-history");
        page.remove();
      }
    });

    // Attach outside React trees so Chat/Home re-renders don't destroy us
    document.documentElement.appendChild(page);
    sampleTheme();
    return page;
  }

  function filterChipDefs() {
    return [
      { id: "", labelKey: "filterAll" },
      { id: "detail", labelKey: "filterDetail" },
      { id: "like", labelKey: "filterLike" },
      { id: "repost", labelKey: "filterRepost" },
      { id: "reply", labelKey: "filterReply" },
      { id: "view", labelKey: "filterView" },
      { id: "bookmark", labelKey: "filterBookmark" },
    ];
  }

  function applyPageChrome(page) {
    if (!page) return;
    const title = t("title");
    page.setAttribute("aria-label", title);
    const h2 = page.querySelector(".xh-top-title");
    if (h2) h2.textContent = title;
    const clearBtn = page.querySelector("[data-xh-clear]");
    if (clearBtn) {
      clearBtn.setAttribute("aria-label", t("clearAria"));
      const span = clearBtn.querySelector("span");
      if (span) span.textContent = t("clear");
    }
    const section = page.querySelector(".xh-section");
    if (section) section.setAttribute("aria-label", title);
    const searchInput = page.querySelector("[data-xh-search]");
    if (searchInput) {
      searchInput.setAttribute("placeholder", t("searchPlaceholder"));
      searchInput.setAttribute("aria-label", t("searchAria"));
    }
    const searchClear = page.querySelector("[data-xh-search-clear]");
    if (searchClear) {
      searchClear.setAttribute("aria-label", t("clear"));
      searchClear.hidden = !String(searchQuery || "").trim();
    }
    const filters = page.querySelector("[data-xh-filters]");
    if (filters) {
      filters.innerHTML = filterChipDefs()
        .map((f) => {
          const active = sourceFilter === f.id ? " is-active" : "";
          return `<button type="button" class="xh-filter-chip${active}" data-xh-filter="${escapeHtml(f.id)}" aria-pressed="${sourceFilter === f.id ? "true" : "false"}">${escapeHtml(t(f.labelKey))}</button>`;
        })
        .join("");
    }
  }

  function sourceBadgesHtml(item) {
    const sources = Array.isArray(item.sources) ? item.sources : [];
    const order = ["like", "repost", "reply", "detail", "view", "bookmark"];
    const seen = new Set();
    const labels = [];
    for (const s of order) {
      if (!sources.includes(s) || seen.has(s)) continue;
      seen.add(s);
      const key =
        s === "detail"
          ? "sourceDetail"
          : s === "like"
            ? "sourceLike"
            : s === "repost"
              ? "sourceRepost"
              : s === "reply"
                ? "sourceReply"
                : s === "view"
                  ? "sourceView"
                  : s === "bookmark"
                    ? "sourceBookmark"
                    : null;
      if (!key) continue;
      labels.push(
        `<span class="xh-badge xh-badge-${escapeHtml(s)}" title="${escapeHtml(t(key))}">${escapeHtml(t(key))}</span>`,
      );
    }
    if (!labels.length) {
      labels.push(
        `<span class="xh-badge xh-badge-detail" title="${escapeHtml(t("sourceDetail"))}">${escapeHtml(t("sourceDetail"))}</span>`,
      );
    }
    return `<div class="xh-badges">${labels.join("")}</div>`;
  }

  function itemMatchesSource(item, filter) {
    if (!filter) return true;
    const sources = Array.isArray(item.sources) ? item.sources : [];
    if (!sources.length) return filter === "detail";
    return sources.includes(filter);
  }

  function normalizeSearch(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();
  }

  function itemMatchesQuery(item, q) {
    if (!q) return true;
    const hay = normalizeSearch(
      [item.title, item.subtitle, item.author, item.url, item.id]
        .filter(Boolean)
        .join(" "),
    );
    // Support multi-word: all tokens must match
    const tokens = q.split(/\s+/).filter(Boolean);
    return tokens.every((tok) => hay.includes(tok));
  }

  async function refreshPageList() {
    const page = document.getElementById(PAGE_ID);
    if (!page) return;
    applyPageChrome(page);
    const listEl = page.querySelector("[data-xh-list]");
    if (!listEl) return;

    // Keep input value if re-render
    const searchInput = page.querySelector("[data-xh-search]");
    if (searchInput && searchInput.value !== searchQuery) {
      searchInput.value = searchQuery;
    }

    const all = await XHistoryStorage.getAll();
    const q = normalizeSearch(searchQuery);
    let items = all.filter((it) => itemMatchesSource(it, sourceFilter));
    if (q) items = items.filter((it) => itemMatchesQuery(it, q));

    if (!all.length) {
      listEl.innerHTML = `
        <div class="xh-empty">
          <div class="xh-empty-title">${escapeHtml(t("emptyTitle"))}</div>
          <div class="xh-empty-desc">${escapeHtml(t("emptyDesc"))}</div>
        </div>`;
      return;
    }

    if (!items.length) {
      listEl.innerHTML = `
        <div class="xh-empty">
          <div class="xh-empty-title">${escapeHtml(t("emptySearchTitle"))}</div>
          <div class="xh-empty-desc">${escapeHtml(t("emptySearchDesc"))}</div>
        </div>`;
      return;
    }

    listEl.innerHTML = items
      .map((item) => {
        const handle = item.author ? `@${item.author}` : item.subtitle || "";
        const letter = avatarLetter(item);
        const avatar = (item.avatar || "").trim();
        const avatarHtml = avatar
          ? `<img class="xh-avatar-img" src="${escapeHtml(avatar)}" alt="" width="40" height="40" loading="lazy" decoding="async" referrerpolicy="no-referrer" /><span class="xh-avatar-fallback" hidden aria-hidden="true">${escapeHtml(letter)}</span>`
          : `<span class="xh-avatar-fallback" aria-hidden="true">${escapeHtml(letter)}</span>`;
        const ts = item.visitedAt || item.firstSeenAt || Date.now();
        return `
        <div class="xh-cell" data-testid="cellInnerDiv">
          <div class="xh-cell-inner">
            <a class="xh-cell-hit" href="${escapeHtml(item.url)}" aria-label="${escapeHtml(item.title)}">
              <div class="xh-avatar" aria-hidden="true">${avatarHtml}</div>
              <div class="xh-cell-body">
                <div class="xh-cell-head">
                  <span class="xh-handle">${escapeHtml(handle)}</span>
                  <span class="xh-dot" aria-hidden="true">·</span>
                  <time class="xh-time" datetime="${new Date(ts).toISOString()}">${formatTime(ts)}</time>
                </div>
                <div class="xh-cell-text">${escapeHtml(item.title || t("noTitle"))}</div>
                ${sourceBadgesHtml(item)}
              </div>
            </a>
            <button type="button" class="xh-del" data-xh-del="${escapeHtml(item.id)}" aria-label="${escapeHtml(t("remove"))}" title="${escapeHtml(t("remove"))}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z"/></svg>
            </button>
          </div>
        </div>`;
      })
      .join("");

    // Avatar load fallback (avoid inline onerror — blocked by page CSP)
    listEl.querySelectorAll(".xh-avatar-img").forEach((img) => {
      img.addEventListener("error", () => {
        img.style.display = "none";
        const fb = img.nextElementSibling;
        if (fb) fb.hidden = false;
      });
    });
  }

  function showHistoryPage() {
    if (exitHistoryLock) return;
    historyViewActive = true;
    document.documentElement.setAttribute("data-xh-history", "1");
    setNavActive(true);

    const page = ensurePageShell();
    if (page) {
      page.hidden = false;
      sampleTheme();
      refreshPageList();
      scheduleLayoutHistoryPage();
      // Layout can settle after X paints (esp. Chat)
      setTimeout(scheduleLayoutHistoryPage, 50);
      setTimeout(scheduleLayoutHistoryPage, 200);
    }

    document.title = t("docTitle");
  }

  function leaveHistoryPage() {
    if (!historyViewActive && !document.getElementById(PAGE_ID)) {
      document.documentElement.removeAttribute("data-xh-history");
      setNavActive(false);
      return;
    }
    historyViewActive = false;
    document.documentElement.removeAttribute("data-xh-history");
    setNavActive(false);
    const page = document.getElementById(PAGE_ID);
    if (page) page.remove();
  }

  /** Strip #xh-history without re-entering history view */
  function clearHistoryHash(mode = "replace") {
    if (!hashIsHistory()) return;
    const bare = `${location.origin}${location.pathname}${location.search}`;
    mainNavigate(mode === "push" ? "xh-push" : "xh-replace", bare, {});
  }

  /**
   * History lives at /home#xh-history. X treats another click on /home as no-op,
   * and programmatic pushState alone often won't re-render React routes.
   * So: exit history → clear hash → re-fire a real click on the menu link.
   */
  let navExitGuard = false;

  function bindSideNavExit() {
    document.addEventListener(
      "click",
      (e) => {
        if (navExitGuard) return;
        if (!historyViewActive && !isHistoryRoute()) return;
        if (e.target.closest(`#${NAV_ID}`)) return;
        if (e.target.closest(`#${PAGE_ID}`)) return;

        const link = e.target.closest("a[href]");
        if (!link) return;

        // Only left rail / app header nav — not random page links
        const shell = link.closest(
          'nav[role="navigation"], header[role="banner"]',
        );
        if (!shell) return;

        const hrefAttr = link.getAttribute("href") || "";
        if (
          !hrefAttr ||
          hrefAttr === "#" ||
          hrefAttr.startsWith("#") ||
          hrefAttr.startsWith("javascript:")
        ) {
          return;
        }

        try {
          const u = new URL(hrefAttr, location.origin);
          if (u.origin !== location.origin) return;
        } catch {
          return;
        }

        // Stop this click; we'll exit history then synthesize a clean one for X
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") {
          e.stopImmediatePropagation();
        }

        exitHistoryLock = true;
        leaveHistoryPage();

        const finishUnlock = () => {
          navExitGuard = false;
          exitHistoryLock = false;
        };

        const replayNavClick = () => {
          navExitGuard = true;
          try {
            // Real click so X's React router handles Explore / Notifications / etc.
            link.click();
          } catch (err) {
            console.warn("[X History] nav replay failed", err);
          }
          // Keep guard briefly so our capture handler ignores the synthetic click
          setTimeout(finishUnlock, 300);
        };

        if (hashIsHistory()) {
          // Clear #xh-history first (MAIN world), then replay after it applies
          clearHistoryHash("replace");
          setTimeout(replayNavClick, 30);
        } else {
          replayNavClick();
        }
      },
      true,
    );
  }

  function openHistoryPage() {
    if (isHistoryRoute() && isOnHomePath()) {
      document
        .getElementById(PAGE_ID)
        ?.querySelector(".xh-stream")
        ?.scrollTo?.(0, 0);
      showHistoryPage();
      return;
    }
    // Always land on Home layout first (not stacked on Chat)
    mainNavigate("xh-push", historyPageUrl(), { xhHistory: true });
    showHistoryPage();
    // X needs a beat to swap Chat chrome → Home primary column
    const relayout = () => {
      if (!isHistoryRoute() || exitHistoryLock) return;
      showHistoryPage();
      scheduleLayoutHistoryPage();
    };
    requestAnimationFrame(relayout);
    setTimeout(relayout, 50);
    setTimeout(relayout, 200);
    setTimeout(relayout, 500);
  }

  function syncHistoryViewWithRoute(reason) {
    if (exitHistoryLock) {
      // Still clearing hash after side-nav exit — never re-open
      if (!isHistoryRoute()) exitHistoryLock = false;
      return;
    }
    if (isHistoryRoute()) {
      // Legacy: history hash on /i/chat etc. → force Home shell
      if (ensureHistoryHomeShell()) {
        setTimeout(() => {
          if (isHistoryRoute() && !exitHistoryLock) showHistoryPage();
        }, 50);
        return;
      }
      showHistoryPage();
      // Re-assert after X finishes its own render
      if (reason === "popstate" || reason === "page-hook" || reason === "bg") {
        requestAnimationFrame(() => showHistoryPage());
        setTimeout(() => {
          if (isHistoryRoute() && !exitHistoryLock) {
            showHistoryPage();
            scheduleLayoutHistoryPage();
          }
        }, 50);
        setTimeout(() => {
          if (isHistoryRoute() && !exitHistoryLock) {
            showHistoryPage();
            scheduleLayoutHistoryPage();
          }
        }, 300);
      }
    } else {
      leaveHistoryPage();
    }
  }

  // ——— Navigation watchers ———

  function onUrlMaybeChanged(reason) {
    const href = location.href;
    if (href === lastHref && reason === "poll") {
      if (isHistoryRoute() && !exitHistoryLock) {
        if (!document.getElementById(PAGE_ID)) showHistoryPage();
        else scheduleLayoutHistoryPage();
      }
      return;
    }
    lastHref = href;

    syncHistoryViewWithRoute(reason);
    ensureNavItem();

    if (!isHistoryRoute()) {
      scheduleRecord();
    }
  }

  function startWatchers() {
    document.documentElement.addEventListener("xh-locationchange", () => {
      onUrlMaybeChanged("page-hook");
    });
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === "xh:navigate") onUrlMaybeChanged(msg.reason || "bg");
    });

    let prev = location.href;
    lastHref = prev;
    pollTimer = setInterval(() => {
      if (location.href !== prev) {
        prev = location.href;
        onUrlMaybeChanged("poll");
      } else if (isHistoryRoute() && !exitHistoryLock) {
        if (!document.getElementById(PAGE_ID)) showHistoryPage();
        else scheduleLayoutHistoryPage();
        sampleTheme();
      }
      // Keep icon-rail label box in sync (Chat collapses side nav)
      if (document.getElementById(NAV_ID)) syncNavLabelVisibility();
    }, 500);

    const mo = new MutationObserver(() => {
      if (location.href !== prev) {
        prev = location.href;
        onUrlMaybeChanged("mutation");
      }
      if (!document.getElementById(NAV_ID)) ensureNavItem();
      if (
        isHistoryRoute() &&
        !exitHistoryLock &&
        !document.getElementById(PAGE_ID)
      ) {
        showHistoryPage();
      } else if (historyViewActive) {
        scheduleLayoutHistoryPage();
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener(
      "popstate",
      () => onUrlMaybeChanged("popstate"),
      true,
    );
    window.addEventListener("resize", scheduleLayoutHistoryPage);

    const themeMo = new MutationObserver(() => sampleTheme());
    if (document.body) {
      themeMo.observe(document.body, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    }
  }

  // ——— Nav ———

  const CLOCK_SVG = `
    <g>
      <path d="M12 4c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14.5c-3.6 0-6.5-2.9-6.5-6.5S8.4 5.5 12 5.5s6.5 2.9 6.5 6.5-2.9 6.5-6.5 6.5z"></path>
      <path d="M12.75 8h-1.5v5.25l4.5 2.7.75-1.23-3.75-2.22V8z"></path>
    </g>`;

  function findNav() {
    const navs = document.querySelectorAll('nav[role="navigation"]');
    for (const nav of navs) {
      if (
        nav.querySelector(
          'a[href="/home"], a[data-testid="AppTabBar_Home_Link"], a[href="/explore"]',
        )
      ) {
        return nav;
      }
    }
    return document.querySelector('header nav[role="navigation"]');
  }

  /** Direct child of nav that wraps a menu control (matches siblings for icon rail). */
  function getNavRow(el, nav) {
    let node = el;
    while (node.parentElement && node.parentElement !== nav) {
      node = node.parentElement;
    }
    return node;
  }

  function replaceNavVisuals(root) {
    const link =
      root.id === NAV_ID && root.tagName === "A"
        ? root
        : root.querySelector("a") || root;

    const svg = link.querySelector?.("svg") || root.querySelector("svg");
    if (svg) {
      const keepClass = svg.getAttribute("class");
      const keepView = svg.getAttribute("viewBox") || "0 0 24 24";
      svg.setAttribute("viewBox", keepView);
      if (keepClass) svg.setAttribute("class", keepClass);
      svg.innerHTML = CLOCK_SVG;
      svg.style.margin = "0";
    }

    // Drop whitespace-only spans (e.g. trailing " ") — they leave margin in icon rail
    root.querySelectorAll("span").forEach((s) => {
      if (!s.querySelector("span") && /^\s*$/.test(s.textContent || "")) {
        s.remove();
      }
    });

    const spans = [...root.querySelectorAll("span")].filter((s) => {
      const t = (s.textContent || "").trim();
      return t && t.length < 20 && !s.querySelector("span") && !/^\d+$/.test(t);
    });
    const known =
      /^(Home|首页|Explore|探索|Notifications|通知|Messages|消息|Bookmarks|书签|Communities|社群|社区|Premium|Grok|Profile|个人资料|Lists|列表|More|更多|Chat|聊天)$/i;
    const labelSpan =
      spans.find((s) => known.test((s.textContent || "").trim())) ||
      spans[spans.length - 1];
    if (labelSpan) {
      labelSpan.textContent = t("nav");
      labelSpan.setAttribute("data-xh-label", "1");
      // Mark the text wrapper div (parent of label span) for icon-rail sync
      const wrap = labelSpan.parentElement;
      if (wrap && wrap !== link && wrap !== root) {
        wrap.setAttribute("data-xh-label-wrap", "1");
        // Never leave permanent inline styles from a previous icon-rail sync
        wrap.removeAttribute("style");
      }
    }

    if (link && link.tagName === "A") {
      link.setAttribute("aria-label", t("nav"));
      link.removeAttribute("data-testid");
      link.href = `/home#${HISTORY_HASH}`;
      link.removeAttribute("aria-current");
    }
    root.setAttribute("aria-label", t("nav"));
    applyNavLabelText(root);
  }

  function isEffectivelyHidden(el) {
    if (!el) return true;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") return true;
    if (parseFloat(s.opacity) === 0) return true;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return true;
    return false;
  }

  function homeNavLink() {
    return (
      document.querySelector('a[data-testid="AppTabBar_Home_Link"]') ||
      document.querySelector('a[href="/home"]')
    );
  }

  function homeLabelSpans(home) {
    return [...home.querySelectorAll("span")].filter((s) => {
      const text = (s.textContent || "").trim();
      return (
        text &&
        text.length < 24 &&
        !s.querySelector("span") &&
        !/^\d+$/.test(text) &&
        !s.closest("svg")
      );
    });
  }

  /**
   * Chat uses an icon-only rail. Detect via Home link geometry / labels —
   * not only CSS on a text node (labels may be removed from the DOM).
   */
  function isNavIconOnly() {
    const home = homeNavLink();
    if (!home) return false;

    const svg = home.querySelector("svg");
    if (svg) {
      const lr = home.getBoundingClientRect();
      const sr = svg.getBoundingClientRect();
      // Expanded: link is much wider than the icon. Icon-only: roughly icon-sized.
      if (sr.width > 0 && lr.width > 0 && lr.width <= sr.width + 36) {
        return true;
      }
    }

    const spans = homeLabelSpans(home);
    if (!spans.length) return true; // no label nodes at all

    // All label text effectively not shown
    return spans.every(
      (s) => isEffectivelyHidden(s) || isEffectivelyHidden(s.parentElement),
    );
  }

  function hideLabelChrome(ours) {
    const wrap =
      ours.querySelector("[data-xh-label-wrap]") ||
      ours.querySelector("[data-xh-label]")?.parentElement;

    if (wrap) {
      // display:none removes flex item entirely (no gap / margin-right phantom)
      wrap.style.cssText =
        "display:none!important;width:0!important;max-width:0!important;" +
        "min-width:0!important;height:0!important;margin:0!important;" +
        "padding:0!important;overflow:hidden!important;border:0!important;" +
        "flex:0 0 0!important;position:absolute!important;opacity:0!important;" +
        "pointer-events:none!important;font-size:0!important;";
    }

    // Also collapse any other non-svg text blocks under the link (clone leftovers)
    const link = ours.tagName === "A" ? ours : ours.querySelector("a") || ours;
    link.querySelectorAll("span, div").forEach((el) => {
      if (el.closest("svg")) return;
      if (wrap && (el === wrap || wrap.contains(el))) return;
      if (el.querySelector("svg")) return; // icon wrapper
      const text = (el.textContent || "").trim();
      if (!text || text.length > 24) return;
      // Only target short label-like nodes not containing the svg
      if (el.querySelector("svg")) return;
      const hasOnlyText =
        !el.querySelector("svg") &&
        !el.querySelector("img") &&
        (el === link.querySelector("[data-xh-label]") ||
          el.contains(link.querySelector("[data-xh-label]")));
      if (hasOnlyText && el !== wrap) {
        el.style.setProperty("display", "none", "important");
      }
    });

    // Kill flex gap on the row between icon and missing label
    const navEl = findNav();
    if (navEl) {
      const row = getNavRow(ours, navEl);
      if (row) {
        row.querySelectorAll("div").forEach((div) => {
          if (
            div.querySelector("svg") &&
            div.querySelector("[data-xh-label-wrap], [data-xh-label]")
          ) {
            div.style.setProperty("gap", "0", "important");
            div.style.setProperty("column-gap", "0", "important");
          }
        });
      }
    }
  }

  function showLabelChrome(ours) {
    const wrap =
      ours.querySelector("[data-xh-label-wrap]") ||
      ours.querySelector("[data-xh-label]")?.parentElement;
    if (wrap) wrap.removeAttribute("style");

    const link = ours.tagName === "A" ? ours : ours.querySelector("a") || ours;
    link.querySelectorAll("[style]").forEach((el) => {
      // Only clear styles we may have forced on label-ish nodes
      if (el.querySelector("svg") && !el.hasAttribute("data-xh-label-wrap")) {
        // might be icon wrapper — only clear gap if we set it
        if (el.style.gap === "0px" || el.style.columnGap === "0px") {
          el.style.removeProperty("gap");
          el.style.removeProperty("column-gap");
        }
        return;
      }
      if (
        el.hasAttribute("data-xh-label-wrap") ||
        el.hasAttribute("data-xh-label") ||
        el.querySelector?.("[data-xh-label]")
      ) {
        el.removeAttribute("style");
      }
    });
  }

  let lastNavIconOnly = null;

  /**
   * Chat icon rail: hide label completely.
   * Home expanded: clear forced styles so text shows.
   * Rebuild nav item when mode flips so structure matches native items.
   */
  function syncNavLabelVisibility() {
    const iconOnly = isNavIconOnly();

    // Mode switch (Home ↔ Chat): rebuild from a live sample so DOM matches
    if (lastNavIconOnly !== null && lastNavIconOnly !== iconOnly) {
      const existing = document.getElementById(NAV_ID);
      if (existing) {
        const navEl = findNav();
        const row = navEl ? getNavRow(existing, navEl) : existing;
        (row || existing).remove();
      }
      lastNavIconOnly = iconOnly;
      ensureNavItem();
      return;
    }
    lastNavIconOnly = iconOnly;

    const ours = document.getElementById(NAV_ID);
    if (!ours) return;

    applyNavLabelText(ours);

    const wrap =
      ours.querySelector("[data-xh-label-wrap]") ||
      ours.querySelector("[data-xh-label]")?.parentElement;

    // Clean whitespace-only siblings
    if (wrap) {
      const label = ours.querySelector("[data-xh-label]");
      [...wrap.querySelectorAll("span")].forEach((s) => {
        if (s !== label && /^\s*$/.test(s.textContent || "")) s.remove();
      });
    }

    if (iconOnly) {
      hideLabelChrome(ours);
    } else {
      showLabelChrome(ours);
    }
  }

  function ensureNavItem() {
    let item = document.getElementById(NAV_ID);
    if (item) {
      setNavActive(isHistoryRoute() || historyViewActive);
      syncNavLabelVisibility();
      return;
    }

    const nav = findNav();
    if (!nav) return;

    const sample =
      nav.querySelector('a[href="/home"]') ||
      nav.querySelector('a[data-testid="AppTabBar_Home_Link"]') ||
      nav.querySelector('a[href="/explore"]') ||
      nav.querySelector('a[href="/notifications"]') ||
      nav.querySelector("a[href]");
    if (!sample) return;

    // Clone the whole row (nav > div > a), not bare <a> — bare <a> gets extra
    // margin in Chat's icon-only rail because siblings are wrapped.
    const sampleRow = getNavRow(sample, nav);
    const row = sampleRow.cloneNode(true);

    // Find the interactive link inside the cloned row
    item =
      row.tagName === "A"
        ? row
        : row.querySelector("a") || row.querySelector("[role='link']") || row;

    if (item.tagName === "A" || item.getAttribute?.("role") === "link") {
      item.id = NAV_ID;
    } else {
      // Fallback: mark the row
      row.id = NAV_ID + "-row";
      const innerA = row.querySelector("a");
      if (innerA) innerA.id = NAV_ID;
      else row.id = NAV_ID;
      item = document.getElementById(NAV_ID) || row;
    }

    item.classList?.remove?.("xh-nav-active");
    replaceNavVisuals(row);

    const clickTarget = document.getElementById(NAV_ID) || item;
    clickTarget.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        openHistoryPage();
      },
      true,
    );

    const more =
      nav.querySelector('[data-testid="AppTabBar_More_Menu"]') ||
      nav.querySelector('button[aria-label="More menu items"]') ||
      nav.querySelector('button[aria-label="更多菜单项"]') ||
      nav.querySelector('button[aria-label="More"]') ||
      nav.querySelector('button[aria-label="更多"]');

    let insertBefore = null;
    if (more) {
      insertBefore = getNavRow(more, nav);
      if (insertBefore === more && more.parentElement !== nav) {
        insertBefore = getNavRow(more, nav);
      }
    }

    if (insertBefore && insertBefore.parentElement === nav) {
      nav.insertBefore(row, insertBefore);
    } else {
      const bookmarks =
        nav.querySelector('a[href="/i/bookmarks"]') ||
        nav.querySelector('a[data-testid="AppTabBar_Bookmarks_Link"]');
      if (bookmarks) {
        const bRow = getNavRow(bookmarks, nav);
        if (bRow.nextSibling) nav.insertBefore(row, bRow.nextSibling);
        else nav.appendChild(row);
      } else {
        nav.appendChild(row);
      }
    }

    setNavActive(isHistoryRoute() || historyViewActive);
    syncNavLabelVisibility();
  }

  // ——— Boot ———

  function boot() {
    // Migrate old fake route / non-home history hash → /home#xh-history
    if (normalizePath(location.pathname) === "/i/xh-history") {
      mainNavigate("xh-replace", historyPageUrl(), { xhHistory: true });
    } else {
      ensureHistoryHomeShell();
    }

    sampleTheme();
    startWatchers();
    startFocusEngine();
    startInteractionCapture();
    bindSideNavExit();
    ensureNavItem();

    if (isHistoryRoute()) showHistoryPage();
    else scheduleRecord();

    chrome.storage.onChanged.addListener((changes, area) => {
      if (
        area === "local" &&
        changes.xHistory &&
        (historyViewActive || isHistoryRoute())
      ) {
        refreshPageList();
      }
    });

    setTimeout(sampleTheme, 800);
    setTimeout(sampleTheme, 2500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
