import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// Initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Types
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
  
  // Refinement states
  const [copyFeedback, setCopyFeedback] = useState('');
  const [showCopyRefine, setShowCopyRefine] = useState(false);
  const [imageFeedback, setImageFeedback] = useState('');
  const [showImageRefine, setShowImageRefine] = useState(false);
  const [refinementFile, setRefinementFile] = useState<{name: string, data: string} | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);

  // State for Briefing
  const [briefing, setBriefing] = useState({
    niche: '',
    product: '',
    objective: 'Vendas',
    promise: '',
    cta: 'Saiba Mais'
  });

  // State for Brand Manual
  const [brandFiles, setBrandFiles] = useState<{name: string, data: string}[]>([]);
  const [brandRules, setBrandRules] = useState<BrandRules>({
    colors: ['#003399', '#FFFFFF'],
    typography: 'Sans-serif',
    style: 'Moderno e Clean',
    tone: 'Profissional',
    elements: ['Bordas arredondadas']
  });

  // State for Strategy
  const [strategies, setStrategies] = useState<StrategyOption[]>([]);
  const [selectedCreative, setSelectedCreative] = useState<Creative>({
    angle: '',
    awareness: AWARENESS_LEVELS[1].level,
    format: RECOMMENDED_FORMATS[0],
    profileName: 'MA Educacional'
  });

  // State for Copy
  const [copyOptions, setCopyOptions] = useState<Creative['copy'][]>([]);
  const [selectedCopyIndex, setSelectedCopyIndex] = useState<number | null>(null);

  // Utility to convert file to base64
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
        Retorne em formato JSON como uma lista de objetos with keys "angle" (nome do ângulo), "audience" (público alvo principal) and "description" (breve explicação).`,
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
      alert('Erro ao gerar estratégia. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBrandUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setLoadingMessage('Processando arquivos e extraindo identidade...');
    
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
            { text: "Analise este material de marca e extraia regras visuais: 1. Cores principais (HEX), 2. Tipografia sugerida, 3. Estilo visual, 4. Tom de voz, 5. Elementos visuais. Retorne como JSON." }
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

  const generateCopyOptions = async (isRefining: boolean = false) => {
    setLoading(true);
    setLoadingMessage(isRefining ? 'Refinando copies...' : 'Escrevendo copies persuasivas...');
    try {
      const isReels = selectedCreative.format === 'Reels';
      const awarenessData = AWARENESS_LEVELS.find(a => a.level === selectedCreative.awareness);
      
      const feedbackPart = isRefining ? `AJUSTE COM BASE NO FEEDBACK DO USUÁRIO: "${copyFeedback}".` : '';
      const reelsPart = isReels ? `
        Gere obrigatoriamente um roteiro detalhado para Reels dividido em 3 partes distintas:
        1. gancho: (Topo do Funil / Hook) Frase de impacto inicial para prender a atenção.
        2. desenvolvimento: (Meio do Funil / Body) Onde você desenvolve o valor, problema ou solução explicada no briefing.
        3. cta: (Fundo do Funil / Call to Action) Chamada final baseada nesta diretriz de consciência: "${awarenessData?.howToSpeak}".
        Não coloque todo o texto no gancho. Distribua o conteúdo para que cada campo tenha seu texto específico.` : 'NÃO GERE roteiro de reels (reelsScript). Foque apenas na headline persuasiva e no primaryText (legenda).';
      
      const prompt = `Crie 3 opções de copy de anúncio persuasiva.
      Nicho: ${briefing.niche}, Produto: ${briefing.product}, Promessa: ${briefing.promise}.
      Ângulo: ${selectedCreative.angle}, Nível de Consciência: ${selectedCreative.awareness}, Formato: ${selectedCreative.format}.
      ${reelsPart}
      ${feedbackPart}
      Retorne em JSON com as chaves: headline, primaryText, cta e reelsScript (objeto com gancho, desenvolvimento, cta - deixe null se não for Reels).`;

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
      alert('Erro ao gerar copies.');
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
    setLoadingMessage('Gerando imagem final do criativo...');
    
    try {
      const imagePrompt = `Crie uma imagem profissional para um anúncio de alta conversão.
      Produto/Serviço: ${briefing.product}.
      Nicho: ${briefing.niche}.
      Ângulo Criativo: "${selectedCreative.angle}".
      Nível de Consciência do Público: ${selectedCreative.awareness}.
      Estilo Visual: ${brandRules.style}.
      Cores Principais: ${brandRules.colors.join(', ')}.
      Tom da Marca: ${brandRules.tone}.
      A imagem deve ser limpa, premium e focada em performance para Meta Ads.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: imagePrompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      let imageUrl = '';
      if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!imageUrl) {
        console.warn("Nenhuma imagem gerada pela IA.");
        alert("A IA não conseguiu gerar uma imagem neste momento. Tente novamente ou verifique se o briefing está claro.");
        // We still proceed to preview so the user can see the text, or we could stay in copy step.
        // Let's proceed but alert that image failed.
      }

      setSelectedCreative(prev => ({ ...prev, copy: approvedCopy, image: imageUrl || prev.image }));
      setStep('preview');
    } catch (error) {
      console.error("Erro na geração de imagem:", error);
      alert('Ocorreu um erro ao tentar gerar a imagem. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefinementFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setRefinementFile({ name: file.name, data: base64 });
  };

  const refineImage = async () => {
    if (!imageFeedback.trim() && !refinementFile) return;

    setLoading(true);
    setLoadingMessage('Ajustando imagem conforme seu pedido...');

    try {
      const parts: any[] = [];
      
      // Add the current image as reference
      if (selectedCreative.image) {
        parts.push({
          inlineData: {
            data: selectedCreative.image.split(',')[1],
            mimeType: 'image/png'
          }
        });
      }

      // Add the NEW refinement file if provided
      if (refinementFile) {
        parts.push({
          inlineData: {
            data: refinementFile.data.split(',')[1],
            mimeType: 'image/png'
          }
        });
      }

      // Add the text instruction
      parts.push({ 
        text: `Ajuste esta imagem publicitária com base neste feedback: "${imageFeedback}". 
               ${refinementFile ? 'Use a segunda imagem enviada como referência visual adicional para a melhoria.' : ''}
               Mantenha o estilo ${brandRules.style} e o produto ${briefing.product}.` 
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      let imageUrl = '';
      if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (imageUrl) {
        setSelectedCreative(prev => ({ ...prev, image: imageUrl }));
        setImageFeedback('');
        setRefinementFile(null);
        setShowImageRefine(false);
      } else {
        alert("Não foi possível gerar a nova versão da imagem.");
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao ajustar imagem.');
    } finally {
      setLoading(false);
    }
  };

  const handleAfterStrategy = () => {
    if (!selectedCreative.angle) return;
    if (selectedCreative.format === 'Reels') {
      generateCopyOptions(); 
    } else {
      setStep('brand-manual'); 
    }
  };

  const downloadImage = () => {
    if (!selectedCreative.image) return;
    const link = document.createElement('a');
    link.href = selectedCreative.image;
    link.download = `MA-Educacional-${Date.now()}.png`;
    link.click();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado com sucesso!');
  };

  const embedCode = `<iframe 
  src="${window.location.origin}" 
  width="100%" 
  height="800px" 
  style="border:none; border-radius:16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);"
  allow="camera; microphone; geolocation"
></iframe>`;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-100 flex flex-col items-center">
      <header className="w-full max-w-5xl mb-8 flex flex-col items-center relative">
        <button 
          onClick={() => setShowEmbedModal(true)}
          className="absolute top-0 right-0 bg-white border border-slate-200 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
        >
          <i className="fa-solid fa-code mr-2"></i>Integrar
        </button>

        <div className="flex items-center space-x-0 mb-4 shadow-xl border border-blue-900/10 rounded-xl overflow-hidden group">
          <div className="bg-[#003399] text-white px-6 py-3 font-black text-4xl">MA</div>
          <div className="bg-white text-[#003399] px-6 py-3 font-black text-xl border-l border-slate-100 h-full flex items-center uppercase tracking-widest">EDUCACIONAL</div>
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">MA Educacional | Social Media</h1>
        <p className="text-slate-500 font-medium italic">Inteligência Artificial para Performance</p>
      </header>

      {/* Embed Modal */}
      {showEmbedModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Código de Integração</h3>
              <button onClick={() => setShowEmbedModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Copie o código abaixo e cole no seu sistema Lovable (bloco de Custom HTML ou Iframe) para integrar esta plataforma de Social Media.
              </p>
              <div className="relative">
                <pre className="bg-slate-900 text-blue-400 p-6 rounded-2xl text-[10px] overflow-x-auto font-mono whitespace-pre-wrap leading-relaxed border border-slate-800">
                  {embedCode}
                </pre>
                <button 
                  onClick={() => copyToClipboard(embedCode)}
                  className="absolute top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-lg"
                >
                  Copiar
                </button>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-[10px] font-bold text-blue-800 leading-tight">
                  <i className="fa-solid fa-circle-info mr-2"></i>
                  Dica: Você pode ajustar a altura (height) para que o sistema se encaixe perfeitamente no seu layout.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {isFullScreen && selectedCreative.image && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          <button 
            onClick={() => setIsFullScreen(false)} 
            className="absolute top-6 right-6 text-white text-3xl hover:text-blue-400 transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <img 
            src={selectedCreative.image} 
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
            alt="Criativo Fullscreen" 
          />
          <div className="mt-6 flex space-x-4">
            <button 
              onClick={downloadImage} 
              className="bg-blue-600 text-white px-8 py-3 rounded-full font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl flex items-center space-x-2"
            >
              <i className="fa-solid fa-download"></i>
              <span>Baixar Criativo</span>
            </button>
          </div>
        </div>
      )}

      <main className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-xl font-bold text-slate-800">{loadingMessage}</p>
          </div>
        )}

        <nav className="flex bg-slate-50 border-b border-slate-200 overflow-x-auto no-scrollbar">
          {['Briefing', 'Estratégia', 'Identidade', 'Copies', 'Preview'].map((s, i) => {
            const steps: Step[] = ['briefing', 'strategy', 'brand-manual', 'copy', 'preview'];
            const active = steps.indexOf(step) >= i;
            const isReels = selectedCreative.format === 'Reels';
            const isIdentity = s === 'Identidade';
            const skipStep = isReels && isIdentity;

            return (
              <div key={s} className={`flex-1 py-4 px-2 text-center text-xs font-black uppercase tracking-widest transition-all ${active && !skipStep ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 opacity-50'}`}>
                {s}
              </div>
            );
          })}
        </nav>

        <div className="p-6 md:p-10">
          {step === 'briefing' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
              <h2 className="text-2xl font-black text-slate-800">Briefing do Projeto</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nicho de Mercado</label>
                  <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none" placeholder="Ex: Estética Automotiva" value={briefing.niche} onChange={e => setBriefing({...briefing, niche: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Produto / Serviço</label>
                  <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none" placeholder="Ex: Curso de Polimento" value={briefing.product} onChange={e => setBriefing({...briefing, product: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Promessa Principal</label>
                <textarea className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none h-24" placeholder="O que o cliente ganha?" value={briefing.promise} onChange={e => setBriefing({...briefing, promise: e.target.value})} />
              </div>
              <div className="flex justify-end"><button disabled={!briefing.niche || !briefing.product} onClick={generateStrategy} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest shadow-xl transition-all disabled:opacity-50">Próxima Etapa</button></div>
            </div>
          )}

          {step === 'strategy' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800">Ângulos e Audiência</h2><button onClick={() => setStep('briefing')} className="text-slate-400 font-bold text-xs uppercase">Voltar</button></div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Escolha o Ângulo Criativo</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {strategies.map((s, i) => (
                    <div key={i} onClick={() => setSelectedCreative({...selectedCreative, angle: s.angle})} className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${selectedCreative.angle === s.angle ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-slate-100 hover:border-slate-300'}`}>
                      <h3 className="font-black text-slate-800 mb-1">{s.angle}</h3>
                      <p className="text-xs text-blue-600 font-bold mb-2 uppercase tracking-tighter">{s.audience}</p>
                      <p className="text-sm text-slate-500 leading-tight font-medium">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nível de Consciência (Estratégia do Funil)</label>
                  <div className="flex flex-col space-y-2 items-center">
                    <div className="w-full bg-slate-50 p-4 rounded-t-3xl border border-slate-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">TOPO DO FUNIL (70%)</span>
                        <span className="text-[9px] bg-blue-100 px-2 py-0.5 rounded-full font-black text-blue-800">ALCANCE</span>
                      </div>
                      <div className="space-y-2">
                        {AWARENESS_LEVELS.filter(l => l.funnelStage === 'top').map(level => (
                          <div key={level.level} onClick={() => setSelectedCreative({...selectedCreative, awareness: level.level})} className={`p-3 rounded-xl border text-sm font-bold transition-all cursor-pointer text-center ${selectedCreative.awareness === level.level ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200'}`}>{level.level}</div>
                        ))}
                      </div>
                    </div>
                    <div className="w-[90%] bg-slate-50 p-4 border-x border-slate-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-blue-800 uppercase tracking-tighter">MEIO DO FUNIL (20%)</span>
                        <span className="text-[9px] bg-blue-200 px-2 py-0.5 rounded-full font-black text-blue-900">CONSIDERAÇÃO</span>
                      </div>
                      <div className="space-y-2">
                        {AWARENESS_LEVELS.filter(l => l.funnelStage === 'mid').map(level => (
                          <div key={level.level} onClick={() => setSelectedCreative({...selectedCreative, awareness: level.level})} className={`p-3 rounded-xl border text-sm font-bold transition-all cursor-pointer text-center ${selectedCreative.awareness === level.level ? 'bg-blue-800 border-blue-800 text-white shadow-md' : 'bg-white border-slate-200'}`}>{level.level}</div>
                        ))}
                      </div>
                    </div>
                    <div className="w-[80%] bg-slate-50 p-4 rounded-b-3xl border border-slate-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">FUNDO DO FUNIL (10%)</span>
                        <span className="text-[9px] bg-slate-900 px-2 py-0.5 rounded-full font-black text-white">VENDA</span>
                      </div>
                      <div className="space-y-2">
                        {AWARENESS_LEVELS.filter(l => l.funnelStage === 'bot').map(level => (
                          <div key={level.level} onClick={() => setSelectedCreative({...selectedCreative, awareness: level.level})} className={`p-3 rounded-xl border text-sm font-bold transition-all cursor-pointer text-center ${selectedCreative.awareness === level.level ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200'}`}>{level.level}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Formato Desejado</label>
                  <div className="grid grid-cols-2 gap-2">{RECOMMENDED_FORMATS.map(f => (<div key={f} onClick={() => setSelectedCreative({...selectedCreative, format: f})} className={`p-3 rounded-xl border text-[10px] font-black uppercase text-center transition-all cursor-pointer ${selectedCreative.format === f ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200'}`}>{f}</div>))}</div>
                </div>
              </div>
              <div className="flex justify-end"><button disabled={!selectedCreative.angle} onClick={handleAfterStrategy} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest shadow-xl transition-all">Continuar</button></div>
            </div>
          )}

          {step === 'brand-manual' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800">Identidade de Marca</h2><button onClick={() => setStep('strategy')} className="text-slate-400 font-bold text-xs uppercase">Voltar</button></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="border-4 border-dashed border-slate-100 rounded-3xl p-10 text-center hover:bg-slate-50 transition-colors relative group">
                  <input type="file" multiple onChange={handleBrandUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <i className="fa-solid fa-cloud-arrow-up text-4xl text-blue-600 mb-4"></i>
                  <p className="font-bold text-slate-700">Arraste seus materiais aqui</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase mt-2">Logo, ID Visual, Referências...</p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Arquivos Enviados ({brandFiles.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">{brandFiles.map((f, i) => (<div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200"><span className="text-xs font-bold truncate">{f.name}</span><button onClick={() => setBrandFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><i className="fa-solid fa-trash-can"></i></button></div>))}</div>
                </div>
              </div>
              {brandRules.colors.length > 0 && (
                <div className="p-6 bg-slate-900 rounded-3xl text-white flex items-center justify-between shadow-2xl">
                  <div className="flex items-center space-x-4"><span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">DNA Visual:</span><div className="flex -space-x-2">{brandRules.colors.map((c, i) => (<div key={i} className="w-6 h-6 rounded-full border border-white/20 shadow-inner" style={{backgroundColor: c}}></div>))}</div></div>
                  <div className="text-right"><span className="text-[10px] font-black uppercase text-blue-400 block tracking-widest">Estilo Sugerido:</span><span className="text-sm font-black">{brandRules.style}</span></div>
                </div>
              )}
              <div className="flex justify-end"><button onClick={() => generateCopyOptions()} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest shadow-xl transition-all">Gerar Copies</button></div>
            </div>
          )}

          {step === 'copy' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800">Copywriting</h2><div className="space-x-4"><button onClick={() => setShowCopyRefine(!showCopyRefine)} className="text-blue-600 font-black text-xs uppercase border-b-2 border-blue-600 pb-1">Refinar</button><button onClick={() => setStep(selectedCreative.format === 'Reels' ? 'strategy' : 'brand-manual')} className="text-slate-400 font-bold text-xs uppercase">Voltar</button></div></div>
              {showCopyRefine && (<div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex space-x-4 animate-in slide-in-from-top duration-300"><input className="flex-1 p-3 rounded-xl border border-blue-200 outline-none" placeholder="Ex: Deixe mais agressivo..." value={copyFeedback} onChange={e => setCopyFeedback(e.target.value)} /><button onClick={() => generateCopyOptions(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black">Aplicar</button></div>)}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {copyOptions.map((opt, i) => (
                  <div key={i} onClick={() => setSelectedCopyIndex(i)} className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col h-full ${selectedCopyIndex === i ? 'border-blue-600 bg-white shadow-xl' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}`}>
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Opção {i+1}</span>{selectedCopyIndex === i && <i className="fa-solid fa-circle-check text-blue-600"></i>}</div>
                      <h4 className="font-black text-slate-900 leading-tight">{opt?.headline}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-6 whitespace-pre-wrap">{opt?.primaryText}</p>
                      {selectedCreative.format === 'Reels' && opt?.reelsScript && (<div className="pt-4 border-t border-slate-100"><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Roteiro Reels Incluído</p></div>)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end"><button disabled={selectedCopyIndex === null} onClick={finalizeCreative} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest shadow-xl transition-all">{selectedCreative.format === 'Reels' ? 'Finalizar Roteiro' : 'Finalizar Criativo'}</button></div>
            </div>
          )}

          {step === 'preview' && selectedCreative.copy && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800">Resultado Final</h2><button onClick={() => { setStep('briefing'); setSelectedCopyIndex(null); setBrandFiles([]); setSelectedCreative({angle:'', awareness:AWARENESS_LEVELS[1].level, format:RECOMMENDED_FORMATS[0], profileName:'MA Educacional'}); }} className="text-blue-600 font-black text-xs uppercase tracking-widest">Novo Projeto</button></div>
              <div className={`grid grid-cols-1 ${selectedCreative.image ? 'lg:grid-cols-2' : ''} gap-12 items-start`}>
                {selectedCreative.image && (
                  <div className="instagram-preview bg-white rounded-2xl border border-slate-200 overflow-hidden mx-auto lg:mx-0 w-full shadow-2xl relative group">
                    <div className="flex items-center p-3 space-x-3"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-blue-600 text-xs">MA</div><div className="flex-1"><p className="text-xs font-black">{selectedCreative.profileName}</p><p className="text-[10px] text-slate-500">Patrocinado</p></div></div>
                    <div className="aspect-square bg-slate-50 overflow-hidden relative group">
                        <img 
                          src={selectedCreative.image} 
                          alt="Criativo" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-[1.02] transition-transform" 
                          onClick={() => setIsFullScreen(true)}
                        />
                        <button onClick={() => setShowImageRefine(!showImageRefine)} className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-blue-600 px-4 py-2 rounded-full font-black text-[10px] uppercase shadow-lg transition-all border border-blue-100">
                            <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>Ajustar Imagem
                        </button>
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setIsFullScreen(true)} className="bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center">
                                <i className="fa-solid fa-expand"></i>
                            </button>
                        </div>
                    </div>
                    {showImageRefine && (
                        <div className="p-4 bg-slate-900 text-white animate-in slide-in-from-bottom duration-300 space-y-3">
                            <div className="flex space-x-2">
                                <input className="flex-1 bg-slate-800 p-2 rounded-lg border border-slate-700 outline-none text-xs" placeholder="O que você quer mudar na imagem?" value={imageFeedback} onChange={e => setImageFeedback(e.target.value)} />
                                <button onClick={refineImage} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase shadow-md hover:bg-blue-700 transition-colors">Ok</button>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="relative flex-1">
                                    <input type="file" id="refine-file" className="hidden" onChange={handleRefinementFileUpload} accept="image/*" />
                                    <label htmlFor="refine-file" className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-blue-400 transition-colors">
                                        <i className="fa-solid fa-paperclip"></i>
                                        <span>{refinementFile ? refinementFile.name : 'Anexar Referência'}</span>
                                    </label>
                                </div>
                                {refinementFile && (
                                    <button onClick={() => setRefinementFile(null)} className="text-red-400 text-xs">
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="p-3 bg-slate-50 flex justify-between items-center border-y border-slate-100"><p className="text-xs font-black uppercase truncate mr-4">{selectedCreative.copy.headline}</p><div className="bg-white px-3 py-2 rounded-lg text-[10px] font-black uppercase border border-slate-200 shadow-sm">{selectedCreative.copy.cta}</div></div>
                    <div className="p-3"><p className="text-xs leading-relaxed font-medium line-clamp-3"><span className="font-black mr-2">{selectedCreative.profileName.toLowerCase().replace(/\s/g, '')}</span>{selectedCreative.copy.primaryText}</p></div>
                  </div>
                )}
                <div className={`space-y-6 ${!selectedCreative.image ? 'max-w-2xl mx-auto w-full' : ''}`}>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm"><div className="flex justify-between items-center mb-4"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Legenda Sugerida</h3><button onClick={() => copyToClipboard(selectedCreative.copy!.primaryText)} className="text-blue-600 text-xs font-black uppercase">Copiar</button></div><p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{selectedCreative.copy.primaryText}</p></div>
                  
                  {selectedCreative.format === 'Reels' && selectedCreative.copy.reelsScript && (
                    <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 shadow-xl space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-2">
                          <i className="fa-solid fa-clapperboard text-blue-600"></i>
                          <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">Roteiro para Reels (Funil)</h3>
                        </div>
                        <button onClick={() => { 
                            const script = `${selectedCreative.copy?.reelsScript?.gancho}\n\n${selectedCreative.copy?.reelsScript?.desenvolvimento}\n\n${selectedCreative.copy?.reelsScript?.cta}`; 
                            copyToClipboard(script); 
                          }} className="text-[10px] font-black text-blue-600 uppercase bg-white px-4 py-2 rounded-full shadow-sm border border-blue-50 hover:bg-blue-50 transition-colors">Copiar Tudo</button>
                      </div>
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-full bg-[#E0F2FE] p-6 rounded-t-3xl border border-blue-200 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">1. Topo do Funil (Gancho - 70%)</span>
                            <span className="text-[9px] bg-blue-100 px-2 py-0.5 rounded-full font-black text-blue-800">ATRAIR</span>
                          </div>
                          <p className="text-sm font-bold italic text-slate-800 leading-relaxed">"{selectedCreative.copy.reelsScript.gancho}"</p>
                        </div>
                        <div className="w-[90%] bg-[#BAE6FD] p-6 border-x border-blue-300 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-blue-800 uppercase tracking-tighter">2. Meio do Funil (Desenv. - 20%)</span>
                            <span className="text-[9px] bg-blue-200 px-2 py-0.5 rounded-full font-black text-blue-900">NUTRIR</span>
                          </div>
                          <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">{selectedCreative.copy.reelsScript.desenvolvimento}</p>
                        </div>
                        <div className="w-[75%] bg-[#7DD3FC] p-6 rounded-b-3xl border border-blue-400 shadow-md text-center">
                          <div className="flex justify-center items-center mb-2 space-x-2">
                            <span className="text-[10px] font-black text-blue-900 uppercase tracking-tighter">3. Fundo do Funil (CTA - 10%)</span>
                            <span className="text-[9px] bg-blue-300 px-2 py-0.5 rounded-full font-black text-blue-900">CONVERTER</span>
                          </div>
                          <p className="text-sm font-black text-blue-900 leading-relaxed uppercase tracking-tight">{selectedCreative.copy.reelsScript.cta}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedCreative.image && (<button onClick={downloadImage} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center space-x-3"><i className="fa-solid fa-download"></i><span>Baixar Criativo (PNG)</span></button>)}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <footer className="w-full max-w-5xl mt-12 pb-8 text-center text-slate-400"><p className="text-[10px] font-black uppercase tracking-[0.3em]">MA Educacional | Performance Platform</p><p className="text-[8px] font-bold mt-2 opacity-50">Tecnologia Gemini 2.5 Flash</p></footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);