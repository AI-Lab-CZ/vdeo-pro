<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 崇正视觉 PRO - 高端产品摄影

专业的电商产品背景替换工具，通过 MetaChat 代理调用 Gemini API，支持国内直接访问。

## 本地开发

**前置要求：** Node.js

1. 安装依赖：`npm install`
2. 配置环境变量：复制 `.env.example` 为 `.env.local`，填入 `METACHAT_API_KEY`
3. 本地运行（需同时跑前端 + API）：
   - 安装 Vercel CLI：`npm i -g vercel`
   - 运行：`vercel dev`

> 若仅运行 `npm run dev`，前端可访问但 `/api` 会 404，需用 `vercel dev` 才能完整调试。

## 部署到 Vercel（轻量级发布）

1. 注册 [Vercel](https://vercel.com) 并安装 [Vercel CLI](https://vercel.com/cli)
2. 将代码推送到 GitHub（可私有仓库）
3. 在 Vercel 中导入该仓库
4. 在 **Settings → Environment Variables** 添加：
   - `METACHAT_API_KEY`：你的 MetaChat API Key
   - （可选）`METACHAT_BASE_URL`：默认 `https://llm-api.mmchat.xyz/gemini`
5. 点击 Deploy，约 30 秒后获得可访问域名

前端页面与 `/api` 后端均部署在同一域名下，国内可直接访问。
