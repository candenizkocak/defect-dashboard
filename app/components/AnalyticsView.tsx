// app/components/AnalyticsView.tsx
import React, { useEffect, useRef, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { 
  Layers, Activity, AlertOctagon, CheckCircle2, 
  Plus, Minus, RefreshCw, FileDown, FileSpreadsheet // <--- Added Icon
} from 'lucide-react';
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { BatchItem } from '../types';
import { DEFECT_COLORS } from '../constants';
import { generatePDFReport } from '../utils/reportGenerator';
import { downloadBatchCSV } from '../utils/processing'; // <--- Added Import

interface AnalyticsViewProps {
  batch: BatchItem[];
}

// Internal Zoom Controls Component
const HeatmapZoomControls = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-4 right-4 flex gap-2 z-10">
      <button onClick={() => zoomIn()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-transform active:scale-95">
        <Plus className="w-4 h-4" />
      </button>
      <button onClick={() => zoomOut()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-transform active:scale-95">
        <Minus className="w-4 h-4" />
      </button>
      <button onClick={() => resetTransform()} className="p-2 bg-white/90 shadow-md rounded-lg hover:bg-gray-50 text-slate-700 transition-transform active:scale-95">
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ batch }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processedItems = batch.filter(i => i.status === 'done' && i.results);

  // --- 1. Calculate Stats ---
  const stats = useMemo(() => {
    let totalDefects = 0;
    let defectCounts: Record<string, number> = {};
    let defectFreeTiles = 0;

    processedItems.forEach(item => {
      const defects = item.results?.defects || [];
      if (defects.length === 0) defectFreeTiles++;
      totalDefects += defects.length;
      
      defects.forEach(d => {
        defectCounts[d.class] = (defectCounts[d.class] || 0) + 1;
      });
    });

    const totalTiles = processedItems.length || 1; 
    const yieldRate = ((defectFreeTiles / totalTiles) * 100).toFixed(1);
    const avgDefects = (totalDefects / totalTiles).toFixed(2);

    const chartData = Object.entries(defectCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalDefects, defectFreeTiles, yieldRate, avgDefects, chartData };
  }, [processedItems]);

  // --- 2. Draw Heatmap ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || processedItems.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Reset Canvas
    ctx.clearRect(0, 0, w, h);

    // Draw Background
    ctx.fillStyle = '#f8fafc'; 
    ctx.fillRect(0, 0, w, h);
    
    // Grid lines
    ctx.beginPath();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h);
    ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
    ctx.stroke();
    
    // Border
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(0, 0, w, h);

    // Overlay Defects
    processedItems.forEach(item => {
      if (!item.results) return;
      
      const imgW = item.results.width || 1000;
      const imgH = item.results.height || 1000;
      const defects = item.results.defects;

      defects.forEach(d => {
        const [x1, y1, x2, y2] = d.box;
        
        const nx = x1 / imgW;
        const ny = y1 / imgH;
        const nw = (x2 - x1) / imgW;
        const nh = (y2 - y1) / imgH;

        const drawX = nx * w;
        const drawY = ny * h;
        const drawW = Math.max(nw * w, 4);
        const drawH = Math.max(nh * h, 4);

        ctx.shadowColor = "rgba(239, 68, 68, 0.5)";
        ctx.shadowBlur = 10;

        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)'; 
        ctx.fillRect(drawX, drawY, drawW, drawH);
        
        ctx.shadowBlur = 0; 
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX, drawY, drawW, drawH);
      });
    });

  }, [processedItems]);

  if (processedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-dashed border-gray-300">
        <Activity className="w-12 h-12 text-slate-300 mb-2" />
        <p className="text-slate-500 font-medium">No analysis data available</p>
        <p className="text-xs text-slate-400">Process some images to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-1 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" /> Yield Rate
            </div>
            <div className={`text-2xl font-bold ${Number(stats.yieldRate) > 90 ? 'text-green-600' : Number(stats.yieldRate) > 50 ? 'text-orange-500' : 'text-red-600'}`}>
                {stats.yieldRate}%
            </div>
            <div className="text-xs text-slate-400 font-medium">% of perfect tiles</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-1 text-xs font-bold uppercase tracking-wider">
                <AlertOctagon className="w-4 h-4" /> Total Defects
            </div>
            <div className="text-2xl font-bold text-slate-800">{stats.totalDefects}</div>
            <div className="text-xs text-slate-400">Across {processedItems.length} tiles</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-1 text-xs font-bold uppercase tracking-wider">
                <Activity className="w-4 h-4" /> Avg Density
            </div>
            <div className="text-2xl font-bold text-slate-800">{stats.avgDefects}</div>
            <div className="text-xs text-slate-400">Defects per tile</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-1 text-xs font-bold uppercase tracking-wider">
                <Layers className="w-4 h-4" /> Top Defect
            </div>
            <div className="text-2xl font-bold text-slate-800 truncate">
                {stats.chartData[0]?.name || "-"}
            </div>
            <div className="text-xs text-slate-400">Most frequent issue</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Heatmap Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-slate-800">Spatial Heatmap</h3>
                
                {/* --- REPORTING BUTTONS --- */}
                <div className="flex items-center gap-2">
                    {/* CSV Button (Light Green) */}
                    <button 
                       onClick={() => downloadBatchCSV(batch)}
                       className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors shadow-sm active:scale-95"
                    >
                       <FileSpreadsheet className="w-3.5 h-3.5" /> Download CSV Data
                    </button>

                    {/* PDF Button (Slate/Dark) */}
                    <button 
                       onClick={() => generatePDFReport(batch, canvasRef.current)}
                       className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white border border-slate-900 rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors shadow-sm active:scale-95"
                    >
                       <FileDown className="w-3.5 h-3.5" /> Export PDF Report
                    </button>
                </div>
            </div>
            <p className="text-xs text-slate-500 mb-6">Cumulative view of all defect locations.</p>
            
            <div className="flex-grow bg-slate-50 rounded-lg border border-slate-100 relative overflow-hidden flex items-center justify-center min-h-[400px]">
                {/* --- ZOOM WRAPPER --- */}
                <TransformWrapper initialScale={1} minScale={1} maxScale={8}>
                    <HeatmapZoomControls />
                    <TransformComponent wrapperClass="!w-full !h-full flex items-center justify-center" contentClass="!w-full !h-full flex items-center justify-center">
                        <div className="relative aspect-square w-full max-w-[500px]">
                            <canvas 
                                ref={canvasRef} 
                                width={800} 
                                height={800} 
                                className="w-full h-full object-contain rounded-md shadow-sm bg-white"
                            />
                            {/* Labels */}
                            <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-slate-400 font-mono tracking-widest pointer-events-none">VERTICAL</div>
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-mono tracking-widest pointer-events-none">HORIZONTAL</div>
                        </div>
                    </TransformComponent>
                </TransformWrapper>
            </div>
        </div>

        {/* Charts Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-base font-bold text-slate-800 mb-1">Defect Distribution</h3>
            <p className="text-xs text-slate-500 mb-6">Breakdown by classification type.</p>
            
            <div className="flex-grow min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" width={100} fontSize={12} tick={{fill: '#475569'}} />
                        <ReTooltip 
                            cursor={{ fill: '#f1f5f9' }}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                            {stats.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={DEFECT_COLORS[entry.name] || '#94a3b8'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};