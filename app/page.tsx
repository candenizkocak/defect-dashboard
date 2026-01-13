// app/page.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Settings, FileText, ChevronRight, ChevronLeft, AlertTriangle, Download, X, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts';

import { API_URL, DEFECT_COLORS } from './constants';
import { BatchItem, Crop } from './types';
import { generateCrops, downloadBatchCSV } from './utils/processing';

import { Sidebar } from './components/Sidebar';
import { MainStage } from './components/MainStage';
import { ConfigDrawer } from './components/ConfigDrawer';

export default function CeraSightDashboard() {
  // --- State ---
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [confThreshold, setConfThreshold] = useState(0.35);
  const [useRoi, setUseRoi] = useState(true);

  const currentItem = selectedIndex >= 0 ? batch[selectedIndex] : null;

  // --- Computed Stats ---
  const globalStats = useMemo(() => {
    const counts: {[key: string]: number} = {};
    let total = 0;
    batch.forEach(item => {
      if (item.results?.defects) {
        item.results.defects.forEach((d) => {
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

  const currentStats = useMemo(() => {
    if (!currentItem?.results?.defects) return [];
    const counts: {[key: string]: number} = {};
    currentItem.results.defects.forEach((d) => {
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
  };

  const removeImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newBatch = [...batch];
    newBatch.splice(index, 1);
    setBatch(newBatch);
    if (newBatch.length === 0) setSelectedIndex(-1);
    else if (selectedIndex >= index) setSelectedIndex(Math.max(0, selectedIndex - 1));
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

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <img src="/VitrA_logo.png" alt="CeraSight Logo" className="h-8 w-auto" />
             <div className="h-6 w-px bg-gray-200 mx-2"></div>
             <h1 className="font-bold text-xl tracking-tight text-slate-900">
               Cera<span className="text-blue-600">Sight</span>
             </h1>
          </div>
          <div className="flex items-center gap-4">
             <a href="https://huggingface.co/candenizkocak/tile-defect-detection-yolo11" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg">
               <FileText className="w-4 h-4" /> Model Report <ChevronRight className="w-3 h-3" />
             </a>
             <button onClick={() => setIsConfigOpen(true)} className={`p-2 rounded-lg transition-colors border ${isConfigOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-slate-500 hover:bg-gray-50'}`}>
                <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      {/* Drawers & Modals */}
      <ConfigDrawer 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)}
        confThreshold={confThreshold} setConfThreshold={setConfThreshold}
        useRoi={useRoi} setUseRoi={setUseRoi}
      />

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
                     <ReTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                     <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
                        {globalStats.data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DEFECT_COLORS[entry.name] || DEFECT_COLORS['Unknown']} />
                        ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      )}

      {/* Main Layout */}
      <main className="max-w-[1600px] mx-auto px-6 py-8 grid grid-cols-12 gap-8">
        
        <Sidebar 
          batch={batch}
          selectedIndex={selectedIndex}
          isProcessing={isProcessing}
          globalStats={globalStats}
          onUpload={handleFileUpload}
          onAnalyze={analyzeBatch}
          onSelect={setSelectedIndex}
          onRemove={removeImage}
          onOpenChart={() => setIsChartModalOpen(true)}
        />

        <div className="col-span-12 lg:col-span-9 space-y-6">
          {/* Nav Bar */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div>
                   <h2 className="text-lg font-bold text-slate-800">
                       {currentItem ? currentItem.file.name : "Ready to Inspect"}
                   </h2>
                   {currentItem?.status === 'done' ? (
                       <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200 mt-1">
                           <AlertTriangle className="w-3 h-3" />
                           {currentItem.results?.defects.length} Defects Found
                       </span>
                   ) : (
                       <p className="text-xs text-slate-400 mt-0.5">Select an image from the queue</p>
                   )}
                </div>
             </div>
             <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                   <button disabled={selectedIndex <= 0} onClick={() => setSelectedIndex(i => i - 1)} className="p-1.5 rounded-md hover:bg-white disabled:opacity-30 transition-all text-slate-600 shadow-sm disabled:shadow-none"><ChevronLeft className="w-5 h-5" /></button>
                   <span className="text-xs font-mono text-slate-500 w-16 text-center font-medium">{batch.length > 0 ? `${selectedIndex + 1} / ${batch.length}` : "- / -"}</span>
                   <button disabled={selectedIndex >= batch.length - 1} onClick={() => setSelectedIndex(i => i + 1)} className="p-1.5 rounded-md hover:bg-white disabled:opacity-30 transition-all text-slate-600 shadow-sm disabled:shadow-none"><ChevronRight className="w-5 h-5" /></button>
                </div>
             </div>
          </div>
          
          <MainStage item={currentItem} />

          {/* Details Panel */}
          {currentItem?.results && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm col-span-1">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Defects in this Tile</h3>
                    <div className="h-48 w-full -ml-4">
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={currentStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" tick={{fontSize: 10, fill: '#64748b'}} width={80} />
                            <ReTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                {currentStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={DEFECT_COLORS[entry.name] || DEFECT_COLORS['Unknown']} />
                                ))}
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <ZoomIn className="w-5 h-5 text-slate-400" />
                            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Zoomed Inspection</h3>
                        </div>
                        <button onClick={() => downloadBatchCSV(batch)} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg transition-colors">
                            <Download className="w-3.5 h-3.5" /> Export Full Batch Report
                        </button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {currentItem.crops.map((crop, i) => (
                        <div key={i} className="bg-gray-50 border border-gray-100 rounded-lg overflow-hidden group hover:shadow-md transition-all">
                            <div className="aspect-square relative overflow-hidden bg-white">
                                <img src={crop.src} alt="defect crop" className="w-full h-full object-contain" />
                            </div>
                            <div className="p-2 border-t border-gray-100 bg-white">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DEFECT_COLORS[crop.label] }} />
                                    <p className="text-[10px] font-bold text-slate-700 truncate">{crop.label}</p>
                                </div>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${crop.score * 100}%`, backgroundColor: DEFECT_COLORS[crop.label] }} />
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