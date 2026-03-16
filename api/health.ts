import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const hasKey = !!(process.env.METACHAT_API_KEY || process.env.GEMINI_API_KEY);
  return res.status(200).json({
    ok: true,
    apiKeyConfigured: hasKey,
    env: process.env.NODE_ENV,
  });
}
