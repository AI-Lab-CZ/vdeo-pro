/**
 * 服务端专用：通过 MetaChat 代理调用 Gemini API
 * 放在 api/lib 下确保被 Vercel 打包进 serverless 函数
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

const METACHAT_BASE = process.env.METACHAT_BASE_URL || "https://llm-api.mmchat.xyz/gemini";
const METACHAT_KEY = process.env.METACHAT_API_KEY || process.env.GEMINI_API_KEY || "";

export const getAIClient = () => {
  if (!METACHAT_KEY) {
    throw new Error("未配置 METACHAT_API_KEY，请在 Vercel 环境变量中设置");
  }
  return new GoogleGenAI({
    apiKey: METACHAT_KEY,
    httpOptions: {
      baseUrl: METACHAT_BASE,
      apiVersion: "",
    },
  });
};

// 防止 /api/lib/gemini-server 被当作独立路由时返回无意义内容
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(404).end();
}
