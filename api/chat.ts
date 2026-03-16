import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAIClient } from "../lib/gemini-server";

export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { message } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: "缺少 message" });
    }
    const ai = getAIClient();
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "你是一位资深商业摄影总监。专注于视角、光影和材质。请用中文回答。",
      },
    });
    const response = await chat.sendMessage({ message });
    const text = response.text || "抱歉，暂时无法回答。";
    return res.status(200).json({ text });
  } catch (err: any) {
    console.error("chat error:", err);
    return res.status(500).json({ error: err?.message || "对话失败" });
  }
}
