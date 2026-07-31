/**
 * Notify content scripts on X SPA / full navigations.
 */
function isXUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === "x.com" || u.hostname === "twitter.com" || u.hostname.endsWith(".x.com");
  } catch {
    return false;
  }
}

function notify(tabId, url, reason) {
  if (!tabId || tabId < 0 || !isXUrl(url)) return;
  chrome.tabs.sendMessage(tabId, { type: "xh:navigate", url, reason }).catch(() => {
    // content script not ready yet — ignore
  });
}

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) return;
  notify(details.tabId, details.url, "history");
});

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return;
  notify(details.tabId, details.url, "completed");
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  notify(details.tabId, details.url, "committed");
});
