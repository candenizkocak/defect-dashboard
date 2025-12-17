"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle, Settings, ZoomIn, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';

// ⚠️ REPLACE WITH YOUR MODAL URL
const API_URL = "https://candenizkocak--tile-defect-api-json-model-analyze.modal.run";

const COLORS = {
  'Halo': '#ef4444', // Red-500
  'Edge defect': '#f97316', // Orange-500
  'Corner defect': '#eab308', // Yellow-500
  'White spot': '#3b82f6', // Blue-500
  'Light patch': '#a855f7', // Purple-500
  'Dark spot': '#64748b', // Slate-500
  'Unknown': '#71717a'
};

export default function Dashboard() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [confThreshold, setConfThreshold] = useState(0.35);
  const [useRoi, setUseRoi] = useState(true);
  const [crops, setCrops] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        setResults(null);
        setCrops([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;
    setLoading(true);

    try {
      // Strip "data:image/jpeg;base64," prefix
      const base64Data = image.split(',')[1];

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          conf_threshold: confThreshold,
          use_roi: useRoi
        })
      });

      const data = await response.json();
      setResults(data);
      generateCrops(image, data.defects);

    } catch (error) {
      console.error(error);
      alert("Analysis failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // Client-side cropping to save bandwidth
  const generateCrops = (imgSrc: string, defects: any[]) => {
    const img = new Image();
    img.src = imgSrc;
    img.onload = () => {
      const newCrops: any[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      defects.forEach((d) => {
        const padding = 50;
        const [x1, y1, x2, y2] = d.box;
        const w = x2 - x1;
        const h = y2 - y1;
        
        // Add context padding
        const cx = Math.max(0, x1 - padding);
        const cy = Math.max(0, y1 - padding);
        const cw = w + (padding * 2);
        const ch = h + (padding * 2);

        canvas.width = cw;
        canvas.height = ch;
        ctx?.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
        
        newCrops.push({
          src: canvas.toDataURL(),
          label: d.class,
          score: d.score
        });
      });
      setCrops(newCrops);
    };
  };

  // Stats for Chart
  const getStats = () => {
    if (!results?.defects) return [];
    const counts: {[key: string]: number} = {};
    results.defects.forEach((d: any) => {
      counts[d.class] = (counts[d.class] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <ZoomIn className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-white">
              Industrial Defect<span className="text-indigo-400">Inspector</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-slate-500">POWERED BY YOLO11 & MODAL</span>
            <div className="h-4 w-[1px] bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-medium text-green-500">SYSTEM ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
        
        {/* Sidebar Controls */}
        <aside className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 shadow-xl">
            <div className="flex items-center gap-2 text-slate-100 font-medium">
              <Settings className="w-4 h-4" />
              <h2>Config Parameters</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Confidence Threshold</span>
                <span className="text-indigo-400 font-mono">{confThreshold.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0.1" max="0.9" step="0.05" 
                value={confThreshold}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <span className="text-sm text-slate-300">ROI Filter</span>
              <button 
                onClick={() => setUseRoi(!useRoi)}
                className={`w-11 h-6 flex items-center rounded-full transition-colors ${useRoi ? 'bg-indigo-600' : 'bg-slate-600'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${useRoi ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center gap-2 hover:border-indigo-500 hover:bg-slate-800/50 transition-all group"
            >
              <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-400" />
              <span className="text-sm text-slate-400 group-hover:text-slate-200">Upload Tile Image</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

            <button
              onClick={analyzeImage}
              disabled={!image || loading}
              className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all
                ${!image ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 
                  loading ? 'bg-indigo-600/50 text-white cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'}`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ZoomIn className="w-4 h-4" />
                  Run Inspection
                </>
              )}
            </button>
          </div>

          {/* Mini Stats (Only show if results exist) */}
          {results && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
               <h3 className="text-sm font-medium text-slate-400 mb-4">Defect Distribution</h3>
               <div className="h-48 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={getStats()}
                       innerRadius={40}
                       outerRadius={60}
                       paddingAngle={5}
                       dataKey="value"
                     >
                       {getStats().map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS['Unknown']} />
                       ))}
                     </Pie>
                     <ReTooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc' }}
                     />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
               <div className="space-y-2 mt-2">
                 {getStats().map((stat) => (
                   <div key={stat.name} className="flex justify-between text-xs">
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[stat.name as keyof typeof COLORS] || COLORS['Unknown'] }} />
                       <span className="text-slate-300">{stat.name}</span>
                     </div>
                     <span className="font-mono text-slate-400">{stat.value}</span>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </aside>

        {/* Main Stage */}
        <div className="col-span-12 lg:col-span-9 space-y-8">
          
          {/* Macro View */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative min-h-[400px] flex items-center justify-center">
            {!image ? (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-500 text-sm">Upload a high-res image to begin inspection</p>
              </div>
            ) : (
              <div className="relative w-full h-full">
                <img src={image} alt="Inspection Target" className="w-full h-auto object-contain" />
                
                {/* SVG Overlay */}
                {results && (
                  <svg 
                    viewBox={`0 0 ${results.width} ${results.height}`} 
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  >
                    {results.defects.map((d: any, i: number) => {
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
                           <rect x={x1} y={y1 - 60} width={w} height="60" fill={color} opacity="0.9" />
                           <text x={x1 + 10} y={y1 - 20} fill="white" fontSize="40" fontWeight="bold">
                             {d.class} {(d.score * 100).toFixed(0)}%
                           </text>
                         </g>
                       );
                    })}
                  </svg>
                )}
              </div>
            )}
          </div>

          {/* Micro View (Gallery) */}
          {crops.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-indigo-400" />
                  Detected Defects ({crops.length})
                </h3>
                <button className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Export CSV
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {crops.map((crop: any, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-indigo-500/50 transition-colors group">
                    <div className="aspect-square relative overflow-hidden">
                      <img src={crop.src} alt="defect crop" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="p-3 border-t border-slate-800 bg-slate-900/50">
                      <p className="text-xs font-bold text-white mb-1" style={{ color: COLORS[crop.label as keyof typeof COLORS] }}>
                        {crop.label}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500">CONFIDENCE</span>
                        <span className="text-[10px] font-mono text-slate-300">{(crop.score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}