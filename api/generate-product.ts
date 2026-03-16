import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

export const config = { maxDuration: 60 };

function getAIClient() {
  const key = process.env.METACHAT_API_KEY || process.env.GEMINI_API_KEY || "";
  if (!key) throw new Error("未配置 METACHAT_API_KEY，请在 Vercel 环境变量中设置");
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      baseUrl: process.env.METACHAT_BASE_URL || "https://llm-api.mmchat.xyz/gemini",
      apiVersion: "",
    },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { productPrompt, size = "1K", isPro = false } = req.body || {};
    if (!productPrompt) {
      return res.status(400).json({ error: "缺少 productPrompt" });
    }
    const ai = getAIClient();
    const modelName = isPro ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image";
    const prompt = `TASK: PROFESSIONAL PRODUCT PHOTOGRAPHY. SUBJECT: ${productPrompt}. STYLE: Studio white background, clean lighting.`;
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [{ text: prompt }] },
      config: isPro ? { imageConfig: { aspectRatio: "1:1", imageSize: size } } : undefined,
    });
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return res.status(200).json({ image: `data:image/png;base64,${part.inlineData.data}` });
      }
    }
    throw new Error("生成失败");
  } catch (err: any) {
    console.error("generate-product error:", err);
    const msg = err?.message || "生成失败";
    if (msg.includes("METACHAT_API_KEY")) {
      return res.status(503).json({ error: "服务未配置 API Key，请联系管理员" });
    }
    return res.status(500).json({ error: msg });
  }
}
