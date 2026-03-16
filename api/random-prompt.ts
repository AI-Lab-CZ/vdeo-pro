import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

export const config = { maxDuration: 30 };

function getAIClient() {
  const key = process.env.METACHAT_API_KEY || process.env.GEMINI_API_KEY || "";
  if (!key) throw new Error("未配置 METACHAT_API_KEY，请在 Vercel 环境变量中设置");
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      baseUrl: process.env.METACHAT_BASE_URL || "https://llm-api.mmchat.xyz/gemini",
      apiVersion: "v1beta",
    },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const ai = getAIClient();
    const prompt = `
    作为一名资深电商摄影师，请随机提供一个高端、极简的产品描述词。
    要求：
    1. 仅包含产品名称、材质和核心造型特征。
    2. 语言极其简约（不超过20个字）。
    3. 适合作为 AI 图像生成的 Prompt。
    4. 例如："手工拉坯的粗陶茶杯，亚光黑色釉面"、"极简不锈钢咖啡手冲壶，流线型设计"。
    直接返回描述词，不要包含任何解释或引号。
  `;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: { temperature: 0.9, topK: 40 },
    });
    const text = response.text?.trim() || "一套极简主义风格的白色骨瓷茶具";
    return res.status(200).json({ prompt: text });
  } catch (err: any) {
    console.error("random-prompt error:", err);
    const msg = err?.message || "生成失败";
    if (msg.includes("METACHAT_API_KEY")) {
      return res.status(503).json({ error: "服务未配置 API Key，请联系管理员" });
    }
    return res.status(500).json({ error: msg });
  }
}
