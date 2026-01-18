"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, FileText, ChevronRight, ChevronLeft, AlertTriangle, 
  Download, X, Eye, LayoutDashboard, ScanLine, 
  Radio, Archive as ArchiveIcon 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { toast } from 'sonner';

// Internal Imports
import { API_URL, DEFECT_COLORS } from '../constants';
import { BatchItem } from '../types';
import { generateCrops, downloadBatchCSV } from '../utils/processing';
import { exportYOLODataset } from '../utils/exportDataset';
import { supabase } from '@/app/lib/supabase';

// Components
import { Sidebar } from '../components/Sidebar';
import { MainStage, MainStageRef } from '../components/MainStage';
import { ConfigDrawer } from '../components/ConfigDrawer';
import { AnalyticsView } from '../components/AnalyticsView';
import { ArchiveView } from '../components/ArchiveView';
import { ContextMenu } from '../components/ContextMenu';
import { WebcamModal } from '../components/WebcamModal';
import { ClassSelector } from '../components/ClassSelector';

export default function Dashboard() {
  const router = useRouter();

  // --- Auth State ---
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState("Unknown");

  // --- Security Check & Global Config Fetch ---
  useEffect(() => {
    const token = localStorage.getItem('cerasight_token');
    const user = localStorage.getItem('cerasight_user');
    
    if (!token || !user) {
        toast.error("Unauthorized access.");
        router.replace('/'); 
    } else {
        setAuthToken(token);
        setOperatorName(user);
        
        // FETCH GLOBAL RULES FROM ADMIN
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(data => {
                if (data.confThreshold) {
                    setConfThreshold(data.confThreshold);
                    setUseRoi(data.useRoi);
                    setMaxAllowedDefects(data.maxAllowedDefects);
                    toast.success("Global inspection rules applied.");
                }
            })
            .catch(() => toast.error("Failed to load global settings"));
    }
  }, [router]);

  // --- App State ---
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [highlightedDefect, setHighlightedDefect] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'inspection' | 'analytics' | 'archive'>('inspection');
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; defectIndex: number } | null>(null);
  const [newDefectCandidate, setNewDefectCandidate] = useState<{ box: [number, number, number, number], x: number, y: number } | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [isSimulating, setIsSimulating] = useState(false);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  
  // These are now controlled by Admin settings mostly
  const [confThreshold, setConfThreshold] = useState(0.35);
  const [useRoi, setUseRoi] = useState(true);
  const [maxAllowedDefects, setMaxAllowedDefects] = useState(0);
  
  const [currentClientBatchId, setCurrentClientBatchId] = useState<string>("");

  const mainStageRef = useRef<MainStageRef>(null);
  const currentItem = selectedIndex >= 0 ? batch[selectedIndex] : null;

  // --- Helpers ---
  const logDbAction = async (actionType: string, details: any = {}) => {
    if (!authToken) return;
    fetch('/api/log-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            actionType,
            operatorName,
            filename: currentItem?.file.name,
            details
        })
    }).catch(e => console.error(e));
  };

  // --- Effects ---
  useEffect(() => {
    setHighlightedDefect(null);
    setNewDefectCandidate(null);
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (batch.length === 0 || activeTab !== 'inspection' || isSimulating || isCameraOpen || newDefectCandidate) return;
      if (e.key === 'ArrowRight') {
        setSelectedIndex(prev => Math.min(prev + 1, batch.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [batch.length, activeTab, isSimulating, isCameraOpen, newDefectCandidate]);

  useEffect(() => {
    if (!isSimulating) {
      if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current);
      return;
    }
    const runSimulationStep = async () => {
        if (selectedIndex < 0 || selectedIndex >= batch.length) {
            setIsSimulating(false);
            toast.success("Slideshow complete");
            return;
        }
        const current = batch[selectedIndex];
        if (current.status === 'idle') {
            await analyzeSingleImage(selectedIndex);
        }
        simulationTimerRef.current = setTimeout(() => {
            if (selectedIndex < batch.length - 1) {
                setSelectedIndex(prev => prev + 1);
            } else {
                setIsSimulating(false);
                toast.success("Slideshow complete");
            }
        }, 2000); 
    };
    runSimulationStep();
    return () => {
        if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current);
    };
  }, [isSimulating, selectedIndex, batch]);

  // --- Stats ---
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

  const handleLogout = async () => {
      if (authToken) {
          await fetch('/api/auth/logout', {
              method: 'POST',
              body: JSON.stringify({ token: authToken })
          });
      }
      localStorage.removeItem('cerasight_token');
      localStorage.removeItem('cerasight_user');
      toast.info("Signed out successfully");
      router.push('/');
  };

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      if(isSimulating) { toast.warning("Pause slideshow to edit."); return; }
      setContextMenu({ x: e.clientX, y: e.clientY, defectIndex: index });
  };

  const handleDeleteDefect = () => {
    if (!contextMenu || selectedIndex === -1) return;
    const item = batch[selectedIndex];
    if (item.results && item.results.defects[contextMenu.defectIndex]) {
        const defectClass = item.results.defects[contextMenu.defectIndex].class;
        logDbAction('DELETE_INTERVENTION', { defectClass });
    }
    setBatch(prev => {
        const newBatch = [...prev];
        const item = { ...newBatch[selectedIndex] };
        if (item.results) {
            const newDefects = item.results.defects.filter((_, i) => i !== contextMenu.defectIndex);
            item.results = { ...item.results, defects: newDefects };
        }
        item.crops = item.crops.filter((_, i) => i !== contextMenu.defectIndex);
        newBatch[selectedIndex] = item;
        return newBatch;
    });
    setHighlightedDefect(null);
    toast.success("Defect removed.");
    setContextMenu(null);
  };

  const handleDrawComplete = (box: [number, number, number, number], clientX: number, clientY: number) => {
      setNewDefectCandidate({ box, x: clientX, y: clientY });
  };

  const handleAddDefect = async (className: string) => {
      if (!newDefectCandidate || selectedIndex === -1) return;
      const { box } = newDefectCandidate;
      const item = batch[selectedIndex];
      if (!item.results) { toast.error("Analyze image first."); setNewDefectCandidate(null); return; }
      logDbAction('MANUAL_ANNOTATION', { className, box });
      const newDefect = { class: className, score: 1.0, box };
      const updatedDefects = [...item.results.defects, newDefect];
      setBatch(prev => {
          const newBatch = [...prev];
          newBatch[selectedIndex] = { ...newBatch[selectedIndex], results: { ...newBatch[selectedIndex].results!, defects: updatedDefects } };
          return newBatch;
      });
      try {
          const newCrops = await generateCrops(item.src, updatedDefects);
          setBatch(prev => {
              const newBatch = [...prev];
              newBatch[selectedIndex] = { ...newBatch[selectedIndex], crops: newCrops };
              return newBatch;
          });
          toast.success("Manual defect added");
      } catch (e) { console.error(e); }
      setNewDefectCandidate(null);
  };

  const handleUpload = useCallback(async (files: File[]) => {
    const newBatchId = crypto.randomUUID(); 
    setCurrentClientBatchId(newBatchId);
    const uploadPromise = Promise.all(files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error } = await supabase.storage.from('tiles').upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from('tiles').getPublicUrl(filePath);
      return {
        id: crypto.randomUUID(), // <--- FIX: Use UUID instead of Math.random
        file: file,
        src: data.publicUrl, 
        status: 'idle',
        results: null,
        crops: []
      } as BatchItem;
    }));
    toast.promise(uploadPromise, {
      loading: 'Uploading to Cloud...',
      success: (items) => {
        setBatch(prev => {
            const updated = [...prev, ...items];
            if (selectedIndex === -1) setSelectedIndex(0);
            return updated;
        });
        return `Uploaded ${items.length} images`;
      },
      error: 'Upload failed'
    });
  }, [selectedIndex]);

  const handleCameraCapture = (file: File) => { handleUpload([file]); };

  const removeImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSimulating) return;
    const newBatch = [...batch];
    newBatch.splice(index, 1);
    setBatch(newBatch);
    if (newBatch.length === 0) setSelectedIndex(-1);
    else if (selectedIndex >= index) setSelectedIndex(Math.max(0, selectedIndex - 1));
    toast.info("Image removed from queue");
  };

  const handleDefectFocus = (index: number) => {
    if (!currentItem?.results?.defects[index]) return;
    setHighlightedDefect(index);
    const box = currentItem.results.defects[index].box;
    mainStageRef.current?.zoomToBox(box);
  };

  const analyzeSingleImage = async (index: number) => {
    setBatch(prev => { const c = [...prev]; c[index].status = 'processing'; return c; });
    try {
        const item = batch[index];
        const imgResponse = await fetch(item.src);
        const blob = await imgResponse.blob();
        const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => { resolve((reader.result as string).split(',')[1]); };
            reader.readAsDataURL(blob);
        });
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify({ 
              image: base64Data, imageUrl: item.src, conf_threshold: confThreshold, 
              use_roi: useRoi, operatorName: operatorName, filename: item.file.name,
              maxAllowedDefects: maxAllowedDefects, clientBatchId: currentClientBatchId || crypto.randomUUID()
          })
        });
        if (!response.ok) throw new Error("API Error");
        const data = await response.json();
        const crops = await generateCrops(item.src, data.defects);
        setBatch(prev => { const c = [...prev]; c[index].status = 'done'; c[index].results = data; c[index].crops = crops; return c; });
    } catch (error) {
        console.error(error);
        setBatch(prev => { const c = [...prev]; c[index].status = 'error'; return c; });
        toast.error("Analysis failed");
    }
  };

  const analyzeBatch = async () => {
    setIsProcessing(true);
    if (activeTab !== 'inspection') setActiveTab('inspection');
    for (let i = 0; i < batch.length; i++) {
      if (batch[i].status === 'done') continue;
      setSelectedIndex(i);
      await analyzeSingleImage(i);
    }
    setIsProcessing(false);
    toast.success("Batch complete");
  };

  const toggleSimulation = () => {
      if (isSimulating) { setIsSimulating(false); toast.info("Slideshow paused"); } 
      else { 
          if (selectedIndex === batch.length - 1 && batch[selectedIndex].status === 'done') setSelectedIndex(0);
          setIsSimulating(true); setActiveTab('inspection'); toast.info("Slideshow started"); 
      }
  };

  const handleExportDataset = async () => {
    try {
        await exportYOLODataset(batch);
        logDbAction('DATASET_EXPORT', { count: batch.filter(i => i.status === 'done').length });
        toast.success("Dataset downloaded");
    } catch (e) { toast.error("Export failed"); }
  };

  // --- NEW: Load from Archive ---
  const handleLoadFromHistory = async (historyItem: any) => {
      try {
          toast.loading("Restoring inspection context...");

          // 1. Create new item with a FRESH UUID
          const newItem: BatchItem = {
              id: crypto.randomUUID(), // <--- FIX: Ensure unique key
              file: new File([], historyItem.filename), 
              src: historyItem.imageUrl,
              status: 'done',
              results: historyItem.results,
              crops: []
          };

          // Regenerate crops locally
          const newCrops = await generateCrops(historyItem.imageUrl, historyItem.results.defects);
          newItem.crops = newCrops;

          setBatch(prev => [newItem, ...prev]); 
          setSelectedIndex(0); 
          setActiveTab('inspection'); 
          
          toast.dismiss();
          toast.success("History item loaded");

      } catch (e) {
          console.error(e);
          toast.error("Failed to load history item");
      }
  };

  // --- RENDER ---
  if (!authToken) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Initializing secure session...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <h1 className="font-bold text-xl tracking-tight text-slate-900">
               Cera<span className="text-blue-600">Sight</span>
             </h1>
          </div>
          
          {isSimulating && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100 animate-pulse">
                  <Radio className="w-4 h-4" />
                  <span className="text-xs font-bold tracking-wider">SLIDESHOW ACTIVE</span>
              </div>
          )}

          <div className="flex items-center gap-4">
             <a href="https://huggingface.co/candenizkocak/tile-defect-detection-yolo11" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-200">
               <FileText className="w-4 h-4" /> Model Report <ChevronRight className="w-3 h-3" />
             </a>
             <button onClick={() => setIsConfigOpen(true)} className={`p-2 rounded-lg transition-colors border ${isConfigOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-slate-500 hover:bg-gray-50'}`}>
                <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      {/* OVERLAYS */}
      {contextMenu && ( <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} onDelete={handleDeleteDefect} /> )}
      {isCameraOpen && ( <WebcamModal onClose={() => setIsCameraOpen(false)} onCapture={handleCameraCapture} /> )}
      {newDefectCandidate && ( <ClassSelector x={newDefectCandidate.x} y={newDefectCandidate.y} onSelect={handleAddDefect} onCancel={() => setNewDefectCandidate(null)} /> )}

      <ConfigDrawer 
        isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)}
        confThreshold={confThreshold} setConfThreshold={setConfThreshold}
        useRoi={useRoi} setUseRoi={setUseRoi}
        maxAllowedDefects={maxAllowedDefects} setMaxAllowedDefects={setMaxAllowedDefects}
        operatorName={operatorName} setOperatorName={() => {}}
        readOnly={true}
      />

      {isChartModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
           {/* Chart Modal Content */}
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                 <div>
                    <h2 className="text-xl font-bold text-slate-800">Global Batch Statistics</h2>
                    <p className="text-sm text-slate-500">Aggregated from {batch.length} images</p>
                 </div>
                 <button onClick={() => setIsChartModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-500" />
                 </button>
              </div>
              <div className="p-8 flex-grow h-[500px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={globalStats.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} />
                     <YAxis axisLine={false} tickLine={false} />
                     <ReTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', border: 'none' }} />
                     <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60}>
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

      {/* MAIN LAYOUT */}
      <main className="max-w-[1600px] mx-auto px-6 py-8 grid grid-cols-12 gap-8">
        
        <Sidebar 
          batch={batch} selectedIndex={selectedIndex} isProcessing={isProcessing} globalStats={globalStats}
          onUpload={handleUpload} onAnalyze={analyzeBatch} onSelect={setSelectedIndex} onRemove={removeImage}
          onOpenChart={() => setIsChartModalOpen(true)} isSimulating={isSimulating} onToggleSimulation={toggleSimulation}
          onOpenCamera={() => setIsCameraOpen(true)} onExportDataset={handleExportDataset}
          operatorName={operatorName} onLogout={handleLogout}
        />

        <div className="col-span-12 lg:col-span-9 space-y-6">
          
          {/* TABS */}
          <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl w-fit">
              <button
                  onClick={() => setActiveTab('inspection')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                      ${activeTab === 'inspection' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                  `}
              >
                  <ScanLine className="w-4 h-4" /> Inspection
              </button>
              <button
                  onClick={() => setActiveTab('analytics')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                      ${activeTab === 'analytics' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                  `}
              >
                  <LayoutDashboard className="w-4 h-4" /> Analytics
              </button>
              <button
                  onClick={() => setActiveTab('archive')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                      ${activeTab === 'archive' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                  `}
              >
                  <ArchiveIcon className="w-4 h-4" /> History
              </button>
          </div>

          {activeTab === 'inspection' ? (
            <div className="space-y-6 animate-in fade-in duration-300">
                {/* Image Navigation */}
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200 p-4 rounded-xl shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {currentItem ? currentItem.file.name : "Ready to Inspect"}
                        </h2>
                        {currentItem?.status === 'done' ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border mt-1 
                                ${currentItem.results?.defects.length > maxAllowedDefects ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}
                            `}>
                                <AlertTriangle className="w-3 h-3" />
                                {currentItem.results?.defects.length > maxAllowedDefects ? "REJECTED" : "ACCEPTED"} 
                                <span className="opacity-60 ml-1">({currentItem.results?.defects.length} Defects)</span>
                            </span>
                        ) : (
                            <p className="text-xs text-slate-400 mt-0.5">Select an image from the queue</p>
                        )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:inline text-xs text-slate-400 mr-2">Use <kbd className="font-mono bg-gray-100 px-1 rounded">←</kbd> <kbd className="font-mono bg-gray-100 px-1 rounded">→</kbd> keys</span>
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button disabled={selectedIndex <= 0 || isSimulating} onClick={() => setSelectedIndex(i => i - 1)} className="p-1.5 rounded-md hover:bg-white disabled:opacity-30 transition-all text-slate-600 shadow-sm disabled:shadow-none"><ChevronLeft className="w-5 h-5" /></button>
                        <span className="text-xs font-mono text-slate-500 w-16 text-center font-medium">{batch.length > 0 ? `${selectedIndex + 1} / ${batch.length}` : "- / -"}</span>
                        <button disabled={selectedIndex >= batch.length - 1 || isSimulating} onClick={() => setSelectedIndex(i => i + 1)} className="p-1.5 rounded-md hover:bg-white disabled:opacity-30 transition-all text-slate-600 shadow-sm disabled:shadow-none"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                    </div>
                </div>
                
                {/* Main Stage */}
                <MainStage 
                    ref={mainStageRef}
                    item={currentItem} 
                    highlightedIndex={highlightedDefect}
                    onDefectContextMenu={handleContextMenu}
                    onDrawComplete={handleDrawComplete}
                    maxAllowedDefects={maxAllowedDefects}
                />

                {/* Details Panel */}
                {currentItem?.results && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Stats */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm col-span-1">
                            <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Defect Breakdown</h3>
                            <div className="h-48 w-full -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={currentStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{fontSize: 10, fill: '#64748b'}} width={80} />
                                    <ReTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                        {currentStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={DEFECT_COLORS[entry.name] || DEFECT_COLORS['Unknown']} />
                                        ))}
                                    </Bar>
                                </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Crops */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Detected Crops</h3>
                                    <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Right-click to reject</span>
                                </div>
                            </div>
                            
                            {currentItem.crops.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                    {currentItem.crops.map((crop, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => handleDefectFocus(i)}
                                        onContextMenu={(e) => handleContextMenu(e, i)}
                                        className={`
                                            bg-slate-50 border rounded-lg overflow-hidden group cursor-pointer transition-all duration-200
                                            ${highlightedDefect === i 
                                                ? 'ring-2 ring-blue-500 ring-offset-2 border-blue-500 shadow-md transform scale-[1.02]' 
                                                : 'border-slate-200 hover:shadow-md hover:border-blue-300'
                                            }
                                        `}
                                    >
                                        <div className="aspect-square relative overflow-hidden bg-white">
                                            <img src={crop.src} alt="defect crop" className="w-full h-full object-contain" />
                                            <div className={`absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${highlightedDefect === i ? 'opacity-0' : ''}`}>
                                                <Eye className="w-6 h-6 text-white drop-shadow-md" />
                                            </div>
                                        </div>
                                        <div className={`p-2 border-t bg-white ${highlightedDefect === i ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DEFECT_COLORS[crop.label] }} />
                                                <p className="text-[10px] font-bold text-slate-700 truncate">{crop.label}</p>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${crop.score * 100}%`, backgroundColor: DEFECT_COLORS[crop.label] }} />
                                            </div>
                                        </div>
                                    </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-40 flex items-center justify-center text-slate-400 text-sm italic">
                                    No defects detected in this tile.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
          ) : activeTab === 'analytics' ? (
            <AnalyticsView batch={batch} />
          ) : (
            <ArchiveView 
                token={authToken} 
                onLoadForEditing={handleLoadFromHistory} 
            />
          )}

        </div>
      </main>
    </div>
  );
}