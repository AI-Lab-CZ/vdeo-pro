/**
 * 服务端专用：通过 MetaChat 代理调用 Gemini API
 * 仅在 Vercel Serverless / Node 环境运行，API Key 不暴露给前端
 */
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
