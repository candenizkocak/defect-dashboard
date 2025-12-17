"use client";

import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, Settings, ZoomIn, Download, FileText, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';

// ⚠️ YOUR MODAL URL
const API_URL = "https://candenizkocak--tile-defect-api-json-model-analyze.modal.run";

// Professional Industrial Color Palette
const COLORS = {
  'Halo': '#ef4444',          // Red-500 (Critical)
  'Edge defect': '#f97316',   // Orange-500
  'Corner defect': '#eab308', // Yellow-500
  'White spot': '#3b82f6',    // Blue-500
  'Light patch': '#8b5cf6',   // Violet-500
  'Dark spot': '#64748b',     // Slate-500
  'Unknown': '#9ca3af'
};

export default function CeraSightDashboard() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [confThreshold, setConfThreshold] = useState(0.35);
  const [useRoi, setUseRoi] = useState(true);
  const [crops, setCrops] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

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
      alert("Analysis failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const generateCrops = (imgSrc: string, defects: any[]) => {
    const img = new Image();
    img.src = imgSrc;
    img.onload = () => {
      const newCrops: any[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      defects.forEach((d: any) => {
        const padding = 60; // Slightly more context
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
        
        newCrops.push({
          src: canvas.toDataURL(),
          label: d.class,
          score: d.score
        });
      });
      setCrops(newCrops);
    };
  };

  // --- CSV Export Logic ---
  const downloadCSV = () => {
    if (!results?.defects) return;

    // 1. Create CSV Header & Rows
    const headers = ["Defect Type", "Confidence", "x_min", "y_min", "x_max", "y_max"];
    const rows = results.defects.map((d: any) => [
      d.class,
      (d.score * 100).toFixed(2) + "%",
      d.box[0], d.box[1], d.box[2], d.box[3]
    ]);

    // 2. Join into String
    const csvContent = [
      headers.join(","), 
      ...rows.map((row: any[]) => row.join(","))
    ].join("\n");

    // 3. Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CeraSight_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStats = () => {
    if (!results?.defects) return [];
    const counts: {[key: string]: number} = {};
    results.defects.forEach((d: any) => {
      counts[d.class] = (counts[d.class] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <ZoomIn className="w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-900">
              Cera<span className="text-blue-600">Sight</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
             <a 
               href="https://huggingface.co/candenizkocak/tile-defect-detection-yolo11" 
               target="_blank" 
               rel="noopener noreferrer"
               className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
             >
               <FileText className="w-4 h-4" />
               Model Report
               <ChevronRight className="w-3 h-3" />
             </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
        
        {/* Sidebar Controls */}
        <aside className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-gray-100 pb-3">
              <Settings className="w-5 h-5 text-slate-400" />
              <h2>Config Panel</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Sensitivity (Confidence)</span>
                <span className="text-blue-600 font-mono font-medium">{confThreshold.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0.1" max="0.9" step="0.05" 
                value={confThreshold}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-slate-600 font-medium">ROI Filter (Green Line)</span>
              <button 
                onClick={() => setUseRoi(!useRoi)}
                className={`w-11 h-6 flex items-center rounded-full transition-colors ${useRoi ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${useRoi ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
              <span className="text-sm text-slate-500 group-hover:text-slate-700">Upload Tile Image</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

            <button
              onClick={analyzeImage}
              disabled={!image || loading}
              className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/5
                ${!image ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                  loading ? 'bg-blue-600/80 text-white cursor-wait' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ZoomIn className="w-4 h-4" />
                  Analyze Tile
                </>
              )}
            </button>
          </div>

          {/* Statistics Card */}
          {results && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
               <h3 className="text-sm font-semibold text-slate-700 mb-4">Defect Distribution</h3>
               <div className="h-56 w-full -ml-4">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={getStats()}
                       innerRadius={50}
                       outerRadius={70}
                       paddingAngle={5}
                       dataKey="value"
                     >
                       {getStats().map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS['Unknown']} />
                       ))}
                     </Pie>
                     <ReTooltip 
                        contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                     />
                     <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#64748b' }}/>
                   </PieChart>
                 </ResponsiveContainer>
               </div>
            </div>
          )}
        </aside>

        {/* Main Stage */}
        <div className="col-span-12 lg:col-span-9 space-y-8">
          
          {/* Macro View Container */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm relative min-h-[500px] flex items-center justify-center bg-grid-slate-50">
            {!image ? (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-10 h-10 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-700">Ready for Inspection</h3>
                  <p className="text-slate-500 text-sm mt-1">Upload a high-resolution tile image to begin</p>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full">
                <img src={image} alt="Inspection Target" className="w-full h-auto object-contain max-h-[700px]" />
                
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
                           {/* Box */}
                           <rect 
                             x={x1} y={y1} width={w} height={h} 
                             fill="none" stroke={color} strokeWidth="20" opacity="0.9"
                           />
                           {/* Label Background */}
                           <rect x={x1} y={y1 - 60} width={w < 200 ? 200 : w} height="60" fill={color} opacity="1" />
                           {/* Label Text */}
                           <text x={x1 + 10} y={y1 - 15} fill="white" fontSize="35" fontWeight="bold" fontFamily="sans-serif">
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
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-slate-800">Detected Anomalies</h3>
                      <p className="text-sm text-slate-500">{crops.length} defects identified requiring attention</p>
                   </div>
                </div>
                
                <button 
                  onClick={downloadCSV}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV Report
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {crops.map((crop: any, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                    <div className="aspect-square relative overflow-hidden bg-gray-100">
                      <img src={crop.src} alt="defect crop" className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="p-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[crop.label as keyof typeof COLORS] }} />
                        <p className="text-xs font-bold text-slate-700 truncate">{crop.label}</p>
                      </div>
                      <div className="flex justify-between items-center bg-gray-50 rounded px-2 py-1">
                        <span className="text-[10px] text-slate-400 font-medium">CONFIDENCE</span>
                        <span className="text-[10px] font-mono text-slate-600 font-bold">{(crop.score * 100).toFixed(0)}%</span>
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