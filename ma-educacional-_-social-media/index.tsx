
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// Initialization - Strictly following the SDK guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Types & Interfaces
type Step = 'briefing' | 'strategy' | 'brand-manual' | 'copy' | 'preview';

interface BrandRules {
  colors: string[];
  typography: string;
  style: string;
  tone: string;
  elements: string[];
}

interface StrategyOption {
  angle: string;
  audience: string;
  description: string;
}

interface AwarenessLevel {
  level: string;
  description: string;
  howToSpeak: string;
  funnelStage: 'top' | 'mid' | 'bot';
}

interface ReelsScript {
  gancho: string;
  desenvolvimento: string;
  cta: string;
}

interface Creative {
  angle: string;
  awareness: string;
  format: string;
  copy?: {
    headline: string;
    primaryText: string;
    cta: string;
    reelsScript?: ReelsScript;
  };
  image?: string;
  profileName: string;
}

const AWARENESS_LEVELS: AwarenessLevel[] = [
  { 
    level: 'Inconsciente', 
    description: 'Não sabe que tem um problema.', 
    howToSpeak: 'Foque em sintomas e desperte curiosidade imediata para o problema.',
    funnelStage: 'top'
  },
  { 
    level: 'Consciente do Problema', 
    description: 'Sabe do problema, mas não de soluções.', 
    howToSpeak: 'Agite a dor do problema e apresente sua solução como o alívio necessário.',
    funnelStage: 'top'
  },
  { 
    level: 'Consciente da Solução', 
    description: 'Conhece soluções, mas não a sua.', 
    howToSpeak: 'Destaque seus diferenciais únicos e por que o seu método é superior aos outros.',
    funnelStage: 'mid'
  },
  { 
    level: 'Consciente do Produto', 
    description: 'Conhece você, mas ainda não comprou.', 
    howToSpeak: 'Use prova social, quebra de objeções e ofereça uma garantia ou bônus.',
    funnelStage: 'mid'
  },
  { 
    level: 'Totalmente Consciente', 
    description: 'Pronto para a oferta.', 
    howToSpeak: 'Seja extremamente direto, use escassez real e urgência máxima.',
    funnelStage: 'bot'
  },
];

const RECOMMENDED_FORMATS = [
  'Imagem Única (Direto)', 'Carrossel Educativo', 'Prova Social / Depoimento', 
  'Antes e Depois', 'Lista de Benefícios', 'Comparativo', 'Estudo de Caso', 'Reels'
];

const App = () => {
  const [step, setStep] = useState<Step>('briefing');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // States for Refinement & View
  const [copyFeedback, setCopyFeedback] = useState('');
  const [showCopyRefine, setShowCopyRefine] = useState(false);
  const [imageFeedback, setImageFeedback] = useState('');
  const [showImageRefine, setShowImageRefine] = useState(false);
  const [refinementFile, setRefinementFile] = useState<{name: string, data: string} | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);

  // User Data States
  const [briefing, setBriefing] = useState({
    niche: '',
    product: '',
    objective: 'Vendas',
    promise: '',
    cta: 'Saiba Mais'
  });

  const [brandFiles, setBrandFiles] = useState<{name: string, data: string}[]>([]);
  const [brandRules, setBrandRules] = useState<BrandRules>({
    colors: ['#003399', '#FFFFFF'],
    typography: 'Sans-serif',
    style: 'Moderno e Clean',
    tone: 'Profissional',
    elements: ['Bordas arredondadas']
  });

  const [strategies, setStrategies] = useState<StrategyOption[]>([]);
  const [selectedCreative, setSelectedCreative] = useState<Creative>({
    angle: '',
    awareness: AWARENESS_LEVELS[1].level,
    format: RECOMMENDED_FORMATS[0],
    profileName: 'MA Educacional'
  });

  const [copyOptions, setCopyOptions] = useState<Creative['copy'][]>([]);
  const [selectedCopyIndex, setSelectedCopyIndex] = useState<number | null>(null);

  // Helper Functions
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const generateStrategy = async () => {
    setLoading(true);
    setLoadingMessage('Analisando nicho e gerando ângulos estratégicos...');
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Gere 6 ângulos de anúncios para o nicho "${briefing.niche}" e produto "${briefing.product}". O objetivo é ${briefing.objective}.
        Retorne em formato JSON como uma lista de objetos with chaves "angle", "audience" e "description".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                angle: { type: Type.STRING },
                audience: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["angle", "audience", "description"]
            }
          }
        }
      });
      const data = JSON.parse(response.text || '[]');
      setStrategies(data);
      setStep('strategy');
    } catch (error) {
      console.error(error);
      alert('Erro ao conectar com a IA. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleBrandUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setLoadingMessage('Processando arquivos e extraindo DNA da marca...');
    
    const newFiles: {name: string, data: string}[] = [];
    for(let i=0; i<files.length; i++) {
      const base64 = await fileToBase64(files[i]);
      newFiles.push({ name: files[i].name, data: base64 });
    }
    
    setBrandFiles(prev => [...prev, ...newFiles]);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: newFiles[0].data.split(',')[1], mimeType: files[0].type } },
            { text: "Analise este material de marca e extraia regras visuais precisas: 1. Cores principais (HEX), 2. Tipografia sugerida, 3. Estilo visual dominante, 4. Tom de voz, 5. Elementos visuais recorrentes. Retorne como JSON." }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              colors: { type: Type.ARRAY, items: { type: Type.STRING } },
              typography: { type: Type.STRING },
              style: { type: Type.STRING },
              tone: { type: Type.STRING },
              elements: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["colors", "typography", "style", "tone", "elements"]
          }
        }
      });
      const data = JSON.parse(response.text || '{}');
      setBrandRules(data);
    } catch (error) {
      console.error("Brand analysis error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fix: Added handleRefinementFileUpload to handle image refinement upload
  const handleRefinementFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLoadingMessage('Processando imagem de referência...');
    try {
      const base64 = await fileToBase64(file);
      setRefinementFile({ name: file.name, data: base64 });
    } catch (error) {
      console.error("Refinement file upload error:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateCopyOptions = async (isRefining: boolean = false) => {
    setLoading(true);
    setLoadingMessage(isRefining ? 'Refinando copies...' : 'Construindo narrativa persuasiva...');
    try {
      const isReels = selectedCreative.format === 'Reels';
      const awarenessData = AWARENESS_LEVELS.find(a => a.level === selectedCreative.awareness);
      
      const feedbackPart = isRefining ? `AJUSTE COM BASE NO FEEDBACK DO USUÁRIO: "${copyFeedback}".` : '';
      const reelsPart = isReels ? `
        Gere obrigatoriamente um roteiro detalhado para Reels dividido em 3 partes:
        1. gancho: IMPACTO INICIAL para atrair "${awarenessData?.level}".
        2. desenvolvimento: VALOR E CONTEXTO.
        3. cta: CHAMADA PARA AÇÃO direta baseada em: "${awarenessData?.howToSpeak}".` : 'NÃO GERE roteiro de reels (reelsScript). Foque em headline e primaryText.';
      
      const prompt = `Crie 3 opções de copy de anúncio.
      Produto: ${briefing.product}. Nicho: ${briefing.niche}. 
      Nível de Consciência: ${selectedCreative.awareness}.
      Ângulo Estratégico: ${selectedCreative.angle}. 
      ${reelsPart}
      ${feedbackPart}
      Retorne JSON: list of {headline, primaryText, cta, reelsScript: {gancho, desenvolvimento, cta}}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                primaryText: { type: Type.STRING },
                cta: { type: Type.STRING },
                reelsScript: {
                  type: Type.OBJECT,
                  properties: {
                    gancho: { type: Type.STRING },
                    desenvolvimento: { type: Type.STRING },
                    cta: { type: Type.STRING }
                  }
                }
              },
              required: ["headline", "primaryText", "cta"]
            }
          }
        }
      });
      const data = JSON.parse(response.text || '[]');
      setCopyOptions(data);
      setStep('copy');
      setShowCopyRefine(false);
      setCopyFeedback('');
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar textos. Tente simplificar o briefing.');
    } finally {
      setLoading(false);
    }
  };

  const finalizeCreative = async () => {
    if (selectedCopyIndex === null) return;
    const approvedCopy = copyOptions[selectedCopyIndex];

    if (selectedCreative.format === 'Reels') {
      setSelectedCreative(prev => ({ ...prev, copy: approvedCopy, image: undefined }));
      setStep('preview');
      return;
    }

    setLoading(true);
    setLoadingMessage('Criando representação visual de alta performance...');
    
    try {
      const imagePrompt = `Fotografia publicitária premium e profissional. 
      Produto: ${briefing.product}. Estilo: ${brandRules.style}. 
      Cores: ${brandRules.colors.join(', ')}. 
      Contexto: Anúncio de Meta Ads para o nicho ${briefing.niche}.
      Ângulo: "${selectedCreative.angle}".
      Estética limpa, luxuosa e atraente.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: imagePrompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      let imageUrl = '';
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      setSelectedCreative(prev => ({ ...prev, copy: approvedCopy, image: imageUrl }));
      setStep('preview');
    } catch (error) {
      console.error(error);
      alert('A geração de imagem falhou. Prosseguindo com o texto.');
      setSelectedCreative(prev => ({ ...prev, copy: approvedCopy }));
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const refineImage = async () => {
    if (!imageFeedback.trim() && !refinementFile) return;

    setLoading(true);
    setLoadingMessage('Aplicando refinamentos visuais...');

    try {
      const parts: any[] = [];
      if (selectedCreative.image) {
        parts.push({ inlineData: { data: selectedCreative.image.split(',')[1], mimeType: 'image/png' } });
      }
      if (refinementFile) {
        parts.push({ inlineData: { data: refinementFile.data.split(',')[1], mimeType: 'image/png' } });
      }
      parts.push({ text: `Aplique estas melhorias na imagem: "${imageFeedback}". Mantenha coerência com a marca ${brandRules.style}.` });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      let imageUrl = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (imageUrl) {
        setSelectedCreative(prev => ({ ...prev, image: imageUrl }));
        setImageFeedback('');
        setRefinementFile(null);
        setShowImageRefine(false);
      }
    } catch (error) {
      console.error(error);
      alert('Não foi possível ajustar a imagem. Tente uma instrução diferente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAfterStrategy = () => {
    if (!selectedCreative.angle) return;
    selectedCreative.format === 'Reels' ? generateCopyOptions() : setStep('brand-manual');
  };

  const downloadImage = () => {
    if (!selectedCreative.image) return;
    const link = document.createElement('a');
    link.href = selectedCreative.image;
    link.download = `criativo-ma-${Date.now()}.png`;
    link.click();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  const embedCode = `<iframe 
  src="${window.location.origin}" 
  width="100%" 
  height="800px" 
  style="border:none; border-radius:24px; box-shadow: 0 20px 50px -10px rgba(0, 51, 153, 0.15);"
  allow="camera; microphone; geolocation"
></iframe>`;

  return (
    <div className="min-h-screen p-4 md:p-10 bg-[#f0f4f8] flex flex-col items-center">
      <header className="w-full max-w-5xl mb-10 flex flex-col items-center relative">
        <button 
          onClick={() => setShowEmbedModal(true)}
          className="absolute top-0 right-0 bg-white border border-slate-200 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:shadow-lg transition-all"
        >
          <i className="fa-solid fa-cloud-arrow-up mr-2"></i>Publicar / Integrar
        </button>

        <div className="flex items-center mb-5 shadow-2xl border border-blue-900/10 rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
          <div className="bg-[#003399] text-white px-8 py-4 font-black text-5xl">MA</div>
          <div className="bg-white text-[#003399] px-8 py-4 font-black text-2xl border-l border-slate-100 uppercase tracking-widest">EDUCACIONAL</div>
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Social Ads Factory</h1>
        <p className="text-slate-500 font-semibold italic text-lg">Ecossistema de Performance Criativa</p>
      </header>

      {/* Embed Modal */}
      {showEmbedModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-3xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Deploy de Integração</h3>
              <button onClick={() => setShowEmbedModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                <i className="fa-solid fa-xmark text-2xl"></i>
              </button>
            </div>
            <div className="p-10 space-y-8">
              <div className="space-y-3">
                <p className="text-sm text-slate-600 font-medium">Use este código para embutir a plataforma em seu domínio Lovable:</p>
                <div className="relative group">
                  <pre className="bg-slate-950 text-blue-400 p-8 rounded-3xl text-[11px] overflow-x-auto font-mono leading-relaxed border border-slate-800">
                    {embedCode}
                  </pre>
                  <button onClick={() => copyToClipboard(embedCode)} className="absolute top-4 right-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest hover:scale-105 transition-transform shadow-xl">Copiar Código</button>
                </div>
              </div>
              <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex items-start space-x-4">
                <i className="fa-solid fa-rocket text-blue-600 mt-1"></i>
                <p className="text-xs font-bold text-blue-800 leading-normal italic">Seu sistema estará pronto para escala em segundos. Ajuste a largura e altura no código acima conforme sua necessidade visual.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image View */}
      {isFullScreen && selectedCreative.image && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <button onClick={() => setIsFullScreen(false)} className="absolute top-8 right-8 text-white/50 hover:text-white text-4xl transition-colors"><i className="fa-solid fa-circle-xmark"></i></button>
          <img src={selectedCreative.image} className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border-4 border-white/10" alt="Creative HD" />
        </div>
      )}

      <main className="w-full max-w-5xl bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] border border-white overflow-hidden relative min-h-[600px] mb-20">
        {loading && (
          <div className="absolute inset-0 bg-white/98 z-50 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
            <div className="relative w-24 h-24 mb-10">
              <div className="absolute inset-0 border-8 border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{loadingMessage}</p>
            <p className="text-slate-400 mt-4 font-bold uppercase tracking-[0.2em] text-[10px]">IA em Processamento de Dados</p>
          </div>
        )}

        <nav className="flex bg-slate-50/50 border-b border-slate-100 px-6 overflow-x-auto no-scrollbar">
          {['Briefing', 'Estratégia', 'Marca', 'Copies', 'Preview'].map((s, i) => {
            const steps: Step[] = ['briefing', 'strategy', 'brand-manual', 'copy', 'preview'];
            const active = steps.indexOf(step) >= i;
            const skipStep = selectedCreative.format === 'Reels' && s === 'Marca';
            if (skipStep) return null;
            return (
              <div key={s} className={`flex-1 py-7 text-center text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-4 ${active ? 'text-blue-600 border-blue-600' : 'text-slate-300 border-transparent opacity-40'}`}>
                {s}
              </div>
            );
          })}
        </nav>

        <div className="p-8 md:p-16">
          {step === 'briefing' && (
            <div className="space-y-10 animate-in slide-in-from-right duration-700">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Setup Inicial</h2>
                <p className="text-slate-500 font-medium">Defina os pilares do seu novo projeto criativo.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nicho Comercial</label>
                  <input className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all font-bold text-slate-800" placeholder="Ex: Farmácia de Manipulação" value={briefing.niche} onChange={e => setBriefing({...briefing, niche: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nome do Produto</label>
                  <input className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all font-bold text-slate-800" placeholder="Ex: Protocolo MA Farma" value={briefing.product} onChange={e => setBriefing({...briefing, product: e.target.value})} />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Promessa Irresistível</label>
                <textarea className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-blue-600 focus:bg-white outline-none h-32 transition-all font-medium text-slate-800" placeholder="Qual o grande benefício para o cliente?" value={briefing.promise} onChange={e => setBriefing({...briefing, promise: e.target.value})} />
              </div>
              <div className="flex justify-end pt-6 border-t border-slate-50">
                <button disabled={!briefing.niche || !briefing.product} onClick={generateStrategy} className="bg-blue-600 hover:bg-blue-700 text-white px-14 py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all disabled:opacity-30 disabled:grayscale">Mapear Estratégia</button>
              </div>
            </div>
          )}

          {step === 'strategy' && (
            <div className="space-y-12 animate-in slide-in-from-right duration-700">
              <div className="flex justify-between items-end border-b border-slate-50 pb-8">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ângulos Criativos</h2>
                  <p className="text-slate-500 font-medium">A IA detectou 6 abordagens de alta conversão para seu produto.</p>
                </div>
                <button onClick={() => setStep('briefing')} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900">Voltar</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {strategies.map((s, i) => (
                  <div key={i} onClick={() => setSelectedCreative({...selectedCreative, angle: s.angle})} className={`p-8 rounded-[2rem] border-3 transition-all cursor-pointer group relative overflow-hidden ${selectedCreative.angle === s.angle ? 'border-blue-600 bg-blue-50/30' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}`}>
                    <div className="relative z-10">
                      <h3 className="font-black text-xl text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{s.angle}</h3>
                      <p className="text-[10px] bg-blue-100 text-blue-700 inline-block px-3 py-1 rounded-full font-black uppercase tracking-widest mb-4">{s.audience}</p>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium">{s.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-10 border-t border-slate-50">
                <div className="space-y-6">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nível de Consciência (Funil)</label>
                  <div className="space-y-3">
                    {AWARENESS_LEVELS.map(level => (
                      <div key={level.level} onClick={() => setSelectedCreative({...selectedCreative, awareness: level.level})} className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center ${selectedCreative.awareness === level.level ? 'border-blue-600 bg-white shadow-xl' : 'border-slate-50 bg-slate-50 hover:border-slate-100 opacity-60'}`}>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-sm">{level.level}</span>
                          <span className="text-[10px] text-slate-400 font-bold italic">{level.description}</span>
                        </div>
                        <i className={`fa-solid fa-circle-check ${selectedCreative.awareness === level.level ? 'text-blue-600' : 'text-slate-100'}`}></i>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Formato de Mídia</label>
                  <div className="grid grid-cols-2 gap-4">
                    {RECOMMENDED_FORMATS.map(f => (
                      <div key={f} onClick={() => setSelectedCreative({...selectedCreative, format: f})} className={`p-5 rounded-2xl border-2 text-[10px] font-black uppercase text-center transition-all cursor-pointer flex items-center justify-center h-20 leading-tight ${selectedCreative.format === f ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-105' : 'bg-white border-slate-100 hover:border-slate-200 text-slate-500'}`}>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-10">
                <button onClick={handleAfterStrategy} className="bg-blue-600 hover:bg-blue-700 text-white px-16 py-5 rounded-2xl font-black uppercase tracking-widest shadow-3xl transform hover:-translate-y-1 transition-all">Definir Identidade Visual</button>
              </div>
            </div>
          )}

          {step === 'brand-manual' && (
            <div className="space-y-12 animate-in slide-in-from-right duration-700">
              <div className="flex justify-between items-end border-b border-slate-50 pb-8">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Manual de Marca</h2>
                  <p className="text-slate-500 font-medium">Ensine a IA como seu sistema visual funciona.</p>
                </div>
                <button onClick={() => setStep('strategy')} className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Voltar</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="relative group cursor-pointer">
                  <input type="file" multiple onChange={handleBrandUpload} className="absolute inset-0 opacity-0 z-20 cursor-pointer" />
                  <div className="border-4 border-dashed border-slate-100 rounded-[3rem] p-16 text-center group-hover:bg-slate-50 transition-all group-hover:border-blue-200">
                    <i className="fa-solid fa-wand-sparkles text-6xl text-blue-600 mb-6 group-hover:scale-110 transition-transform"></i>
                    <p className="font-black text-xl text-slate-800">Enviar Manual da Marca</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase mt-4 tracking-widest">Logos, Mockups, Paletas (PDF/IMG)</p>
                  </div>
                </div>
                <div className="space-y-8">
                  <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-3xl">
                    <h3 className="text-[10px] font-black uppercase text-blue-400 mb-6 tracking-widest">Extração Automática</h3>
                    <div className="space-y-6">
                      <div className="flex items-center space-x-6">
                        <span className="text-xs font-bold text-slate-400 w-24">Cores:</span>
                        <div className="flex -space-x-3">{brandRules.colors.map((c, i) => (<div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 shadow-xl" style={{backgroundColor: c}}></div>))}</div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <span className="text-xs font-bold text-slate-400 w-24">Estilo:</span>
                        <span className="text-sm font-black italic">{brandRules.style}</span>
                      </div>
                      <div className="flex items-center space-x-6">
                        <span className="text-xs font-bold text-slate-400 w-24">Tom de Voz:</span>
                        <span className="text-sm font-black">{brandRules.tone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <i className="fa-solid fa-paperclip text-slate-300"></i>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest truncate">{brandFiles.length > 0 ? `${brandFiles.length} arquivos processados` : 'Aguardando arquivos...'}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-10">
                <button onClick={() => generateCopyOptions()} className="bg-blue-600 hover:bg-blue-700 text-white px-20 py-5 rounded-2xl font-black uppercase tracking-widest shadow-3xl hover:scale-105 transition-all">Redigir Copies</button>
              </div>
            </div>
          )}

          {step === 'copy' && (
            <div className="space-y-12 animate-in slide-in-from-right duration-700">
              <div className="flex justify-between items-end border-b border-slate-50 pb-8">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Copywriting Criativo</h2>
                  <p className="text-slate-500 font-medium">A IA gerou variações baseadas no seu nível de consciência.</p>
                </div>
                <div className="flex items-center space-x-6">
                   <button onClick={() => setShowCopyRefine(!showCopyRefine)} className="text-blue-600 font-black text-[10px] uppercase tracking-widest border-b-2 border-blue-600 pb-1">Refinar com Feedback</button>
                   <button onClick={() => setStep(selectedCreative.format === 'Reels' ? 'strategy' : 'brand-manual')} className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Voltar</button>
                </div>
              </div>

              {showCopyRefine && (
                <div className="p-8 bg-blue-50/50 rounded-3xl border-2 border-blue-100 flex items-center space-x-6 animate-in slide-in-from-top duration-300 shadow-xl">
                  <input className="flex-1 p-5 rounded-2xl border-2 border-blue-200 outline-none bg-white font-medium" placeholder="Ex: Deixe o CTA mais urgente e o título mais agressivo..." value={copyFeedback} onChange={e => setCopyFeedback(e.target.value)} />
                  <button onClick={() => generateCopyOptions(true)} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg">Ajustar</button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {copyOptions.map((opt, i) => (
                  <div key={i} onClick={() => setSelectedCopyIndex(i)} className={`p-8 rounded-[2.5rem] border-3 transition-all cursor-pointer flex flex-col h-full min-h-[400px] ${selectedCopyIndex === i ? 'border-blue-600 bg-white shadow-3xl transform scale-105 z-10' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 opacity-80'}`}>
                    <div className="flex-1 space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Variação V{i+1}</span>
                        {selectedCopyIndex === i && <i className="fa-solid fa-circle-check text-blue-600 text-2xl"></i>}
                      </div>
                      <h4 className="font-black text-2xl text-slate-900 leading-tight border-l-4 border-blue-600 pl-4">{opt?.headline}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{opt?.primaryText}</p>
                      {opt?.reelsScript && (<div className="pt-6 border-t border-slate-100 flex items-center space-x-3"><i className="fa-solid fa-clapperboard text-blue-600"></i><span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Roteiro Ativo</span></div>)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-10">
                <button disabled={selectedCopyIndex === null} onClick={finalizeCreative} className="bg-blue-600 hover:bg-blue-700 text-white px-20 py-5 rounded-2xl font-black uppercase tracking-widest shadow-3xl hover:scale-105 transition-all">Finalizar Criativo</button>
              </div>
            </div>
          )}

          {step === 'preview' && selectedCreative.copy && (
            <div className="space-y-12 animate-in fade-in duration-1000">
              <div className="flex justify-between items-end border-b border-slate-50 pb-8">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Criativo Final</h2>
                  <p className="text-slate-500 font-medium">Pronto para rodar na sua BM. Alta taxa de CTR garantida.</p>
                </div>
                <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">Novo Projeto</button>
              </div>

              <div className={`grid grid-cols-1 ${selectedCreative.image ? 'lg:grid-cols-2' : ''} gap-16 items-start`}>
                {selectedCreative.image && (
                  <div className="instagram-preview bg-white rounded-[2rem] border border-slate-100 overflow-hidden mx-auto lg:mx-0 w-full shadow-3xl relative">
                    <div className="flex items-center p-4 space-x-4">
                      <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center font-black text-blue-400 text-sm">MA</div>
                      <div className="flex-1"><p className="text-sm font-black text-slate-900">{selectedCreative.profileName}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Patrocinado</p></div>
                    </div>
                    <div className="aspect-square bg-slate-50 overflow-hidden relative group">
                        <img 
                          src={selectedCreative.image} 
                          alt="Ad Visual" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-[1.03] transition-transform duration-700" 
                          onClick={() => setIsFullScreen(true)}
                        />
                        <button onClick={() => setShowImageRefine(!showImageRefine)} className="absolute bottom-6 right-6 bg-white/95 hover:bg-white text-blue-600 px-6 py-3 rounded-full font-black text-[11px] uppercase shadow-2xl transition-all border border-blue-50">
                            <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>Ajustar Visual
                        </button>
                        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setIsFullScreen(true)} className="bg-black/60 text-white w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <i className="fa-solid fa-expand text-lg"></i>
                            </button>
                        </div>
                    </div>
                    
                    {showImageRefine && (
                        <div className="p-6 bg-slate-950 text-white animate-in slide-in-from-bottom duration-500 space-y-4 shadow-2xl">
                            <div className="flex space-x-3">
                                <input className="flex-1 bg-slate-900 p-4 rounded-xl border border-slate-800 outline-none text-xs font-medium placeholder:text-slate-600" placeholder="O que deseja mudar na imagem? Ex: Mudar fundo..." value={imageFeedback} onChange={e => setImageFeedback(e.target.value)} />
                                <button onClick={refineImage} className="bg-blue-600 text-white px-6 py-4 rounded-xl font-black uppercase text-[10px] shadow-lg hover:bg-blue-700 transition-colors">Confirmar</button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="relative">
                                    <input type="file" id="refine-file-2" className="hidden" onChange={handleRefinementFileUpload} accept="image/*" />
                                    <label htmlFor="refine-file-2" className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest cursor-pointer text-slate-400 hover:text-white transition-colors">
                                        <i className="fa-solid fa-paperclip"></i>
                                        <span>{refinementFile ? refinementFile.name : 'Anexar Referência Extra'}</span>
                                    </label>
                                </div>
                                {refinementFile && <button onClick={() => setRefinementFile(null)} className="text-red-500 text-xs font-black uppercase tracking-widest">Remover</button>}
                            </div>
                        </div>
                    )}

                    <div className="p-4 bg-slate-50 flex justify-between items-center border-y border-slate-100">
                      <p className="text-xs font-black text-slate-900 uppercase truncate mr-6">{selectedCreative.copy.headline}</p>
                      <div className="bg-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase border border-slate-200 shadow-sm text-blue-600">{selectedCreative.copy.cta}</div>
                    </div>
                    <div className="p-5">
                      <p className="text-xs leading-relaxed font-medium text-slate-700">
                        <span className="font-black mr-2 text-slate-900">{selectedCreative.profileName.toLowerCase().replace(/\s/g, '')}</span>
                        {selectedCreative.copy.primaryText}
                      </p>
                    </div>
                  </div>
                )}

                <div className={`space-y-8 ${!selectedCreative.image ? 'max-w-2xl mx-auto w-full' : ''}`}>
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Legenda Final</h3>
                      <button onClick={() => copyToClipboard(selectedCreative.copy!.primaryText)} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors">Copiar Legenda</button>
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-6 rounded-2xl border border-slate-100">{selectedCreative.copy.primaryText}</p>
                  </div>
                  
                  {selectedCreative.copy.reelsScript && (
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-1 rounded-[2.5rem] shadow-3xl">
                      <div className="bg-white p-10 rounded-[2.4rem] space-y-8">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <i className="fa-solid fa-video text-blue-600 text-2xl"></i>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Roteiro Estratégico</h3>
                          </div>
                          <button onClick={() => { 
                              const fullScript = `GANCHO: ${selectedCreative.copy?.reelsScript?.gancho}\n\nDESENVOLVIMENTO: ${selectedCreative.copy?.reelsScript?.desenvolvimento}\n\nCTA: ${selectedCreative.copy?.reelsScript?.cta}`; 
                              copyToClipboard(fullScript); 
                            }} className="text-[10px] font-black text-blue-600 uppercase border-b-2 border-blue-600">Copiar Roteiro</button>
                        </div>
                        <div className="space-y-4">
                          <div className="p-6 bg-slate-50 rounded-2xl border-l-8 border-blue-600">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Parte 01: Gancho</span>
                            <p className="text-base font-black italic text-slate-900">"{selectedCreative.copy.reelsScript.gancho}"</p>
                          </div>
                          <div className="p-6 bg-slate-50 rounded-2xl border-l-8 border-blue-400">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Parte 02: Valor</span>
                            <p className="text-sm font-medium text-slate-700">{selectedCreative.copy.reelsScript.desenvolvimento}</p>
                          </div>
                          <div className="p-6 bg-slate-50 rounded-2xl border-l-8 border-slate-900">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Parte 03: CTA</span>
                            <p className="text-base font-black text-slate-900 uppercase tracking-tight">{selectedCreative.copy.reelsScript.cta}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedCreative.image && (
                    <button onClick={downloadImage} className="w-full bg-slate-950 text-white p-7 rounded-[1.5rem] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-3xl flex items-center justify-center space-x-4 group">
                      <i className="fa-solid fa-cloud-arrow-down group-hover:scale-125 transition-transform"></i>
                      <span>Baixar Criativo (PNG)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full max-w-5xl text-center text-slate-400 pb-20 space-y-4">
        <p className="text-[11px] font-black uppercase tracking-[0.5em] opacity-30">MA Educacional | Platform Core v2.5</p>
        <div className="flex justify-center items-center space-x-4">
          <span className="h-[1px] w-10 bg-slate-200"></span>
          <p className="text-[9px] font-bold opacity-40">Powered by Google Gemini Large Models</p>
          <span className="h-[1px] w-10 bg-slate-200"></span>
        </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
