/**
 * 前端 API 客户端：所有 AI 请求通过 /api 后端，不暴露 API Key
 */
const API_BASE = "";

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `请求失败 ${res.status}`);
  return data as T;
}

export const api = {
  randomPrompt: () => post<{ prompt: string }>("/api/random-prompt", {}),
  recognizeProduct: (base64Image: string) =>
    post<{ productName: string }>("/api/recognize-product", { base64Image }),
  generateProduct: (params: { productPrompt: string; size?: string; isPro?: boolean }) =>
    post<{ image: string }>("/api/generate-product", params),
  replaceBackground: (params: {
    base64Image: string;
    environment: string;
    style: string;
    customPrompt?: string;
    taskType: string;
    isPro?: boolean;
    size?: string;
    addReference?: boolean;
    cleanProduct?: boolean;
    addHuman?: boolean;
  }) => post<{ image: string }>("/api/replace-background", params),
  chat: (message: string) => post<{ text: string }>("/api/chat", { message }),
};
