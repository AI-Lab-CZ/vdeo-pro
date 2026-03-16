import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAIClient } from "../lib/gemini-server";

export const config = { maxDuration: 60 };

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
    return res.status(500).json({ error: err?.message || "生成失败" });
  }
}
