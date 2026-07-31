# X History

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-lightgrey.svg)](manifest.json)

Chrome / Edge extension that adds a **History** entry to the X (Twitter) sidebar.

It keeps a **local-only** history of posts you care about — detail pages you open, plus likes, reposts, replies, bookmarks, and careful timeline reads — with search. Nothing is uploaded by default.

**Website:** [Landing page](docs/index.html) · **Privacy:** [store/privacy.html](store/privacy.html)

## Features

- Sidebar **History** item (matches X home / icon-rail layouts)
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

After listing is live, use the Chrome Web Store link on the [landing page](docs/index.html).

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
git commit -m "chore: release v1.1.0"
gh repo create robinv8/x-history --public --source=. --remote=origin --push
```

Enable **GitHub Pages** → Deploy from branch → `/docs`.

## Notes

- Web only (not the official mobile apps)
- X layout changes may temporarily break the sidebar inject
- Does not call the X API

## Version

Current: **1.1.0**
