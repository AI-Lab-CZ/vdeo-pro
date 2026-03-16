import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

export const config = { maxDuration: 15 };

function getAIClient() {
  const key = process.env.METACHAT_API_KEY || process.env.GEMINI_API_KEY || "";
  if (!key) throw new Error("未配置 METACHAT_API_KEY");
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
    const { base64Image } = req.body || {};
    if (!base64Image) {
      return res.status(400).json({ error: "缺少 base64Image" });
    }
    const data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data } },
          { text: "请识别这张图片中的产品主体。仅返回该产品的名称，要求：中文、简洁、高端。不要包含任何解释或引号。" },
        ],
      },
    });
    const name = response.text?.trim() || "";
    return res.status(200).json({ productName: name });
  } catch (err: any) {
    console.error("recognize-product error:", err);
    const msg = err?.message || "识别失败";
    if (msg.includes("METACHAT_API_KEY")) {
      return res.status(503).json({ error: "服务未配置 API Key" });
    }
    return res.status(500).json({ error: msg });
  }
}
