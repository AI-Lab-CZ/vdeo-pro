
export enum EnvironmentType {
  PAIFANG_STREET = '潮州牌坊街',
  BINJIANG_PROMENADE = '滨江长廊',
  PHOENIX_TIANCHI = '凤凰天池',
  GUANGJI_BRIDGE = '广济桥',
  BEDROOM = '卧室',
  DINING_ROOM = '家庭餐厅',
  OUTDOOR_PICNIC = '户外野餐',
  BATHROOM = '卫生间',
  LIVING_ROOM = '客厅',
  OFFICE = '办公室',
  STUDIO = '专业摄影棚',
  CAFE = '精品咖啡馆'
}

export enum SceneStyle {
  MODERN_LUXURY = '现代奢华',
  ZEN_MINIMALIST = '禅意极简',
  C4D_GEOMETRIC = 'C4D 3D渲染',
  WINDOW_LIGHT = '自然窗光',
  WARM_BOKEH = '温馨灯影',
  BLACK_GOLD = '黑金质感',
  CHAOZHOU_RETRO = '潮汕复古'
}

export enum ImageSize {
  SIZE_1K = '1K',
  SIZE_2K = '2K',
  SIZE_4K = '4K'
}

export type ImageTaskType = 
  | 'FRONT_HERO'   // 正面主图
  | 'DETAIL_MACRO' // 细节特写
  | 'VIEW_TOP'     // 俯拍视角
  | 'VIEW_SIDE'    // 45度侧切视角
  | 'AD_POSTER'    // 戏剧化海报视角
  | 'AD_NEGATIVE'; // 留白功能视角

export interface GenerationConfig {
  environment: EnvironmentType;
  style: SceneStyle;
  customPrompt: string;
  isPro: boolean;
  size: ImageSize;
  addReference: boolean;
  cleanProduct: boolean;
  mode: 'UPLOAD' | 'AI_GEN';
  productPrompt: string;
  plan: 'BASIC' | 'PRO_SET'; // BASIC = 2+1, PRO_SET = 6
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GenerationResult {
  originalUrl: string;
  results: {
    url: string;
    type: ImageTaskType;
    label: string;
    description: string;
  }[];
  id: string;
}
