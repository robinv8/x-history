# 自动发布到 Chrome Web Store

## 重要限制（先看）

| 能力 | 能否全自动 |
|------|------------|
| **第一次**创建扩展 + 填名称/截图/隐私政策 | ❌ 必须在网页后台做一次 |
| **之后**上传新 zip + 提交审核 | ✅ API / 本仓库脚本 |
| 我（AI）在你电脑上直接点发布 | ❌ 需要你的 OAuth 密钥；**不要把密钥发到聊天里** |

官方说明：首次用控制台创建并完善资料；记下 **Extension ID** 后，后续用 API 更新。

---

## 一、一次性准备（约 15 分钟）

### 1. 后台手动创建第一个版本

1. 打开 [Chrome 开发者后台](https://chrome.google.com/webstore/devconsole/)
2. **新增项目** → 上传 `dist/x-history-1.0.0.zip`
3. 按 `LISTING.md` / `PUBLISH.md` 填完文案、截图、隐私政策
4. **先存草稿** 或 **提交审核** 均可
5. 记下扩展 ID（商店链接里或后台 item 详情中的 ID，形如 `abcdefghijklmnopqrstuvwxyzabcdef`）

### 2. 打开 Chrome Web Store API

1. 打开 [Google Cloud Console](https://console.cloud.google.com/)
2. 新建或选择一个项目
3. **API 和服务 → 库** → 搜索 **Chrome Web Store API** → **启用**

### 3. 创建 OAuth 客户端

1. **API 和服务 → 凭据 → 创建凭据 → OAuth 客户端 ID**
2. 应用类型选 **桌面应用**（Desktop）
3. 创建后得到：
   - `Client ID`
   - `Client Secret`

若提示配置 OAuth 同意屏幕：选 **外部**，填应用名，测试用户加你自己的 Google 账号即可。

### 4. 拿 Refresh Token

推荐用 [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)：

1. 右上角齿轮 ⚙️ → 勾选 **Use your own OAuth credentials**
2. 填入刚才的 Client ID / Secret
3. 左侧 scope 填（或搜索）：

   ```
   https://www.googleapis.com/auth/chromewebstore
   ```

4. **Authorize APIs** → 用开发者账号登录 → 允许
5. **Exchange authorization code for tokens**
6. 复制 **Refresh token**（长期有效，妥善保管）

更细的图文也可见：  
https://github.com/fregante/chrome-webstore-upload/blob/main/How%20to%20generate%20Google%20API%20keys.md

### 5. 写入本地环境变量（勿提交 git）

在项目根目录：

```bash
cp store/env.example .env
```

编辑 `.env`（已在 `.gitignore`）：

```bash
EXTENSION_ID=你的扩展ID
CLIENT_ID=xxx.apps.googleusercontent.com
CLIENT_SECRET=xxx
REFRESH_TOKEN=xxx
# 可选：只上传不自动提交审核则设为 0
AUTO_PUBLISH=1
```

---

## 二、之后每次发版

```bash
# 1. 改 manifest.json 的 version（必须比商店上更高）
# 2. 打包 + 上传（+ 可选发布）
./store/publish.sh
```

脚本会：

1. 运行 `pack.sh` 生成 zip  
2. 用 [chrome-webstore-upload-cli](https://github.com/fregante/chrome-webstore-upload-cli) 上传  
3. 若 `AUTO_PUBLISH=1`，再调用 publish 提交审核  

也可以分步：

```bash
./store/pack.sh
./store/publish.sh --upload-only   # 只上传，不 publish
./store/publish.sh --publish-only # 对已上传包提交审核
```

---

## 三、GitHub Actions（可选）

若要用 CI 自动发版，把同样 4 个值放进仓库 **Secrets**：

- `EXTENSION_ID`
- `CLIENT_ID`
- `CLIENT_SECRET`
- `REFRESH_TOKEN`

示例工作流见 `store/github-publish.example.yml`，复制到 `.github/workflows/publish.yml` 后按需启用。

---

## 四、我能帮你做什么 / 不能做什么

| 我可以 | 我不能 |
|--------|--------|
| 写好打包与发布脚本 | 使用你的账号密码代登录 |
| 指导你配置 API | 在聊天里接收并保存你的 Secret |
| 发版前改 version、再跑 pack | 跳过首次后台填资料 |

你完成 **第一节** 并填好 `.env` 后，在本机告诉我「已配置好 .env」，我可以再帮你执行 `./store/publish.sh`（命令在你机器上跑，密钥不离开本机）。
