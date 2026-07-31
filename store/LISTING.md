# Chrome Web Store 上架文案

提交时复制到开发者后台对应字段。

---

## 后台字段速填版

### Store listing

| 后台字段 | 建议填写 |
|---|---|
| Category | Productivity |
| Language | English |
| Extension name | `X History - Browse history for X / Twitter` |
| Short description | `History in the X sidebar. Saves posts you open, like, repost, or carefully read. Search later — data stays on your device.` |
| Detailed description | 复制下方 English 详细说明 |
| Single purpose | `This extension’s single purpose is to keep a local history of X/Twitter posts the user opens or interacts with in the browser, and to surface that history via a sidebar entry and searchable list on x.com.` |
| Website | https://x-history.robinren.me |
| Support URL | GitHub Issues |
| Privacy policy URL | `https://x-history.robinren.me/privacy.html` |

### Privacy practices

| 后台问题 | 建议选择 / 填写 |
|---|---|
| Does the extension collect or use user data? | Yes, only to provide the core local history feature. |
| Data types | Website content / Web browsing activity, limited to X/Twitter posts the user opens or interacts with on x.com / twitter.com. |
| Is data sold to third parties? | No |
| Is data used or transferred for unrelated purposes? | No |
| Is data used for creditworthiness or lending? | No |
| Is data transferred off the user device? | No, history data is stored locally in `chrome.storage.local`. |
| Remote code | No. The extension does not execute remotely hosted code. |
| Analytics / tracking | No third-party analytics, ads, or tracking beacons are included. |

### Permission justification

Copy these into the permission justification fields:

**storage**

```
Used to save the user's X/Twitter post history and UI preferences locally on this device. The extension stores post IDs, URLs, author/snippet metadata, avatar URLs, and timestamps in chrome.storage.local so the user can search, reopen, delete, or clear their own history.
```

**webNavigation**

```
Used to detect navigation changes within X/Twitter's single-page web app. This lets the extension know when the user opens a post detail page so it can record that post and keep the History view in sync.
```

**Host permissions: `https://x.com/*`, `https://twitter.com/*`**

```
Required to add the History sidebar item and history UI to the X/Twitter website, and to read on-page post metadata (author, text snippet, avatar URL, post URL, post ID) and detect on-page interactions the user initiates, for the local history list. The extension does not run on unrelated websites.
```

### Data use certification

```
X History uses data only for its single purpose: saving and showing a local history of X/Twitter posts the user opens or interacts with. The extension does not sell user data, does not use data for advertising or creditworthiness, does not transfer history data to developer servers, and does not include third-party analytics or tracking code.
```

### Store review note

```
X History is local-first and open source. It injects a History entry into x.com / twitter.com, records post detail pages the user opens plus optional timeline interactions (like, repost, reply, bookmark) and careful reads under conservative rules, and stores history locally in chrome.storage.local with a recent-item limit (~500). Users can delete individual entries or clear all history from the UI.
```

---

## 扩展名称（最多 75 字符）

```
X History - Browse history for X / Twitter
```

中文展示名（若商店支持区域名称，可另填）：

```
X History - X / Twitter 浏览历史
```

---

## 简短说明（最多 132 字符）

**English**

```
History in the X sidebar. Saves posts you open, like, repost, or carefully read. Search later — data stays on your device.
```

**中文**

```
在 X 侧栏加「历史」。记录打开、点赞、转发与认真读过的帖，本地可搜，数据不出本机。
```

---

## 详细说明

**English**

```
X History adds a missing piece of the X (Twitter) web experience: a local, searchable history of posts you actually engaged with.

FEATURES
• Sidebar “History” — fits home and icon-rail layouts
• Opened posts — detail pages you visit
• Timeline actions — like, repost, reply, bookmark
• Careful reads — only after stable focus (not every scroll-by)
• Search & filters — by text, author, or source badge
• Multi-language UI — follows browser / X language when possible
• Local only — chrome.storage on your device, not our servers
• Open source — MIT

HOW TO USE
1. Install the extension and open x.com
2. Open posts or interact in the timeline as usual
3. Click History in the left sidebar
4. Search, filter, reopen, or clear entries anytime

PRIVACY
• No account required
• No analytics or tracking beacons from this extension
• No data is uploaded by default
• Only runs on x.com and twitter.com

NOTE
• Web only (not the mobile apps)
• X layout updates may temporarily break injection until we ship a fix
• Keeps a limited number of recent items (currently about 500)

Feedback welcome via GitHub Issues or the store support link.
```

**中文**

```
X History 补上 X（Twitter）网页版缺少的能力：本地可搜的「我碰过的帖」历史。

功能
• 左侧「历史」入口（适配首页与窄轨图标栏）
• 记录打开过的推文详情
• 记录时间线点赞、转发、回复、书签
• 认真阅读（焦点稳定后才记，不是每条滑过都记）
• 搜索与来源筛选
• 多语言界面
• 数据仅本机 chrome.storage，默认不上云
• 开源 MIT

使用方式
1. 安装扩展并打开 x.com
2. 正常打开帖子或在时间线互动
3. 点击左侧「历史」
4. 可搜索、筛选、跳转、删除或清空

隐私
• 无需注册账号
• 扩展本身不嵌入统计追踪
• 默认不上传任何浏览数据
• 仅在 x.com / twitter.com 运行

说明
• 仅支持网页版，不支持官方 App
• X 改版可能导致侧栏暂时失效，我们会尽快修复
• 约保留最近 500 条

问题与建议可通过 GitHub Issues 或商店支持链接联系。
```

---

## 类别

- Primary: **Productivity**
- 或 **Social & Communication**（二选一，Productivity 更贴切）

---

## 语言

- 默认：English（en）
- 可额外声明：中文（简体）

---

## 权限说明（审核「隐私权措施」里填写）

### storage
Used to save your post history and preferences locally on this device. Data is not sent to our servers by default.

用于在本地保存浏览历史与偏好。默认不会发送到开发者服务器。

### webNavigation
Used to detect when you navigate between pages on X so the extension can record opened posts and keep the History page in sync. Only used on x.com / twitter.com.

用于检测你在 X 站内的页面跳转，以便记录打开过的推文并同步历史页状态。仅作用于 x.com / twitter.com。

### Host permission (x.com / twitter.com)
Required to inject the History menu and UI into the X website, and to read on-page post metadata (author, text snippet, avatar) for the history list.

需要在 X 网页注入「历史」菜单与界面，并读取页面上的推文元数据（作者、摘要、头像）用于历史列表。

---

## 单一用途说明（Single purpose）

```
This extension’s single purpose is to keep a local history of X/Twitter posts the user opens or interacts with in the browser, and to surface that history via a sidebar entry and searchable list on x.com.
```

```
本扩展的唯一用途是：在浏览器中记录用户打开过的 X/Twitter 推文详情，并在 x.com 侧边栏提供可搜索的历史列表。
```

---

## 截图建议（至少 1 张，推荐 1280×800 或 640×400）

1. 左侧出现 History / 历史 菜单  
2. 历史列表（含头像、时间）  
3. 搜索过滤结果  
4. （可选）深色模式界面  

可用系统截图工具在 x.com 上截取后裁切到商店要求尺寸。

---

## 商店图标

使用 `icons/icon128.png`（已准备）。可另上传宣传图（可选）。

---

## 隐私政策 URL

将 `store/privacy.html` 托管到可公开访问的地址（GitHub Pages / 个人站），把 URL 填进后台。

示例：`https://<your-username>.github.io/x-history/privacy.html`
