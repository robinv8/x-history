# X History 上架清单（Chrome Web Store）

## 0. 你需要准备的账号

1. [Chrome 开发者账号](https://chrome.google.com/webstore/devconsole/)（一次性注册费约 $5）
2. 可公开访问的 **隐私政策 URL**（用本仓库 `store/privacy.html`）
3. 支持邮箱（商店后台展示）

---

## 1. 托管隐私政策（必须）

任选一种：

### A. GitHub Pages（推荐）

1. 把仓库推到 GitHub（公开）
2. Settings → Pages → Deploy from branch → `/docs` 或 `root`
3. 若用 Pages 根路径，可把 `store/privacy.html` 复制到 `docs/privacy.html` 或站点根目录
4. 得到类似：`https://<user>.github.io/x-history/privacy.html`

### B. 任意静态托管

把 `privacy.html` 上传到你的域名即可。

后台填写：**Privacy policy URL** = 上述地址。

---

## 2. 打包扩展 zip

在项目根目录执行：

```bash
./store/pack.sh
```

会生成 `dist/x-history-<version>.zip`（仅含上架所需文件）。

**不要**把整个 git 仓库直接 zip 上传（会带上 store 文档等多余内容也可以，但建议用脚本）。

---

## 3. 开发者后台提交

打开 [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/) → **新增项目** → 上传 zip。

### 必填对照

| 后台字段 | 内容来源 |
|---------|----------|
| 名称 / 说明 | `store/LISTING.md` |
| 图标 | `icons/icon128.png` |
| 截图 | 自己在 x.com 截 1–5 张（推荐 1280×800） |
| 类别 | Productivity |
| 语言 | English（+ 可选中文） |
| 隐私政策 URL | 你托管的 privacy.html |
| 单一用途 | LISTING.md 中 Single purpose |
| 权限声明 | LISTING.md 中权限说明 |
| 远程代码 | **否**（本扩展无远程代码） |
| 数据使用 | 见下一节 |

### 数据使用声明（勾选建议）

- 是否出售数据：**否**
- 是否用于与扩展核心无关的目的：**否**
- 是否传输给第三方用于与核心功能无关目的：**否**
- 用户数据：勾选你实际处理的类型  
  - 建议如实勾选：**Website content**（页面上读取的推文摘要）  
  - 存储位置：**Locally**  
- 若有「仅本地」相关选项，优先选本地存储

以后台当前问卷文案为准，核心原则：**本地历史、不上传、不卖数据**。

---

## 4. 截图拍摄步骤

1. 开发者模式加载扩展 → 打开 x.com  
2. 打开几条推文详情（生成记录）  
3. 点侧边栏 History / 历史  
4. 再拍一张搜索状态  
5. 尽量用深色主题（更贴近 X）  
6. 裁成商店要求尺寸后上传  

---

## 5. 提交前自测

- [ ] 新 Chrome 配置文件安装 zip / 解压加载  
- [ ] x.com 侧栏出现 History  
- [ ] 打开推文 → 历史列表有记录与头像  
- [ ] 搜索可用  
- [ ] 清空 / 删除可用  
- [ ] Chat 侧栏图标模式无多余空白  
- [ ] 从 Chat 进 History 落在首页布局  
- [ ] 刷新 `/home#xh-history` 不 404  
- [ ] twitter.com 域名如需支持则再测一次  

---

## 6. 审核常见问法（可提前想好）

**Q: 为什么需要 webNavigation？**  
A: X 是 SPA，仅靠 content script 的初次加载无法稳定感知站内跳转；用 webNavigation 在 x.com 上检测导航以记录打开的推文详情。

**Q: 为什么需要读取页面内容？**  
A: 仅为生成本地历史列表（作者、摘要、头像 URL），数据留在用户设备。

**Q: 是否收集用户账号密码？**  
A: 否。

---

## 7. 版本号

当前 `manifest.json` version：见文件内字段。  
每次商店更新必须升高 version（如 `1.0.0` → `1.0.1`）。

首次公开发布建议改为 `1.0.0`（可选，脚本/手动改均可）。

---

## 8. 上架后

- 用无痕窗口再装一遍验证  
- 准备好支持邮箱回复  
- X 大改版后优先修选择器，再提审小版本  

---

## 9. 自动发版（后续更新）

首次必须在网页后台创建并填资料。之后可用 API 自动上传：

- 说明：`store/AUTOMATE.md`
- 一键脚本：`./store/publish.sh`（需本地 `.env`）

**不要把 Client Secret / Refresh Token 发给任何人（包括 AI 聊天）。**
