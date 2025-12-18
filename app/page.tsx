"use client";

import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, Settings, Download, FileText, ChevronRight, ChevronLeft, 
  ZoomIn as ZoomIcon, RefreshCw, Minus, Plus, Layers, Trash2, 
  CheckCircle, XCircle, Loader2, X, BarChart3, AlertTriangle 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";

// ⚠️ API URL
const API_URL = "https://candenizkocak--tile-defect-api-json-model-analyze.modal.run";

// Color Palette
const COLORS = {
  'Halo': '#ef4444',          // Red
  'Edge defect': '#f97316',   // Orange
  'Corner defect': '#eab308', // Yellow
  'White spot': '#3b82f6',    // Blue
  'Light patch': '#8b5cf6',   // Violet
  'Dark spot': '#64748b',     // Slate
  'Unknown': '#9ca3af'
};

type BatchItem = {
  id: string;
  file: File;
  src: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  results: any | null;
  crops: any[];
};

// Zoom Controls
const ZoomControls = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-4 right-4 flex gap-2 z-10">
      <button onClick={() => zoomIn()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-colors">
        <Plus className="w-4 h-4" />
      </button>
      <button onClick={() => zoomOut()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-colors">
        <Minus className="w-4 h-4" />
      </button>
      <button onClick={() => resetTransform()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-colors">
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function CeraSightDashboard() {
  // State
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // UI State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);

  // Config State
  const [confThreshold, setConfThreshold] = useState(0.35);
  const [useRoi, setUseRoi] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived State
  const currentItem = selectedIndex >= 0 ? batch[selectedIndex] : null;

  // --- Helpers ---

  // Calculate Global Stats across ALL images
  const globalStats = useMemo(() => {
    const counts: {[key: string]: number} = {};
    let total = 0;
    batch.forEach(item => {
      if (item.results?.defects) {
        item.results.defects.forEach((d: any) => {
          counts[d.class] = (counts[d.class] || 0) + 1;
          total++;
        });
      }
    });
    const data = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return { data, total };
  }, [batch]);

  // Calculate Single Image Stats
  const currentStats = useMemo(() => {
    if (!currentItem?.results?.defects) return [];
    const counts: {[key: string]: number} = {};
    currentItem.results.defects.forEach((d: any) => {
      counts[d.class] = (counts[d.class] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); 
  }, [currentItem]);


  // --- Handlers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newItems: BatchItem[] = [];
      const files = Array.from(e.target.files);
      let processedCount = 0;

      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          newItems.push({
            id: Math.random().toString(36).substr(2, 9),
            file: file,
            src: ev.target?.result as string,
            status: 'idle',
            results: null,
            crops: []
          });
          processedCount++;
          
          if (processedCount === files.length) {
            setBatch(prev => {
                const updated = [...prev, ...newItems];
                if (selectedIndex === -1) setSelectedIndex(0);
                return updated;
            });
          }
        };
        reader.readAsDataURL(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newBatch = [...batch];
    newBatch.splice(index, 1);
    setBatch(newBatch);
    if (newBatch.length === 0) {
      setSelectedIndex(-1);
    } else if (selectedIndex >= index) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    }
  };

  const analyzeBatch = async () => {
    setIsProcessing(true);
    for (let i = 0; i < batch.length; i++) {
      if (batch[i].status === 'done') continue;

      setBatch(prev => {
        const copy = [...prev];
        copy[i].status = 'processing';
        return copy;
      });
      setSelectedIndex(i);

      try {
        const base64Data = batch[i].src.split(',')[1];
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Data, conf_threshold: confThreshold, use_roi: useRoi })
        });
        const data = await response.json();
        const crops = await generateCrops(batch[i].src, data.defects);

        setBatch(prev => {
          const copy = [...prev];
          copy[i].status = 'done';
          copy[i].results = data;
          copy[i].crops = crops;
          return copy;
        });
      } catch (error) {
        console.error(error);
        setBatch(prev => {
          const copy = [...prev];
          copy[i].status = 'error';
          return copy;
        });
      }
    }
    setIsProcessing(false);
  };

  const generateCrops = (imgSrc: string, defects: any[]): Promise<any[]> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imgSrc;
      img.onload = () => {
        const newCrops: any[] = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        defects.forEach((d: any) => {
          const padding = 60; 
          const [x1, y1, x2, y2] = d.box;
          const w = x2 - x1;
          const h = y2 - y1;
          const cx = Math.max(0, x1 - padding);
          const cy = Math.max(0, y1 - padding);
          const cw = w + (padding * 2);
          const ch = h + (padding * 2);
          canvas.width = cw;
          canvas.height = ch;
          ctx?.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
          newCrops.push({ src: canvas.toDataURL(), label: d.class, score: d.score });
        });
        resolve(newCrops);
      };
    });
  };

  const downloadBatchCSV = () => {
    const processedItems = batch.filter(item => item.status === 'done' && item.results?.defects);
    if (processedItems.length === 0) return;

    const headers = ["Filename", "Defect Type", "Confidence", "x_min", "y_min", "x_max", "y_max"];
    let csvRows: string[] = [];
    processedItems.forEach(item => {
        const rows = item.results.defects.map((d: any) => [
            item.file.name,
            d.class,
            (d.score * 100).toFixed(2) + "%",
            d.box[0], d.box[1], d.box[2], d.box[3]
        ]);
        csvRows = [...csvRows, ...rows.map((r: any[]) => r.join(","))];
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CeraSight_Batch_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans overflow-x-hidden">
      
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {/* LOGO */}
             <img src="/VitrA_logo.png" alt="CeraSight Logo" className="h-8 w-auto" />
             <div className="h-6 w-px bg-gray-200 mx-2"></div>
             <h1 className="font-bold text-xl tracking-tight text-slate-900">
               Cera<span className="text-blue-600">Sight</span>
             </h1>
          </div>
          
          <div className="flex items-center gap-4">
             <a 
               href="https://huggingface.co/candenizkocak/tile-defect-detection-yolo11" 
               target="_blank" 
               rel="noopener noreferrer"
               className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg"
             >
               <FileText className="w-4 h-4" />
               Model Report
               <ChevronRight className="w-3 h-3" />
             </a>
             
             {/* Settings Toggle */}
             <button 
                onClick={() => setIsConfigOpen(true)}
                className={`p-2 rounded-lg transition-colors border ${isConfigOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-slate-500 hover:bg-gray-50'}`}
             >
                <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      {/* --- CONFIG DRAWER (Right Side) --- */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${isConfigOpen ? 'translate-x-0' : 'translate-x-full'}`}>
         <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
               <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5" /> Configuration
               </h2>
               <button onClick={() => setIsConfigOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-slate-500" />
               </button>
            </div>
            
            <div className="space-y-8 flex-grow">
               <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-600">Sensitivity Threshold</span>
                    <span className="text-blue-600 font-mono font-bold">{confThreshold.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="0.9" step="0.05" 
                    value={confThreshold}
                    onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <p className="text-xs text-slate-400">Higher values detect fewer but more certain defects.</p>
               </div>

               <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">ROI Filter</span>
                    <button 
                      onClick={() => setUseRoi(!useRoi)}
                      className={`w-11 h-6 flex items-center rounded-full transition-colors ${useRoi ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${useRoi ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Uses edge detection to find the tile and ignore background conveyor belt noise.
                  </p>
               </div>
            </div>
            
            <div className="pt-6 border-t border-gray-100">
               <p className="text-xs text-slate-400 text-center">Powered by YOLO11 & Modal</p>
            </div>
         </div>
      </div>

      {/* --- CHART MODAL --- */}
      {isChartModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                 <div>
                    <h2 className="text-xl font-bold text-slate-800">Global Batch Statistics</h2>
                    <p className="text-sm text-slate-500">Aggregated from {batch.length} images</p>
                 </div>
                 <button onClick={() => setIsChartModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="w-6 h-6 text-slate-500" />
                 </button>
              </div>
              <div className="p-8 flex-grow h-[500px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={globalStats.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} />
                     <YAxis axisLine={false} tickLine={false} />
                     <ReTooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                     />
                     <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
                        {globalStats.data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS['Unknown']} />
                        ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      )}


      {/* --- MAIN LAYOUT --- */}
      <main className="max-w-[1600px] mx-auto px-6 py-8 grid grid-cols-12 gap-8">
        
        {/* --- LEFT SIDEBAR (Actions & Queue) --- */}
        <aside className="col-span-12 lg:col-span-3 space-y-6 flex flex-col h-[calc(100vh-8rem)] sticky top-24">
          
          {/* 1. Actions Area */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3 flex-shrink-0">
             <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-semibold text-slate-600 hover:text-blue-700 group"
             >
                <div className="p-1.5 bg-gray-100 rounded-md group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600">
                    <Upload className="w-4 h-4" />
                </div>
                Upload Tiles
             </button>
             <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />

             <button
                onClick={analyzeBatch}
                disabled={batch.length === 0 || isProcessing}
                className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/10
                    ${batch.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                    isProcessing ? 'bg-blue-600/90 text-white cursor-wait' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
             >
                {isProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                    <><ZoomIcon className="w-4 h-4" /> Analyze Batch ({batch.filter(i => i.status === 'idle').length})</>
                )}
             </button>
          </div>

          {/* 2. Global Stats Chart (Clickable) */}
          {globalStats.total > 0 && (
             <div 
                onClick={() => setIsChartModalOpen(true)}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-blue-300 transition-all group flex-shrink-0"
             >
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5" /> Batch Distribution
                    </h3>
                    <ZoomIcon className="w-3 h-3 text-slate-300 group-hover:text-blue-500" />
                </div>
                <div className="h-24 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={globalStats.data}>
                            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                                {globalStats.data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS['Unknown']} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-center text-[10px] text-slate-400 mt-1">Click to enlarge</p>
             </div>
          )}

          {/* 3. Image Queue */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex-grow flex flex-col overflow-hidden min-h-[300px]">
             <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <h3>Batch Queue</h3>
                </div>
                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-slate-500">
                    {batch.length}
                </span>
             </div>

             <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {batch.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-100 rounded-lg">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                           <Upload className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-xs text-slate-400">Queue is empty</p>
                    </div>
                )}
                {batch.map((item, idx) => (
                    <div 
                        key={item.id}
                        onClick={() => setSelectedIndex(idx)}
                        className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border
                            ${selectedIndex === idx ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-gray-50 border-transparent'}
                        `}
                    >
                        <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                            <img src={item.src} className="w-full h-full object-cover" alt="thumbnail" />
                            {item.status === 'done' && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-white drop-shadow-md" /></div>}
                            {item.status === 'processing' && <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"><Loader2 className="w-5 h-5 text-white animate-spin" /></div>}
                        </div>
                        <div className="flex-grow min-w-0">
                            <p className={`text-sm font-medium truncate ${selectedIndex === idx ? 'text-blue-700' : 'text-slate-700'}`}>
                                {item.file.name}
                            </p>
                            <p className="text-[10px] text-slate-400 capitalize flex items-center gap-1">
                                {item.status}
                                {item.results && <span className="text-slate-300">• {item.results.defects.length} defects</span>}
                            </p>
                        </div>
                        <button 
                            onClick={(e) => removeImage(idx, e)}
                            className="p-1.5 hover:bg-red-50 rounded-md text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
             </div>
          </div>
        </aside>

        {/* --- MAIN STAGE (Center) --- */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          
          {/* Navigation Bar */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div>
                   <h2 className="text-lg font-bold text-slate-800">
                       {currentItem ? currentItem.file.name : "Ready to Inspect"}
                   </h2>
                   {currentItem?.status === 'done' ? (
                       <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200 mt-1">
                           <AlertTriangle className="w-3 h-3" />
                           {currentItem.results.defects.length} Defects Found
                       </span>
                   ) : (
                       <p className="text-xs text-slate-400 mt-0.5">Select an image from the queue</p>
                   )}
                </div>
             </div>

             <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                   <button 
                       disabled={selectedIndex <= 0}
                       onClick={() => setSelectedIndex(i => i - 1)}
                       className="p-1.5 rounded-md hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all text-slate-600 shadow-sm disabled:shadow-none"
                   >
                       <ChevronLeft className="w-5 h-5" />
                   </button>
                   <span className="text-xs font-mono text-slate-500 w-16 text-center font-medium">
                       {batch.length > 0 ? `${selectedIndex + 1} / ${batch.length}` : "- / -"}
                   </span>
                   <button 
                       disabled={selectedIndex >= batch.length - 1}
                       onClick={() => setSelectedIndex(i => i + 1)}
                       className="p-1.5 rounded-md hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all text-slate-600 shadow-sm disabled:shadow-none"
                   >
                       <ChevronRight className="w-5 h-5" />
                   </button>
                </div>
             </div>
          </div>
          
          {/* Macro View */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm relative min-h-[500px] flex items-center justify-center bg-grid-slate-50">
            {!currentItem ? (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Layers className="w-10 h-10 text-gray-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-700">No Image Selected</h3>
                  <p className="text-slate-500 text-sm mt-1">Upload images to the queue to begin</p>
                </div>
              </div>
            ) : (
              <TransformWrapper initialScale={1} minScale={0.5} maxScale={8}>
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    <ZoomControls />
                    <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                      <div className="relative w-full h-full">
                        <img src={currentItem.src} alt="Inspection Target" className="w-full h-auto object-contain max-h-[700px]" />
                        
                        {/* SVG Overlay */}
                        {currentItem.results && (
                          <svg 
                            viewBox={`0 0 ${currentItem.results.width} ${currentItem.results.height}`} 
                            className="absolute top-0 left-0 w-full h-full pointer-events-none"
                          >
                            {currentItem.results.defects.map((d: any, i: number) => {
                               const [x1, y1, x2, y2] = d.box;
                               const w = x2 - x1;
                               const h = y2 - y1;
                               const color = COLORS[d.class as keyof typeof COLORS] || COLORS['Unknown'];
                               
                               return (
                                 <g key={i}>
                                   <rect 
                                     x={x1} y={y1} width={w} height={h} 
                                     fill="none" stroke={color} strokeWidth="20" opacity="0.9"
                                   />
                                   <rect x={x1} y={y1 - 60} width={w < 200 ? 200 : w} height="60" fill={color} opacity="1" />
                                   <text x={x1 + 10} y={y1 - 15} fill="white" fontSize="35" fontWeight="bold" fontFamily="sans-serif">
                                     {d.class} {(d.score * 100).toFixed(0)}%
                                   </text>
                                 </g>
                               );
                            })}
                          </svg>
                        )}
                      </div>
                    </TransformComponent>
                  </>
                )}
              </TransformWrapper>
            )}
          </div>

          {/* Micro View & Single Image Stats */}
          {currentItem?.results && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Stats Chart */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm col-span-1">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Defects in this Tile</h3>
                    <div className="h-48 w-full -ml-4">
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={currentStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                tick={{fontSize: 10, fill: '#64748b'}} 
                                width={80}
                            />
                            <ReTooltip 
                                cursor={{fill: '#f1f5f9'}}
                                contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px' }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                {currentStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS['Unknown']} />
                                ))}
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gallery */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <ZoomIcon className="w-5 h-5 text-slate-400" />
                            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Zoomed Inspection</h3>
                        </div>
                        <button 
                            onClick={downloadBatchCSV}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" /> Export Full Batch Report
                        </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {currentItem.crops.map((crop: any, i) => (
                        <div key={i} className="bg-gray-50 border border-gray-100 rounded-lg overflow-hidden group hover:shadow-md transition-all">
                            <div className="aspect-square relative overflow-hidden bg-white">
                                <img src={crop.src} alt="defect crop" className="w-full h-full object-contain" />
                            </div>
                            <div className="p-2 border-t border-gray-100 bg-white">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[crop.label as keyof typeof COLORS] }} />
                                    <p className="text-[10px] font-bold text-slate-700 truncate">{crop.label}</p>
                                </div>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full" 
                                        style={{ width: `${crop.score * 100}%`, backgroundColor: COLORS[crop.label as keyof typeof COLORS] }} 
                                    />
                                </div>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}