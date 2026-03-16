/**
 * 前端服务层：通过 /api 后端调用 AI，API Key 不暴露
 */
import { api } from "./apiClient";
import { SceneStyle, EnvironmentType, ImageSize, ImageTaskType } from "./types";

export const generateRandomProductPrompt = async (): Promise<string> => {
  const { prompt } = await api.randomPrompt();
  return prompt;
};

export const generateOriginalProduct = async (
  productDescription: string,
  size: ImageSize = ImageSize.SIZE_1K,
  usePro: boolean = false
): Promise<string> => {
  const { image } = await api.generateProduct({
    productPrompt: productDescription,
    size,
    isPro: usePro,
  });
  return image;
};

export const replaceBackground = async (
  base64Image: string,
  environment: EnvironmentType,
  style: SceneStyle,
  customPrompt: string,
  taskType: ImageTaskType,
  isPro: boolean = false,
  size: ImageSize = ImageSize.SIZE_1K,
  addReference: boolean = false,
  cleanProduct: boolean = false
): Promise<string> => {
  const { image } = await api.replaceBackground({
    base64Image,
    environment,
    style,
    customPrompt,
    taskType,
    isPro,
    size,
    addReference,
    cleanProduct,
  });
  return image;
};
