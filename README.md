# X History

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/jijknbffmnjebeklhmmfldhgkefgcdoo)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-lightgrey.svg)](manifest.json)

Chrome / Edge extension that adds a **Local History** entry to the X (Twitter) sidebar — distinct from X’s own History tab (bookmarks, likes, videos, articles).

It keeps a **local-only** history of posts you care about — detail pages you open, plus likes, reposts, replies, bookmarks, and careful timeline reads — with search. Nothing is uploaded by default.

**Website:** https://x-history.robinren.me · **Privacy:** https://x-history.robinren.me/privacy.html

Hosted on **GitHub Pages** (`docs/`) with custom domain via Cloudflare DNS.

## Features

- Sidebar **Local History** item (matches X home / icon-rail layouts; sits next to X’s History/Bookmarks)
- Records:
  - Post **detail** pages you open
  - **Like / repost / reply / bookmark** from the timeline
  - **Careful reads** (stable focus ~3s+; not every scroll-by)
- Search, avatars, relative time, source badges & filters
- Multi-language UI (follows page / browser when possible)
- `chrome.storage.local` only — up to ~500 recent items
- No X official API, no analytics SDK

## Install (development)

1. Chrome → `chrome://extensions` → Developer mode  
2. **Load unpacked** → select this repo root  
3. Open [x.com](https://x.com) and hard-refresh  

## Install (store)

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/jijknbffmnjebeklhmmfldhgkefgcdoo).

## Package / publish

```bash
chmod +x store/pack.sh store/publish.sh
./store/pack.sh          # → dist/x-history-<version>.zip
./store/publish.sh       # pack + upload (needs .env — see store/AUTOMATE.md)
```

Store materials:

- [store/PUBLISH.md](store/PUBLISH.md) — first-time listing checklist  
- [store/AUTOMATE.md](store/AUTOMATE.md) — API auto-release  
- [store/LISTING.md](store/LISTING.md) — copy for the developer dashboard  
- [store/privacy.html](store/privacy.html) — privacy policy (host publicly for the store)

## Project layout

```
x-history/
├── manifest.json
├── icons/
├── src/
│   ├── background.js    # SPA navigation bridge
│   ├── page-hook.js     # MAIN-world history hooks
│   ├── storage.js       # local CRUD + sources
│   ├── content.js       # UI, focus, capture
│   └── content.css
├── docs/                # GitHub Pages landing
├── store/               # listing, pack, privacy
├── LICENSE
└── README.md
```

## Open source

MIT — see [LICENSE](LICENSE). Issues and PRs welcome once the repo is on GitHub.

Suggested remote:

```bash
git init
git add .
git commit -m "chore: release v1.3.0"
gh repo create robinv8/x-history --public --source=. --remote=origin --push
```

Enable **GitHub Pages** → branch `main` → `/docs`, custom domain `x-history.robinren.me` (see `docs/CNAME`).

## Notes

- Web only (not the official mobile apps)
- X has a native **History** tab (bookmarks / likes / videos / articles). This extension is a **local browse history** of posts you opened or engaged with — different purpose, stored on your device
- X layout changes may temporarily break the sidebar inject
- Does not call the X API

## Version

Current: **1.3.1**
