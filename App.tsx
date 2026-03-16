
import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Sparkles, 
  Download, 
  MessageSquare, 
  X, 
  ChevronRight,
  RefreshCw,
  Box,
  Check,
  Zap,
  Layers,
  Camera,
  Focus,
  Trophy,
  Image as ImageIcon,
  Compass,
  ArrowDownCircle,
  Maximize2,
  Dices,
  Archive,
  Eye,
  Lock,
  ShieldCheck,
  Columns,
  Loader2,
  UserPlus,
  MousePointer2
} from 'lucide-react';
import { SceneStyle, EnvironmentType, ImageSize, GenerationConfig, ChatMessage, GenerationResult, ImageTaskType } from './types';
import { replaceBackground, generateOriginalProduct, generateRandomProductPrompt, recognizeProduct } from './geminiService';
import { api } from './apiClient';
import JSZip from 'jszip';

const ALL_TASKS: { type: ImageTaskType; label: string; desc: string; icon: any }[] = [
  { type: 'FRONT_HERO', label: '正面主图', desc: '全景呈现', icon: Camera },
  { type: 'VIEW_SIDE', label: '侧翼轮廓', desc: '立体呈现', icon: MousePointer2 },
  { type: 'VIEW_TOP', label: '俯视角', desc: '轮廓呈现', icon: ArrowDownCircle },
  { type: 'DETAIL_MACRO', label: '极微距', desc: '触感呈现', icon: Focus },
  { type: 'AD_POSTER', label: '英雄仰视角', desc: '张力呈现', icon: Trophy },
  { type: 'AD_NEGATIVE', label: '黄金分割', desc: '商业留白', icon: ImageIcon },
];

const createComparisonImage = (originalUrl: string, generatedUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img1 = new Image();
    const img2 = new Image();
    img1.onload = () => {
      img2.onload = () => {
        const gap = 20;
        const width = img1.width + img2.width + gap;
        const height = Math.max(img1.height, img2.height);
        canvas.width = width;
        canvas.height = height;
        if (ctx) {
          ctx.fillStyle = '#0a0a0a';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img1, 0, 0);
          ctx.drawImage(img2, img1.width + gap, 0);
          ctx.font = 'bold 40px system-ui, sans-serif';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 10;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillText('BEFORE', 30, 60);
          ctx.fillStyle = '#6366f1';
          ctx.fillText('AFTER', img1.width + gap + 30, 60);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        }
      };
      img2.src = generatedUrl;
    };
    img1.crossOrigin = 'anonymous';
    img2.crossOrigin = 'anonymous';
    img1.src = originalUrl;
  });
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, label: '' });
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isZippingComparison, setIsZippingComparison] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [previewImage, setPreviewImage] = useState<{url: string, label: string} | null>(null);
  
  const [config, setConfig] = useState<GenerationConfig>({
    environment: EnvironmentType.AUTO_ADAPT,
    style: SceneStyle.AUTO_ADAPT,
    customPrompt: '',
    isPro: false,
    size: ImageSize.SIZE_1K,
    addReference: true,
    cleanProduct: true,
    addHuman: false,
    selectedTasks: ['FRONT_HERO', 'VIEW_SIDE', 'DETAIL_MACRO'],
    mode: 'UPLOAD',
    productPrompt: '一套极简主义风格的白色骨瓷茶具',
    plan: 'BASIC'
  });
  
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const recognizeProductFromImage = async (base64: string) => {
    setIsRecognizing(true);
    try {
      const name = await recognizeProduct(base64);
      if (name) setConfig(prev => ({ ...prev, productPrompt: name }));
    } catch (e) {
      console.error('识别失败:', e);
    } finally {
      setIsRecognizing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setSelectedFile(base64);
        setResult(null);
        recognizeProductFromImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTask = (type: ImageTaskType) => {
    setConfig(prev => {
      const isSelected = prev.selectedTasks.includes(type);
      return {
        ...prev,
        selectedTasks: isSelected
          ? prev.selectedTasks.filter(t => t !== type)
          : [...prev.selectedTasks, type]
      };
    });
  };

  const handleRandomPrompt = async () => {
    setIsGeneratingPrompt(true);
    try {
      const randomPrompt = await generateRandomProductPrompt();
      setConfig(prev => ({ ...prev, productPrompt: randomPrompt }));
    } catch (error) {
      console.error("生成灵感失败:", error);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    if (config.selectedTasks.length === 0) {
      alert("请至少选择一个视角");
      return;
    }
    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: config.selectedTasks.length, label: '准备中...' });
    try {
      let baseImage = selectedFile;
      if (config.mode === 'AI_GEN') {
        setProcessingProgress(prev => ({ ...prev, label: '正在生成 AI 原型...' }));
        baseImage = await generateOriginalProduct(config.productPrompt, config.size, config.isPro);
        setSelectedFile(baseImage);
      }
      if (!baseImage) {
        alert("请先上传图片或描述产品");
        setIsProcessing(false);
        return;
      }

      const tasksToRun = ALL_TASKS.filter(t => config.selectedTasks.includes(t.type));
      const generatedImages: { url: string; type: ImageTaskType; label: string; description: string }[] = [];

      for (let i = 0; i < tasksToRun.length; i++) {
        const task = tasksToRun[i];
        setProcessingProgress({ current: i + 1, total: tasksToRun.length, label: `正在生成: ${task.label}` });
        if (i > 0) {
          const delay = config.isPro ? 2500 : 800;
          await new Promise(r => setTimeout(r, delay));
        }
        const url = await replaceBackground(
          baseImage!,
          config.environment,
          config.style,
          config.customPrompt,
          task.type,
          config.isPro,
          config.size,
          config.addReference,
          config.cleanProduct,
          config.addHuman
        );
        generatedImages.push({
          url,
          type: task.type,
          label: task.label,
          description: config.addHuman ? '含人物交互场景' : task.desc
        });
      }

      setResult({
        originalUrl: baseImage,
        results: generatedImages,
        id: Date.now().toString()
      });
    } catch (error: any) {
      console.error("生成失败:", error);
      alert(`生成失败: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const base64ToBlob = (base64: string) => {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const uInt8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) uInt8Array[i] = raw.charCodeAt(i);
    return new Blob([uInt8Array], { type: contentType });
  };

  const getSafeFileName = (suffix: string) => {
    const baseName = config.productPrompt || '未命名产品';
    const safeName = baseName.slice(0, 20).trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
    return `${safeName}_${suffix}`;
  };

  const downloadAllAsZip = async () => {
    if (!result) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folderName = getSafeFileName('精修包');
      const folder = zip.folder(folderName);
      if (!folder) throw new Error("Could not create folder in ZIP");
      folder.file("00_原始图.png", base64ToBlob(result.originalUrl));
      result.results.forEach((res, index) => {
        folder.file(`${(index + 1).toString().padStart(2, '0')}_${res.label}.png`, base64ToBlob(res.url));
      });
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${folderName}.zip`;
      link.click();
    } catch (error) {
      console.error("ZIP Error:", error);
      alert("打包失败，请重试");
    } finally {
      setIsZipping(false);
    }
  };

  const downloadAllComparisonsAsZip = async () => {
    if (!result) return;
    setIsZippingComparison(true);
    try {
      const zip = new JSZip();
      const folderName = getSafeFileName('对比包');
      const folder = zip.folder(folderName);
      if (!folder) throw new Error("Could not create folder in ZIP");
      const promises = result.results.map(async (res, i) => {
        const comp = await createComparisonImage(result.originalUrl, res.url);
        folder.file(`${(i + 1).toString().padStart(2, '0')}_${res.label}_对比.jpg`, base64ToBlob(comp));
      });
      await Promise.all(promises);
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${folderName}.zip`;
      link.click();
    } catch (error) {
      console.error("对比包打包失败:", error);
      alert("打包失败，请重试");
    } finally {
      setIsZippingComparison(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatting(true);
    try {
      const { text } = await api.chat(chatInput);
      const modelMsg: ChatMessage = { role: 'model', text };
      setChatMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("对话错误:", error);
      setChatMessages(prev => [...prev, { role: 'model', text: '对话失败，请稍后重试。' }]);
    } finally {
      setIsChatting(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '0768') {
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
      setPassword('');
      // Shake effect or feedback
      setTimeout(() => setLoginError(false), 1000);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808] text-white font-sans p-6">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <div className="bg-[#0c0c0c] border border-white/5 rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl group-hover:bg-indigo-600/20 transition-all duration-1000" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="p-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] shadow-2xl mb-8 group-hover:scale-110 transition-transform duration-500">
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-2xl font-bold tracking-tight mb-2">崇正视觉 PRO</h1>
              <p className="text-white/40 text-xs uppercase tracking-[0.3em] mb-10">High-Fidelity Suite Access</p>
              
              <form onSubmit={handleLogin} className="w-full space-y-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <Lock className={`w-4 h-4 transition-colors ${loginError ? 'text-red-500' : 'text-white/20'}`} />
                  </div>
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入访问密码"
                    className={`w-full bg-white/[0.03] border ${loginError ? 'border-red-500/50 ring-2 ring-red-500/10' : 'border-white/10 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10'} rounded-2xl py-4 pl-14 pr-6 text-sm transition-all focus:outline-none placeholder:text-white/10 tracking-[0.5em] font-mono`}
                    autoFocus
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-white text-black py-4 rounded-2xl font-bold text-sm hover:bg-indigo-50 active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2 group/btn"
                >
                  验证身份
                  <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </form>
              
              {loginError && (
                <p className="mt-6 text-red-500 text-[10px] font-bold uppercase tracking-widest animate-bounce">
                  密码错误，请重新输入
                </p>
              )}
            </div>
          </div>
          
          <p className="text-center mt-8 text-[10px] text-white/10 uppercase tracking-[0.4em]">
            © 2026 Lumina Studio AI · All Rights Reserved
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#080808] text-white selection:bg-indigo-500/30 font-sans relative">
      <aside className="w-full md:w-[400px] border-r border-white/5 bg-[#0c0c0c] p-8 flex flex-col gap-6 overflow-y-auto z-10">
        <header className="flex items-center gap-4 mb-2">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">崇正视觉 PRO</h1>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">High-Fidelity Suite</p>
          </div>
        </header>

        <section className="bg-white/5 p-1 rounded-2xl flex gap-1">
          <button 
            onClick={() => setConfig({...config, plan: 'BASIC', selectedTasks: ['FRONT_HERO', 'VIEW_SIDE', 'DETAIL_MACRO']})}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${config.plan === 'BASIC' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >标准 2+1</button>
          <button 
            onClick={() => setConfig({...config, plan: 'PRO_SET', selectedTasks: ['FRONT_HERO', 'VIEW_SIDE', 'VIEW_TOP', 'DETAIL_MACRO', 'AD_POSTER', 'AD_NEGATIVE']})}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${config.plan === 'PRO_SET' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >专业 6 视角</button>
        </section>

        <section className="bg-white/5 p-1 rounded-2xl flex gap-1">
          <button 
            onClick={() => setConfig({...config, mode: 'UPLOAD'})}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${config.mode === 'UPLOAD' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
          >实拍上传</button>
          <button 
            onClick={() => setConfig({...config, mode: 'AI_GEN'})}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${config.mode === 'AI_GEN' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
          >AI 创作</button>
        </section>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">视角库 (自由勾选)</label>
          <div className="grid grid-cols-3 gap-2">
            {ALL_TASKS.map(task => (
              <button
                key={task.type}
                onClick={() => toggleTask(task.type)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${config.selectedTasks.includes(task.type) ? 'bg-indigo-600/10 border-indigo-500/50 text-white' : 'bg-white/[0.02] border-white/5 text-white/30'}`}
              >
                <task.icon className={`w-4 h-4 ${config.selectedTasks.includes(task.type) ? 'text-indigo-400' : ''}`} />
                <span className="text-[9px] font-bold">{task.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/30 ml-1">{config.selectedTasks.length} 个已选</p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">高保真渲染控制</label>
          <div className="grid grid-cols-2 gap-2">
             <button 
               onClick={() => setConfig({...config, cleanProduct: !config.cleanProduct})}
               className={`flex items-center justify-between px-4 py-3 rounded-2xl text-[11px] font-bold border transition-all ${config.cleanProduct ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400' : 'bg-white/[0.02] border-white/5 text-white/30'}`}
             >
               精修材质
               {config.cleanProduct ? <Check className="w-3 h-3" /> : <Layers className="w-3 h-3 opacity-20" />}
             </button>
             <button 
               onClick={() => setConfig({...config, addReference: !config.addReference})}
               className={`flex items-center justify-between px-4 py-3 rounded-2xl text-[11px] font-bold border transition-all ${config.addReference ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400' : 'bg-white/[0.02] border-white/5 text-white/30'}`}
             >
               空间比例
               {config.addReference ? <Check className="w-3 h-3" /> : <Box className="w-3 h-3 opacity-20" />}
             </button>
          </div>
          <button 
            onClick={() => setConfig({...config, addHuman: !config.addHuman})}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[11px] font-bold border transition-all ${config.addHuman ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400' : 'bg-white/[0.02] border-white/5 text-white/30'}`}
          >
            人物介入 (Lifestyle)
            {config.addHuman ? <Check className="w-3 h-3" /> : <UserPlus className="w-3 h-3 opacity-20" />}
          </button>
        </div>

        <section className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${config.isPro ? 'text-indigo-400' : 'text-white/20'}`} />
              <span className="text-xs font-bold">Pro 级物理渲染</span>
            </div>
            <button 
              onClick={() => setConfig({...config, isPro: !config.isPro})}
              className={`w-10 h-5 rounded-full relative transition-all ${config.isPro ? 'bg-indigo-600' : 'bg-white/10'}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.isPro ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </section>

        {config.mode === 'UPLOAD' ? (
          <section className="space-y-4">
            <div className={`relative group cursor-pointer border-2 border-dashed ${selectedFile ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/5 bg-white/[0.02]'} rounded-3xl aspect-square flex items-center justify-center overflow-hidden transition-all`}>
              {selectedFile ? (
                <img src={selectedFile} alt="Preview" className="w-full h-full object-contain p-4" />
              ) : (
                <div className="text-center p-6"><Upload className="w-8 h-8 text-white/20 mx-auto mb-2" /></div>
              )}
              {isRecognizing && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                  <span className="text-[10px] font-bold">识别产品中...</span>
                </div>
              )}
              <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="relative group">
              <textarea 
                value={config.productPrompt}
                onChange={(e) => setConfig({...config, productPrompt: e.target.value})}
                placeholder="描述产品材质和造型..."
                className="w-full bg-white/[0.05] border border-white/10 rounded-2xl p-4 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all"
              />
              <button 
                onClick={handleRandomPrompt}
                disabled={isGeneratingPrompt}
                className="absolute top-3 right-3 p-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded-lg transition-all border border-indigo-500/30"
                title="随机灵感"
              >
                {isGeneratingPrompt ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Dices className="w-4 h-4" />}
              </button>
            </div>
          </section>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">空间场景</label>
            <select 
              value={config.environment}
              onChange={(e) => setConfig({...config, environment: e.target.value as EnvironmentType})}
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-3 text-xs focus:outline-none appearance-none"
            >
              {Object.values(EnvironmentType).map(env => <option key={env} value={env} className="bg-neutral-900">{env}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">视觉调性</label>
            <select 
              value={config.style}
              onChange={(e) => setConfig({...config, style: e.target.value as SceneStyle})}
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-3 text-xs focus:outline-none appearance-none"
            >
              {Object.values(SceneStyle).map(s => <option key={s} value={s} className="bg-neutral-900">{s}</option>)}
            </select>
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={isProcessing || config.selectedTasks.length === 0}
          className={`w-full py-5 rounded-3xl font-bold text-sm flex flex-col items-center justify-center gap-1 transition-all ${isProcessing || config.selectedTasks.length === 0 ? 'bg-white/5 text-white/20' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-indigo-600/30 hover:scale-[1.02] shadow-xl active:scale-[0.98]'}`}
        >
          {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Compass className="w-4 h-4" /> 开始生成 {config.selectedTasks.length} 个视角</>}
        </button>
      </aside>

      <main className="flex-1 p-8 md:p-12 overflow-y-auto z-0">
        {!result && !isProcessing && (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
             <Maximize2 className="w-16 h-16 mb-6" />
             <p className="tracking-[0.5em] text-xs uppercase font-bold text-center">Multi-Angle Pro Suite Ready</p>
          </div>
        )}

        {isProcessing && (
          <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in">
             <div className="relative">
                <div className="w-24 h-24 border-t-2 border-indigo-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-indigo-400">
                  {processingProgress.total ? Math.round((processingProgress.current / processingProgress.total) * 100) : 0}%
                </div>
             </div>
             <div className="text-center space-y-2">
                <p className="text-sm text-white/70 font-bold tracking-widest uppercase animate-pulse">{processingProgress.label}</p>
                <p className="text-[10px] text-white/20 uppercase tracking-widest">正在处理第 {processingProgress.current} / {processingProgress.total} 个视角</p>
             </div>
          </div>
        )}

        {result && !isProcessing && (
          <div className="space-y-12 animate-in fade-in duration-1000 pb-24">
            <section className="flex items-center gap-8 bg-white/[0.02] p-6 rounded-[32px] border border-white/5">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 bg-black/40 cursor-pointer hover:scale-105 transition-all" onClick={() => setPreviewImage({url: result.originalUrl, label: '原始输入图'})}>
                <img src={result.originalUrl} alt="Original" className="w-full h-full object-contain p-2" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-indigo-400 mb-1">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {config.selectedTasks.length} 视角 · {config.addHuman ? '含人物交互' : '纯净展示'}
                  </span>
                </div>
                <h2 className="text-xl font-bold">已同步环境 DNA 与 空间视角指纹</h2>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={downloadAllAsZip}
                  disabled={isZipping}
                  className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 text-xs font-bold hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isZipping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                  精修包
                </button>
                <button 
                  onClick={downloadAllComparisonsAsZip}
                  disabled={isZippingComparison}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                  {isZippingComparison ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Columns className="w-4 h-4" />}
                  对比包
                </button>
              </div>
            </section>

            <section className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6`}>
              {result.results.map((res, index) => (
                <div 
                  key={index} 
                  className="group relative rounded-[40px] overflow-hidden bg-white/5 border border-white/10 aspect-square shadow-2xl transition-all hover:border-indigo-500/40 cursor-zoom-in"
                  onClick={() => setPreviewImage({url: res.url, label: res.label})}
                >
                  <img src={res.url} alt={res.label} className="w-full h-full object-cover" />
                  
                  <div className="absolute top-5 left-5 right-5 flex justify-between items-start pointer-events-none">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 w-fit">
                        {res.type === 'DETAIL_MACRO' ? <Focus className="w-3 h-3 text-purple-400" /> : res.type === 'VIEW_TOP' ? <ArrowDownCircle className="w-3 h-3 text-emerald-400" /> : res.type.startsWith('AD') ? <ImageIcon className="w-3 h-3 text-pink-400" /> : <Camera className="w-3 h-3 text-indigo-400" />}
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{res.label}</span>
                      </div>
                      <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg border border-white/5 w-fit">
                        <span className="text-[9px] text-white/40 italic">{res.description}</span>
                      </div>
                    </div>
                    <div className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-8">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = document.createElement('a');
                        link.href = res.url;
                        link.download = `studipro-${res.type}-${index+1}.png`;
                        link.click();
                      }}
                      className="w-full bg-white text-black py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-50 active:scale-95 transition-all"
                    >
                      <Download className="w-4 h-4" /> 下载 4K 原片
                    </button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        <button 
          onClick={() => setShowChat(!showChat)}
          className={`fixed bottom-10 right-10 p-5 rounded-3xl shadow-2xl z-50 transition-all ${showChat ? 'bg-red-500 rotate-90' : 'bg-indigo-600 hover:scale-110'}`}
        >
          {showChat ? <X /> : <MessageSquare />}
        </button>

        {showChat && (
          <div className="fixed bottom-32 right-10 w-80 md:w-[400px] h-[550px] bg-[#121212] border border-white/10 rounded-[40px] shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-10">
             <header className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <span className="text-xs font-bold tracking-widest uppercase opacity-60">视觉总监诊断室</span>
                <button onClick={() => setShowChat(false)} className="opacity-20 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
             </header>
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-[13px] leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white/5 border border-white/10 text-white/80'}`}>
                        {msg.text}
                     </div>
                  </div>
                ))}
                {isChatting && <div className="text-[10px] text-white/20 animate-pulse ml-2 uppercase font-bold">Analyzing...</div>}
                <div ref={chatEndRef} />
             </div>
             <div className="p-6 border-t border-white/5">
                <div className="flex gap-3">
                   <input 
                     type="text" 
                     value={chatInput} 
                     onChange={e => setChatInput(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                     placeholder="询问关于视角、构图或光影的建议..." 
                     className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                   />
                   <button onClick={handleSendMessage} className="w-12 h-12 flex items-center justify-center bg-indigo-600 rounded-2xl shadow-lg"><ChevronRight /></button>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 p-4 md:p-12 cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <div className="absolute top-8 right-8 flex gap-4">
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 const link = document.createElement('a');
                 link.href = previewImage.url;
                 link.download = `studipro-preview.png`;
                 link.click();
               }}
               className="p-4 bg-white/10 hover:bg-white/20 rounded-full border border-white/10 transition-all active:scale-95"
             >
               <Download className="w-6 h-6" />
             </button>
             <button 
               onClick={() => setPreviewImage(null)}
               className="p-4 bg-white/10 hover:bg-white/20 rounded-full border border-white/10 transition-all active:scale-95"
             >
               <X className="w-6 h-6" />
             </button>
          </div>
          <div className="max-w-7xl max-h-full flex flex-col items-center">
            <img 
              src={previewImage.url} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-500" 
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-8 text-center" onClick={(e) => e.stopPropagation()}>
               <span className="px-6 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full text-xs font-black uppercase tracking-[0.3em] text-indigo-300">
                  {previewImage.label}
               </span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
