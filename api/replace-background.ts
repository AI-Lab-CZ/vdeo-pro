import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAIClient } from "../lib/gemini-server";

const STRICT_PROTOCOL = `
[STRICT IDENTITY PROTOCOL]
- RETAIN the product's exact physical form, dimensions, and texture.
- NO DEFORMATION: The product must not bend, stretch, or warp.
- PERSPECTIVE ALIGNMENT: Adjust the perspective of the product to match the specified camera angle perfectly.
`;

const ENV_PROMPTS: Record<string, string> = {
  潮州牌坊街: "the historic Chaoshan Paifang Street with traditional stone arches and vintage Lingnan architecture",
  滨江长廊: "the scenic Chaoshan Binjiang Promenade by the river with ancient city walls and banyan trees",
  凤凰天池: "the misty Phoenix Heaven Lake (Fenghuang Tianchi) mountain top surrounded by high-altitude tea plantations and soft clouds",
  广济桥: "the ancient Guangji Bridge with its iconic wooden pavilions and floating bridge structures",
  卧室: "a high-end luxury bedroom",
  家庭餐厅: "an elegant dining room",
  户外野餐: "a sunny outdoor garden",
  卫生间: "a modern marble bathroom",
  客厅: "a designer living room",
  办公室: "a professional minimalist office",
  专业摄影棚: "a clean photography studio",
  精品咖啡馆: "a boutique urban cafe",
};

const STYLE_PROMPTS: Record<string, string> = {
  现代奢华: "Premium luxury, marble, gold accents, clean sharp lighting.",
  禅意极简: "Peaceful, organic textures, wood, stone, diffused lighting.",
  "C4D 3D渲染": "Avant-garde 3D render style, abstract shapes, soft pastel colors.",
  自然窗光: "Cinematic window light, soft ray tracing, airy atmosphere.",
  温馨灯影: "Warm cozy evening mood, rich bokeh, lens flare.",
  黑金质感: "Sultry dark mode, black slate, dramatic rim lighting.",
  潮汕复古: "Southern Chinese vintage textures, nostalgic architecture, warm film grain.",
};

function getTaskInstruction(taskType: string): { instruction: string; envWeight: string } {
  switch (taskType) {
    case "VIEW_TOP":
      return {
        instruction: `[TASK: TOP-DOWN VIEW]
        - CAMERA: Flat lay, looking straight down from above the product.
        - ANGLE: 90-degree vertical perspective.
        - FOCUS: Top details and overall footprint.`,
        envWeight: "NORMAL",
      };
    case "VIEW_SIDE":
      return {
        instruction: `[TASK: 45-DEGREE PROFILE VIEW]
        - CAMERA: Three-quarter view from the side.
        - ANGLE: Emphasize the depth, volume, and side-profile of the product.
        - DEPTH: Show the side texture and geometric complexity.`,
        envWeight: "NORMAL",
      };
    case "DETAIL_MACRO":
      return {
        instruction: `[TASK: MACRO MATERIAL FOCUS]
        - ZOOM: Extreme macro close-up. Focus purely on surface texture.
        - BACKGROUND: Extreme bokeh. Abstract colors only.`,
        envWeight: "LOW",
      };
    case "AD_POSTER":
      return {
        instruction: `[TASK: HEROIC AD VIEW]
        - CAMERA: Low-angle shot, looking slightly upward.
        - FEEL: Majestic, grand commercial aesthetic.
        - LIGHTING: High-contrast, rim lighting.`,
        envWeight: "NORMAL",
      };
    case "AD_NEGATIVE":
      return {
        instruction: `[TASK: COMPOSITIONAL NEGATIVE SPACE]
        - COMPOSITION: Rule of thirds. Product is positioned at the far left or right.
        - PURPOSE: Leave large empty area for advertising copy.`,
        envWeight: "NORMAL",
      };
    default:
      return {
        instruction: `[TASK: ICONIC FRONT VIEW]
        - CAMERA: Straight-on eye-level view.
        - PURPOSE: Standard catalog primary image.`,
        envWeight: "NORMAL",
      };
  }
}

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const {
      base64Image,
      environment,
      style,
      customPrompt = "",
      taskType = "FRONT_HERO",
      isPro = false,
      size = "1K",
      addReference = false,
      cleanProduct = false,
    } = req.body || {};

    if (!base64Image) {
      return res.status(400).json({ error: "缺少 base64Image" });
    }

    const { instruction, envWeight } = getTaskInstruction(taskType);
    const cleanCmd = cleanProduct ? "RETCH: Ensure the product surface is pristine and clean." : "";
    const refCmd = addReference && envWeight !== "LOW"
      ? "SCALE: Add a subtle blurry household object for size comparison."
      : "";

    const envStr = envWeight !== "LOW" ? `ENVIRONMENT: In ${ENV_PROMPTS[environment] || ENV_PROMPTS["家庭餐厅"]}.` : "";
    const styleStr = STYLE_PROMPTS[style] || STYLE_PROMPTS["自然窗光"];

    const finalPrompt = `
${STRICT_PROTOCOL}
${instruction}
${envStr}
VISUAL STYLE: ${styleStr}
${cleanCmd}
${refCmd}
${customPrompt ? `EXTRA_DETAIL: ${customPrompt}` : ""}
PHOTOGRAPHY: Photorealistic, 8k, sharp focus on product.
`.trim();

    const data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    const ai = getAIClient();
    const modelName = isPro ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image";
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data } },
            { text: finalPrompt },
          ],
        },
      ],
      config: isPro ? { imageConfig: { aspectRatio: "1:1", imageSize: size } } : undefined,
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const part = parts.find((p: any) => p.inlineData?.data);
    if (!part?.inlineData?.data) {
      throw new Error("AI未能生成图像");
    }
    return res.status(200).json({ image: `data:image/png;base64,${part.inlineData.data}` });
  } catch (err: any) {
    console.error("replace-background error:", err);
    const msg = err?.message || "生成失败";
    if (msg.includes("METACHAT_API_KEY")) {
      return res.status(503).json({ error: "服务未配置 API Key，请联系管理员" });
    }
    return res.status(500).json({ error: msg });
  }
}
