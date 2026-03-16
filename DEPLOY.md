# 崇正视觉 PRO - 部署架构说明

## 总体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           用户浏览器（国内）                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Vercel 部署（*.vercel.app 或自定义域名）                 │
│  ┌──────────────────────┐    ┌──────────────────────────────────────┐   │
│  │   静态前端 (dist/)    │    │         Serverless API (/api/*)       │   │
│  │   React + Vite       │    │  random-prompt / generate-product     │   │
│  │   无 API Key         │    │  replace-background / chat            │   │
│  └──────────────────────┘    └──────────────────────────────────────┘   │
│              │                                    │                       │
└──────────────┼────────────────────────────────────┼───────────────────────┘
               │                                    │
               │  fetch('/api/xxx')                  │ 使用 METACHAT_API_KEY
               │                                    ▼
               │                    ┌──────────────────────────────────────┐
               │                    │         MetaChat 代理服务              │
               │                    │  https://llm-api.mmchat.xyz/gemini     │
               │                    └──────────────────────────────────────┘
               │                                    │
               │                                    ▼
               │                    ┌──────────────────────────────────────┐
               └──────────────────►│         Google Gemini API             │
                                   └──────────────────────────────────────┘
```

## 前置更改清单

| 项目 | 说明 |
|------|------|
| **api/** | 新增 4 个 Vercel Serverless 函数，替代前端直连 Gemini |
| **lib/gemini-server.ts** | 服务端 Gemini 客户端，使用 MetaChat baseUrl |
| **apiClient.ts** | 前端统一通过 `/api/*` 发起请求 |
| **geminiService.ts** | 改为调用 apiClient，不再使用 @google/genai |
| **App.tsx** | 对话改为调用 api.chat() |
| **vite.config.ts** | 移除 API Key 注入 |
| **vercel.json** | 构建与 SPA 路由配置 |
| **.env.example** | 环境变量模板 |

## 部署步骤

1. **推送到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "feat: Vercel 部署架构"
   git remote add origin https://github.com/你的用户名/仓库名.git
   git push -u origin main
   ```

2. **在 Vercel 导入项目**
   - 登录 [vercel.com](https://vercel.com)
   - New Project → Import Git Repository
   - 选择你的仓库

3. **配置环境变量**
   - Settings → Environment Variables
   - 添加 `METACHAT_API_KEY` = 你的 MetaChat API Key
   - （可选）`METACHAT_BASE_URL` = `https://llm-api.mmchat.xyz/gemini`

4. **Deploy**
   - 点击 Deploy，等待约 30 秒
   - 获得 `https://xxx.vercel.app` 域名

## 本地调试

```bash
npm install
vercel dev   # 需先 npm i -g vercel
```

在 `.env.local` 中配置 `METACHAT_API_KEY`，`vercel dev` 会同时运行前端和 API。
